import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { LogOut, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import Logo from "../../components/Logo.jsx";
import StatusBadge, { STATUS_OPTIONS } from "./StatusBadge.jsx";
import LeadDetailModal from "./LeadDetailModal.jsx";
import { fetchLeads, fetchLeadStats, fetchInterests, logout } from "../../lib/leadsApi.js";

const STAT_CARDS = [
  { key: "total", label: "Total" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "converted", label: "Converted" },
  { key: "lost", label: "Lost" },
];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Dashboard({ user, onLoggedOut }) {
  const [leads, setLeads] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [interests, setInterests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [interestFilter, setInterestFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLead, setSelectedLead] = useState(null);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetchLeads({ page, search, status: statusFilter, interest: interestFilter }),
        fetchLeadStats(),
      ]);
      setLeads(leadsRes.results);
      setCount(leadsRes.count);
      setStats(statsRes);
    } catch (err) {
      setError(err.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, interestFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchInterests().then(setInterests).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, interestFilter]);

  const handleLogout = () => {
    logout();
    onLoggedOut();
  };

  const handleUpdated = (updatedLead) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    setSelectedLead(updatedLead);
    fetchLeadStats().then(setStats).catch(() => {});
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="min-h-screen bg-encode-soft">
      <header className="sticky top-0 z-10 border-b border-encode-border bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo className="h-7 w-auto" />
            <span className="rounded-full bg-encode-blueTint px-2.5 py-1 text-xs font-semibold text-encode-blueDark">
              Lead Manager
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-encode-grey">
              Signed in as <span className="font-semibold text-black">{user?.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-encode-border px-3.5 py-2 text-sm font-medium text-black/80 hover:border-black"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAT_CARDS.map((s) => (
            <div key={s.key} className="rounded-2xl border border-encode-border bg-white p-4">
              <p className="label">{s.label}</p>
              <p className="mt-1.5 text-2xl font-display font-bold">{stats ? stats[s.key] : "—"}</p>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-encode-grey" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, company, message..."
              className="input pl-10"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input sm:w-44">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select value={interestFilter} onChange={(e) => setInterestFilter(e.target.value)} className="input sm:w-56">
            <option value="">All interests</option>
            {interests.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <button
            onClick={load}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-encode-border bg-white text-encode-grey hover:border-black hover:text-black"
            aria-label="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* TABLE */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-encode-border bg-white">
          {error && <p className="p-6 text-sm text-red-600">{error}</p>}
          {!error && loading && <p className="p-6 text-sm text-encode-grey">Loading leads...</p>}
          {!error && !loading && leads.length === 0 && (
            <p className="p-6 text-sm text-encode-grey">No leads match these filters.</p>
          )}
          {!error && !loading && leads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-encode-border bg-encode-soft text-xs uppercase tracking-wide text-encode-grey">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Company</th>
                    <th className="px-5 py-3 font-semibold">Interest</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="cursor-pointer border-b border-encode-border last:border-0 hover:bg-encode-blueTint/40"
                    >
                      <td className="px-5 py-3.5 font-medium text-black">{lead.name}</td>
                      <td className="px-5 py-3.5 text-black/70">{lead.email}</td>
                      <td className="px-5 py-3.5 text-black/70">{lead.company || "—"}</td>
                      <td className="px-5 py-3.5 text-black/70">{lead.interest || "—"}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={lead.status} />
                      </td>
                      <td className="px-5 py-3.5 text-black/70">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {count > pageSize && (
          <div className="mt-4 flex items-center justify-between text-sm text-encode-grey">
            <span>
              Page {page} of {totalPages} — {count} lead{count === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-encode-border disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-encode-border disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedLead && (
          <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdated={handleUpdated} />
        )}
      </AnimatePresence>
    </div>
  );
}
