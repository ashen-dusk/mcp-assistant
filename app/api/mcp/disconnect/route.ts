import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';
import { createClient } from "@/lib/supabase/server";
import { MCPClient } from '@/lib/mcp/oauth-client';

interface DisconnectRequestBody {
  sessionId: string;
}

/**
 * POST /api/mcp/disconnect
 *
 * Disconnect from an MCP server and clean up the session
 *
 * Request body:
 * {
 *   "sessionId": "abc123xyz"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Disconnected successfully"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Require authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to disconnect from MCP servers' },
        { status: 401 }
      );
    }

    const body: DisconnectRequestBody = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Create MCP client - it will load serverId from session
    const client = new MCPClient({
      userId,
      sessionId,
    });

    await client.clearSession();

    return NextResponse.json({
      success: true,
      message: 'Disconnected successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process disconnect request' },
      { status: 500 }
    );
  }
}
