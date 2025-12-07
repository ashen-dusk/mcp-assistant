"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Globe,
  Calendar,
  Info,
  Copy,
  Check,
} from "lucide-react";
import { ServerIcon } from "@/components/common/ServerIcon";
import type { ParsedRegistryServer } from "@/types/mcp";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface RegistryServerDetailsModalProps {
  server: ParsedRegistryServer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RegistryServerDetailsModal({
  server,
  isOpen,
  onClose,
}: RegistryServerDetailsModalProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = () => {
    if (server?.remoteUrl) {
      navigator.clipboard.writeText(server.remoteUrl);
      setCopiedUrl(true);
      toast.success("Remote URL copied to clipboard");
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  if (!server) return null;

  const displayName = server.title || server.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Server Icon */}
            <ServerIcon
              serverName={server.name}
              serverUrl={server.remoteUrl}
              size={64}
              className="rounded-xl"
              fallbackImage={server.iconUrl || undefined}
            />

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {server.hasRemote && (
                  <Globe className="h-5 w-5 text-primary shrink-0" />
                )}
                <DialogTitle className="text-2xl">
                  {displayName}
                </DialogTitle>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{server.vendor}</span>
                <span>•</span>
                <Badge variant="secondary" className="font-mono">
                  v{server.version}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          {server.description && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                About
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {server.description}
              </p>
            </div>
          )}

          {/* Remote URL */}
          {server.hasRemote && server.remoteUrl && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Remote Endpoint
                </h3>
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="flex items-center justify-between gap-3">
                    <code className="text-sm font-mono text-primary break-all">
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
                  </AlertDescription>
                </Alert>
                <p className="text-xs text-muted-foreground mt-2">
                  This server is accessible via remote HTTP endpoint
                </p>
              </div>
            </>
          )}

          {/* Package Info */}
          {server.hasPackage && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Package Available</h3>
                <p className="text-sm text-muted-foreground">
                  This server includes installable packages
                </p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div>
            <h3 className="font-semibold mb-3">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Published
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm">
                    {new Date(server.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Last Updated
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="text-sm">
                    {new Date(server.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Version Status
                </label>
                <p className="text-sm mt-1">
                  {server.isLatest ? (
                    <Badge variant="default" className="text-xs">
                      Latest
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Not Latest
                    </Badge>
                  )}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Server ID
                </label>
                <p className="text-sm mt-1 font-mono text-xs truncate">
                  {server.id}
                </p>
              </div>
            </div>
          </div>

          {/* Links */}
          {(server.websiteUrl || server.repositoryUrl) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Links</h3>
                <div className="space-y-2">
                  {server.websiteUrl && (
                    <Button
                      variant="outline"
                      asChild
                      className="w-full justify-start"
                    >
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
                    <Button
                      variant="outline"
                      asChild
                      className="w-full justify-start"
                    >
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
            </>
          )}
        </div>

        <Separator />

        <div className="p-6 pt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
