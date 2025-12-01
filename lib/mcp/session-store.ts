import { MCPOAuthClient } from './oauth-client';
import { Redis } from 'ioredis';
import type {
  OAuthTokens,
  OAuthClientInformationMixed,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { customAlphabet } from 'nanoid';

export interface SessionData {
  sessionId: string;
  serverUrl: string;
  callbackUrl: string;
  transportType: 'sse' | 'streamable_http';
  createdAt: number;
  active: boolean;
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationMixed;
  codeVerifier?: string;
}

const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  24
);

export class SessionStore {
  private redis: Redis;
  private readonly SESSION_TTL = 43200; // 12 hours
  private readonly KEY_PREFIX = 'mcp:session:';

  constructor() {
    const redisUrl = process.env.REDIS_URL || process.env.NEXT_PUBLIC_REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableReadyCheck: true,
      connectTimeout: 10000,
    });

    this.redis.on('ready', () => {
      console.log('✅ Session Store: Redis connected');
    });
    this.redis.on('error', (err) => {
      console.error('❌ Session Store: Redis error:', err.message);
    });
    this.redis.on('reconnecting', () => {
      console.log('🔄 Session Store: Reconnecting to Redis...');
    });
  }

  private getSessionKey(sessionId: string): string {
    return `${this.KEY_PREFIX}${sessionId}`;
  }

  generateSessionId(): string {
    return nanoid();
  }

  async setClient(
    sessionId: string,
    client?: MCPOAuthClient,
    serverUrl?: string,
    callbackUrl?: string,
    transportType: 'sse' | 'streamable_http' = 'streamable_http'
  ): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);

      let tokens: OAuthTokens | undefined;
      let clientInformation: OAuthClientInformationMixed | undefined;
      let codeVerifier: string | undefined;
      let resolvedServerUrl = serverUrl;
      let resolvedCallbackUrl = callbackUrl;

      if (client) {
        try {
          const oauthProvider = client.oauthProvider;
          if (oauthProvider) {
            tokens = oauthProvider.tokens();
            clientInformation = oauthProvider.clientInformation();
            try {
              codeVerifier = oauthProvider.codeVerifier();
            } catch {}
          }
        } catch {}

        resolvedServerUrl ||= client.getServerUrl();
        resolvedCallbackUrl ||= client.getCallbackUrl();
      }

      if (!resolvedServerUrl || !resolvedCallbackUrl) {
        throw new Error(
          'serverUrl and callbackUrl must be provided (either explicitly or via client)'
        );
      }

      const sessionData: SessionData = {
        sessionId,
        serverUrl: resolvedServerUrl,
        callbackUrl: resolvedCallbackUrl,
        transportType,
        createdAt: Date.now(),
        active: true,
        tokens,
        clientInformation,
        codeVerifier,
      };

      await this.redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));
      console.log(`✅ Redis SET session data: ${sessionKey} (TTL: ${this.SESSION_TTL}s)`);
    } catch (error) {
      console.error('❌ Failed to store session in Redis:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionDataStr = await this.redis.get(sessionKey);
      if (!sessionDataStr) {
        console.log(`❓ Session not found in Redis: ${sessionKey}`);
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);
      await this.redis.expire(sessionKey, this.SESSION_TTL);
      return sessionData;
    } catch (error) {
      console.error('❌ Failed to get session from Redis:', error);
      return null;
    }
  }

  private async recreateClient(sessionData: SessionData): Promise<MCPOAuthClient> {
    console.log(
      `🔄 Recreating client: sessionId=${sessionData.sessionId}, hasTokens=${!!sessionData.tokens}`
    );

    const client = new MCPOAuthClient(
      sessionData.serverUrl,
      sessionData.callbackUrl,
      () => {},
      sessionData.sessionId,
      sessionData.transportType
    );

    if (!sessionData.tokens) {
      console.log(`⚠️ Session has no tokens (mid-OAuth flow): ${sessionData.sessionId}`);

      await client.connect().catch((err) => {
        console.log(
          `🔐 Client awaiting OAuth (expected mid-flow): ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      });

      const oauthProvider = client.oauthProvider;
      if (oauthProvider) {
        if (sessionData.clientInformation && 'redirect_uris' in sessionData.clientInformation) {
          oauthProvider.saveClientInformation(sessionData.clientInformation);
          console.log(`✅ Restored client info for mid-OAuth: ${sessionData.clientInformation.client_id}`);
        }
        if (sessionData.codeVerifier) {
          oauthProvider.saveCodeVerifier(sessionData.codeVerifier);
          console.log(`✅ Restored code verifier for mid-OAuth (required for finishAuth)`);
        }
      }

      return client;
    }

    console.log(`🔐 Restoring OAuth session: ${sessionData.sessionId}`);

    try {
      await client.connect();
    } catch (err) {
      console.log(
        `🔄 Initial connect failed (often expected): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const oauthProvider = client.oauthProvider;
    if (!oauthProvider) {
      throw new Error('OAuth provider not initialized');
    }

    if (sessionData.clientInformation && 'redirect_uris' in sessionData.clientInformation) {
      oauthProvider.saveClientInformation(sessionData.clientInformation);
    }
    if (sessionData.tokens && 'access_token' in sessionData.tokens) {
      oauthProvider.saveTokens(sessionData.tokens);
    }
    if (sessionData.codeVerifier) {
      oauthProvider.saveCodeVerifier(sessionData.codeVerifier);
    }

    await client.reconnect();
    console.log(`✅ OAuth session restored: ${sessionData.sessionId}`);
    return client;
  }

  async getClient(sessionId: string): Promise<MCPOAuthClient | null> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) return null;
    return this.recreateClient(sessionData);
  }

  async removeSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      await this.redis.del(sessionKey);
      console.log(`✅ Removed session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to remove session from Redis:', error);
    }
  }

  async getAllSessionIds(): Promise<string[]> {
    try {
      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      return keys.map((key) => key.replace(this.KEY_PREFIX, ''));
    } catch (error) {
      console.error('❌ Failed to get sessions from Redis:', error);
      return [];
    }
  }

  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      console.log('✅ Cleared all sessions from Redis');
    } catch (error) {
      console.error('❌ Failed to clear sessions from Redis:', error);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
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

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('✅ Session Store: Redis disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect Redis:', error);
    }
  }
}

export const sessionStore = new SessionStore();
