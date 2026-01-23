'use client';

import { useEffect } from 'react';
import { useMcpStore, type McpStore } from '@/lib/stores/mcp-store';
import { useMcp } from '@mcp-ts/redis/client';
import { useAuth } from '@/components/providers/AuthProvider';

/**
 * MCP Store Provider
 * Initializes the Zustand store with data on mount
 * Validates persisted connections and fetches user servers
 */
export function McpStoreProvider({ children }: { children: React.ReactNode }) {
  const fetchUserServers = useMcpStore((state: McpStore) => state.fetchUserServers);

  const { userSession } = useAuth();
  const userId = userSession?.user?.id;

  // Initialize MCP Hook globally
  const {
    connections,
    connect,
    disconnect,
    callTool
  } = useMcp({
    url: '/api/mcp/sse',
    identity: userId || 'anonymous',
    autoConnect: true
  });

  const syncConnections = useMcpStore(state => state.syncConnections);
  const setMcpActions = useMcpStore(state => state.setMcpActions);

  // Sync actions to store once (or when they change)
  useEffect(() => {
    setMcpActions({ connect, disconnect, callTool });
  }, [connect, disconnect, callTool, setMcpActions]);

  // Sync state to store whenever connections change
  useEffect(() => {
    syncConnections(connections as any);
  }, [connections, syncConnections]);

  useEffect(() => {
    // On mount: fetch user servers
    const initializeConnections = async () => {
      // Fetch user servers
      await fetchUserServers();
    };

    initializeConnections();
  }, [fetchUserServers]);

  return <>{children}</>;
}
