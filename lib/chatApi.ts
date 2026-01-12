import { Client } from "@langchain/langgraph-sdk";
import {
  LangChainMessage,
  LangGraphSendMessageConfig,
} from "@assistant-ui/react-langgraph";
import { getMcpServerConfig } from "./mcp";
import { createClient as supabaseClient } from "@/lib/supabase/server";

const createLangGraphClient = () => {
  const apiUrl = new URL("/api", window.location.href).href;
  console.log("Creating LangGraph client with API URL:", apiUrl);

  return new Client({
    apiUrl,
  });
};

export const createThread = async () => {
  const client = createLangGraphClient();
  return client.threads.create();
};

export const getThreadState = async (
  threadId: string,
): Promise<{
  values: { messages: LangChainMessage[] };
  tasks: any[];
}> => {
  const client = createLangGraphClient();
  return client.threads.getState(threadId) as any;
};

export const sendMessage = async (params: {
  threadId: string;
  messages: LangChainMessage[];
  config?: LangGraphSendMessageConfig;
}) => {
  try {
    const client = createLangGraphClient();
    const supabase = await supabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        error: "Unauthorized - Please sign in",
        status: 401,
      };
    }

    const assistantId =
      process.env.NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID || "agent";

    const mcpConfig = getMcpServerConfig(session.user.id);

    return client.runs.stream(
      params.threadId,
      assistantId,
      {
        input: {
          messages: params.messages,
          model: "gpt-4o-mini",
          mcpConfig,
        },
        streamMode: "messages",
        ...params.config,
      },
    );
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Helper type for thread state
export type ThreadState<T = any> = {
  values: T;
  tasks: Array<{
    interrupts?: any[];
  }>;
};
