'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ServerIcon } from '../common/ServerIcon';
import { useMcpStore } from '@/lib/stores/mcp-store';

interface MCPConnectionApprovalProps {
  serverName: string;
  serverUrl: string;
  serverId: string;
  transportType: string;
  approvalId: string;
  onApprove: (data: any) => void;
  onDeny: () => void;
}

/**
 * Get user-friendly status message for connection phase
 */


export function MCPConnectionApproval({
  serverName,
  serverUrl,
  serverId,
  transportType,
  approvalId,
  onApprove,
  onDeny,
}: MCPConnectionApprovalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Use the global store for connections
  const connectServer = useMcpStore(state => state.connect);
  const disconnectServer = useMcpStore(state => state.disconnect);
  const connections = useMcpStore(state => state.connections);
  const activeConnections = useMcpStore(state => state.activeConnectionCount);
  const getConnectionByServerId = useMcpStore(state => state.getConnectionByServerId);

  // Check if we already have a connection for this server
  const existingConnection = getConnectionByServerId(serverId);
  const isConnected = existingConnection?.connectionStatus === 'CONNECTED';
  const isConnecting = existingConnection?.connectionStatus === 'CONNECTING' || existingConnection?.connectionStatus === 'VALIDATING';

  // Watch for successful connection
  const [hasTriggeredApprove, setHasTriggeredApprove] = useState(false);

  if (isConnected && !hasTriggeredApprove) {
    setHasTriggeredApprove(true);
    onApprove({ sessionId: existingConnection!.sessionId });
  }

  const handleConnect = async () => {
    try {
      await connectServer({
        id: serverId,
        name: serverName,
        url: serverUrl,
        transport: transportType,
      } as any); // Cast to McpServer type as needed
    } catch (error) {
      console.error('[MCPConnectionApproval] Connection failed:', error);
      onDeny();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg shadow-sm animate-in fade-in slide-in-from-bottom-2 max-w-2xl">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ServerIcon
          serverName={serverName}
          serverUrl={serverUrl}
          size={40}
          className="rounded-lg flex-shrink-0"
        />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-base font-semibold text-foreground truncate">
            {serverName}
          </span>
          <span className="text-xs text-muted-foreground truncate">{serverUrl}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="default"
          onClick={onDeny}
          variant="outline"
          disabled={isConnecting}
        >
          Deny
        </Button>
        <Button
          size="default"
          onClick={handleConnect}
          variant="default"
          className="cursor-pointer gap-2"
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <span className="text-sm">Connecting...</span>
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </div>
    </div>
  );
}
