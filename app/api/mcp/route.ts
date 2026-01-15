import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";
import { generateId, IdPrefixes } from "@/lib/generate-id";
import { syncUser } from "@/lib/sync-user";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Reusable Prisma include object for fetching server data with owner and categories
 */
const serverInclude = {
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
} satisfies Prisma.McpServerInclude;

/**
 * Transform Prisma server data to frontend format
 */
function transformServerData(server: Prisma.McpServerGetPayload<{ include: typeof serverInclude }>) {
  return {
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
  };
}

/**
 * Update server category associations
 */
async function updateServerCategories(serverId: string, categoryIds: string[]) {
  // Remove existing category associations
  await prisma.mcpServerCategory.deleteMany({
    where: { serverId },
  });

  // Create new category associations if provided
  if (categoryIds.length > 0) {
    await prisma.mcpServerCategory.createMany({
      data: categoryIds.map((categoryId: string) => ({
        id: generateId(IdPrefixes.MCP_SERVER_CATEGORY),
        serverId,
        categoryId,
      })),
      skipDuplicates: true,
    });
  }

  // Return updated server with categories
  return await prisma.mcpServer.findUnique({
    where: { id: serverId },
    include: serverInclude,
  });
}

// ============================================================================
// API Route Handlers
// ============================================================================

/**
 * GET /api/mcp - Fetch MCP servers with optional pagination and ordering
 *
 * Query Parameters:
 * - limit: Number of servers to return (default: 10, e.g., ?limit=10)
 * - offset: Offset for pagination (e.g., ?offset=10)
 * - orderBy: Field to order by with optional "-" prefix for descending (e.g., ?orderBy=-created_at)
 *   Supported fields: name, created_at, updated_at
 * - search: Search by server name (e.g., ?search=github)
 *
 * Examples:
 * - /api/mcp - Get first 10 servers (default)
 * - /api/mcp?limit=10&offset=10 - Get next 10 servers
 * - /api/mcp?orderBy=-created_at&limit=10 - Get 10 newest servers
 * - /api/mcp?search=github - Search for servers with "github" in name
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;
    const orderBy = searchParams.get("orderBy") || "-createdAt";
    const search = searchParams.get("search");

    // Parse orderBy format: "name", "-name", "createdAt", "-createdAt"
    const isDesc = orderBy.startsWith("-");
    const field = isDesc ? orderBy.substring(1) : orderBy;

    // Validate field and map to Prisma field names
    const validFields: Record<string, keyof Prisma.McpServerOrderByWithRelationInput> = {
      "name": "name",
      "created_at": "createdAt",
      "createdAt": "createdAt",
      "updated_at": "updatedAt",
      "updatedAt": "updatedAt",
    };

    const prismaField = validFields[field];
    if (!prismaField) {
      return NextResponse.json(
        { error: "Invalid orderBy field" },
        { status: 400 }
      );
    }

    // Build the where clause
    const whereClause: Prisma.McpServerWhereInput = {
      OR: [
        { isPublic: true },
        { ownerId: userId || undefined },
      ],
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      }),
    };

    // Fetch servers and total count in parallel
    const [servers, totalCount] = await Promise.all([
      prisma.mcpServer.findMany({
        where: whereClause,
        include: serverInclude,
        orderBy: {
          [prismaField]: isDesc ? 'desc' : 'asc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.mcpServer.count({
        where: whereClause,
      }),
    ]);

    // Transform data to match expected format
    const transformedServers = servers.map(transformServerData);

    return NextResponse.json({
      data: {
        mcpServers: {
          edges: transformedServers.map((server) => ({ node: server })),
          pageInfo: {
            hasNextPage: offset + limit < totalCount,
            hasPreviousPage: offset > 0,
            totalCount
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching MCP servers:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mcp - Create a new MCP server
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync user to database before creating server
    await syncUser(session.user);

    const body = await request.json();
    const { name, transport, url, requiresOauth, isPublic, isFeatured, description, categoryIds } = body;

    // Check if server with this name and owner already exists
    const existingServer = await prisma.mcpServer.findUnique({
      where: {
        name_ownerId: {
          name,
          ownerId: session.user.id,
        },
      },
    });

    if (existingServer) {
      return NextResponse.json(
        { error: `Server with name "${name}" already exists. Use PATCH to update it.` },
        { status: 409 } // Conflict
      );
    }

    // Create new server
    let server = await prisma.mcpServer.create({
      data: {
        id: generateId(IdPrefixes.MCP_SERVER),
        name,
        transport,
        url: url || null,
        requiresOauth2: requiresOauth || false,
        isPublic: isPublic || false,
        isFeatured: isFeatured || false,
        description: description || null,
        ownerId: session.user.id,
      },
      include: serverInclude,
    });

    // Handle category associations if provided
    if (categoryIds && categoryIds.length > 0) {
      const updatedServer = await updateServerCategories(server.id, categoryIds);
      if (updatedServer) server = updatedServer;
    }

    return NextResponse.json({
      data: transformServerData(server)
    }, { status: 201 }); // Created
  } catch (error) {
    console.error('Error creating MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/mcp - Update an existing MCP server
 * Query Parameters:
 * - name: Server name to update (required)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync user to database
    await syncUser(session.user);

    const { searchParams } = new URL(request.url);
    const serverName = searchParams.get("name");

    if (!serverName) {
      return NextResponse.json({ error: "Server name is required" }, { status: 400 });
    }

    const body = await request.json();
    const { transport, url, requiresOauth, isPublic, isFeatured, description, categoryIds } = body;

    // Check if server exists and user owns it
    const existingServer = await prisma.mcpServer.findUnique({
      where: {
        name_ownerId: {
          name: serverName,
          ownerId: session.user.id,
        },
      },
    });

    if (!existingServer) {
      return NextResponse.json(
        { error: "Server not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    // Update server
    let server = await prisma.mcpServer.update({
      where: { id: existingServer.id },
      data: {
        transport,
        url: url || null,
        requiresOauth2: requiresOauth || false,
        isPublic: isPublic || false,
        isFeatured: isFeatured || false,
        description: description || null,
      },
      include: serverInclude,
    });

    // Handle category associations if provided
    if (categoryIds !== undefined) {
      const updatedServer = await updateServerCategories(server.id, categoryIds);
      if (updatedServer) server = updatedServer;
    }

    return NextResponse.json({
      data: transformServerData(server)
    });
  } catch (error) {
    console.error('Error updating MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mcp - Delete an MCP server
 * Query Parameters:
 * - name: Server name to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serverName = searchParams.get("name");

    if (!serverName) {
      return NextResponse.json({ error: "Server name is required" }, { status: 400 });
    }

    // Delete the server (cascade will handle category associations)
    const deletedServer = await prisma.mcpServer.deleteMany({
      where: {
        name: serverName,
        ownerId: session.user.id,
      },
    });

    if (deletedServer.count === 0) {
      return NextResponse.json(
        { error: "Server not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: true,
      message: "Server deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


