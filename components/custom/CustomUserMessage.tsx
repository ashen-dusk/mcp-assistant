import { type UserMessageProps } from "@copilotkit/react-ui";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "../ui/shadcn-io/ai/message";
import { useSession } from "next-auth/react";

const CustomUserMessage = (props: UserMessageProps) => {
  const { user } = useSession()?.data ?? {};

  const wrapperStyles = "flex items-center gap-2 justify-end mb-4";
 const messageStyles = "items-start [&>div]:max-w-full";
  // const avatarStyles = "bg-blue-500 shadow-sm min-h-10 min-w-10 rounded-full text-white flex items-center justify-center";

  return (
    <div className={wrapperStyles}>
      <Message from="user" className={messageStyles}>
        <MessageContent>{props.message?.content}</MessageContent>
        <MessageAvatar src={user?.image || ""} name="User" />
      </Message>
    </div>
  );
};

export default CustomUserMessage;
