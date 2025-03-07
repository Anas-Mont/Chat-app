import { Message } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { format } from "date-fns";

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const { user } = useAuth();
  const { deleteMessage } = useChat();

  return (
    <div className="flex flex-col gap-4 p-4 h-[calc(100vh-12rem)] overflow-y-auto">
      {messages.map((message) => {
        const isOwnMessage = message.senderId === user?.id;

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <ContextMenu>
              <ContextMenuTrigger>
                <div 
                  className={`max-w-[80%] sm:max-w-[70%] ${
                    isOwnMessage ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground'
                        : 'bg-gradient-to-r from-muted/50 to-muted'
                    }`}
                  >
                    <p className="break-words text-sm sm:text-base">{message.content}</p>
                    <span className="text-xs opacity-70 block mt-1">
                      {format(new Date(message.timestamp), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {isOwnMessage ? (
                  <>
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteMessage(message.id)}
                    >
                      Delete for everyone
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteMessage(message.id)}
                    >
                      Delete for me
                    </ContextMenuItem>
                  </>
                ) : (
                  <ContextMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteMessage(message.id)}
                  >
                    Delete for me
                  </ContextMenuItem>
                )}
              </ContextMenuContent>
            </ContextMenu>
          </div>
        );
      })}
    </div>
  );
}