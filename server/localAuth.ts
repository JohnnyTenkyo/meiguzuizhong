import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { users, InsertUser } from "../drizzle/schema";

/**
 * 本地用户认证（用户名/密码）
 * 使用 users 表的 openId 字段存储用户名（加 local: 前缀）
 * 使用 loginMethod 字段标记为 "local"
 * 使用 name 字段存储密码哈希
 */

export async function registerLocalUser(username: string, password: string): Promise<{ success: boolean; error?: string; userId?: number }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Check if username already exists
    const openId = `local:${username}`;
    const existing = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    
    if (existing.length > 0) {
      return { success: false, error: "Username already exists" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.insert(users).values({
      openId,
      name: username,
      email: null,
      loginMethod: "local",
      role: "user",
      lastSignedIn: new Date(),
    });

    // Store password hash separately (we'll use a workaround with email field for now)
    // In production, you should create a separate passwords table
    const userId = Number(result[0].insertId);
    await db.update(users)
      .set({ email: passwordHash }) // Temporary: store hash in email field
      .where(eq(users.id, userId));

    return { success: true, userId };
  } catch (error) {
    console.error("[LocalAuth] Registration error:", error);
    return { success: false, error: "Registration failed" };
  }
}

export async function loginLocalUser(username: string, password: string): Promise<{ success: boolean; error?: string; user?: any }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    const openId = `local:${username}`;
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

    if (result.length === 0) {
      return { success: false, error: "Invalid username or password" };
    }

    const user = result[0];
    const passwordHash = user.email; // Temporary: hash stored in email field

    if (!passwordHash) {
      return { success: false, error: "Invalid account" };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      return { success: false, error: "Invalid username or password" };
    }

    // Update last signed in
    await db.update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    return {
      success: true,
      user: {
        id: user.id,
        openId: user.openId,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("[LocalAuth] Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

export async function changeLocalUserPassword(userId: number, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (result.length === 0) {
      return { success: false, error: "User not found" };
    }

    const user = result[0];
    const passwordHash = user.email; // Temporary: hash stored in email field

    if (!passwordHash) {
      return { success: false, error: "Invalid account" };
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, passwordHash);
    if (!isValid) {
      return { success: false, error: "Old password is incorrect" };
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.update(users)
      .set({ email: newPasswordHash })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error("[LocalAuth] Change password error:", error);
    return { success: false, error: "Failed to change password" };
  }
}
