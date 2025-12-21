import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const serviceAdapter = new EmptyAdapter();

export const POST = async (req: NextRequest) => {
  const session = await getServerSession(authOptions);

  const mcpAssistant = new HttpAgent({
    url: process.env.NEXT_PUBLIC_BACKEND_URL + "/api/langgraph-agent" || "http://localhost:8000/api/langgraph-agent",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.googleIdToken}`,
    },
  });

  const runtime = new CopilotRuntime({
    agents: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mcpAssistant: mcpAssistant as any,
    },
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  const response = await handleRequest(req);
  return response;
};