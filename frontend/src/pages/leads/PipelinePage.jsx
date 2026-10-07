import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { CalendarClock, Search } from "lucide-react";
import { fetchBoard, updateLead } from "../../lib/leadsApi.js";
import { PageHeader } from "./PortalLayout.jsx";
import { usePortal } from "./PortalContext.jsx";
import { Avatar, Field, Modal, PriorityBadge, ScoreRing } from "./ui.jsx";
import { formatMoney, timeAgo } from "./format.js";

const COLUMN_ACCENT = {
  new: "border-t-encode-blue",
  contacted: "border-t-[#6B7280]",
  qualified: "border-t-black",
  converted: "border-t-green-600",
  lost: "border-t-red-500",
};

function LeadCard({ lead, onDragStart, dragging }) {
  const overdue = lead.next_task_due_at && new Date(lead.next_task_due_at) < new Date();
  return (
    <Link
      to={`/leads/lead/${lead.id}`}
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      className={`block rounded-xl border border-encode-border bg-white p-3 shadow-sm transition hover:border-black/30 hover:shadow-md ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-black">{lead.name}</p>
          <p className="truncate text-xs text-encode-grey">{lead.company || lead.interest || lead.email}</p>
        </div>
        <ScoreRing score={lead.score} size={30} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PriorityBadge priority={lead.priority} />
          {lead.open_tasks > 0 && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                overdue ? "bg-red-50 text-red-700" : "bg-encode-soft text-encode-grey"
              }`}
              title={overdue ? "Follow-up overdue" : "Open follow-ups"}
            >
              <CalendarClock size={11} /> {lead.open_tasks}
            </span>
          )}
        </div>
        <span className="text-xs font-semibold text-black">{lead.deal_value ? formatMoney(lead.deal_value, true) : ""}</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-encode-border pt-2 text-[11px] text-encode-grey">
        <span>{timeAgo(lead.last_activity_at)}</span>
        {lead.owner ? <Avatar name={lead.owner.name} size="xs" /> : <span>Unassigned</span>}
      </div>
    </Link>
  );
}

export default function PipelinePage() {
  const { activeUsers, notify, dataVersion } = usePortal();
  const [columns, setColumns] = useState([]);
  const [owner, setOwner] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragged, setDragged] = useState(null);
  const [overColumn, setOverColumn] = useState(null);
  const [pendingLost, setPendingLost] = useState(null);
  const [lostReason, setLostReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    return fetchBoard({ owner, search: query })
      .then((d) => setColumns(d.columns))
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [owner, query, notify]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const moveLead = async (lead, status, extra = {}) => {
    const previous = columns;
    // Optimistic move so the board feels instant.
    setColumns((cols) =>
      cols.map((c) => {
        if (c.status === lead.status) {
          return { ...c, count: c.count - 1, value: c.value - (lead.deal_value || 0), leads: c.leads.filter((l) => l.id !== lead.id) };
        }
        if (c.status === status) {
          return { ...c, count: c.count + 1, value: c.value + (lead.deal_value || 0), leads: [{ ...lead, status }, ...c.leads] };
        }
        return c;
      }),
    );
    try {
      await updateLead(lead.id, { status, ...extra });
      notify(`${lead.name} moved to ${columns.find((c) => c.status === status)?.label}`);
      load();
    } catch (err) {
      setColumns(previous);
      notify(err.message, "error");
    }
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    setOverColumn(null);
    const lead = dragged;
    setDragged(null);
    if (!lead || lead.status === status) return;
    if (status === "lost") {
      setLostReason("");
      setPendingLost(lead);
    } else {
      moveLead(lead, status);
    }
  };

  const totalOpen = columns.filter((c) => ["new", "contacted", "qualified"].includes(c.status)).reduce((s, c) => s + c.value, 0);

  return (
    <div>
      <PageHeader title="Pipeline" subtitle={`Open pipeline value ${formatMoney(totalOpen)} · drag cards to move them between stages`}>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-encode-grey" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter cards..." className="input !w-52 !py-2 !pl-9" />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="input !w-44 !py-2" aria-label="Owner">
          <option value="">Everyone</option>
          <option value="me">My leads</option>
          <option value="none">Unassigned</option>
          {activeUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </PageHeader>

      <div className={`-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 ${loading && columns.length ? "opacity-60" : ""}`}>
        {columns.map((col) => (
          <section
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(col.status);
            }}
            onDragLeave={() => setOverColumn((c) => (c === col.status ? null : c))}
            onDrop={(e) => handleDrop(e, col.status)}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border border-t-4 bg-encode-soft/60 transition-colors ${COLUMN_ACCENT[col.status]} ${
              overColumn === col.status && dragged?.status !== col.status ? "border-encode-blue bg-encode-blueTint/60" : "border-encode-border"
            }`}
            aria-label={`${col.label} column`}
          >
            <header className="flex items-baseline justify-between px-4 pb-2 pt-3">
              <h2 className="text-sm font-bold">
                {col.label} <span className="ml-1 font-normal text-encode-grey">{col.count}</span>
              </h2>
              <span className="text-xs font-semibold text-encode-grey">{formatMoney(col.value, true)}</span>
            </header>
            <div className="flex max-h-[calc(100vh-15rem)] min-h-[160px] flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">
              {col.leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  dragging={dragged?.id === lead.id}
                  onDragStart={(e, l) => {
                    e.dataTransfer.effectAllowed = "move";
                    setDragged(l);
                  }}
                />
              ))}
              {col.leads.length === 0 && <p className="py-8 text-center text-xs text-encode-grey">Drop leads here</p>}
              {col.count > col.leads.length && (
                <Link to={`/leads/list?status=${col.status}`} className="py-2 text-center text-xs font-semibold text-encode-blueDark hover:underline">
                  + {col.count - col.leads.length} more in list view
                </Link>
              )}
            </div>
          </section>
        ))}
      </div>

      <AnimatePresence>
        {pendingLost && (
          <Modal title={`Mark ${pendingLost.name} as lost`} onClose={() => setPendingLost(null)}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                moveLead(pendingLost, "lost", { lost_reason: lostReason });
                setPendingLost(null);
              }}
              className="space-y-4"
            >
              <Field label="Why was it lost?">
                <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="input">
                  <option value="">Choose a reason (optional)</option>
                  {["Budget", "Chose a competitor", "No response", "Timing / not now", "Not a fit", "Duplicate / spam"].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPendingLost(null)} className="btn-secondary !px-5 !py-2.5">
                  Cancel
                </button>
                <button type="submit" className="btn-primary !px-5 !py-2.5">
                  Mark as lost
                </button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
