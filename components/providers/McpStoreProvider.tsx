'use client';

import { useEffect } from 'react';
import { useMcpStore, type McpStore } from '@/lib/stores/mcp-store';

/**
 * MCP Store Provider
 * Initializes the Zustand store with data on mount
 * Fetches connections and user servers when component mounts
 */
export function McpStoreProvider({ children }: { children: React.ReactNode }) {
  const fetchConnections = useMcpStore((state: McpStore) => state.fetchConnections);
  const fetchUserServers = useMcpStore((state: McpStore) => state.fetchUserServers);

  useEffect(() => {
    // Fetch initial data on mount
    fetchConnections();
    fetchUserServers();
  }, [fetchConnections, fetchUserServers]);

  return <>{children}</>;
}
