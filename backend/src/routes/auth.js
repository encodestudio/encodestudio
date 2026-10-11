import { Hono } from "hono";
import { NOW, query } from "../db.js";
import {
  USER_TABLE,
  displayName,
  findUserByUsername,
  issueTokens,
  requireAuth,
  userFromToken,
  verifyPassword,
} from "../auth.js";

const router = new Hono({ strict: false });

// POST /api/auth/login/ — staff-only login for the /leads portal.
router.post("/login", async (c) => {
  const body = c.get("body");
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) {
    return c.json({ detail: "Username and password are required." }, 400);
  }

  const user = await findUserByUsername(username);
  if (!user || !user.is_active || !(await verifyPassword(password, user.password))) {
    return c.json({ detail: "No active account found with the given credentials" }, 401);
  }
  // The portal is not for regular website visitors, even with valid credentials.
  if (!user.is_staff) {
    return c.json(
      { non_field_errors: ["This account is not authorized to access the lead management portal."] },
      400,
    );
  }

  await query(`UPDATE ${USER_TABLE} SET last_login = ${NOW} WHERE id = ?`, [user.id]);
  return c.json({
    ...(await issueTokens(user)),
    user: { id: user.id, username: user.username, name: displayName(user), is_superuser: Boolean(user.is_superuser) },
  });
});

// POST /api/auth/refresh/ — exchanges a refresh token for a new access +
// refresh pair (refresh tokens rotate on every use).
router.post("/refresh", async (c) => {
  const user = await userFromToken(String(c.get("body").refresh || ""), "refresh");
  if (!user) return c.json({ detail: "Token is invalid or expired", code: "token_not_valid" }, 401);
  return c.json(await issueTokens(user));
});

// GET /api/auth/me/
router.get("/me", requireAuth, (c) => {
  const user = c.get("user");
  return c.json({
    id: user.id,
    username: user.username,
    name: displayName(user),
    is_staff: Boolean(user.is_staff),
    is_superuser: Boolean(user.is_superuser),
  });
});

export default router;
