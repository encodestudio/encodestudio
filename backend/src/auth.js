import { sign, verify } from "hono/jwt";
import { config } from "./config.js";
import { query } from "./db.js";

export { hashPassword, verifyPassword } from "./passwords.js";

// Staff accounts live in the `auth_user` table the Django app created.
export const USER_TABLE = "auth_user";

export function displayName(user) {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
}

export async function findUserByUsername(username) {
  const rows = await query(`SELECT * FROM ${USER_TABLE} WHERE username = ?`, [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await query(`SELECT * FROM ${USER_TABLE} WHERE id = ?`, [Number(id) || 0]);
  return rows[0] || null;
}

export async function issueTokens(user) {
  const sub = String(user.id);
  const iat = Math.floor(Date.now() / 1000);
  const token = (type, ttl) => sign({ type, sub, iat, exp: iat + ttl }, config.jwt.secret, "HS256");
  return {
    access: await token("access", config.jwt.accessTtl),
    refresh: await token("refresh", config.jwt.refreshTtl),
  };
}

/** Verifies a token of the given type and returns its still-active user, or null. */
export async function userFromToken(token, type) {
  let payload;
  try {
    payload = await verify(token, config.jwt.secret, "HS256");
  } catch {
    return null;
  }
  if (payload.type !== type) return null;
  const user = await findUserById(payload.sub);
  return user && user.is_active ? user : null;
}

const TOKEN_INVALID = { detail: "Given token not valid for any token type", code: "token_not_valid" };

/** Returns the request's authenticated user, or an error response. */
async function authenticate(c) {
  const match = /^Bearer\s+(.+)$/i.exec(c.req.header("Authorization") || "");
  if (!match) {
    return c.json({ detail: "Authentication credentials were not provided." }, 401);
  }
  const user = await userFromToken(match[1], "access");
  if (!user) return c.json(TOKEN_INVALID, 401);
  c.set("user", user);
  return user;
}

/** Requires a valid access token; sets c.get("user"). */
export async function requireAuth(c, next) {
  const user = await authenticate(c);
  if (user instanceof Response) return user;
  await next();
}

/** Requires an authenticated staff user (the lead-manager portal). */
export async function requireStaff(c, next) {
  const user = await authenticate(c);
  if (user instanceof Response) return user;
  if (!user.is_staff) {
    return c.json({ detail: "You do not have permission to perform this action." }, 403);
  }
  await next();
}
