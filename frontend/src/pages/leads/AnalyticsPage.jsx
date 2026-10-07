import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, Inbox, UserX } from "lucide-react";
import { fetchAnalytics } from "../../lib/leadsApi.js";
import { PageHeader } from "./PortalLayout.jsx";
import { usePortal } from "./PortalContext.jsx";
import ActivityItem from "./ActivityItem.jsx";
import { Avatar, Card, EmptyState, PriorityBadge } from "./ui.jsx";
import { CHART, formatHours, formatMoney, timeAgo } from "./format.js";

const RANGES = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "12m", label: "12 months", days: 365 },
  { key: "all", label: "All time" },
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function rangeParams(key) {
  const range = RANGES.find((r) => r.key === key) || RANGES[1];
  const to = new Date();
  return {
    from: range.days ? new Date(to.getTime() - range.days * 86_400_000).toISOString() : "all",
    to: to.toISOString(),
    tz: -to.getTimezoneOffset(),
  };
}

function Delta({ now, prev, invert = false }) {
  if (prev == null || (now === 0 && prev === 0)) return <span className="text-xs text-encode-grey">no change</span>;
  if (prev === 0) return <span className="text-xs text-encode-grey">new this period</span>;
  const pct = ((now - prev) / prev) * 100;
  const good = invert ? pct < 0 : pct > 0;
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${pct === 0 ? "text-encode-grey" : good ? "text-green-700" : "text-red-600"}`}>
      <Icon size={13} />
      {Math.abs(pct).toFixed(0)}% <span className="font-normal text-encode-grey">vs previous</span>
    </span>
  );
}

function Kpi({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-encode-border bg-white p-4">
      <p className="label !text-[10px]">{label}</p>
      <p className="mt-2 text-2xl font-display font-bold tracking-tight">{value}</p>
      <div className="mt-1 min-h-[18px]">{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-encode-border bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-encode-grey">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-3 rounded" style={{ background: p.color }} />
          <span className="font-bold text-black">{p.value}</span>
          <span className="text-encode-grey">{p.name}</span>
        </p>
      ))}
    </div>
  );
}

/** Single-series horizontal bars, values labelled at the bar end. */
function HBarChart({ data, dataKey = "count", nameKey = "label", height }) {
  if (!data.length) return <EmptyState title="No data in this period" />;
  return (
    <ResponsiveContainer width="100%" height={height || Math.max(120, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={6}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey={nameKey} width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#374151" }} />
        <Tooltip cursor={{ fill: "#F7F9FB" }} content={<ChartTooltip />} />
        <Bar dataKey={dataKey} name="leads" fill={CHART.series1} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
          <LabelList dataKey={dataKey} position="right" style={{ fontSize: 12, fill: "#0A0A0A", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function Funnel({ stages }) {
  const top = stages[0]?.count || 0;
  if (!top) return <EmptyState title="No leads in this period" />;
  return (
    <ol className="space-y-3">
      {stages.map((s, i) => {
        const pct = top ? (s.count / top) * 100 : 0;
        const stepRate = i > 0 && stages[i - 1].count ? (s.count / stages[i - 1].count) * 100 : null;
        return (
          <li key={s.stage}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-semibold text-black">{s.label}</span>
              <span className="text-encode-grey">
                <span className="font-bold text-black">{s.count}</span> · {pct.toFixed(0)}% of leads
                {stepRate != null && <> · {stepRate.toFixed(0)}% from previous</>}
              </span>
            </div>
            <div className="h-7 rounded-md bg-encode-soft">
              <div
                className="h-full rounded-md transition-all"
                style={{ width: `${Math.max(pct, s.count ? 2 : 0)}%`, background: CHART.ordinal[i] }}
                title={`${s.label}: ${s.count}`}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Heatmap({ grid }) {
  const max = Math.max(1, ...grid.flat());
  const color = (v) => (v === 0 ? CHART.sequential[0] : CHART.sequential[Math.min(6, 1 + Math.floor((v / max) * 5.999))]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="text-[10px] font-normal text-encode-grey">
                {h % 3 === 0 ? `${h}` : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, d) => (
            <tr key={d}>
              <th className="pr-2 text-right text-[11px] font-medium text-encode-grey">{WEEKDAYS[d]}</th>
              {row.map((v, h) => (
                <td
                  key={h}
                  title={`${WEEKDAYS[d]} ${h}:00–${h + 1}:00 — ${v} lead${v === 1 ? "" : "s"}`}
                  className="h-5 rounded-[3px] hover:outline hover:outline-2 hover:outline-black"
                  style={{ background: color(v) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-encode-grey">
        Fewer
        {CHART.sequential.map((c) => (
          <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}

function LeadRow({ lead, meta }) {
  return (
    <Link to={`/leads/lead/${lead.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-encode-soft">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{lead.name}</p>
        <p className="truncate text-xs text-encode-grey">{lead.company || lead.email}</p>
      </div>
      <span className="shrink-0 text-xs text-encode-grey">{meta}</span>
    </Link>
  );
}

export default function AnalyticsPage() {
  const { user, dataVersion } = usePortal();
  const [params, setParams] = useSearchParams();
  const rangeKey = params.get("range") || "30d";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAnalytics(rangeParams(rangeKey))
      .then((d) => !cancelled && (setData(d), setError("")))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [rangeKey, dataVersion]);

  const formatBucket = useMemo(() => {
    const g = data?.range.granularity;
    return (iso) => {
      const d = new Date(`${iso}T00:00:00`);
      if (g === "month") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      if (g === "week") return `Wk of ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
      return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    };
  }, [data?.range.granularity]);

  const k = data?.kpis;
  const firstName = user.name.split(" ")[0];

  return (
    <div>
      <PageHeader title={`Hello, ${firstName}`} subtitle="Here's how your pipeline is doing.">
        <div className="flex rounded-full border border-encode-border bg-white p-1" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setParams({ range: r.key })}
              aria-pressed={rangeKey === r.key}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                rangeKey === r.key ? "bg-black text-white" : "text-black/60 hover:text-black"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      {!data && loading && <p className="text-sm text-encode-grey">Loading analytics...</p>}

      {data && (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="New leads" value={k.leads}>
              <Delta now={k.leads} prev={k.leads_prev} />
            </Kpi>
            <Kpi label="Won" value={k.converted}>
              <Delta now={k.converted} prev={k.converted_prev} />
            </Kpi>
            <Kpi label="Conversion rate" value={`${(k.conversion_rate * 100).toFixed(1)}%`}>
              <span className="text-xs text-encode-grey">of leads in this period</span>
            </Kpi>
            <Kpi label="Revenue won" value={formatMoney(k.won_value, true)}>
              <Delta now={k.won_value} prev={k.won_value_prev} />
            </Kpi>
            <Kpi label="Open pipeline" value={formatMoney(k.pipeline_value, true)}>
              <span className="text-xs text-encode-grey">{k.open_leads} open leads</span>
            </Kpi>
            <Kpi label="Avg. first response" value={formatHours(k.avg_response_hours)}>
              <span className="text-xs text-encode-grey">{(k.responded_rate * 100).toFixed(0)}% contacted</span>
            </Kpi>
          </div>

          {/* Trend + funnel */}
          <div className="grid gap-5 xl:grid-cols-3">
            <Card title="Leads over time" className="xl:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.timeseries} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="leadsFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor={CHART.series1} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={CHART.series1} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="date" tickFormatter={formatBucket} tick={{ fontSize: 11, fill: CHART.axis }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: CHART.axis }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip labelFormatter={formatBucket} />} cursor={{ stroke: "#9CA3AF", strokeWidth: 1 }} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="leads" name="New leads" stroke={CHART.series1} strokeWidth={2} fill="url(#leadsFill)" activeDot={{ r: 4 }} isAnimationActive={false} />
                  <Area type="monotone" dataKey="converted" name="Won" stroke={CHART.series2} strokeWidth={2} fill="none" activeDot={{ r: 4 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Conversion funnel">
              <Funnel stages={data.funnel} />
              <p className="mt-4 text-xs text-encode-grey">Leads created in this period, by the furthest stage they reached.</p>
            </Card>
          </div>

          {/* Breakdowns */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="By stage">
              <HBarChart data={data.by_status} />
            </Card>
            <Card title="By source">
              <HBarChart data={data.by_source} />
            </Card>
            <Card title="By interest">
              <HBarChart data={data.by_interest.slice(0, 8)} />
            </Card>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Card title="When leads arrive" className="xl:col-span-2">
              <Heatmap grid={data.heatmap} />
            </Card>
            <Card title="By priority">
              <div className="space-y-3">
                {data.by_priority.map((p) => (
                  <div key={p.key} className="flex items-center justify-between">
                    <PriorityBadge priority={p.key} />
                    <span className="text-sm font-bold">{p.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Team */}
          <Card title="Team performance" bodyClassName="overflow-x-auto">
            {data.by_owner.length === 0 ? (
              <EmptyState title="No leads in this period" />
            ) : (
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-encode-border text-xs uppercase tracking-wide text-encode-grey">
                    <th className="px-5 py-2.5 font-semibold">Owner</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Leads</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Open</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Won</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Win rate</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_owner.map((o) => (
                    <tr key={o.id ?? "none"} className="border-b border-encode-border last:border-0">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          {o.id ? <Avatar name={o.name} size="xs" /> : <UserX size={16} className="text-encode-grey" />}
                          <span className={o.id ? "font-medium" : "text-encode-grey"}>{o.name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">{o.leads}</td>
                      <td className="px-5 py-3 text-right">{o.open}</td>
                      <td className="px-5 py-3 text-right">{o.converted}</td>
                      <td className="px-5 py-3 text-right">{o.leads ? `${((o.converted / o.leads) * 100).toFixed(0)}%` : "—"}</td>
                      <td className="px-5 py-3 text-right">{formatMoney(o.value, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Attention + activity */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card
              title={
                <span className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-600" /> Going cold
                </span>
              }
              action={
                <Link to="/leads/list?stale=1" className="text-xs font-semibold text-encode-blueDark hover:underline">
                  View all
                </Link>
              }
              bodyClassName="p-3"
            >
              {data.attention.stale.length ? (
                data.attention.stale.map((l) => <LeadRow key={l.id} lead={l} meta={`idle ${timeAgo(l.last_activity_at).replace(" ago", "")}`} />)
              ) : (
                <EmptyState title="Nothing going cold">Every open lead has been touched in the last 3 days.</EmptyState>
              )}
            </Card>
            <Card
              title={
                <span className="flex items-center gap-2">
                  <Inbox size={15} className="text-encode-blueDark" /> Unassigned new leads
                </span>
              }
              action={
                <Link to="/leads/list?owner=none&status=new" className="text-xs font-semibold text-encode-blueDark hover:underline">
                  View all
                </Link>
              }
              bodyClassName="p-3"
            >
              {data.attention.unassigned.length ? (
                data.attention.unassigned.map((l) => <LeadRow key={l.id} lead={l} meta={timeAgo(l.created_at)} />)
              ) : (
                <EmptyState title="All caught up">Every new lead has an owner.</EmptyState>
              )}
            </Card>
            <Card
              title={
                <span className="flex items-center gap-2">
                  <Clock size={15} className="text-encode-grey" /> Recent activity
                </span>
              }
              bodyClassName="max-h-[420px] overflow-y-auto px-5 py-3"
            >
              {data.recent_activity.length ? (
                <ul className="space-y-3">
                  {data.recent_activity.map((a) => (
                    <ActivityItem key={a.id} activity={a} compact />
                  ))}
                </ul>
              ) : (
                <EmptyState title="No activity yet" />
              )}
            </Card>
          </div>

          {k.overdue_tasks > 0 && (
            <Link to="/leads/tasks" className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 hover:bg-red-100">
              <span>
                <strong>{k.overdue_tasks}</strong> overdue follow-up{k.overdue_tasks === 1 ? "" : "s"} across the team
              </span>
              <span className="font-semibold">Open tasks →</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
