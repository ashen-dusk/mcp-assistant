import { MCPOAuthClient } from './oauth-client';
import { Redis } from 'ioredis';

/**
 * Session store for managing MCP client instances
 *
 * Hybrid implementation:
 * - Uses Redis for session metadata (production)
 * - Falls back to in-memory when Redis is unavailable (development)
 * - Client connections always stay in memory (cannot be serialized)
 */
export class SessionStore {
  private clients = new Map<string, MCPOAuthClient>();
  private serverToSession = new Map<string, Map<string, string>>(); // sessionId -> (serverUrl -> sessionId)
  private redis: Redis | null = null;
  private useRedis = false;
  private readonly SESSION_TTL = 86400; // 24 hours in seconds
  private readonly KEY_PREFIX = 'mcp:session:';

  constructor() {
    this.initRedis();
  }

  /**
   * Initialize Redis connection for production
   */
  private initRedis(): void {
    const redisUrl = process.env.REDIS_URL || process.env.NEXT_PUBLIC_REDIS_URL;

    if (!redisUrl) {
      console.log('🔄 Session Store: Using in-memory storage (Redis URL not configured)');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.connect().then(() => {
        this.useRedis = true;
        console.log('✅ Session Store: Connected to Redis');
      }).catch((err) => {
        console.warn('⚠️ Session Store: Redis connection failed, falling back to in-memory:', err.message);
        this.useRedis = false;
        this.redis = null;
      });

      this.redis.on('error', (err) => {
        console.error('❌ Session Store: Redis error:', err.message);
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Session Store: Reconnecting to Redis...');
      });

    } catch (error) {
      console.warn('⚠️ Session Store: Redis initialization failed, using in-memory storage:', error);
      this.redis = null;
      this.useRedis = false;
    }
  }

  /**
   * Store a client instance with a session ID
   */
  async setClient(sessionId: string, client: MCPOAuthClient): Promise<void> {
    // Store client in memory (connections cannot be serialized)
    this.clients.set(sessionId, client);

    // Store session metadata in Redis for persistence
    if (this.useRedis && this.redis) {
      try {
        const sessionKey = `${this.KEY_PREFIX}${sessionId}`;
        const metadata = {
          sessionId,
          createdAt: Date.now(),
          active: true,
        };
        await this.redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(metadata));
        console.log(`✅ Redis SET client metadata: ${sessionKey} (TTL: ${this.SESSION_TTL}s)`);
      } catch (error) {
        console.error('❌ Failed to store session in Redis:', error);
      }
    } else {
      console.log(`📦 In-memory SET client: sessionId=${sessionId}`);
    }
  }

  /**
   * Retrieve a client instance by session ID
   */
  async getClient(sessionId: string): Promise<MCPOAuthClient | null> {
    const client = this.clients.get(sessionId) || null;

    if (!client) {
      console.log(`❓ Client not found in memory: sessionId=${sessionId}`);
      return null;
    }

    // Verify session exists in Redis
    if (this.useRedis && this.redis) {
      try {
        const sessionKey = `${this.KEY_PREFIX}${sessionId}`;
        const exists = await this.redis.exists(sessionKey);
        if (!exists) {
          // Session expired in Redis, clean up in-memory client
          console.log(`⚠️ Redis session expired, removing client: ${sessionKey}`);
          this.clients.delete(sessionId);
          return null;
        }
        // Refresh TTL on access
        await this.redis.expire(sessionKey, this.SESSION_TTL);
        console.log(`✅ Redis GET client verified: ${sessionKey} (TTL refreshed)`);
      } catch (error) {
        console.error('❌ Failed to verify session in Redis:', error);
      }
    } else {
      console.log(`✅ In-memory GET client: sessionId=${sessionId}`);
    }

    return client;
  }

  /**
   * Remove a client from the store and disconnect it
   */
  async removeClient(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (client) {
      client.disconnect();
      this.clients.delete(sessionId);
    }

    // Remove from Redis
    if (this.useRedis && this.redis) {
      try {
        const sessionKey = `${this.KEY_PREFIX}${sessionId}`;
        await this.redis.del(sessionKey);

        // Remove all server URL mappings for this session
        const pattern = `${this.KEY_PREFIX}session:${sessionId}:url:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('❌ Failed to remove session from Redis:', error);
      }
    }

    // Also remove from in-memory server mapping (iterate through nested map)
    for (const [userId, serverMap] of this.serverToSession.entries()) {
      for (const [serverName, sid] of serverMap.entries()) {
        if (sid === sessionId) {
          serverMap.delete(serverName);
          if (serverMap.size === 0) {
            this.serverToSession.delete(userId);
          }
          break;
        }
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get all active session IDs
   */
  async getAllSessionIds(): Promise<string[]> {
    if (this.useRedis && this.redis) {
      try {
        const pattern = `${this.KEY_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        return keys.map(key => key.replace(this.KEY_PREFIX, ''));
      } catch (error) {
        console.error('❌ Failed to get sessions from Redis:', error);
      }
    }
    return Array.from(this.clients.keys());
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    // Disconnect all in-memory clients
    this.clients.forEach((client) => client.disconnect());
    this.clients.clear();
    this.serverToSession.clear();

    // Clear Redis
    if (this.useRedis && this.redis) {
      try {
        const pattern = `${this.KEY_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('❌ Failed to clear sessions from Redis:', error);
      }
    }
  }

  /**
   * Map a server URL to a session ID for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   * @param sessionIdValue - OAuth session ID to store (same as sessionId param)
   */
  async setServerSession(sessionId: string, serverUrl: string, sessionIdValue: string): Promise<void> {
    // Store in nested map: sessionId -> (serverUrl -> sessionId)
    if (!this.serverToSession.has(sessionId)) {
      this.serverToSession.set(sessionId, new Map());
    }
    this.serverToSession.get(sessionId)!.set(serverUrl, sessionIdValue);

    if (this.useRedis && this.redis) {
      try {
        const serverKey = `${this.KEY_PREFIX}session:${sessionId}:url:${serverUrl}`;
        await this.redis.setex(serverKey, this.SESSION_TTL, sessionIdValue);
        console.log(`✅ Redis SET: ${serverKey} -> ${sessionIdValue} (TTL: ${this.SESSION_TTL}s)`);
      } catch (error) {
        console.error('❌ Failed to store server mapping in Redis:', error);
      }
    } else {
      console.log('📦 In-memory SET: sessionId=' + sessionId + ', serverUrl=' + serverUrl);
    }
  }

  /**
   * Get session ID for a server URL for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   */
  async getServerSession(sessionId: string, serverUrl: string): Promise<string | null> {
    // Try in-memory cache first
    let storedSessionId = this.serverToSession.get(sessionId)?.get(serverUrl) || null;

    if (storedSessionId) {
      console.log(`✅ In-memory GET: ${sessionId} + ${serverUrl} -> ${storedSessionId}`);
      return storedSessionId;
    }

    // If not in cache, try Redis
    if (this.useRedis && this.redis) {
      try {
        const serverKey = `${this.KEY_PREFIX}session:${sessionId}:url:${serverUrl}`;
        storedSessionId = await this.redis.get(serverKey);
        if (storedSessionId) {
          console.log(`✅ Redis GET: ${serverKey} -> ${storedSessionId}`);
          // Update in-memory cache
          if (!this.serverToSession.has(sessionId)) {
            this.serverToSession.set(sessionId, new Map());
          }
          this.serverToSession.get(sessionId)!.set(serverUrl, storedSessionId);
          // Refresh TTL
          await this.redis.expire(serverKey, this.SESSION_TTL);
        } else {
          console.log(`❓ Redis GET: ${serverKey} -> NOT FOUND`);
        }
      } catch (error) {
        console.error('❌ Failed to get server mapping from Redis:', error);
      }
    } else {
      console.log(`❓ Not found: sessionId=${sessionId}, serverUrl=${serverUrl}`);
    }

    return storedSessionId;
  }

  /**
   * Remove server session mapping for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   */
  async removeServerSession(sessionId: string, serverUrl: string): Promise<void> {
    const storedSessionId = await this.getServerSession(sessionId, serverUrl);
    if (storedSessionId) {
      await this.removeClient(storedSessionId);
    }

    // Remove from in-memory cache
    this.serverToSession.get(sessionId)?.delete(serverUrl);
    if (this.serverToSession.get(sessionId)?.size === 0) {
      this.serverToSession.delete(sessionId);
    }

    if (this.useRedis && this.redis) {
      try {
        const serverKey = `${this.KEY_PREFIX}session:${sessionId}:url:${serverUrl}`;
        await this.redis.del(serverKey);
      } catch (error) {
        console.error('❌ Failed to remove server mapping from Redis:', error);
      }
    }
  }

  /**
   * Get client by server URL for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   */
  async getClientByServer(sessionId: string, serverUrl: string): Promise<MCPOAuthClient | null> {
    const storedSessionId = await this.getServerSession(sessionId, serverUrl);
    return storedSessionId ? this.getClient(storedSessionId) : null;
  }

  /**
   * Cleanup expired sessions (should be called periodically)
   */
  async cleanupExpiredSessions(): Promise<void> {
    if (!this.useRedis || !this.redis) return;

    try {
      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Get Redis connection status
   */
  isRedisConnected(): boolean {
    return this.useRedis && this.redis?.status === 'ready';
  }

  /**
   * Close Redis connection gracefully
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log('✅ Session Store: Redis disconnected');
      } catch (error) {
        console.error('❌ Failed to disconnect Redis:', error);
      }
    }
  }
}

// Global singleton instance
export const sessionStore = new SessionStore();
