import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { LogOut, Menu, Send, User, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme-toggle";

function AddFriendDialog() {
  const { addFriend } = useChat();
  const [username, setUsername] = useState("");
  const [discriminator, setDiscriminator] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Username#ID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <Input
                placeholder="000000"
                maxLength={6}
                className="w-24"
                value={discriminator}
                onChange={e => setDiscriminator(e.target.value)}
              />
            </div>
          </div>
          <Button 
            className="w-full" 
            onClick={() => {
              if (username && discriminator) {
                addFriend(username, discriminator);
              }
            }}
          >
            Add Friend
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageInput() {
  const { register, handleSubmit, reset } = useForm<{ content: string }>();
  const { sendMessage } = useChat();

  return (
    <form
      onSubmit={handleSubmit(data => {
        sendMessage(data.content);
        reset();
      })}
      className="flex gap-2 p-4 border-t"
    >
      <Input
        placeholder="Type a message..."
        {...register("content", { required: true })}
      />
      <Button type="submit" size="icon">
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}

function FriendsList() {
  const { friends, selectedFriend, setSelectedFriend } = useChat();
  
  return (
    <ScrollArea className="flex-1">
      {friends.map(friend => (
        <button
          key={friend.id}
          onClick={() => setSelectedFriend(friend)}
          className={cn(
            "flex items-center gap-3 w-full p-3 hover:bg-accent transition-colors",
            selectedFriend?.id === friend.id && "bg-accent"
          )}
        >
          <div className="relative">
            <User className="h-10 w-10 p-2 rounded-full bg-primary text-primary-foreground" />
            <div
              className={cn(
                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background",
                friend.online ? "bg-green-500" : "bg-gray-500"
              )}
            />
          </div>
          <div className="flex-1 text-left">
            <div className="font-medium">{friend.username}</div>
            <div className="text-sm text-muted-foreground">
              #{friend.discriminator}
            </div>
          </div>
        </button>
      ))}
    </ScrollArea>
  );
}

function ChatArea() {
  const { messages, selectedFriend, deleteMessage } = useChat();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!selectedFriend) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a friend to start chatting
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b">
        <div className="font-medium">{selectedFriend.username}</div>
        <div className="text-sm text-muted-foreground">
          #{selectedFriend.discriminator}
        </div>
      </div>
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                "flex group",
                message.senderId === user?.id ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "rounded-lg px-4 py-2 max-w-[80%] break-words",
                  message.senderId === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.content}
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <MessageInput />
    </div>
  );
}

export default function HomePage() {
  const { logoutMutation, user } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-screen">
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="fixed top-4 left-4">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <FriendsSidebar user={user} onLogout={() => logoutMutation.mutate()} />
          </SheetContent>
        </Sheet>
      ) : (
        <FriendsSidebar user={user} onLogout={() => logoutMutation.mutate()} />
      )}
      <ChatArea />
    </div>
  );
}

function FriendsSidebar({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div className="w-80 border-r flex flex-col">
      <div className="p-4 flex items-center justify-between">
        <div>
          <div className="font-medium">{user?.username}</div>
          <div className="text-sm text-muted-foreground">
            #{user?.discriminator}
          </div>
        </div>
        <div className="flex gap-2">
          <AddFriendDialog />
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <Separator />
      <FriendsList />
    </div>
  );
}