import { useState, useEffect, useCallback } from "react";
import type { ParsedRegistryServer } from "@/types/mcp";

/**
 * Hook for fetching recently updated MCP servers from the official registry
 */
export function useRegistryRecentServers(limit: number = 12, updatedSince?: string) {
  const [servers, setServers] = useState<ParsedRegistryServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      
      if (updatedSince) {
        params.append("updated_since", updatedSince);
      }

      const response = await fetch(`/api/registry?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch registry servers");
      }

      const result: {
        data: {
          servers: ParsedRegistryServer[];
        };
      } = await response.json();

      setServers(result.data.servers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching recent registry servers:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, updatedSince]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return {
    servers,
    loading,
    error,
    refetch: fetchServers,
  };
}
