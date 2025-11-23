"use client";

import { ChevronDown, Boxes, CheckCircle, Circle, Server } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useMcpTools, McpServerWithTools } from "@/hooks/useMcpTools";
import { ToolInfo, McpConfig } from "@/types/mcp";

export interface MCPToolSelection {
  selectedServers: string[]; // Array of selected server names
  selectedTools: string[]; // Array of selected tool names
  mcpConfig: McpConfig; // Config dict for MultiServerMCPClient
}

export interface MCPToolsDropdownProps {
  selection: MCPToolSelection;
  onSelectionChange: (selection: MCPToolSelection) => void;
  showDropdown: boolean;
  setShowDropdown: (open: boolean) => void;
}

const MCPToolsDropdown: React.FC<MCPToolsDropdownProps> = ({
  selection,
  onSelectionChange,
  showDropdown,
  setShowDropdown
}) => {
  const { mcpServers, loading } = useMcpTools();

  // Local state for checkboxes (synced with parent)
  const [localSelection, setLocalSelection] = useState<MCPToolSelection>(selection);

  // Sync local state with parent when selection changes externally
  useEffect(() => {
    setLocalSelection(selection);
  }, [selection]);

  // Build MCP config dict from selected servers
  const buildMcpConfig = (selectedServerNames: string[]): McpConfig => {
    const config: McpConfig = {};

    mcpServers
      .filter(server => selectedServerNames.includes(server.serverName))
      .forEach(server => {
        config[server.serverName] = {
          transport: server.transport || 'sse',
          url: server.url || '',
          ...(server.headers && { headers: server.headers }),
        };
      });

    return config;
  };

  // Get all tool names from selected servers
  const getToolsFromServers = (selectedServerNames: string[]): string[] => {
    return mcpServers
      .filter(s => selectedServerNames.includes(s.serverName))
      .flatMap(s => s.tools.map(t => t.name));
  };

  // Count selected servers and tools
  const selectedCount = localSelection.selectedServers.length;
  const totalServerCount = mcpServers.length;
  const selectedToolsCount = localSelection.selectedTools.length;

  // Handle server selection toggle
  const toggleServer = (serverName: string) => {
    const isSelected = localSelection.selectedServers.includes(serverName);

    const newSelectedServers = isSelected
      ? localSelection.selectedServers.filter(s => s !== serverName)
      : [...localSelection.selectedServers, serverName];

    const newSelection = {
      selectedServers: newSelectedServers,
      selectedTools: getToolsFromServers(newSelectedServers),
      mcpConfig: buildMcpConfig(newSelectedServers),
    };

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  // Select all servers
  const selectAll = () => {
    const allServerNames = mcpServers.map(server => server.serverName);

    const newSelection = {
      selectedServers: allServerNames,
      selectedTools: getToolsFromServers(allServerNames),
      mcpConfig: buildMcpConfig(allServerNames),
    };

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  // Deselect all servers
  const deselectAll = () => {
    const newSelection = {
      selectedServers: [],
      selectedTools: [],
      mcpConfig: {},
    };

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
  };

  return (
    <div className="relative mr-1 sm:mr-2">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700/50 rounded transition-all duration-200"
        title={`${selectedCount} of ${totalServerCount} servers selected (${selectedToolsCount} tools)`}
      >
        <Boxes className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-700 dark:text-gray-300" />
        <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">
          {selectedCount}/{totalServerCount}
        </span>
        <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div className="absolute bottom-full mb-2 right-0 md:right-0 left-0 md:left-auto bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-700/50 rounded-2xl shadow-2xl backdrop-blur-xl z-50 w-full md:min-w-[380px] md:max-w-[450px] max-h-[60vh] overflow-hidden">

            {/* Header with Select All / Deselect All */}
            <div className="px-4 py-3 border-b border-gray-200/80 dark:border-zinc-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-semibold text-gray-900 dark:text-white">
                  MCP Tools
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAll}
                  className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAll}
                  className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* MCP Servers and Tools List */}
            <div className="overflow-y-auto max-h-[50vh] scrollbar-minimal">
              {loading ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Loading MCP servers...
                </div>
              ) : mcpServers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No active MCP servers connected.
                  <br />
                  <span className="text-xs">Connect servers from the MCP page first.</span>
                </div>
              ) : (
                <div className="p-2">
                  {mcpServers.map((server) => {
                    const isServerSelected = localSelection.selectedServers.includes(server.serverName);

                    return (
                      <div key={server.serverName} className="mb-2 last:mb-0">
                        {/* Server Card */}
                        <button
                          onClick={() => toggleServer(server.serverName)}
                          className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-all border ${
                            isServerSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-gray-200 dark:border-zinc-700'
                          }`}
                        >
                          {/* Checkbox */}
                          {isServerSelected ? (
                            <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400 dark:text-gray-600 mt-0.5 flex-shrink-0" />
                          )}

                          {/* Server Info */}
                          <div className="flex-1 text-left min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Server className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {server.serverName}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-400">
                              {server.tools.length} tool{server.tools.length !== 1 ? 's' : ''} • {server.transport || 'unknown transport'}
                            </div>
                            {/* Tool preview */}
                            {server.tools.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {server.tools.slice(0, 3).map(tool => (
                                  <span
                                    key={tool.name}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400"
                                  >
                                    {tool.name}
                                  </span>
                                ))}
                                {server.tools.length > 3 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] text-gray-500 dark:text-gray-500">
                                    +{server.tools.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer with summary */}
            {mcpServers.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200/80 dark:border-zinc-700/50 bg-gray-50 dark:bg-zinc-800/50">
                <div className="text-[10px] text-gray-600 dark:text-gray-400">
                  {selectedCount} of {totalServerCount} servers selected ({selectedToolsCount} tools available)
                </div>
              </div>
            )}
          </div>

          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        </>
      )}
    </div>
  );
};

export default MCPToolsDropdown;
