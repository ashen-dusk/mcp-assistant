"use client";

import { PlaygroundProvider } from "@/components/providers/PlaygroundProvider";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useLangGraphRuntime } from "@assistant-ui/react-langgraph";
import type { PropsWithChildren } from "react";
import { DevToolsModal } from "@assistant-ui/react-devtools";
import { createThread, getThreadState, sendMessage } from "@/lib/chatApi";

function PlaygroundAppLayoutInner({ children }: PropsWithChildren) {
  const runtime = useLangGraphRuntime({
    stream: async (messages, { initialize, command, runConfig }) => {
      // initialize() returns { remoteId, externalId }
      // For new threads: create is called first, then initialize uses that
      // For existing threads: initialize returns the existing externalId
      const { externalId } = await initialize();

      if (!externalId) {
        throw new Error("Thread not found");
      }

      return sendMessage({
        threadId: externalId,
        messages,
        config: { command, runConfig },
      });
    },
    create: async () => {
      const result = await createThread();
      return { externalId: result.thread_id };
    },
    load: async (externalId) => {
      const state = await getThreadState(externalId);
      return {
        messages: state.values.messages,
        interrupts: state.tasks?.[0]?.interrupts,
      };
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
    <DevToolsModal />
      <PlaygroundProvider>
        <div className="flex h-screen bg-background text-foreground">
          <PlaygroundSidebar />
          <main className="flex-1 flex flex-col relative overflow-hidden">
            {children}
          </main>
        </div>
      </PlaygroundProvider>
    </AssistantRuntimeProvider>
  );
}

export default function PlaygroundAppLayout({ children }: PropsWithChildren) {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <PlaygroundAppLayoutInner>{children}</PlaygroundAppLayoutInner>
    </div>
  );
}
