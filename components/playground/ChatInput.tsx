"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  StopCircle,
} from "lucide-react";

interface CustomChatInputProps {
  onSendMessage: (message: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
}

export default function ChatInput({
  onSendMessage,
  onStop,
  isGenerating = false
}: CustomChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isGenerating) return;

    onSendMessage(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            disabled={isGenerating}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{
              minHeight: "40px",
              maxHeight: "128px",
            }}
          />

          {isGenerating ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleStop}
              className="h-9 w-9 rounded-full shrink-0"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim()}
              className="h-9 w-9 rounded-full shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-30"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
