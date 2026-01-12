'use client';

import { User } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

type MessageLike = {
  role?: string;
  content?: any;
  text?: string;
};

function AssistantAvatar() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = resolvedTheme === "dark" ? "/images/logo-dark.png" : "/images/logo-light.png";

  return (
    <div className="w-full h-full flex items-center justify-center rounded-full bg-muted">
      {mounted ? (
        <Image
          src={logoSrc}
          alt="Assistant avatar"
          width={32}
          height={32}
          className="rounded-full object-contain"
        />
      ) : (
        null
      )}
    </div>
  );
}

export function UserMessage({ key, message }: any) {
  const getMessageContent = () => {
    if (typeof message === "string") return message;
    if (message?.content) {
      // Handle assistant-ui message format with content array
      if (Array.isArray(message.content)) {
        return message.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join(" ");
      }
      return message.content;
    }
    return message?.text || "";
  };

  return (
    <div key={key} className="flex justify-end px-2 sm:px-4 py-2">
      <div
        className="
          max-w-[90%] sm:max-w-[72ch]
          rounded-xl
          px-2.5 sm:px-3 py-1.5
          text-sm sm:text-md leading-relaxed
          bg-zinc-100 dark:bg-zinc-800
          border border-zinc-200 dark:border-zinc-700
          text-foreground
        "
      >
        <div className="whitespace-pre-wrap break-words">
          {getMessageContent()}
        </div>
      </div>
    </div>
  );
}


export function AssistantMessage({
  key,
  message,
  showReasoning = false,
}: any) {
  const getMessageContent = () => {
    if (typeof message === "string") return message;
    if (message?.content) {
      // Handle assistant-ui message format with content array
      if (Array.isArray(message.content)) {
        return message.content
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join(" ");
      }
      return message.content;
    }
    return message?.text || "";
  };

  const messageContent = getMessageContent();

  return (
    <div key={key} className="flex items-start gap-2 sm:gap-3 px-2 sm:px-4 py-2">
      <div className="flex flex-col gap-2 max-w-full sm:max-w-[90%] md:max-w-[72ch] w-full">
        {messageContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base break-words overflow-x-auto">
            <ReactMarkdown>{messageContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
