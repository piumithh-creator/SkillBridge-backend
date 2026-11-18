import bcrypt from "bcryptjs";
import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import { MAX_SESSIONS_PER_USER, REFRESH_COOKIE } from "../constants";
import { CompanyProfile } from "../models/CompanyProfile";
import { StudentProfile } from "../models/StudentProfile";
import { User, type IUser } from "../models/User";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/response";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens";

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: env.isProd,
  // Frontend (Vercel) and API (Render) are different sites in production
  sameSite: env.isProd ? "none" : "lax",
  path: "/api/auth",
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
});

const publicUser = (u: Pick<IUser, "id" | "name" | "email" | "role">) => ({
  id: u.id as string,
  name: u.name,
  email: u.email,
  role: u.role
});

/** Creates a new access/refresh pair, stores the refresh hash, and sets the cookie. */
const issueSession = async (user: IUser, res: Response, replacedHash?: string): Promise<string> => {
  const refreshToken = signRefreshToken(user.id);
  const now = new Date();
  const current = (user.refreshSessions ?? []).filter((s) => s.expiresAt > now && s.hash !== replacedHash);
  current.push({ hash: hashToken(refreshToken), expiresAt: new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 86400000) });
  await User.updateOne(
    { _id: user._id },
    { $set: { refreshSessions: current.slice(-MAX_SESSIONS_PER_USER), lastLoginAt: now } }
  );
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  return signAccessToken(user.id, user.role);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, companyName } = req.body as {
    name: string; email: string; password: string; role: "STUDENT" | "COMPANY"; companyName?: string;
  };

  if (await User.exists({ email })) throw AppError.conflict("An account with this email already exists");

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, password: hashed, role });

  try {
    if (role === "STUDENT") await StudentProfile.create({ user: user._id, fullName: name });
    else await CompanyProfile.create({ user: user._id, companyName: companyName as string });
  } catch (err) {
    await User.deleteOne({ _id: user._id }); // keep user + profile consistent
    throw err;
  }

  const accessToken = await issueSession(user, res);
  sendSuccess(res, { user: publicUser(user), accessToken }, "Registration successful", 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ email }).select("+password +refreshSessions");
  // Same message for unknown email and wrong password (no account enumeration)
  if (!user || !(await bcrypt.compare(password, user.password))) throw AppError.unauthorized("Invalid email or password");
  if (user.isBlocked) throw AppError.forbidden("This account has been blocked. Contact support.");

  const accessToken = await issueSession(user, res);
  sendSuccess(res, { user: publicUser(user), accessToken }, "Login successful");
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw AppError.unauthorized("No refresh token");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub).select("+refreshSessions");
  if (!user) throw AppError.unauthorized("Account no longer exists");
  if (user.isBlocked) throw AppError.forbidden("This account has been blocked");

  const hash = hashToken(token);
  if (!user.refreshSessions.some((s) => s.hash === hash)) {
    // A valid-signature token that is no longer stored = reuse of a rotated token → revoke all sessions
    await User.updateOne({ _id: user._id }, { $set: { refreshSessions: [] } });
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
    throw AppError.unauthorized("Refresh token reuse detected. Please log in again.");
  }

  const accessToken = await issueSession(user, res, hash); // rotation
  sendSuccess(res, { user: publicUser(user), accessToken }, "Token refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne({ _id: payload.sub }, { $pull: { refreshSessions: { hash: hashToken(token) } } });
    } catch {
      /* token already invalid – nothing to revoke */
    }
  }
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  sendSuccess(res, null, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const profile =
    user.role === "STUDENT"
      ? await StudentProfile.findOne({ user: user.id })
      : user.role === "COMPANY"
        ? await CompanyProfile.findOne({ user: user.id })
        : null;
  sendSuccess(res, { user: { id: user.id, name: user.name, email: user.email, role: user.role }, profile });
});
