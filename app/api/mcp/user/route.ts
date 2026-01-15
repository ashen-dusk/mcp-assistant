import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/mcp/user - Get current user's MCP servers
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // This route requires authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's MCP servers with categories
    const servers = await prisma.mcpServer.findMany({
      where: {
        ownerId: session.user.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data to match expected format
    const transformedServers = servers.map((server) => ({
      id: server.id,
      name: server.name,
      transport: server.transport,
      url: server.url,
      requiresOauth2: server.requiresOauth2,
      isPublic: server.isPublic,
      isFeatured: server.isFeatured,
      description: server.description,
      categories: server.categories.map(sc => ({
        id: sc.category.id,
        name: sc.category.name,
        description: sc.category.description,
      })),
      createdAt: server.createdAt,
      updatedAt: server.updatedAt,
      owner: server.owner ? {
        id: server.owner.id,
        username: server.owner.username,
        email: server.owner.email,
        firstName: server.owner.firstName,
        lastName: server.owner.lastName,
      } : null,
    }));

    return NextResponse.json({
      data: {
        getUserMcpServers: transformedServers
      }
    });
  } catch (error) {
    console.error("Error fetching user MCP servers:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
