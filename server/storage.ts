import { User, InsertUser, Message, Friend } from "@shared/schema";
import { users, messages, friends } from "@shared/schema";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { db } from "./db";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  setUserOnlineStatus(userId: number, online: boolean): Promise<void>;
  getFriends(userId: number): Promise<User[]>;
  addFriend(userId: number, friendId: number): Promise<void>;
  getMessages(userId: number, friendId: number): Promise<Message[]>;
  createMessage(message: Omit<Message, "id" | "timestamp">): Promise<Message>;
  deleteMessage(messageId: number): Promise<void>; // Added deleteMessage method
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const discriminator = Math.floor(Math.random() * 900000 + 100000).toString();
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        discriminator,
        online: false
      })
      .returning();
    return user;
  }

  async setUserOnlineStatus(userId: number, online: boolean): Promise<void> {
    await db.update(users)
      .set({ online })
      .where(eq(users.id, userId));
  }

  async getFriends(userId: number): Promise<User[]> {
    const friendsList = await db
      .select({
        friendUser: users
      })
      .from(friends)
      .innerJoin(users, eq(friends.friendId, users.id))
      .where(eq(friends.userId, userId));

    return friendsList.map(f => f.friendUser);
  }

  async addFriend(userId: number, friendId: number): Promise<void> {
    // Add bidirectional friendship
    await db.insert(friends).values([
      { userId, friendId },
      { userId: friendId, friendId: userId }
    ]);
  }

  async getMessages(userId: number, friendId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, userId),
            eq(messages.receiverId, friendId)
          ),
          and(
            eq(messages.senderId, friendId),
            eq(messages.receiverId, userId)
          )
        )
      )
      .orderBy(asc(messages.timestamp)); // Changed to ascending order for proper chat history
  }

  async createMessage(message: Omit<Message, "id" | "timestamp">): Promise<Message> {
    try {
      const [newMessage] = await db
        .insert(messages)
        .values(message)
        .returning();

      if (!newMessage) {
        throw new Error("Failed to create message");
      }

      return newMessage;
    } catch (error) {
      console.error("Error creating message:", error);
      throw error;
    }
  }

  async deleteMessage(messageId: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, messageId));
  }
}

export const storage = new DatabaseStorage();