import {
  AssistantMessageProps,
  Markdown,
  useChatContext,
} from "@copilotkit/react-ui";
import { useState } from "react";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "../ui/shadcn-io/ai/message";

const CustomAssistantMessage = (props: AssistantMessageProps) => {
  const { icons, labels } = useChatContext();
  const {
    message,
    isLoading,
    onRegenerate,
    onCopy,
    onThumbsUp,
    onThumbsDown,
    isCurrentMessage,
    feedback,
    markdownTagRenderers,
  } = props;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const content = message?.content || "";
    if (content && onCopy) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      onCopy(content);
      setTimeout(() => setCopied(false), 2000);
    } else if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) onRegenerate();
  };

  const handleThumbsUp = () => {
    if (onThumbsUp && message) {
      onThumbsUp(message);
    }
  };

  const handleThumbsDown = () => {
    if (onThumbsDown && message) {
      onThumbsDown(message);
    }
  };

  const LoadingIcon = () => <span>{icons.activityIcon}</span>;
  const content = message?.content || "";
  const subComponent = message?.generativeUI?.();

  const wrapperStyles = "flex items-center gap-2 justify-end mb-4";
  const messageStyles = "items-start [&>div]:max-w-full";

  return (
    <>
     <div className={wrapperStyles}>
      {content && (
        <>
       
          <Message from="assistant" className={messageStyles}>
            <MessageContent>
              {content && (
                <Markdown content={content} components={markdownTagRenderers} />
              )}

              {content && !isLoading && (
                <div
                  className={`copilotKitMessageControls flex mt-4 gap-3 ${
                    isCurrentMessage ? "currentMessage " : ""
                  }`}
                >
                  <button
                    className="copilotKitMessageControlButton"
                    onClick={handleRegenerate}
                    aria-label={labels.regenerateResponse}
                    title={labels.regenerateResponse}
                  >
                    {icons.regenerateIcon}
                  </button>
                  <button
                    className="copilotKitMessageControlButton"
                    onClick={handleCopy}
                    aria-label={labels.copyToClipboard}
                    title={labels.copyToClipboard}
                  >
                    {copied ? (
                      <span style={{ fontSize: "10px", fontWeight: "bold" }}>
                        ✓
                      </span>
                    ) : (
                      icons.copyIcon
                    )}
                  </button>
                  {onThumbsUp && (
                    <button
                      className={`copilotKitMessageControlButton ${
                        feedback === "thumbsUp" ? "active" : ""
                      }`}
                      onClick={handleThumbsUp}
                      aria-label={labels.thumbsUp}
                      title={labels.thumbsUp}
                    >
                      {icons.thumbsUpIcon}
                    </button>
                  )}
                  {onThumbsDown && (
                    <button
                      className={`copilotKitMessageControlButton ${
                        feedback === "thumbsDown" ? "active" : ""
                      }`}
                      onClick={handleThumbsDown}
                      aria-label={labels.thumbsDown}
                      title={labels.thumbsDown}
                    >
                      {icons.thumbsDownIcon}
                    </button>
                  )}
                </div>
              )}
            </MessageContent>
            <MessageAvatar src="https://github.com/openai.png" name="AI" />
          </Message>
        
        </>
      )}
      </div>
      <div style={{ marginBottom: "0.5rem" }}>{subComponent}</div>
      {isLoading && <LoadingIcon />}
    </>
  );
};

export default CustomAssistantMessage;

