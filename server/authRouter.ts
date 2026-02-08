import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "./db";
import { localUsers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";

const JWT_SECRET = ENV.cookieSecret || "meigu-default-secret";

export const authApiRouter = Router();

// Register
authApiRouter.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ success: false, error: "用户名和密码不能为空" });
    }
    if (username.length < 2 || username.length > 32) {
      return res.json({ success: false, error: "用户名长度需要2-32位" });
    }
    if (password.length < 4) {
      return res.json({ success: false, error: "密码至少4位" });
    }

    // Check if username exists
    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    const existing = await db.select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
    if (existing.length > 0) {
      return res.json({ success: false, error: "用户名已存在" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db!.insert(localUsers).values({
      username,
      passwordHash,
      name: username,
    });

    const userId = result[0].insertId;
    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      success: true,
      user: { id: String(userId), name: username },
      token,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.json({ success: false, error: "注册失败，请重试" });
  }
});

// Login
authApiRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ success: false, error: "用户名和密码不能为空" });
    }

    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    const users = await db.select().from(localUsers).where(eq(localUsers.username, username)).limit(1);
    if (users.length === 0) {
      return res.json({ success: false, error: "用户名或密码错误" });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.json({ success: false, error: "用户名或密码错误" });
    }

    // Update last signed in
    await db!.update(localUsers).set({ lastSignedIn: new Date() }).where(eq(localUsers.id, user.id));

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      success: true,
      user: { id: String(user.id), name: user.name || user.username },
      token,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.json({ success: false, error: "登录失败，请重试" });
  }
});

// Change password
authApiRouter.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ success: false, error: "未登录" });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.json({ success: false, error: "登录已过期，请重新登录" });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.json({ success: false, error: "请填写旧密码和新密码" });
    }
    if (newPassword.length < 4) {
      return res.json({ success: false, error: "新密码至少4位" });
    }

    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    const users = await db.select().from(localUsers).where(eq(localUsers.id, decoded.userId)).limit(1);
    if (users.length === 0) {
      return res.json({ success: false, error: "用户不存在" });
    }

    const user = users[0];
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      return res.json({ success: false, error: "旧密码错误" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db!.update(localUsers).set({ passwordHash: newHash }).where(eq(localUsers.id, user.id));

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Change password error:", err);
    return res.json({ success: false, error: "修改密码失败" });
  }
});

// Verify token (for middleware)
export function verifyToken(token: string): { userId: number; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}
