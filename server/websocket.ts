import { WebSocket, WebSocketServer } from "ws";
import { Server } from "http";
import { storage } from "./storage";
import { log } from "./vite";

// Keep track of connected clients
const clients = new Map<number, WebSocket>();

export function broadcastMessage(senderId: number, receiverId: number, message: any) {
  const senderWs = clients.get(senderId);
  const receiverWs = clients.get(receiverId);

  const messagePayload = {
    type: "message",
    data: message
  };

  // Send to both sender and receiver if connected
  [senderWs, receiverWs].forEach(ws => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(messagePayload));
    }
  });
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws"
  });

  wss.on("connection", (ws) => {
    let userId: number;
    log("New WebSocket connection established", "websocket");

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        log(`Received message: ${JSON.stringify(message)}`, "websocket");

        if (message.type === "auth") {
          // Ensure userId is a number
          if (typeof message.data?.userId !== 'number') {
            throw new Error("Invalid user ID");
          }

          userId = message.data.userId;
          // Remove any existing connection for this user
          const existingWs = clients.get(userId);
          if (existingWs && existingWs !== ws) {
            existingWs.close();
          }

          // Store the new connection
          clients.set(userId, ws);
          await storage.setUserOnlineStatus(userId, true);

          // Send confirmation
          ws.send(JSON.stringify({
            type: "auth_success",
            data: { userId }
          }));

          log(`User ${userId} authenticated via WebSocket`, "websocket");
        } else if (message.type === "message") {
          // Ensure we have userId before processing messages
          if (!userId) {
            throw new Error("Not authenticated");
          }

          const { senderId, receiverId, content } = message.data;

          // Verify sender matches authenticated user
          if (userId !== senderId) {
            throw new Error("Unauthorized");
          }

          // Create and store message
          const newMessage = await storage.createMessage({
            senderId,
            receiverId,
            content
          });

          log(`Created message: ${JSON.stringify(newMessage)}`, "websocket");

          // Broadcast to both users
          broadcastMessage(senderId, receiverId, newMessage);
        }
      } catch (err) {
        log(`WebSocket error: ${err}`, "websocket");
        ws.send(JSON.stringify({
          type: "error",
          data: { message: err instanceof Error ? err.message : "Failed to process message" }
        }));
      }
    });

    ws.on("close", async () => {
      if (userId) {
        await storage.setUserOnlineStatus(userId, false);
        clients.delete(userId);
        log(`Client ${userId} disconnected`, "websocket");
      }
    });
  });

  // Ping to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }, 30000);

  server.on("close", () => {
    clearInterval(interval);
    wss.close();
  });
}