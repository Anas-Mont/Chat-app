import { createContext, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Message, User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ChatContextType {
  friends: User[];
  messages: Message[];
  selectedFriend: User | null;
  setSelectedFriend: (friend: User | null) => void;
  sendMessage: (content: string) => void;
  addFriend: (username: string, discriminator: string) => void;
  deleteMessage: (messageId: number) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);

  // Get friends list
  const { data: friends = [] } = useQuery<User[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
    staleTime: 30000
  });

  // Get messages with polling
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", selectedFriend?.id],
    queryFn: async () => {
      if (!selectedFriend?.id) return [];
      const res = await apiRequest("GET", `/api/messages/${selectedFriend.id}`);
      return res.json();
    },
    enabled: !!selectedFriend?.id && !!user,
    refetchInterval: 1000, // Poll every second
    retry: 3
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedFriend) throw new Error("Please select a friend to message");
      if (!user) throw new Error("You must be logged in to send messages");

      const message = {
        senderId: user.id,
        receiverId: selectedFriend.id,
        content
      };

      const response = await apiRequest("POST", "/api/messages", message);
      return response.json();
    },
    onSuccess: (newMessage) => {
      // Optimistically update messages list
      queryClient.setQueryData<Message[]>(
        ["/api/messages", selectedFriend?.id],
        (old = []) => [...old, newMessage]
      );
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedFriend?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not send message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: (_data, messageId) => {
      // Optimistically remove the message from the UI
      queryClient.setQueryData<Message[]>(
        ["/api/messages", selectedFriend?.id],
        (oldMessages = []) => oldMessages.filter((m) => m.id !== messageId)
      );
      toast({
        title: "Message Deleted",
        description: "Message was successfully deleted"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not delete message",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Add friend mutation
  const addFriendMutation = useMutation({
    mutationFn: async (data: { username: string; discriminator: string }) => {
      const res = await apiRequest("POST", "/api/friends", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend Added",
        description: "Successfully added friend"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not add friend",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <ChatContext.Provider
      value={{
        friends,
        messages,
        selectedFriend,
        setSelectedFriend,
        sendMessage: (content: string) => sendMessageMutation.mutate(content),
        addFriend: (username: string, discriminator: string) =>
          addFriendMutation.mutate({ username, discriminator }),
        deleteMessage: (messageId: number) =>
          deleteMessageMutation.mutate(messageId)
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}