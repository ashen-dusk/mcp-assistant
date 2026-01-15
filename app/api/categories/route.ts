import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/categories - Get all categories
 *
 * Query Parameters:
 * - limit: Number of categories to return (default: 50)
 * - offset: Offset for pagination (default: 0)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    const [categories, totalCount] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      prisma.category.count(),
    ]);

    return NextResponse.json({
      data: {
        categories: {
          edges: categories.map((category) => ({ node: category })),
          pageInfo: {
            hasNextPage: offset + limit < totalCount,
            hasPreviousPage: offset > 0,
            totalCount
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
