"use client";

import type { FC } from "react";
import { ComposerPrimitive, AssistantIf } from "@assistant-ui/react";
import { Button } from "@/components/ui/button";
import { ArrowUp, StopCircle } from "lucide-react";

export const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="w-full">
      <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-background p-2 shadow-sm focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <ComposerPrimitive.Input
          autoFocus
          placeholder="Type your message..."
          rows={1}
          maxRows={4}
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto"
        />

        {/* Cancel Button - Only shown when thread is running */}
        <AssistantIf condition={({ thread }) => thread.isRunning}>
          <ComposerPrimitive.Cancel asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full shrink-0"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          </ComposerPrimitive.Cancel>
        </AssistantIf>

        {/* Send Button - Only shown when thread is not running */}
        <AssistantIf condition={({ thread }) => !thread.isRunning}>
          <ComposerPrimitive.Send asChild>
            <Button
              type="submit"
              size="icon"
              className="h-9 w-9 rounded-full shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-30"
            >
              <ArrowUp className="h-5 w-5" />
            </Button>
          </ComposerPrimitive.Send>
        </AssistantIf>
      </div>
    </ComposerPrimitive.Root>
  );
};
