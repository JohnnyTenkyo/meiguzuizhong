import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createMockContext(): { ctx: TrpcContext; cookies: CookieCall[] } {
  const cookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx, cookies };
}

describe("Authentication Flow", () => {
  it("register should return user info and set cookie", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const testUsername = `test${Date.now()}`.substring(0, 15);
    const result = await caller.localAuth.register({
      username: testUsername,
      password: "test123456",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.openId).toBe(`local:${testUsername}`);
    expect(result.user?.role).toBe("user");
    
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
    expect(cookies[0]?.value).toBeDefined();
  });

  it("login should return user info and set cookie", async () => {
    const { ctx: registerCtx } = createMockContext();
    const registerCaller = appRouter.createCaller(registerCtx);

    const testUsername = `test${Date.now()}`.substring(0, 15);
    await registerCaller.localAuth.register({
      username: testUsername,
      password: "test123456",
    });

    const { ctx: loginCtx, cookies } = createMockContext();
    const loginCaller = appRouter.createCaller(loginCtx);

    const result = await loginCaller.localAuth.login({
      username: testUsername,
      password: "test123456",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.openId).toBe(`local:${testUsername}`);
    
    expect(cookies).toHaveLength(1);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
  });

  it("login with wrong password should fail", async () => {
    const { ctx: registerCtx } = createMockContext();
    const registerCaller = appRouter.createCaller(registerCtx);

    const testUsername = `test${Date.now()}`.substring(0, 15);
    await registerCaller.localAuth.register({
      username: testUsername,
      password: "test123456",
    });

    const { ctx: loginCtx } = createMockContext();
    const loginCaller = appRouter.createCaller(loginCtx);

    const result = await loginCaller.localAuth.login({
      username: testUsername,
      password: "wrongpassword",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
