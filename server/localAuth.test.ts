import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Local Authentication", () => {
  const testUsername = `test${Date.now() % 100000}`; // Keep under 20 chars
  const testPassword = "testpass123";
  let testUserId: number;

  // Clean up test user after tests
  afterAll(async () => {
    const db = await getDb();
    if (db && testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("should register a new user", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.localAuth.register({
      username: testUsername,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify user was created in database
    const db = await getDb();
    if (db) {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.openId, `local:${testUsername}`))
        .limit(1);
      
      expect(user.length).toBe(1);
      expect(user[0]?.name).toBe(testUsername);
      testUserId = user[0]!.id;
    }
  });

  it("should not register duplicate username", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.localAuth.register({
      username: testUsername,
      password: testPassword,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should login with correct credentials", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.localAuth.login({
      username: testUsername,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.name).toBe(testUsername);
  });

  it("should not login with wrong password", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.localAuth.login({
      username: testUsername,
      password: "wrongpassword",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
