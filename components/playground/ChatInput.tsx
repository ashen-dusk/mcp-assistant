'use client';

import { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  ArrowUp,
  Plus,
  Mic,
  Loader2,
  X,
  FileIcon,
  ImageIcon,
} from 'lucide-react';

async function convertFilesToDataURLs(files: FileList) {
  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<{
          type: 'file';
          mediaType: string;
          url: string;
        }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({
              type: 'file',
              mediaType: file.type,
              url: reader.result as string,
            });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

interface ChatInputProps {
  onSend: (data: { text?: string; parts?: any[] }) => void;
  disabled?: boolean;
  status: 'ready' | 'submitted' | 'streaming' | 'error';
}

export function ChatInput({ onSend, disabled, status }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<FileList | undefined>();
  const [input, setInput] = useState('');

  const isPending = status === 'submitted' || status === 'streaming';
  const fileArray = files ? Array.from(files) : [];

  const handleSend = async () => {
    const value = input.trim();
    if (!value && !fileArray.length) return;

    const fileParts = files ? await convertFilesToDataURLs(files) : [];

    onSend({
      parts: [
        ...(value ? [{ type: 'text', text: value }] : []),
        ...fileParts,
      ],
    });

    setInput('');
    setFiles(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full px-2 sm:px-4">
      <div
        className="
          bg-white dark:bg-transparent
          rounded-2xl border-2
          border-gray-400 dark:border-zinc-700
          shadow-xl
          hover:border-gray-500 dark:hover:border-zinc-600
          transition-colors
        "
      >
        <div className="flex flex-col">
          {/* TEXTAREA */}
          <div className="px-2 pt-2">
            <Textarea
              ref={textareaRef}
              value={input}
              placeholder="Type your prompt..."
              disabled={disabled}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 120) + 'px';
              }}
              className="
                w-full resize-none bg-transparent border-0 outline-none
                text-gray-900 dark:text-white
                placeholder-gray-500 dark:placeholder-gray-400
                text-sm sm:text-[15px]
                leading-relaxed
                focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0
                [&:focus]:outline-none [&:focus]:ring-0 [&:focus]:border-0
              "
              style={{
                minHeight: '50px',
                maxHeight: '120px',
                overflowY: 'auto',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
          </div>

          {/* ACTION ROW */}
          <div className="flex items-center justify-between px-2 pb-2">
            {/* LEFT ACTIONS */}
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) =>
                  e.target.files && setFiles(e.target.files)
                }
              />

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                disabled={isPending}
              >
                <Mic className="w-4 h-4 text-muted-foreground" />
              </Button>

              {/* SEND */}
              <Button
                onClick={handleSend}
                disabled={disabled || isPending || (!input.trim() && !fileArray.length)}
                className="
                  bg-gray-900 hover:bg-gray-800
                  dark:bg-white dark:hover:bg-gray-100
                  dark:text-black text-white
                  h-7 w-7 sm:h-8 sm:w-8
                  rounded-lg p-1.5
                  shadow-lg
                  disabled:opacity-50
                "
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
