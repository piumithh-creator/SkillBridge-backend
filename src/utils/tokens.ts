import crypto from "crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../constants";

export interface AccessPayload extends JwtPayload {
  sub: string;
  role: Role;
}
export interface RefreshPayload extends JwtPayload {
  sub: string;
  jti: string;
}

export const signAccessToken = (userId: string, role: Role): string =>
  jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS
  });

export const signRefreshToken = (userId: string): string =>
  jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: userId,
    jwtid: crypto.randomUUID(),
    expiresIn: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60
  });

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
