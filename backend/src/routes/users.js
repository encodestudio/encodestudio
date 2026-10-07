import { Router } from "express";
import { query } from "../db.js";
import { USER_TABLE, displayName, hashPassword, requireStaff } from "../auth.js";

// Team members (lead-portal staff accounts).
const router = Router();
router.use(requireStaff);

function requireSuperuser(req, res, next) {
  if (!req.user.is_superuser) return res.status(403).json({ detail: "Only admins can manage the team." });
  next();
}

const toUser = (u) => ({
  id: u.id,
  username: u.username,
  name: displayName(u),
  first_name: u.first_name,
  last_name: u.last_name,
  email: u.email,
  is_superuser: Boolean(u.is_superuser),
  is_active: Boolean(u.is_active),
  last_login: u.last_login,
  date_joined: u.date_joined,
  open_leads: Number(u.open_leads ?? 0),
  open_tasks: Number(u.open_tasks ?? 0),
});

const USER_SELECT = `
  SELECT u.*,
    (SELECT COUNT(*) FROM contact_lead l WHERE l.owner_id = u.id AND l.status IN ('new', 'contacted', 'qualified')) AS open_leads,
    (SELECT COUNT(*) FROM lead_task t WHERE t.assigned_to = u.id AND t.completed_at IS NULL) AS open_tasks
  FROM ${USER_TABLE} u`;

async function getUser(id) {
  const rows = await query(`${USER_SELECT} WHERE u.id = ? AND u.is_staff = 1`, [Number(id) || 0]);
  return rows[0] || null;
}

function validate(body, errors, { creating }) {
  const data = {};
  if (creating) {
    const username = String(body.username ?? "").trim();
    if (!/^[\w.@+-]{1,150}$/.test(username)) errors.username = ["Use letters, digits and @/./+/-/_ only."];
    data.username = username;
  }
  for (const field of ["first_name", "last_name"]) {
    if (body[field] !== undefined) data[field] = String(body[field] ?? "").trim().slice(0, 150);
  }
  if (body.email !== undefined) {
    const email = String(body.email ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = ["Enter a valid email address."];
    data.email = email;
  }
  if (body.is_superuser !== undefined) data.is_superuser = body.is_superuser ? 1 : 0;
  if (body.is_active !== undefined) data.is_active = body.is_active ? 1 : 0;
  if (creating || body.password) {
    const password = String(body.password ?? "");
    if (password.length < 8) errors.password = ["Password must be at least 8 characters."];
    data.password = password;
  }
  return data;
}

// GET /api/users/ — everyone on the team (used for owner/assignee pickers).
router.get("/", async (req, res) => {
  const rows = await query(`${USER_SELECT} WHERE u.is_staff = 1 ORDER BY u.is_active DESC, u.first_name, u.username`);
  res.json(rows.map(toUser));
});

// POST /api/users/ — admins only.
router.post("/", requireSuperuser, async (req, res) => {
  const errors = {};
  const data = validate(req.body || {}, errors, { creating: true });
  if (!errors.username && (await query(`SELECT id FROM ${USER_TABLE} WHERE username = ?`, [data.username])).length) {
    errors.username = ["A user with that username already exists."];
  }
  if (Object.keys(errors).length) return res.status(400).json(errors);

  const result = await query(
    `INSERT INTO ${USER_TABLE}
       (password, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, UTC_TIMESTAMP(6))`,
    [
      await hashPassword(data.password),
      data.is_superuser ?? 0,
      data.username,
      data.first_name ?? "",
      data.last_name ?? "",
      data.email ?? "",
    ],
  );
  res.status(201).json(toUser(await getUser(result.insertId)));
});

// PATCH /api/users/:id/ — admins can edit anyone; everyone can edit their own name/email/password.
router.patch("/:id/", async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ detail: "Not found." });
  const isSelf = user.id === req.user.id;
  if (!isSelf && !req.user.is_superuser) return res.status(403).json({ detail: "Only admins can manage the team." });

  const body = { ...(req.body || {}) };
  if (!req.user.is_superuser) {
    delete body.is_superuser;
    delete body.is_active;
  }
  if (isSelf && (body.is_active === false || body.is_superuser === false)) {
    return res.status(400).json({ detail: "You can't deactivate or demote your own account." });
  }
  const errors = {};
  const data = validate(body, errors, { creating: false });
  if (Object.keys(errors).length) return res.status(400).json(errors);
  if (data.password) data.password = await hashPassword(data.password);

  if (Object.keys(data).length) {
    await query(`UPDATE ${USER_TABLE} SET ${Object.keys(data).map((k) => `${k} = ?`).join(", ")} WHERE id = ?`, [
      ...Object.values(data),
      user.id,
    ]);
  }
  res.json(toUser(await getUser(user.id)));
});

export default router;
