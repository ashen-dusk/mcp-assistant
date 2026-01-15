import { UIToolInvocation, tool } from 'ai';
import { z } from 'zod';

export const searchMcpServers = tool({
  description: 'Search for MCP servers in the registry using filters',
  inputSchema: z.object({
    searchQuery: z.string().optional().describe('Search query to filter servers by name'),
    limit: z.number().optional().default(10).describe('Number of results to return (default: 10)'),
    offset: z.number().optional().default(0).describe('Offset for pagination (default: 0)'),
  }),
  async *execute({ searchQuery, limit, offset }) {
    yield { state: 'loading' as const };

    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('limit', (limit || 10).toString());
      params.append('offset', (offset || 0).toString());

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Call our Next.js API endpoint
      const response = await fetch(`/api/mcp?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.data?.mcpServers) {
        const servers = data.data.mcpServers.edges.map((edge: any) => edge.node);
        const pageInfo = data.data.mcpServers.pageInfo;

        yield {
          state: 'ready' as const,
          success: true,
          servers,
          count: servers.length,
          totalCount: pageInfo.totalCount,
          hasNextPage: pageInfo.hasNextPage,
          message: `Found ${pageInfo.totalCount} MCP server(s)${searchQuery ? ` matching "${searchQuery}"` : ''}`,
        };
      } else if (data.error) {
        yield {
          state: 'ready' as const,
          success: false,
          error: data.error,
          message: `Error: ${data.error}`,
        };
      } else {
        yield {
          state: 'ready' as const,
          success: false,
          error: 'Failed to search servers',
          message: 'Failed to search servers',
        };
      }
    } catch (error) {
      yield {
        state: 'ready' as const,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Error searching servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

export type SearchMcpServersToolInvocation = UIToolInvocation<
  typeof searchMcpServers
>;
