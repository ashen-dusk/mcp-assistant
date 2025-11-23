"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
} from "lucide-react";
import { PushToTalkState } from "@/hooks/usePushToTalk";
import { useCoAgent } from "@copilotkit/react-core";
import { AgentState, Assistant } from "@/types/mcp";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import { toast } from "react-hot-toast";
import AssistantDropdown from "./AssistantDropdown";
import ModelDropdown from "./ModelDropdown";
import MCPToolsDropdown, { MCPToolSelection } from "./MCPToolsDropdown";
import MicrophoneButton from "./MicrophoneButton";
import AuthDialog from "./dialogs/AuthDialog";
import AssistantCreateDialog from "./dialogs/AssistantCreateDialog";
import AssistantEditDialog, { AssistantFormData } from "./dialogs/AssistantEditDialog";
import AssistantDeleteDialog from "./dialogs/AssistantDeleteDialog";
import { AVAILABLE_MODELS } from "./availableModels";

interface CustomChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  pushToTalkState?: PushToTalkState;
  onPushToTalkStateChange?: (state: PushToTalkState) => void;
}

export default function ChatInput({
  onSendMessage,
  pushToTalkState = "idle",
  onPushToTalkStateChange
}: CustomChatInputProps) {

  // Generate sessionId for authenticated or anonymous users (browser only)
  const { data: session } = useSession();
  const getSessionId = (session: Session | null) => {
    if (typeof window === "undefined") return undefined;

    const sessionId = localStorage.getItem("copilotkit-session");

    if (session?.user?.email) {
    // Authenticated user
    const email = session.user.email;
    const derivedId = email.endsWith("@gmail.com")
      ? email.replace(/@gmail\.com$/, "")
      : email;
    localStorage.setItem("copilotkit-session", derivedId);
    return derivedId;

  } else {
    // Anonymous user
    if (!sessionId) {
      const randomId = crypto.randomUUID();
      localStorage.setItem("copilotkit-session", randomId);
      return randomId;
    }
    return sessionId;
  }
  };

  // Fetch assistants from context
  const { assistants, activeAssistant, setActiveAssistant, createAssistant, updateAssistant, deleteAssistant, loading } = usePlayground();

  // Separate state for model - independent of coagent state
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");

  // MCP tool selection state
  const [toolSelection, setToolSelection] = useState<MCPToolSelection>({
    selectedServers: [],
    selectedTools: [],
    mcpConfig: {},
  });

  const { state, setState } = useCoAgent<AgentState>({
    name: "mcpAssistant",
    initialState: {
      model: selectedModel,
      status: undefined,
      sessionId: getSessionId(session),
      assistant: activeAssistant,
      mcp_config: toolSelection.mcpConfig,
      selectedTools: toolSelection.selectedTools,
    },
  });

  // Update coagent state when active assistant changes
  useEffect(() => {
    if (activeAssistant !== state.assistant) {
      setState({ ...state, assistant: activeAssistant });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssistant, setState]);

  // console.log("Agent State:", state);

  const [message, setMessage] = useState("");
  const [dropdownState, setDropdownState] = useState<"model" | "assistant" | "mcp" | null>(null);
  const [dialogState, setDialogState] = useState<"auth" | "create" | "edit" | "delete" | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [deletingAssistant, setDeletingAssistant] = useState<Assistant | null>(null);
  const [assistantFormData, setAssistantFormData] = useState({
    name: "",
    description: "",
    instructions: "",
    config: {
      ask_mode: false,
      max_tokens: 2000,
      temperature: 0.7,
      datetime_context: true,
    }
  });

  const handleModelChange = (modelId: string) => {
    // Update local state
    setSelectedModel(modelId);
    // Push to coagent state
    setState({...state, model: modelId});
    setDropdownState(null);
  };

  const handleAssistantChange = async (assistantId: string) => {
    setIsBusy(true);
    try {
      await setActiveAssistant(assistantId);
      setDropdownState(null);
    } catch (error) {
      console.error("Failed to set active assistant:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolSelectionChange = (newSelection: MCPToolSelection) => {
    setToolSelection(newSelection);
    // Update coagent state with new MCP config and selected tools
    setState({
      ...state,
      mcp_config: newSelection.mcpConfig,
      selectedTools: newSelection.selectedTools,
    });
  };

  const handleCreateAssistant = async () => {
    if (!assistantFormData.name.trim() || !assistantFormData.instructions.trim()) {
      toast.error("Name and instructions are required");
      return;
    }
    setIsBusy(true);
    try {
      await createAssistant({
        name: assistantFormData.name,
        instructions: assistantFormData.instructions,
        description: assistantFormData.description || undefined,
        isActive: true, // Make new assistant active by default
        config: assistantFormData.config,
      });
      setDialogState(null);
      setAssistantFormData({
        name: "",
        description: "",
        instructions: "",
        config: {
          ask_mode: false,
          max_tokens: 2000,
          temperature: 0.7,
          datetime_context: true,
        }
      });
    } catch (error) {
      console.error("Failed to create assistant:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleEditClick = (assistant: Assistant, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the assistant
    setEditingAssistant(assistant);
    setAssistantFormData({
      name: assistant.name,
      description: assistant.description || "",
      instructions: assistant.instructions,
      config: assistant.config || {
        ask_mode: false,
        max_tokens: 2000,
        temperature: 0.7,
        datetime_context: true,
      }
    });
    setDropdownState(null);
    setDialogState("edit");
  };

  const handleUpdateAssistant = async () => {
    if (!editingAssistant) return;
    if (!assistantFormData.name.trim() || !assistantFormData.instructions.trim()) {
      toast.error("Name and instructions are required");
      return;
    }
    setIsBusy(true);
    try {
      await updateAssistant(editingAssistant.id, {
        name: assistantFormData.name,
        instructions: assistantFormData.instructions,
        description: assistantFormData.description || undefined,
        config: assistantFormData.config,
      });
      setDialogState(null);
      setEditingAssistant(null);
      setAssistantFormData({
        name: "",
        description: "",
        instructions: "",
        config: {
          ask_mode: false,
          max_tokens: 2000,
          temperature: 0.7,
          datetime_context: true,
        }
      });
    } catch (error) {
      console.error("Failed to update assistant:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteClick = (assistant: Assistant, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the assistant
    setDeletingAssistant(assistant);
    setDropdownState(null);
    setDialogState("delete");
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssistant) return;
    setIsBusy(true);
    try {
      await deleteAssistant(deletingAssistant.id);
      setDialogState(null);
      setDeletingAssistant(null);
    } catch (error) {
      console.error("Failed to delete assistant:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendMessage = () => {
    if (!session) {
      setDialogState("auth");
      return;
    }

    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <AuthDialog open={dialogState === "auth"} onOpenChange={v => setDialogState(v ? "auth" : null)} />
      <AssistantCreateDialog
        open={dialogState === "create"}
        onOpenChange={v => setDialogState(v ? "create" : null)}
        formData={assistantFormData}
        setFormData={setAssistantFormData}
        onCreate={handleCreateAssistant}
        loading={isBusy}
        handleCancel={() => {
          setDialogState(null);
          setAssistantFormData({ name: '', description: '', instructions: '', config: { ask_mode: false, max_tokens: 2000, temperature: 0.7, datetime_context: true } });
        }}
      />
      <AssistantEditDialog
        open={dialogState === "edit"}
        onOpenChange={v => setDialogState(v ? "edit" : null)}
        formData={assistantFormData}
        setFormData={setAssistantFormData}
        onUpdate={handleUpdateAssistant}
        loading={isBusy}
        handleCancel={() => {
          setDialogState(null);
          setEditingAssistant(null);
          setAssistantFormData({ name: '', description: '', instructions: '', config: { ask_mode: false, max_tokens: 2000, temperature: 0.7, datetime_context: true } });
        }}
      />
      <AssistantDeleteDialog
        open={dialogState === "delete"}
        onOpenChange={v => setDialogState(v ? "delete" : null)}
        assistant={deletingAssistant}
        loading={isBusy}
        onDelete={handleConfirmDelete}
        onCancel={() => { setDialogState(null); setDeletingAssistant(null); }}
      />

      <div className="w-full px-2 sm:px-4">
        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-400 dark:border-zinc-700 shadow-xl hover:border-gray-500 dark:hover:border-zinc-600 transition-colors">
        <div className="flex items-end p-2 sm:p-4">
          {/* Message Input Area */}
          <div className="flex-1 mr-1.5 sm:mr-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your prompt..."
              className="w-full resize-none bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-[15px] leading-relaxed"
              rows={1}
              style={{
                minHeight: '60px',
                maxHeight: '120px',
                overflowY: message.split('\n').length > 3 ? 'auto' : 'hidden'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>

          {/* Assistant Selection Dropdown */}
          {session && (
            <AssistantDropdown
              session={session}
              assistants={assistants || []}
              activeAssistant={activeAssistant}
              isBusy={isBusy}
              loading={loading}
              showAssistantDropdown={dropdownState === "assistant"}
              setShowAssistantDropdown={(open) => setDropdownState(open ? "assistant" : null)}
              handleAssistantChange={handleAssistantChange}
              handleEditClick={handleEditClick}
              handleDeleteClick={handleDeleteClick}
              handleCreateAssistantClick={() => setDialogState("create")}
            />
          )}

          {/* MCP Tools Selection Dropdown */}
          <MCPToolsDropdown
            selection={toolSelection}
            onSelectionChange={handleToolSelectionChange}
            showDropdown={dropdownState === "mcp"}
            setShowDropdown={(open) => setDropdownState(open ? "mcp" : null)}
          />

          {/* Model Selection Dropdown */}
          <ModelDropdown
            selectedModel={selectedModel}
            setShowModelDropdown={(open) => setDropdownState(open ? "model" : null)}
            showModelDropdown={dropdownState === "model"}
            AVAILABLE_MODELS={AVAILABLE_MODELS}
            handleModelChange={handleModelChange}
          />

          {/* Microphone Button */}
          {onPushToTalkStateChange && (
            <MicrophoneButton
              pushToTalkState={pushToTalkState as string}
              onPushToTalkStateChange={typeof onPushToTalkStateChange === 'function' ? ((s) => onPushToTalkStateChange(s as PushToTalkState)) : undefined}
              session={session}
              disabled={isBusy}
              setShowAuthDialog={() => setDialogState("auth")}
            />
          )}

          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black disabled:bg-gray-300 dark:disabled:bg-zinc-700 disabled:opacity-50
                     text-white rounded-lg p-1.5 sm:p-2 h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center
                     transition-all duration-200 shadow-lg cursor-pointer disabled:cursor-not-allowed"
          >
              <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>
      </div>
    </>
  );
}