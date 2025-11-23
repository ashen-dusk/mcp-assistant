"use client";

import { useState, useEffect } from 'react';
import { connectionStore, StoredConnection } from '@/lib/mcp/connection-store';
import { ToolInfo, McpServerConfig } from '@/types/mcp';

export interface McpServerWithTools {
  serverName: string;
  sessionId: string;
  connectionStatus: string;
  tools: ToolInfo[];
  connectedAt: string;
  // Server config fields for backend
  transport?: string;
  url?: string;
  headers?: Record<string, string> | null;
}

export interface UseMcpToolsReturn {
  mcpServers: McpServerWithTools[];
  loading: boolean;
  refresh: () => void;
}

/**
 * Hook to get all active MCP servers and their tools from connection store
 */
export function useMcpTools(): UseMcpToolsReturn {
  const [mcpServers, setMcpServers] = useState<McpServerWithTools[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMcpServers = async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      // First, validate all stored connections and clean up expired ones
      const validServerNames = await connectionStore.getValidConnections();

      if (validServerNames.length === 0) {
        setMcpServers([]);
        setLoading(false);
        return;
      }

      // Get all connections again (after cleanup)
      const connections = connectionStore.getAll();

      // Filter connected servers that are also valid
      const connectedServers = Object.entries(connections)
        .filter(([serverName, connection]) =>
          connection.connectionStatus === 'CONNECTED' &&
          validServerNames.includes(serverName)
        );

      if (connectedServers.length === 0) {
        setMcpServers([]);
        setLoading(false);
        return;
      }

      // Fetch server metadata from GraphQL to get transport, url, headers
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query {
              mcpServers(first: 100) {
                edges {
                  node {
                    name
                    transport
                    url
                  }
                }
              }
            }
          `,
        }),
      });

      const result = await response.json();
      const serverMetadata = result?.data?.mcpServers?.edges?.map((e: any) => e.node) || [];

      // Create a map for quick lookup
      const metadataMap = new Map(serverMetadata.map((s: any) => [s.name, s]));

      // Merge connection data with server metadata
      const servers: McpServerWithTools[] = connectedServers.map(([serverName, connection]) => {
        const metadata = metadataMap.get(serverName);
        return {
          serverName,
          sessionId: connection.sessionId,
          connectionStatus: connection.connectionStatus,
          tools: connection.tools || [],
          connectedAt: connection.connectedAt,
          transport: metadata?.transport,
          url: metadata?.url,
          headers: null, // TODO: Get headers from server metadata if needed
        };
      });

      setMcpServers(servers);
    } catch (error) {
      console.error('[useMcpTools] Failed to load MCP servers:', error);
      setMcpServers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMcpServers();

    // Refresh every 5 seconds to catch connection changes
    const interval = setInterval(loadMcpServers, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    mcpServers,
    loading,
    refresh: loadMcpServers,
  };
}
