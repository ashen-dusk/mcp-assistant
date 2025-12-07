/**
 * A2A Agent Types
 */

import { ActionRenderProps } from "@copilotkit/react-core";
export type MessageActionRenderProps = ActionRenderProps<
  [
    {
      readonly name: "agentName";
      readonly type: "string";
      readonly description: "The name of the A2A agent to send the message to";
    },
    {
      readonly name: "task";
      readonly type: "string";
      readonly description: "The message to send to the A2A agent";
    }
  ]
>;

export interface A2AValidationResult {
  success: boolean;
  name?: string;
  description?: string;
  capabilities?: string[];
  skills?: string[];
  agentCard?: A2AAgentCard;
  error?: string;
}

export interface A2AAgentCard {
  name: string;
  description?: string;
  capabilities?: string[];
  skills?: string[];
  version?: string;
  api_version?: string;
  [key: string]: any; // Allow additional fields
}

export interface A2AAgent {
  name: string;
  a2a_url: string;
  skills?: string[];
  description?: string;
  agent_card?: A2AAgentCard;
}