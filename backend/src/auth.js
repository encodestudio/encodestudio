import crypto from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { query } from "./db.js";

const pbkdf2 = promisify(crypto.pbkdf2);

// Staff accounts live in the `auth_user` table the Django app created, and
// passwords use Django's hash format ("pbkdf2_sha256$<iter>$<salt>$<b64>"),
// so every existing lead-manager login keeps working after the migration.
export const USER_TABLE = "auth_user";
const HASH_ITERATIONS = 1_000_000; // Django 5.2 default
const DIGESTS = { pbkdf2_sha256: "sha256", pbkdf2_sha1: "sha1" };

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, 22);
  const hash = await pbkdf2(password, salt, HASH_ITERATIONS, 32, "sha256");
  return `pbkdf2_sha256$${HASH_ITERATIONS}$${salt}$${hash.toString("base64")}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, iterations, salt, expected] = String(encoded || "").split("$");
  const digest = DIGESTS[algorithm];
  if (!digest || !salt || !expected) return false; // unusable or unsupported hash
  const expectedBuf = Buffer.from(expected, "base64");
  const actual = await pbkdf2(password, salt, Number(iterations), expectedBuf.length, digest);
  return crypto.timingSafeEqual(actual, expectedBuf);
}

export function displayName(user) {
  return `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
}

export async function findUserByUsername(username) {
  const rows = await query(`SELECT * FROM ${USER_TABLE} WHERE username = ?`, [username]);
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await query(`SELECT * FROM ${USER_TABLE} WHERE id = ?`, [id]);
  return rows[0] || null;
}

export function issueTokens(user) {
  const sub = String(user.id);
  return {
    access: jwt.sign({ type: "access" }, config.jwt.secret, { subject: sub, expiresIn: config.jwt.accessTtl }),
    refresh: jwt.sign({ type: "refresh" }, config.jwt.secret, { subject: sub, expiresIn: config.jwt.refreshTtl }),
  };
}

/** Verifies a token of the given type and returns its still-active user, or null. */
export async function userFromToken(token, type) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
  if (payload.type !== type) return null;
  const user = await findUserById(payload.sub);
  return user && user.is_active ? user : null;
}

const TOKEN_INVALID = { detail: "Given token not valid for any token type", code: "token_not_valid" };

/** Requires a valid access token; attaches req.user. */
export async function requireAuth(req, res, next) {
  const match = /^Bearer\s+(.+)$/i.exec(req.get("Authorization") || "");
  if (!match) {
    return res.status(401).json({ detail: "Authentication credentials were not provided." });
  }
  const user = await userFromToken(match[1], "access");
  if (!user) return res.status(401).json(TOKEN_INVALID);
  req.user = user;
  next();
}

/** Requires an authenticated staff user (the lead-manager portal). */
export function requireStaff(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (!req.user.is_staff) {
      return res.status(403).json({ detail: "You do not have permission to perform this action." });
    }
    next();
  }).catch(next);
}
