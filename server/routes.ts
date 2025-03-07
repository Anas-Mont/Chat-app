import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/friends", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const friends = await storage.getFriends(req.user.id);
    res.json(friends);
  });

  app.post("/api/friends", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const schema = z.object({
      username: z.string(),
      discriminator: z.string()
    });

    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json(result.error);

    // Find potential friend by username and discriminator
    const allUsers = Array.from((await storage.getAllUsers()));
    const friend = allUsers.find(u => 
      u.username === result.data.username && 
      u.discriminator === result.data.discriminator
    );

    if (!friend) return res.status(404).json({ message: "User not found" });

    // Check if they're already friends
    const existingFriends = await storage.getFriends(req.user.id);
    if (existingFriends.some(f => f.id === friend.id)) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Add friend relationship
    await storage.addFriend(req.user.id, friend.id);
    res.status(201).json({ message: "Friend added successfully" });
  });

  app.get("/api/messages/:friendId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const friendId = parseInt(req.params.friendId);
    if (isNaN(friendId)) return res.sendStatus(400);

    const messages = await storage.getMessages(req.user.id, friendId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertMessageSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json(result.error);

    const message = await storage.createMessage({
      senderId: req.user.id,
      receiverId: result.data.receiverId,
      content: result.data.content
    });

    res.status(201).json(message);
  });

  app.delete("/api/messages/:messageId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const messageId = parseInt(req.params.messageId);
    if (isNaN(messageId)) return res.sendStatus(400);

    await storage.deleteMessage(messageId);
    res.json({ message: "Message deleted successfully" });
  });

  return createServer(app);
}