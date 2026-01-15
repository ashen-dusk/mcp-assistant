"use client";

import { createContext, useContext, type PropsWithChildren } from "react";
import { Assistant } from "@/types/mcp";

// Minimal interface since assistants have been removed
export interface AssistantsState {
  assistants: Assistant[] | null;
  loading: boolean;
  error: string | null;
  activeAssistant: Assistant | null;
  refresh: () => Promise<void>;
  setActiveAssistant: (assistantId: string) => Promise<void>;
  createAssistant: (data: { name: string; instructions: string; assistantType?: string; description?: string; isActive?: boolean; config?: any }) => Promise<void>;
  updateAssistant: (id: string, data: { name?: string; assistantType?: string; instructions?: string; description?: string; isActive?: boolean; config?: any }) => Promise<void>;
  deleteAssistant: (id: string) => Promise<void>;
}

interface PlaygroundContextType extends AssistantsState {
  // Add any additional playground-specific state here if needed
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(
  undefined
);

// Stub implementation since assistants have been removed
const stubAssistantState: AssistantsState = {
  assistants: null,
  loading: false,
  error: null,
  activeAssistant: null,
  refresh: async () => {},
  setActiveAssistant: async () => {},
  createAssistant: async () => {},
  updateAssistant: async () => {},
  deleteAssistant: async () => {},
};

export function PlaygroundProvider({ children }: PropsWithChildren) {
  return (
    <PlaygroundContext.Provider value={stubAssistantState}>
      {children}
    </PlaygroundContext.Provider>
  );
}

export function usePlayground() {
  const context = useContext(PlaygroundContext);
  if (context === undefined) {
    throw new Error(
      "usePlayground must be used within a PlaygroundProvider"
    );
  }
  return context;
}
