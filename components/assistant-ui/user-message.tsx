"use client";

import type { FC } from "react";
import { MessagePrimitive } from "@assistant-ui/react";

export const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root>
      <div className="flex justify-end px-2 sm:px-4 py-2">
        <div className="max-w-[90%] sm:max-w-[72ch] rounded-xl px-2.5 sm:px-3 py-1.5 text-sm sm:text-md leading-relaxed bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-foreground">
          <div className="whitespace-pre-wrap break-words">
            <MessagePrimitive.Content />
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};
