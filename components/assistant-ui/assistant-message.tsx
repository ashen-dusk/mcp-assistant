"use client";

import type { FC } from "react";
import { MessagePrimitive, AssistantIf } from "@assistant-ui/react";
import { MarkdownText } from "@/components/markdown-text";
import { ToolFallback } from "@/components/tool-fallback";

export const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root>
      <div className="flex items-start gap-2 sm:gap-3 px-2 sm:px-4 py-2">
        <div className="flex flex-col gap-2 max-w-full sm:max-w-[90%] md:max-w-[72ch] w-full">
          {/* Text Content */}
          <AssistantIf condition={({ message }) => message.role === "assistant" && message.content.some((c: any) => c.type === "text")}>
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base break-words overflow-x-auto">
              <MessagePrimitive.Content components={{ Text: MarkdownText, tools: { Fallback: ToolFallback } }} />
            </div>
          </AssistantIf>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};


