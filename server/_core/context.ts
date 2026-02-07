import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "../../shared/const";
import { ENV } from "./env";
import { getUserByOpenId } from "../db";

const JWT_SECRET = new TextEncoder().encode(ENV.jwtSecret);

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Only use local JWT auth from Authorization header
  try {
    const authHeader = opts.req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    console.log("[Context] Auth token:", token ? `${token.substring(0, 20)}...` : "none");
    
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        console.log("[Context] JWT payload:", payload);
        
        if (payload.openId && typeof payload.openId === 'string') {
          const localUser = await getUserByOpenId(payload.openId);
          console.log("[Context] Local user found:", localUser ? `id=${localUser.id}, openId=${localUser.openId}` : "none");
          
          if (localUser) {
            user = localUser;
          }
        } else {
          console.log("[Context] JWT payload missing openId");
        }
      } catch (jwtError) {
        console.log("[Context] JWT verification failed:", jwtError);
      }
    }
  } catch (error) {
    console.log("[Context] Local auth error:", error);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
