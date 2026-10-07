import { Router } from "express";
import { query } from "../db.js";
import { requireStaff } from "../auth.js";
import { LEAD_SELECT, OPEN_STATUSES, SOURCES, STATUSES, toManage } from "../leads.js";

// Dashboard analytics for the lead portal.
const router = Router();
router.use(requireStaff);

const DAY = 86_400_000;
const STAGES = ["new", "contacted", "qualified", "converted"];
const NAME = (alias) =>
  `COALESCE(NULLIF(TRIM(CONCAT(${alias}.first_name, ' ', ${alias}.last_name)), ''), ${alias}.username)`;

/** Start of the bucket containing `date`, in the viewer's local time (tz = minutes east of UTC). */
function bucketStart(date, granularity, tz) {
  const local = new Date(date.getTime() + tz * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  if (granularity === "week") local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7)); // Monday
  if (granularity === "month") local.setUTCDate(1);
  return local;
}

function nextBucket(date, granularity) {
  const d = new Date(date);
  if (granularity === "day") d.setUTCDate(d.getUTCDate() + 1);
  else if (granularity === "week") d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

const countBy = (rows, key) => {
  const out = {};
  for (const row of rows) {
    const k = typeof key === "function" ? key(row) : row[key];
    out[k] = (out[k] || 0) + 1;
  }
  return out;
};

// GET /api/analytics/?from=<iso>&to=<iso>&tz=<minutes east of UTC>
router.get("/", async (req, res) => {
  const to = req.query.to ? new Date(req.query.to) : new Date();
  let from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 30 * DAY);
  if (req.query.from === "all") {
    const [{ first }] = await query("SELECT MIN(created_at) AS first FROM contact_lead");
    from = first && to - first > 7 * DAY ? first : new Date(to.getTime() - 30 * DAY);
  }
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return res.status(400).json({ detail: "Invalid date range." });
  }
  const tz = Math.max(-840, Math.min(840, Number(req.query.tz) || 0));
  const span = to - from;
  const granularity = span <= 92 * DAY ? "day" : span <= 400 * DAY ? "week" : "month";

  // Leads created in the range — small enough to aggregate in JS.
  const leads = await query(
    `SELECT l.id, l.status, l.source, l.interest, l.priority, l.owner_id, l.deal_value, l.created_at,
            l.first_contacted_at, ${NAME("o")} AS owner_name
     FROM contact_lead l LEFT JOIN auth_user o ON o.id = l.owner_id
     WHERE l.created_at >= ? AND l.created_at < ?`,
    [from, to],
  );
  const [prev] = await query(`SELECT COUNT(*) AS n FROM contact_lead WHERE created_at >= ? AND created_at < ?`, [
    new Date(from.getTime() - span),
    from,
  ]);
  const won = await query(
    `SELECT status_changed_at, deal_value FROM contact_lead
     WHERE status = 'converted' AND status_changed_at >= ? AND status_changed_at < ?`,
    [from, to],
  );
  const [prevWon] = await query(
    `SELECT COUNT(*) AS n, COALESCE(SUM(deal_value), 0) AS value FROM contact_lead
     WHERE status = 'converted' AND status_changed_at >= ? AND status_changed_at < ?`,
    [new Date(from.getTime() - span), from],
  );
  const [pipeline] = await query(
    `SELECT COUNT(*) AS n, COALESCE(SUM(deal_value), 0) AS value FROM contact_lead WHERE status IN ('new', 'contacted', 'qualified')`,
  );
  const [tasks] = await query(
    `SELECT SUM(due_at < UTC_TIMESTAMP()) AS overdue, COUNT(*) AS open FROM lead_task WHERE completed_at IS NULL`,
  );

  // ---- KPIs
  const responded = leads.filter((l) => l.first_contacted_at);
  const avgResponseHours = responded.length
    ? responded.reduce((sum, l) => sum + (l.first_contacted_at - l.created_at), 0) / responded.length / 3_600_000
    : null;
  const convertedInCohort = leads.filter((l) => l.status === "converted").length;
  const kpis = {
    leads: leads.length,
    leads_prev: prev.n,
    converted: won.length,
    converted_prev: prevWon.n,
    conversion_rate: leads.length ? convertedInCohort / leads.length : 0,
    won_value: won.reduce((sum, l) => sum + Number(l.deal_value || 0), 0),
    won_value_prev: Number(prevWon.value),
    pipeline_value: Number(pipeline.value),
    open_leads: pipeline.n,
    avg_response_hours: avgResponseHours,
    responded_rate: leads.length ? responded.length / leads.length : 0,
    open_tasks: Number(tasks.open || 0),
    overdue_tasks: Number(tasks.overdue || 0),
  };

  // ---- Time series (zero-filled)
  const buckets = new Map();
  for (let b = bucketStart(from, granularity, tz); b.getTime() - tz * 60_000 < to.getTime(); b = nextBucket(b, granularity)) {
    buckets.set(b.toISOString().slice(0, 10), { date: b.toISOString().slice(0, 10), leads: 0, converted: 0 });
  }
  const bump = (date, key) => {
    const bucket = buckets.get(bucketStart(date, granularity, tz).toISOString().slice(0, 10));
    if (bucket) bucket[key] += 1;
  };
  leads.forEach((l) => bump(l.created_at, "leads"));
  won.forEach((l) => bump(l.status_changed_at, "converted"));

  // ---- Funnel: a lead "reached" a stage if it is at/after it now, or its
  // status history shows it got there before being marked lost.
  const reached = new Map(leads.map((l) => [l.id, Math.max(0, STAGES.indexOf(l.status))]));
  if (leads.length) {
    const history = await query(
      `SELECT lead_id, JSON_UNQUOTE(JSON_EXTRACT(meta, '$.to')) AS to_status FROM lead_activity
       WHERE type = 'status_change' AND lead_id IN (${leads.map(() => "?").join(", ")})`,
      leads.map((l) => l.id),
    );
    for (const { lead_id: id, to_status: status } of history) {
      reached.set(id, Math.max(reached.get(id) ?? 0, STAGES.indexOf(status)));
    }
  }
  const funnel = STAGES.map((stage, i) => ({
    stage,
    label: STATUSES[stage],
    count: [...reached.values()].filter((r) => r >= i).length,
  }));

  // ---- Breakdowns
  const byStatus = countBy(leads, "status");
  const bySource = countBy(leads, "source");
  const byInterest = countBy(leads, (l) => l.interest || "Not specified");
  const byPriority = countBy(leads, "priority");
  const owners = {};
  for (const l of leads) {
    const key = l.owner_id ?? 0;
    owners[key] ??= { id: l.owner_id, name: l.owner_name || "Unassigned", leads: 0, converted: 0, open: 0, value: 0 };
    owners[key].leads += 1;
    if (l.status === "converted") {
      owners[key].converted += 1;
      owners[key].value += Number(l.deal_value || 0);
    }
    if (OPEN_STATUSES.includes(l.status)) owners[key].open += 1;
  }

  // ---- When leads arrive (viewer's local weekday × hour, Monday first)
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const l of leads) {
    const local = new Date(l.created_at.getTime() + tz * 60_000);
    heatmap[(local.getUTCDay() + 6) % 7][local.getUTCHours()] += 1;
  }

  // ---- Activity feed + leads that need attention
  const recent = await query(
    `SELECT a.id, a.type, a.body, a.meta, a.created_at, a.lead_id, l.name AS lead_name, ${NAME("u")} AS user_name
     FROM lead_activity a JOIN contact_lead l ON l.id = a.lead_id LEFT JOIN auth_user u ON u.id = a.user_id
     WHERE a.type <> 'email_sent'
     ORDER BY a.created_at DESC, a.id DESC LIMIT 12`,
  );
  const stale = await query(
    `${LEAD_SELECT} WHERE l.status IN ('new', 'contacted', 'qualified') AND l.last_activity_at < UTC_TIMESTAMP() - INTERVAL 3 DAY
     ORDER BY l.last_activity_at ASC LIMIT 6`,
  );
  const unassigned = await query(
    `${LEAD_SELECT} WHERE l.status = 'new' AND l.owner_id IS NULL ORDER BY l.created_at DESC LIMIT 6`,
  );

  res.json({
    range: { from, to, granularity },
    kpis,
    timeseries: [...buckets.values()],
    funnel,
    by_status: Object.keys(STATUSES).map((s) => ({ key: s, label: STATUSES[s], count: byStatus[s] || 0 })),
    by_source: Object.entries(bySource)
      .map(([key, count]) => ({ key, label: SOURCES[key] || key, count }))
      .sort((a, b) => b.count - a.count),
    by_interest: Object.entries(byInterest)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    by_priority: ["high", "medium", "low"].map((p) => ({ key: p, count: byPriority[p] || 0 })),
    by_owner: Object.values(owners).sort((a, b) => b.leads - a.leads),
    heatmap,
    recent_activity: recent.map((a) => ({
      id: a.id,
      type: a.type,
      body: a.body,
      meta: a.meta,
      created_at: a.created_at,
      lead: { id: a.lead_id, name: a.lead_name },
      user: a.user_name ? { name: a.user_name } : null,
    })),
    attention: { stale: stale.map(toManage), unassigned: unassigned.map(toManage) },
  });
});

export default router;
