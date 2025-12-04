import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';
import type { McpConfig, McpServerConfig } from '@/types/mcp';

/**
 * POST /api/mcp/secure-config
 *
 * Converts client-side MCP config (with sessionIds) to secure config with credentials
 * This endpoint runs server-side only and never exposes tokens to the client
 *
 * Request body:
 * {
 *   "mcpConfig": {
 *     "server1": { "transport": "sse", "url": "...", "sessionId": "..." },
 *     ...
 *   }
 * }
 *
 * Response:
 * {
 *   "serverConfig": {
 *     "server1": { "transport": "sse", "url": "...", "headers": { "Authorization": "..." } },
 *     ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mcpConfig: McpConfig = body.mcpConfig;

    if (!mcpConfig || typeof mcpConfig !== 'object') {
      return NextResponse.json(
        { error: 'Invalid mcpConfig provided' },
        { status: 400 }
      );
    }

    const serverConfig: McpServerConfig = {};

    // For each server in the config, fetch credentials from session store
    for (const [serverName, config] of Object.entries(mcpConfig)) {
      const { transport, url, sessionId } = config;

      if (!sessionId) {
        console.warn(`[Secure Config] No sessionId for server: ${serverName}`);
        // Include server without headers if no sessionId
        serverConfig[serverName] = { transport, url };
        continue;
      }

      try {
        // Fetch the MCP client from session store
        const client = await sessionStore.getClient(sessionId);

        if (!client) {
          console.warn(`[Secure Config] Client not found for sessionId: ${sessionId}`);
          // Include server without headers if client not found
          serverConfig[serverName] = { transport, url };
          continue;
        }

        // Get valid tokens, refreshing if expired
        try {
          const tokenValid = await client.getValidTokens();
          if (!tokenValid) {
            console.warn(`[Secure Config] Token invalid and refresh failed for ${serverName}`);
          } else {
            // If token was refreshed, update it in session store
            const oauthProvider = client.oauthProvider;
            if (oauthProvider) {
              const tokens = oauthProvider.tokens();
              if (tokens) {
                await sessionStore.updateTokens(sessionId, tokens);
                console.log(`[Secure Config] Updated refreshed tokens for ${serverName}`);
              }
            }
          }
        } catch (refreshError) {
          console.log(`[Secure Config] Token refresh check failed for ${serverName}:`, refreshError);
        }

        // Extract OAuth headers if available
        let headers: Record<string, string> | undefined;
        try {
          const oauthProvider = (client as unknown as {
            oauthProvider?: { tokens: () => { access_token?: string } }
          }).oauthProvider;

          if (oauthProvider) {
            const tokens = oauthProvider.tokens();
            if (tokens && tokens.access_token) {
              headers = {
                Authorization: `Bearer ${tokens.access_token}`
              };
            }
          }
        } catch (headerError) {
          console.log(`[Secure Config] Could not fetch OAuth headers for ${serverName}:`, headerError);
        }

        // Build server config entry
        serverConfig[serverName] = {
          transport,
          url,
          ...(headers && { headers })
        };

        console.log(`[Secure Config] Added server config for ${serverName}`);

      } catch (error) {
        console.error(`[Secure Config] Error processing ${serverName}:`, error);
        // Include server without headers on error
        serverConfig[serverName] = { transport, url };
      }
    }

    return NextResponse.json({ serverConfig });

  } catch (error: unknown) {
    console.error('[Secure Config] Unexpected error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process secure config' },
      { status: 500 }
    );
  }
}
