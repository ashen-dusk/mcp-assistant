"use client";

import { useState } from "react";
import { useLangGraphInterrupt, useCoAgentStateRender } from "@copilotkit/react-core";
import { Button } from "@/components/ui/button";
import MCPToolCall from "./MCPToolCall";
import { ServerIcon } from "@/components/common/ServerIcon";

interface ToolData {
  tool_args?: Record<string, unknown>;
  message?: string;
}

export default function HumanInTheLoop() {
  // Render tool call state using useCoAgentStateRender
  // This shows tool execution progress from agent state
  // useCoAgentStateRender({
  //   name: "mcpAssistant",
  //   render: ({ state }) => {
  //     const currentToolCall = state?.current_tool_call;

  //     if (!currentToolCall) return null;

  //     const status = currentToolCall.status === "complete"
  //       ? "complete"
  //       : currentToolCall.status === "executing"
  //       ? "inProgress"
  //       : "executing";

  //     return (
  //       <MCPToolCall
  //         status={status}
  //         name={currentToolCall.name}
  //         args={currentToolCall.args}
  //         result={currentToolCall.result}
  //       />
  //     );
  //   },
  // });

  // Human-in-the-Loop interrupt handler
  // useLangGraphInterrupt({
  //   enabled: ({ eventValue }: { eventValue?: { type?: string } }) =>
  //     eventValue?.type === "tool_approval_request",
  //   render: ({ event, resolve }) => {
  //     const toolData = (event?.value || {}) as ToolData;
  //     const toolArgs = toolData?.tool_args;
  //     const message = toolData?.message;

  //     return (
  //       <div className="flex items-start animate-in fade-in slide-in-from-bottom-2">
  //         <div className="flex flex-col text-sm max-w-[80%]">
  //           <p className="text-foreground mb-2 leading-snug">
  //             {message}
  //           </p>
  //           {toolArgs && Object.keys(toolArgs).length > 0 && (
  //             <div className="mb-2 text-xs text-muted-foreground">
  //               <pre className="bg-background/50 p-2 rounded border border-border overflow-auto max-h-32">
  //                 {JSON.stringify(toolArgs, null, 2)}
  //               </pre>
  //             </div>
  //           )}
  //           <div className="flex gap-2 justify-end">
  //             <Button
  //               size="sm"
  //               onClick={() => resolve?.(JSON.stringify({ approved: false, action: "CANCEL" }))}
  //               variant="outline"
  //               className="cursor-pointer"
  //             >
  //               Cancel
  //             </Button>
  //             <Button
  //               size="sm"
  //               onClick={() => resolve?.(JSON.stringify({ approved: true, action: "CONTINUE" }))}
  //               variant="default"
  //               className="cursor-pointer"
  //             >
  //               Continue
  //             </Button>
  //           </div>
  //         </div>
  //       </div>
  //     );
  //   },
  // });

  // Server connection interrupt handler for initiate_connection tool
  useLangGraphInterrupt({
    enabled: ({ eventValue }: { eventValue?: { type?: string; tool_name?: string } }) => {
      console.log("HumanInTheLoop - enabled check:", eventValue);
      return eventValue?.type === "tool_approval_request" && eventValue?.tool_name === "initiate_connection";
    },
    render: ({ event, resolve }) => {
      console.log("HumanInTheLoop - initiate_connection event:", event);
      const eventData = (event?.value || {}) as { tool_args?: { server_name?: string; server_url?: string; server_id?: string; transport_type?: string; } };
      const toolArgs = eventData.tool_args || {};
      const serverName = toolArgs.server_name || "Server";
      const serverUrl = toolArgs.server_url || "";
      const serverId = toolArgs.server_id || "";
      const transportType = toolArgs.transport_type || "";

      console.log("Extracted values:", { serverName, serverUrl, serverId, transportType });
      console.log("About to render UI component");

      const [isLoading, setIsLoading] = useState(false);

      const handleConnect = async () => {
        setIsLoading(true);
        try {
          // Make API call to initiate connection
          const response = await fetch('/api/mcp/auth/connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              serverName,
              serverUrl,
              serverId,
              callbackUrl: `${window.location.origin}/api/mcp/auth/callback`,
              sourceUrl: `${window.location.origin}/auth/callback/success`,
              transportType,
            }),
          });

          const data = await response.json();
          console.log("Connect API response:", data);

          // If response contains an auth URL, open popup window
          const authUrl = data.authUrl || data.url;
          if (authUrl) {
            console.log("Opening popup with URL:", authUrl);
            console.log("URL length:", authUrl.length);

            // Open popup window with specific dimensions
            const width = 600;
            const height = 700;
            const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
            const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

            try {
              const popup = window.open(
                authUrl,
                'oauth-popup',
                `width=${width},height=${height},left=${left},top=${top},popup=yes,toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes`
              );

              console.log("Popup object:", popup);

              // Check if popup opened successfully
              if (popup && !popup.closed) {
                console.log("Popup opened successfully");
                popup.focus();

                // Listen for postMessage from popup
                let popupCheckInterval: NodeJS.Timeout | null = null;

                const handleMessage = (event: MessageEvent) => {
                  // Verify the message is from our domain
                  if (event.origin !== window.location.origin) {
                    console.warn("Ignoring message from unknown origin:", event.origin);
                    return;
                  }

                  console.log("Received postMessage:", event.data);

                  if (event.data.type === "mcp-auth-success") {
                    console.log("Auth success, resolving promise");

                    // Clean up listeners and interval
                    if (popupCheckInterval) {
                      clearInterval(popupCheckInterval);
                    }
                    window.removeEventListener("message", handleMessage);
                    setIsLoading(false);

                    // Resolve with stringified JSON data (required by LangGraph)
                    const result = JSON.stringify({
                      approved: true,
                      action: "CONNECT",
                      connected: true,
                      sessionId: event.data.sessionId,
                      serverName: event.data.serverName,
                      serverId: event.data.serverId,
                      serverUrl: event.data.serverUrl
                    });
                    console.log("Resolving with:", result);
                    resolve?.(result);
                  } else if (event.data.type === "mcp-auth-error") {
                    console.error("Auth error:", event.data.error);

                    // Clean up listeners and interval
                    if (popupCheckInterval) {
                      clearInterval(popupCheckInterval);
                    }
                    window.removeEventListener("message", handleMessage);
                    setIsLoading(false);

                    resolve?.(JSON.stringify({
                      approved: false,
                      connected: false,
                      error: event.data.error
                    }));
                  }
                };

                window.addEventListener("message", handleMessage);

                // Also check for popup close (fallback)
                popupCheckInterval = setInterval(() => {
                  if (popup.closed) {
                    console.log("Popup closed without message");
                    clearInterval(popupCheckInterval!);
                    window.removeEventListener("message", handleMessage);
                    setIsLoading(false);
                    // Don't resolve here, let the user retry
                  }
                }, 500);
              } else {
                // Popup was blocked
                console.error("Popup was blocked by the browser");
                alert("Please allow popups for this site to connect your account. Check your browser's popup blocker settings.");
                setIsLoading(false);
              }
            } catch (popupError) {
              console.error("Error opening popup:", popupError);
              alert("Failed to open authentication window. Please check your browser settings.");
              setIsLoading(false);
            }
          } else {
            // No URL returned, resolve immediately
            console.log("No auth URL, resolving immediately");
            setIsLoading(false);
            resolve?.(JSON.stringify({ approved: true, connected: true }));
          }
        } catch (error) {
          console.error('Connection error:', error);
          setIsLoading(false);
          resolve?.(JSON.stringify({ approved: false, connected: false, error: String(error) }));
        }
      };

      return (
      //   <>
      // {JSON.stringify({serverName, serverUrl, serverId, transportType})}
      //   </>
        <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg shadow-sm animate-in fade-in slide-in-from-bottom-2 max-w-2xl">
          <div className="flex items-center gap-3">
            <ServerIcon
              serverName={serverName}
              serverUrl={serverUrl}
              size={40}
              className="rounded-lg"
            />
            <span className="text-base font-semibold text-foreground">
              {serverName}
            </span>
          </div>
          <Button
            size="default"
            onClick={handleConnect}
            variant="outline"
            className="cursor-pointer gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                Connecting...
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
              <>
                Connect Account
                <svg
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
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </>
            )}
          </Button>
        </div>
      );
    },
  });

  return null;
}
