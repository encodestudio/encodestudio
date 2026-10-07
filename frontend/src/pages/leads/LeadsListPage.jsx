import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Filter, RefreshCw, Search, SearchX, X } from "lucide-react";
import { bulkUpdateLeads, exportLeadsCsv, fetchInterests, fetchLeads, fetchTags } from "../../lib/leadsApi.js";
import { PageHeader } from "./PortalLayout.jsx";
import { usePortal } from "./PortalContext.jsx";
import StatusBadge, { STATUS_OPTIONS } from "./StatusBadge.jsx";
import { Avatar, EmptyState, PriorityBadge, ScoreRing } from "./ui.jsx";
import { PRIORITY_OPTIONS, SOURCE_OPTIONS, formatMoney, timeAgo } from "./format.js";

const FILTER_KEYS = ["search", "status", "source", "priority", "owner", "interest", "tag", "stale", "overdue"];

const VIEWS = [
  { label: "All leads", params: {} },
  { label: "My leads", params: { owner: "me" } },
  { label: "My open leads", params: { owner: "me", status: "new,contacted,qualified" } },
  { label: "Unassigned", params: { owner: "none" } },
  { label: "Hot", params: { priority: "high", status: "new,contacted,qualified" } },
  { label: "Overdue follow-ups", params: { overdue: "1" } },
  { label: "Going cold", params: { stale: "1" } },
  { label: "Won", params: { status: "converted" } },
];

const COLUMNS = [
  { key: "name", label: "Lead", sort: "name" },
  { key: "status", label: "Stage", sort: "status" },
  { key: "priority", label: "Priority", sort: "priority" },
  { key: "score", label: "Score" },
  { key: "owner", label: "Owner" },
  { key: "deal_value", label: "Value", sort: "deal_value", align: "right" },
  { key: "source", label: "Source" },
  { key: "last_activity_at", label: "Last activity", sort: "last_activity_at" },
  { key: "created_at", label: "Received", sort: "created_at" },
];

function sameView(params, view) {
  return FILTER_KEYS.every((k) => (params.get(k) || "") === (view.params[k] || ""));
}

export default function LeadsListPage() {
  const { activeUsers, notify, dataVersion } = usePortal();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ count: 0, results: [] });
  const [interests, setInterests] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [searchDraft, setSearchDraft] = useState(params.get("search") || "");
  const [showFilters, setShowFilters] = useState(false);

  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("page_size") || 25);
  const ordering = params.get("ordering") || "-created_at";
  const query = Object.fromEntries([...params.entries()]);
  const paramsKey = params.toString();

  const update = useCallback(
    (changes, { keepPage = false } = {}) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(changes)) {
        if (v === "" || v == null) next.delete(k);
        else next.set(k, v);
      }
      if (!keepPage) next.delete("page");
      setParams(next);
    },
    [params, setParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchLeads({ ...query, page, page_size: pageSize, ordering });
      setData(res);
    } catch (err) {
      if (err.message === "Invalid page." && page > 1) update({ page: "" });
      else setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paramsKey captures every input
  }, [paramsKey, dataVersion]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchInterests().then(setInterests).catch(() => {});
    fetchTags().then(setTags).catch(() => {});
  }, [dataVersion]);

  // Debounced search box → URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("search") || "") !== searchDraft) update({ search: searchDraft });
    }, 300);
    return () => clearTimeout(t);
  }, [searchDraft, params, update]);

  useEffect(() => setSelected(new Set()), [paramsKey]);

  const toggleSort = (field) => update({ ordering: ordering === `-${field}` ? field : `-${field}` }, { keepPage: true });
  const toggleAll = () =>
    setSelected((s) => (s.size === data.results.length ? new Set() : new Set(data.results.map((l) => l.id))));
  const toggleOne = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = async (action, value) => {
    if (action === "delete" && !window.confirm(`Delete ${selected.size} lead(s)? This can't be undone.`)) return;
    try {
      const res = await bulkUpdateLeads([...selected], action, value);
      notify(`${res.updated} lead${res.updated === 1 ? "" : "s"} updated`);
      setSelected(new Set());
      load();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const handleExport = async () => {
    try {
      await exportLeadsCsv({ ...query, ordering });
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const activeFilterCount = FILTER_KEYS.filter((k) => k !== "search" && params.get(k)).length;
  const totalPages = Math.max(1, Math.ceil(data.count / pageSize));

  return (
    <div>
      <PageHeader title="Leads" subtitle={`${data.count} lead${data.count === 1 ? "" : "s"} match`}>
        <button onClick={handleExport} className="btn-secondary !px-4 !py-2 text-xs">
          <Download size={14} /> Export CSV
        </button>
      </PageHeader>

      {/* Saved views */}
      <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {VIEWS.map((v) => {
          const active = sameView(params, v);
          return (
            <button
              key={v.label}
              onClick={() => {
                setSearchDraft("");
                setParams(new URLSearchParams(v.params));
              }}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active ? "border-black bg-black text-white" : "border-encode-border bg-white text-black/70 hover:border-black"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-encode-grey" />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search name, email, phone, company, message, tags..."
            className="input !pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium ${
            showFilters || activeFilterCount ? "border-black bg-white" : "border-encode-border bg-white text-black/70"
          }`}
        >
          <Filter size={15} /> Filters
          {activeFilterCount > 0 && <span className="rounded-full bg-black px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
        </button>
        <button onClick={load} className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl border border-encode-border bg-white text-encode-grey hover:border-black hover:text-black sm:self-auto" aria-label="Refresh">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 grid gap-3 rounded-2xl border border-encode-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <select value={params.get("status") || ""} onChange={(e) => update({ status: e.target.value })} className="input" aria-label="Stage">
            <option value="">All stages</option>
            <option value="new,contacted,qualified">Open (not won/lost)</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={params.get("owner") || ""} onChange={(e) => update({ owner: e.target.value })} className="input" aria-label="Owner">
            <option value="">Any owner</option>
            <option value="me">Me</option>
            <option value="none">Unassigned</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <select value={params.get("priority") || ""} onChange={(e) => update({ priority: e.target.value })} className="input" aria-label="Priority">
            <option value="">Any priority</option>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={params.get("source") || ""} onChange={(e) => update({ source: e.target.value })} className="input" aria-label="Source">
            <option value="">Any source</option>
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select value={params.get("interest") || ""} onChange={(e) => update({ interest: e.target.value })} className="input" aria-label="Interest">
            <option value="">Any interest</option>
            {interests.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
          <select value={params.get("tag") || ""} onChange={(e) => update({ tag: e.target.value })} className="input" aria-label="Tag">
            <option value="">Any tag</option>
            {tags.map((t) => (
              <option key={t.tag} value={t.tag}>
                #{t.tag} ({t.count})
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={params.get("overdue") === "1"} onChange={(e) => update({ overdue: e.target.checked ? "1" : "" })} className="h-4 w-4 accent-black" />
            Has overdue follow-up
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={params.get("stale") === "1"} onChange={(e) => update({ stale: e.target.checked ? "1" : "" })} className="h-4 w-4 accent-black" />
            Idle 3+ days
          </label>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setParams(new URLSearchParams(params.get("search") ? { search: params.get("search") } : {}))}
              className="flex items-center gap-1 text-sm font-medium text-encode-grey hover:text-black sm:col-span-2 lg:col-span-4"
            >
              <X size={14} /> Clear filters
            </button>
          )}
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm text-white shadow-lg lg:top-4">
          <span className="mr-2 font-semibold">{selected.size} selected</span>
          <select defaultValue="" onChange={(e) => e.target.value && runBulk("status", e.target.value)} className="rounded-lg bg-white/10 px-2 py-1.5 text-xs" aria-label="Move to stage">
            <option value="">Move to stage…</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="text-black">
                {o.label}
              </option>
            ))}
          </select>
          <select defaultValue="" onChange={(e) => e.target.value && runBulk("owner", e.target.value === "none" ? null : e.target.value)} className="rounded-lg bg-white/10 px-2 py-1.5 text-xs" aria-label="Assign to">
            <option value="">Assign to…</option>
            <option value="none" className="text-black">
              Unassigned
            </option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id} className="text-black">
                {u.name}
              </option>
            ))}
          </select>
          <select defaultValue="" onChange={(e) => e.target.value && runBulk("priority", e.target.value)} className="rounded-lg bg-white/10 px-2 py-1.5 text-xs" aria-label="Set priority">
            <option value="">Set priority…</option>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="text-black">
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const tag = window.prompt("Tag to add:");
              if (tag) runBulk("add_tag", tag);
            }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
          >
            Add tag
          </button>
          <button onClick={() => runBulk("delete")} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold hover:bg-red-700">
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto rounded-lg p-1.5 hover:bg-white/10" aria-label="Clear selection">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-encode-border bg-white">
        {error && <p className="p-6 text-sm text-red-600">{error}</p>}
        {!error && !loading && data.results.length === 0 && (
          <EmptyState icon={SearchX} title="No leads match">
            Try a different view or clear some filters.
          </EmptyState>
        )}
        {!error && data.results.length > 0 && (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="border-b border-encode-border bg-encode-soft text-xs uppercase tracking-wide text-encode-grey">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selected.size === data.results.length} onChange={toggleAll} className="h-4 w-4 accent-black" aria-label="Select all" />
                  </th>
                  {COLUMNS.map((c) => {
                    const sorted = ordering.replace(/^-/, "") === c.sort;
                    return (
                      <th key={c.key} className={`px-3 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`} aria-sort={sorted ? (ordering.startsWith("-") ? "descending" : "ascending") : undefined}>
                        {c.sort ? (
                          <button onClick={() => toggleSort(c.sort)} className={`inline-flex items-center gap-1 uppercase hover:text-black ${sorted ? "text-black" : ""}`}>
                            {c.label}
                            {sorted && (ordering.startsWith("-") ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                          </button>
                        ) : (
                          c.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.results.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/lead/${lead.id}`)}
                    className={`cursor-pointer border-b border-encode-border last:border-0 hover:bg-encode-blueTint/40 ${selected.has(lead.id) ? "bg-encode-blueTint/50" : ""}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)} className="h-4 w-4 accent-black" aria-label={`Select ${lead.name}`} />
                    </td>
                    <td className="max-w-[240px] px-3 py-3">
                      <p className="truncate font-semibold text-black">{lead.name}</p>
                      <p className="truncate text-xs text-encode-grey">{lead.company || lead.email}</p>
                      {(lead.tags.length > 0 || lead.open_tasks > 0) && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {lead.next_task_due_at && new Date(lead.next_task_due_at) < new Date() && (
                            <span className="rounded bg-red-50 px-1.5 text-[10px] font-semibold text-red-700">overdue</span>
                          )}
                          {lead.tags.slice(0, 3).map((t) => (
                            <span key={t} className="rounded bg-encode-blueTint px-1.5 text-[10px] font-medium text-encode-blueDark">
                              #{t}
                            </span>
                          ))}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-3 py-3">
                      <PriorityBadge priority={lead.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <ScoreRing score={lead.score} size={32} />
                    </td>
                    <td className="px-3 py-3">
                      {lead.owner ? (
                        <span className="flex items-center gap-2">
                          <Avatar name={lead.owner.name} size="xs" />
                          <span className="truncate text-black/80">{lead.owner.name}</span>
                        </span>
                      ) : (
                        <span className="text-encode-grey">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{formatMoney(lead.deal_value, true)}</td>
                    <td className="px-3 py-3 text-black/70">{lead.source_display}</td>
                    <td className="px-3 py-3 text-black/70">{timeAgo(lead.last_activity_at)}</td>
                    <td className="px-3 py-3 text-black/70">{timeAgo(lead.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!error && loading && data.results.length === 0 && <p className="p-6 text-sm text-encode-grey">Loading leads...</p>}
      </div>

      {/* Pagination */}
      {data.count > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-encode-grey">
          <span className="flex items-center gap-2">
            Rows
            <select value={pageSize} onChange={(e) => update({ page_size: e.target.value })} className="rounded-lg border border-encode-border bg-white px-2 py-1 text-black">
              {[25, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button onClick={() => update({ page: page - 1 }, { keepPage: true })} disabled={page <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg border border-encode-border bg-white disabled:opacity-40" aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => update({ page: page + 1 }, { keepPage: true })} disabled={page >= totalPages} className="flex h-9 w-9 items-center justify-center rounded-lg border border-encode-border bg-white disabled:opacity-40" aria-label="Next page">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
