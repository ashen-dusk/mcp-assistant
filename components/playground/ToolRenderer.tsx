"use client";

import {
  useRenderToolCall,
  type ActionRenderPropsNoArgs,
} from "@copilotkit/react-core";
import type React from "react";
import MCPToolCall from "./MCPToolCall";
import { MessageToA2A } from "./a2a/MessageToA2A";
import { MessageFromA2A } from "./a2a/MessageFromA2A";

type RenderProps = ActionRenderPropsNoArgs<[]> & { name?: string };

interface ToolRendererProps {
  a2aAgents?: Array<{
    name: string;
    description: string;
    url: string;
  }> | null;
}

const defaultRender: React.ComponentType<RenderProps> = (props: RenderProps) => {
  const { name = "", status, args, result } = props;
  const toolStatus = (status === "complete" || status === "inProgress" || status === "executing")
    ? status
    : "executing";
  return <MCPToolCall status={toolStatus} name={name} args={args} result={result} />;
};

export function ToolRenderer({ a2aAgents }: ToolRendererProps) {
  // Check if A2A agents are configured
  const hasA2AAgents = a2aAgents && a2aAgents.length > 0;
  console.log("hasA2AAgents", hasA2AAgents);
  console.log("a2aAgents", a2aAgents);
  if (hasA2AAgents) {
    // Render A2A agent communication messages
    useRenderToolCall({
      name: "send_message_to_a2a_agent",
      render: ({ status, args }) => {
        return (
          <>
            <MessageToA2A status={status} args={args} />
            <MessageFromA2A status={status} args={args} />
          </>
        );
      },
    });
  } else {
    // Render default MCP tool calls
    useRenderToolCall({
      name: "*",
      render: defaultRender as (props: ActionRenderPropsNoArgs<[]>) => React.ReactElement,
    });
  }

  return null;
}
