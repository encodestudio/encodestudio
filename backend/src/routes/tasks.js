import { Hono } from "hono";
import { NOW, now, query, userNameSql } from "../db.js";
import { requireStaff } from "../auth.js";
import { logActivity } from "../leads.js";

// Follow-up tasks attached to leads.
const router = new Hono({ strict: false });
router.use(requireStaff);

const TASK_SELECT = `
  SELECT t.*, l.name AS lead_name, l.company AS lead_company, l.status AS lead_status,
         ${userNameSql("a")} AS assignee_name
  FROM lead_task t
  JOIN contact_lead l ON l.id = t.lead_id
  LEFT JOIN auth_user a ON a.id = t.assigned_to`;

function toTask(t) {
  return {
    id: t.id,
    lead: { id: t.lead_id, name: t.lead_name, company: t.lead_company, status: t.lead_status },
    title: t.title,
    notes: t.notes,
    due_at: t.due_at,
    assigned_to: t.assigned_to ? { id: t.assigned_to, name: t.assignee_name } : null,
    completed_at: t.completed_at,
    created_at: t.created_at,
  };
}

async function getTask(id) {
  const rows = await query(`${TASK_SELECT} WHERE t.id = ?`, [Number(id) || 0]);
  return rows[0] || null;
}

async function validate(body, errors, { partial }) {
  const data = {};
  if (!partial || body.title !== undefined) {
    const title = String(body.title ?? "").trim();
    if (!title) errors.title = ["This field may not be blank."];
    else if (title.length > 255) errors.title = ["Ensure this field has no more than 255 characters."];
    data.title = title;
  }
  if (body.notes !== undefined) data.notes = String(body.notes ?? "").slice(0, 5000);
  if (body.due_at !== undefined) {
    if (body.due_at === null || body.due_at === "") data.due_at = null;
    else {
      const due = new Date(body.due_at);
      if (Number.isNaN(due.getTime())) errors.due_at = ["Enter a valid date."];
      data.due_at = due;
    }
  }
  if (body.assigned_to !== undefined) {
    if (body.assigned_to === null || body.assigned_to === "") data.assigned_to = null;
    else {
      const rows = await query("SELECT id FROM auth_user WHERE id = ? AND is_staff = 1", [Number(body.assigned_to) || 0]);
      if (!rows.length) errors.assigned_to = ["Unknown team member."];
      data.assigned_to = Number(body.assigned_to);
    }
  }
  return data;
}

// GET /api/tasks/?scope=mine|all&state=open|done&lead=<id>
router.get("/", async (c) => {
  const q = c.req.query();
  const where = [];
  const params = [];
  if (q.lead) {
    where.push("t.lead_id = ?");
    params.push(Number(q.lead) || 0);
  }
  if (q.scope === "mine") {
    where.push("t.assigned_to = ?");
    params.push(c.get("user").id);
  }
  if (q.state === "done") where.push("t.completed_at IS NOT NULL");
  else if (q.state !== "all") where.push("t.completed_at IS NULL");
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order =
    q.state === "done" ? "t.completed_at DESC" : "t.completed_at IS NOT NULL, t.due_at IS NULL, t.due_at ASC, t.id";
  const rows = await query(`${TASK_SELECT} ${whereSql} ORDER BY ${order} LIMIT 500`, params);
  return c.json(rows.map(toTask));
});

// GET /api/tasks/summary/ — counts for the sidebar badge (the user's own open tasks).
router.get("/summary", async (c) => {
  const [row] = await query(
    `SELECT
       SUM(due_at < ${NOW}) AS overdue,
       SUM(due_at >= ${NOW} AND due_at < ${now("+1 day")}) AS due_soon,
       COUNT(*) AS open
     FROM lead_task WHERE completed_at IS NULL AND assigned_to = ?`,
    [c.get("user").id],
  );
  return c.json({ overdue: Number(row.overdue || 0), due_soon: Number(row.due_soon || 0), open: Number(row.open || 0) });
});

// POST /api/tasks/ — { lead_id, title, notes?, due_at?, assigned_to? }
router.post("/", async (c) => {
  const body = c.get("body");
  const user = c.get("user");
  const errors = {};
  const leadRows = await query("SELECT id FROM contact_lead WHERE id = ?", [Number(body.lead_id) || 0]);
  if (!leadRows.length) errors.lead_id = ["Unknown lead."];
  const data = await validate({ assigned_to: user.id, ...body }, errors, { partial: false });
  if (Object.keys(errors).length) return c.json(errors, 400);

  const result = await query(
    `INSERT INTO lead_task (lead_id, title, notes, due_at, assigned_to, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ${NOW})`,
    [leadRows[0].id, data.title, data.notes ?? "", data.due_at ?? null, data.assigned_to ?? null, user.id],
  );
  await logActivity(leadRows[0].id, user.id, "task_created", data.title, { task_id: result.insertId, due_at: data.due_at });
  return c.json(toTask(await getTask(result.insertId)), 201);
});

// PATCH /api/tasks/:id/ — { title?, notes?, due_at?, assigned_to?, completed? }
router.patch("/:id", async (c) => {
  const task = await getTask(c.req.param("id"));
  if (!task) return c.json({ detail: "Not found." }, 404);
  const body = c.get("body");
  const errors = {};
  const data = await validate(body, errors, { partial: true });
  if (Object.keys(errors).length) return c.json(errors, 400);

  const sets = Object.keys(data).map((key) => `${key} = ?`);
  const params = Object.values(data);
  if (body.completed !== undefined) {
    sets.push(body.completed ? `completed_at = COALESCE(completed_at, ${NOW})` : "completed_at = NULL");
  }
  if (sets.length) await query(`UPDATE lead_task SET ${sets.join(", ")} WHERE id = ?`, [...params, task.id]);
  if (body.completed === true && !task.completed_at) {
    await logActivity(task.lead_id, c.get("user").id, "task_completed", task.title, { task_id: task.id });
  }
  return c.json(toTask(await getTask(task.id)));
});

// DELETE /api/tasks/:id/
router.delete("/:id", async (c) => {
  const result = await query("DELETE FROM lead_task WHERE id = ?", [Number(c.req.param("id")) || 0]);
  if (!result.affectedRows) return c.json({ detail: "Not found." }, 404);
  return c.body(null, 204);
});

export default router;
