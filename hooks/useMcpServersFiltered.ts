"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { McpServer, Category } from "@/types/mcp";
import { connectionStore } from "@/lib/mcp/connection-store";
import { useConnectionContext } from "@/components/providers/ConnectionProvider";

interface FilterOptions {
  searchQuery?: string;
  categorySlug?: string;
  categories: Category[];
}

/**
 * Custom hook for filtered MCP servers with pagination
 * Handles search and category filtering using REST API
 */
export function useMcpServersFiltered(
  options: FilterOptions,
  limit: number = 10
) {
  const { searchQuery, categorySlug, categories } = options;
  const { connections } = useConnectionContext();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const isFiltering = Boolean(searchQuery?.trim() || categorySlug);

  // Fetch servers from REST API
  const fetchServers = useCallback(async (currentOffset: number = 0, append: boolean = false) => {
    if (!isFiltering) {
      setData(null);
      return;
    }

    setLoading(!append);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('offset', currentOffset.toString());

      if (searchQuery?.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Note: Category filtering would need to be implemented in the API
      // For now, we'll fetch all and filter client-side if categorySlug exists

      const response = await fetch(`/api/mcp?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to fetch servers');
      }

      if (append && data) {
        // Append to existing data
        setData({
          ...result,
          data: {
            mcpServers: {
              ...result.data.mcpServers,
              edges: [...data.data.mcpServers.edges, ...result.data.mcpServers.edges]
            }
          }
        });
      } else {
        setData(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch servers';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [isFiltering, limit, searchQuery, data]);

  // Initial fetch when filters change
  useEffect(() => {
    setOffset(0);
    fetchServers(0, false);
  }, [searchQuery, categorySlug, limit]);

  // Merge with localStorage connection state
  const mergeWithConnectionState = useCallback((servers: McpServer[]) => {
    const storedConnections = connectionStore.getAll();
    return servers.map((server) => {
      const stored = storedConnections[server.id];
      if (stored && stored.connectionStatus === "CONNECTED") {
        return {
          ...server,
          connectionStatus: stored.connectionStatus,
          tools: stored.tools,
        };
      }
      return {
        ...server,
        connectionStatus: server.connectionStatus || "DISCONNECTED",
        tools: server.tools || [],
      };
    });
  }, []);

  const servers = useMemo(() => {
    if (!isFiltering) return [];
    const rawServers = data?.data?.mcpServers?.edges?.map((edge: any) => edge.node) || [];
    return mergeWithConnectionState(rawServers);
  }, [data, isFiltering, mergeWithConnectionState, connections]);

  const pageInfo = data?.data?.mcpServers?.pageInfo;

  // Load more filtered results
  const loadMore = useCallback(async () => {
    if (!pageInfo?.hasNextPage || isLoadingMore) return;

    setIsLoadingMore(true);
    const newOffset = offset + limit;
    setOffset(newOffset);
    await fetchServers(newOffset, true);
  }, [pageInfo?.hasNextPage, isLoadingMore, offset, limit, fetchServers]);

  return {
    servers,
    loading,
    error,
    hasNextPage: pageInfo?.hasNextPage || false,
    isLoadingMore,
    isFiltering,
    loadMore,
  };
}
