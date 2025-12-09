"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExternalLink,
  Globe,
  Calendar,
  Info,
  Copy,
  Check,
  Play,
  Square,
  Loader2,
  Wrench,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ServerIcon } from "@/components/common/ServerIcon";
import type { ParsedRegistryServer, ToolInfo } from "@/types/mcp";
import { toast } from "react-hot-toast";
import { connectionStore } from "@/lib/mcp/connection-store";

interface ServerDetailProps {
  server: ParsedRegistryServer;
}

export function ServerDetail({ server }: ServerDetailProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const displayName = server.title || server.name;

  // Hydrate connection state from store
  useState(() => {
    const stored = connectionStore.get(server.name);
    if (stored && stored.connectionStatus === 'CONNECTED' && stored.sessionId) {
      setSessionId(stored.sessionId);
      setIsConnected(true);
      setTools(stored.tools || []);
    }
  });

  const handleCopyUrl = () => {
    if (server?.remoteUrl) {
      navigator.clipboard.writeText(server.remoteUrl);
      setCopiedUrl(true);
      toast.success("Remote URL copied to clipboard");
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleConnect = async () => {
    if (!server?.remoteUrl) {
      toast.error("No remote URL available for this server");
      return;
    }

    if (!server.transportType) {
      toast.error("Transport type not available for this server");
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const response = await fetch("/api/mcp/auth/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl: server.remoteUrl,
          callbackUrl: `${window.location.origin}/api/mcp/auth/callback`,
          serverName: server.title || server.name,
          transportType: server.transportType,
        }),
      });

      const result = await response.json();

      if (result.requiresAuth && result.authUrl) {
        toast.success("Redirecting to OAuth authorization...");
        window.location.href = result.authUrl;
        return;
      }

      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setIsConnected(true);

        let fetchedTools: ToolInfo[] = [];
        const toolsResponse = await fetch(`/api/mcp/tool/list?sessionId=${result.sessionId}`);
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          fetchedTools = toolsData.tools || [];
          setTools(fetchedTools);
        }

        toast.success("Connected successfully!");

        // Persist connection
        connectionStore.set(server.id, {
          sessionId: result.sessionId,
          connectionStatus: 'CONNECTED',
          tools: fetchedTools,
          transport: server.transportType,
          url: server.remoteUrl,
        });
      } else {
        throw new Error(result.error || "Failed to connect");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to connect";
      setConnectionError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch("/api/mcp/auth/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(null);
        setIsConnected(false);
        setTools([]);
        toast.success("Disconnected successfully");
        connectionStore.remove(server.id);
      } else {
        throw new Error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect");
    }
  };

  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="pb-8 border-b">
        <div className="flex items-start justify-between gap-8 flex-wrap mb-6">
          <div className="flex items-start gap-6 flex-1 min-w-0">
            <div className="shrink-0">
              <ServerIcon
                serverName={server.name}
                serverUrl={server.remoteUrl}
                size={56}
                className="rounded-xl shrink-0"
                fallbackImage={server.iconUrl || undefined}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {server.hasRemote && (
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                )}
                <h1 className="text-3xl font-bold">{displayName}</h1>
              </div>

              <div className="flex items-center gap-2.5 text-muted-foreground mb-4 flex-wrap">
                <span className="text-base">{server.vendor}</span>
                <span className="text-xs">•</span>
                <Badge variant="secondary" className="font-mono text-xs">
                  v{server.version}
                </Badge>
                {server.isLatest && (
                  <>
                    <span className="text-xs">•</span>
                    <Badge variant="default" className="text-xs">Latest</Badge>
                  </>
                )}
              </div>

              {isConnected && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              )}
            </div>
          </div>

          {server.hasRemote && (
            <div className="shrink-0">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  size="lg"
                  className="gap-2 min-w-[140px] cursor-pointer"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      Connect
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  size="lg"
                  className="gap-2 min-w-[140px] cursor-pointer"
                >
                  <Square className="h-4 w-4 fill-current" />
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-10">
        {connectionError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        {isConnected && tools.length > 0 && (
          <div className="pb-10 border-b">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2.5">
              <Wrench className="h-5 w-5 text-primary" />
              Available Tools ({tools.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tools.map((tool, index) => (
                <div
                  key={index}
                  className="p-4 bg-accent/30 hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <h3 className="font-semibold text-sm mb-1.5">{tool.name}</h3>
                  {tool.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tool.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {server.description && (
          <div className="pb-10 border-b">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2.5">
              <Info className="h-5 w-5 text-primary" />
              About
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {server.description}
            </p>
          </div>
        )}

        {server.hasRemote && server.remoteUrl && (
          <div className="pb-10 border-b">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2.5">
              <Globe className="h-5 w-5 text-primary" />
              Remote Endpoint
            </h2>
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm font-mono break-all flex-1">
                  {server.remoteUrl}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyUrl}
                  className="shrink-0"
                >
                  {copiedUrl ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This server is accessible via remote HTTP endpoint
            </p>
          </div>
        )}

        {server.hasPackage && (
          <div className="pb-10 border-b">
            <h2 className="text-xl font-semibold mb-2">
              Package Available
            </h2>
            <p className="text-muted-foreground">
              This server includes installable packages
            </p>
          </div>
        )}

        <div className="pb-10 border-b">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-primary" />
            Metadata
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Published
              </label>
              <p className="mt-2 text-foreground">
                {new Date(server.publishedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Updated
              </label>
              <p className="mt-2 text-foreground">
                {new Date(server.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Server ID
              </label>
              <p className="mt-2 font-mono text-sm break-all text-foreground/80">
                {server.id}
              </p>
            </div>
          </div>
        </div>

        {(server.websiteUrl || server.repositoryUrl) && (
          <div>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2.5">
              <ExternalLink className="h-5 w-5 text-primary" />
              External Links
            </h2>
            <div className="flex gap-4 flex-wrap">
              {server.websiteUrl && (
                <Button variant="outline" asChild size="lg">
                  <a
                    href={server.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Website
                  </a>
                </Button>
              )}
              {server.repositoryUrl && (
                <Button variant="outline" asChild size="lg">
                  <a
                    href={server.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Source Code
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
