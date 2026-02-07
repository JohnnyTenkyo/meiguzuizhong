import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { registerLocalUser, loginLocalUser, changeLocalUserPassword } from "./localAuth";
import { COOKIE_NAME } from "@shared/const";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret);

export const localAuthRouter = router({
  register: publicProcedure
    .input(z.object({
      username: z.string().min(3).max(20),
      password: z.string().min(6).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await registerLocalUser(input.username, input.password);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Create session token
      const token = await new SignJWT({ userId: result.userId, openId: `local:${input.username}` })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      // Return token and user info
      return {
        success: true,
        token,
        user: {
          id: result.userId,
          openId: `local:${input.username}`,
          role: 'user' as const,
        },
      };
    }),

  login: publicProcedure
    .input(z.object({
      username: z.string(),
      password: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await loginLocalUser(input.username, input.password);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Create session token
      const token = await new SignJWT({ userId: result.user.id, openId: result.user.openId })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      // Return token and user info
      return { success: true, token, user: result.user };
    }),

  changePassword: publicProcedure
    .input(z.object({
      oldPassword: z.string(),
      newPassword: z.string().min(6).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        return { success: false, error: "Not authenticated" };
      }

      const result = await changeLocalUserPassword(
        ctx.user.id,
        input.oldPassword,
        input.newPassword
      );

      return result;
    }),
});
