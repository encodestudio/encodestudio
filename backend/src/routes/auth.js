import { Router } from "express";
import { query } from "../db.js";
import {
  USER_TABLE,
  displayName,
  findUserByUsername,
  issueTokens,
  requireAuth,
  userFromToken,
  verifyPassword,
} from "../auth.js";

const router = Router();

// POST /api/auth/login/ — staff-only login for the /leads portal.
router.post("/login/", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password) {
    return res.status(400).json({ detail: "Username and password are required." });
  }

  const user = await findUserByUsername(username);
  if (!user || !user.is_active || !(await verifyPassword(password, user.password))) {
    return res.status(401).json({ detail: "No active account found with the given credentials" });
  }
  // The portal is not for regular website visitors, even with valid credentials.
  if (!user.is_staff) {
    return res.status(400).json({
      non_field_errors: ["This account is not authorized to access the lead management portal."],
    });
  }

  await query(`UPDATE ${USER_TABLE} SET last_login = UTC_TIMESTAMP(6) WHERE id = ?`, [user.id]);
  res.json({
    ...issueTokens(user),
    user: { username: user.username, name: displayName(user), is_superuser: Boolean(user.is_superuser) },
  });
});

// POST /api/auth/refresh/ — exchanges a refresh token for a new access +
// refresh pair (refresh tokens rotate on every use).
router.post("/refresh/", async (req, res) => {
  const user = await userFromToken(String(req.body?.refresh || ""), "refresh");
  if (!user) return res.status(401).json({ detail: "Token is invalid or expired", code: "token_not_valid" });
  res.json(issueTokens(user));
});

// GET /api/auth/me/
router.get("/me/", requireAuth, (req, res) => {
  const user = req.user;
  res.json({
    username: user.username,
    name: displayName(user),
    is_staff: Boolean(user.is_staff),
    is_superuser: Boolean(user.is_superuser),
  });
});

export default router;
