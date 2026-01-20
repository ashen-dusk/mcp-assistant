import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';
import { MCPClient } from '@/lib/mcp/oauth-client';
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/mcp/tool/list?sessionId=<sessionId>
 *
 * List all available tools from a connected MCP server
 *
 * Query parameters:
 * - sessionId: Session ID identifying the connected client
 *
 * Response:
 * {
 *   "tools": [
 *     {
 *       "name": "example_tool",
 *       "description": "An example tool",
 *       "inputSchema": {
 *         "type": "object",
 *         "properties": { ... }
 *       }
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  let sessionId: string | null = null;
  let userId: string | null = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    sessionId = searchParams.get('sessionId');

    console.log('[List Tools] Request received for sessionId:', sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    // Create MCP client - it will load serverId from session
    const client = new MCPClient({
      userId,
      sessionId,
    });

    // Connect to the server
    try {
      await client.connect();
    } catch (error) {
      console.log('[List Tools] Failed to connect:', error);
      return NextResponse.json(
        { error: 'Failed to connect to server. Please reconnect.' },
        { status: 500 }
      );
    }

    // Get valid tokens before making request
    // Token validation and refresh is handled automatically by the client
    // via the onTokenRefreshed callback passed from SessionStore

    try {
      // List tools from the MCP server
      console.log('[List Tools] Fetching tools from MCP server...');
      const result = await client.listTools();
      console.log('[List Tools] Found', result.tools.length, 'tools');

      return NextResponse.json({
        tools: result.tools,
        url: client.getServerUrl(),
        transport: client.getTransportType(),
      });
    } catch (error: unknown) {
      console.log('[List Tools] Error fetching tools:', error);
      if (error instanceof Error) {
        return NextResponse.json(
          { error: `Failed to list tools: ${error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to list tools' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.log('[List Tools] Unexpected error:', error);

    // Check for invalid refresh token error and clear session
    if (userId && sessionId && error instanceof Error && (error.message.includes('Invalid refresh token') || error.name === 'InvalidGrantError' || (error as any).code === 'InvalidGrantError')) {
      console.log(`[List Tools] Clearing session ${sessionId} due to invalid refresh token`);
      await sessionStore.removeSession(userId, sessionId);
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
