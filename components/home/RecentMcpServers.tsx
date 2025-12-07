"use client";

import Link from "next/link";
import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { McpServer, ParsedRegistryServer } from "@/types/mcp";
import { RECENT_MCP_SERVERS_QUERY } from "@/lib/graphql";
import { ServerIcon } from "@/components/common/ServerIcon";
import { useRegistryRecentServers } from "@/hooks/useRegistryRecentServers";
import { RegistryServerCard } from "@/components/registry/RegistryServerCard";

// GraphQL query for recent MCP servers - imported from lib/graphql.ts
const GET_RECENT_SERVERS = gql`${RECENT_MCP_SERVERS_QUERY}`;

function ServerItemSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

function ServerCard({ server }: { server: McpServer }) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (server.url) {
      navigator.clipboard.writeText(server.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group flex flex-col gap-3 p-4 rounded-lg transition-all duration-300">
      {/* Icon and Transport Badge Row */}
      <div className="flex items-center justify-between">
        <ServerIcon
          serverName={server.name}
          serverUrl={server.url}
          size={40}
        />
        {/* Transport Badge - Right Side */}
        <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md font-normal">
          {server.transport}
        </Badge>
      </div>

      {/* Server Info */}
      <div className="space-y-2">
        {/* Title */}
        <h3 className="font-medium text-sm text-foreground/90 group-hover:text-primary transition-colors">
          {server.name}
        </h3>

        {/* Description with Markdown */}
        {server.description && (
          <div className="text-xs text-muted-foreground line-clamp-2 prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-p:inline prose-strong:text-foreground prose-em:text-muted-foreground">
            <ReactMarkdown>
              {server.description}
            </ReactMarkdown>
          </div>
        )}

        {/* URL with Copy Button */}
        {server.url && (
          <button
            onClick={handleCopyUrl}
            title={server.url}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group/url cursor-pointer w-full min-w-0"
          >
            <span className="truncate min-w-0">{server.url}</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 flex-shrink-0 opacity-0 group-hover/url:opacity-100 transition-opacity" />
            )}
          </button>
        )}

        {/* Created At */}
        {server.createdAt && (
          <p className="text-xs text-muted-foreground">
            {new Date(server.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}

export default function RecentMcpServers() {
  // Registry Data
  const { servers: registryServers, loading: registryLoading } = useRegistryRecentServers(12);

  // Local Data (Apollo)
  const { loading: localLoading, error: localError, data: localData } = useQuery<{
    mcpServers: {
      edges: Array<{ node: McpServer }>;
    };
  }>(GET_RECENT_SERVERS, {
    variables: {
      first: 8,
      order: { createdAt: "DESC" }, // Order by creation date descending (newest first)
    },
    fetchPolicy: "cache-and-network", // Always fetch fresh data while showing cached
  });

  // Extract nodes from edges structure
  const edges = localData?.mcpServers?.edges || [];
  const localServers: McpServer[] = edges.map((edge: { node: McpServer }) => edge.node);

  return (
    <div className="w-full space-y-12">
      {/* Registry Section */}
      {(registryLoading || registryServers.length > 0) && (
        <section>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl md:text-2xl font-bold">Latest Registry Updates</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Explore the newest additions and updates from the official MCP registry.
            </p>
          </div>

          {registryLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ServerItemSkeleton />
              <ServerItemSkeleton />
              <ServerItemSkeleton />
              <ServerItemSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {registryServers.map((server) => (
                <RegistryServerCard
                  key={server.id}
                  server={server}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Local Section */}
      {!localError && (localLoading || localServers.length > 0) && (
        <section>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl md:text-2xl font-bold">Recently Added to MCP Assistant</h2>
              <Link
                href="/mcp"
                className="hidden md:flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors group"
              >
                View All <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover the latest MCP servers you can access and test in Playground.
            </p>
          </div>

          {localLoading && localServers.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ServerItemSkeleton />
              <ServerItemSkeleton />
              <ServerItemSkeleton />
              <ServerItemSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {localServers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          )}

          <div className="md:hidden mt-6 text-center">
            <Link
              href="/mcp"
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View All Servers <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
