import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ReceiptText, Search, Settings } from "lucide-react";
import { fetchInvoiceSummary, fetchInvoices } from "../../lib/leadsApi.js";
import { PageHeader } from "./PortalLayout.jsx";
import { usePortal } from "./PortalContext.jsx";
import { EmptyState, InvoiceStatusBadge } from "./ui.jsx";
import { formatDay, formatInr } from "./format.js";

const TABS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "outstanding", label: "Unpaid" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" },
];

function Stat({ label, value, hint, tone }) {
  return (
    <div className="rounded-2xl border border-encode-border bg-white p-4">
      <p className="text-xs font-semibold text-encode-grey">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold tabular-nums ${tone || ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-encode-grey">{hint}</p>}
    </div>
  );
}

export default function InvoicesPage() {
  const { notify, user } = usePortal();
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    return fetchInvoices({ status, search: query })
      .then(setInvoices)
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [status, query, notify]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    fetchInvoiceSummary().then(setSummary).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="Invoices" subtitle="GST invoices, payments and what's still owed.">
        {user.is_superuser && (
          <Link to="/leads/invoices/settings" className="btn-secondary !px-4 !py-2.5">
            <Settings size={15} /> Settings
          </Link>
        )}
        <Link to="/leads/invoices/new" className="btn-primary !px-4 !py-2.5">
          <Plus size={16} /> New invoice
        </Link>
      </PageHeader>

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Outstanding" value={formatInr(summary.outstanding)} hint={`${summary.open_count} unpaid invoice${summary.open_count === 1 ? "" : "s"}`} />
          <Stat
            label="Overdue"
            value={formatInr(summary.overdue)}
            hint={`${summary.overdue_count} past due date`}
            tone={summary.overdue > 0 ? "text-red-600" : ""}
          />
          <Stat label="Received this month" value={formatInr(summary.paid_this_month)} tone="text-green-700" />
          <Stat label={`Invoiced in FY ${summary.current_fy}`} value={formatInr(summary.invoiced_this_fy)} hint={`incl. ${formatInr(summary.gst_this_fy)} GST`} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-full border border-encode-border bg-white p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${status === tab.value ? "bg-black text-white" : "text-black/60 hover:text-black"}`}
            >
              {tab.label}
              {tab.value === "draft" && summary?.drafts ? <span className="ml-1 opacity-60">{summary.drafts}</span> : null}
            </button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-encode-grey" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search number or client" className="input !py-2 !pl-9" />
        </label>
      </div>

      {!loading && invoices.length === 0 ? (
        <div className="rounded-2xl border border-encode-border bg-white">
          <EmptyState icon={ReceiptText} title={query || status ? "No matching invoices" : "No invoices yet"}>
            {query || status ? null : "Create one here, or from a lead's page so the client details fill in for you."}
          </EmptyState>
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-2xl border border-encode-border bg-white transition-opacity ${loading ? "opacity-50" : ""}`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-encode-border text-left text-xs font-semibold text-encode-grey">
                <th className="px-5 py-3">Invoice</th>
                <th className="px-3 py-3">Client</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Due</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3 text-right">Balance</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-encode-border">
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => navigate(`/leads/invoices/${inv.id}`)}
                  className="cursor-pointer hover:bg-encode-soft"
                >
                  <td className="px-5 py-3">
                    <Link to={`/leads/invoices/${inv.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                      {inv.number || <span className="text-encode-grey">Draft #{inv.id}</span>}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{inv.client_company || inv.client_name}</p>
                    {inv.client_company && <p className="text-xs text-encode-grey">{inv.client_name}</p>}
                  </td>
                  <td className="px-3 py-3 text-encode-grey">{formatDay(inv.issue_date)}</td>
                  <td className={`px-3 py-3 ${inv.display_status === "overdue" ? "font-semibold text-red-600" : "text-encode-grey"}`}>
                    {formatDay(inv.due_date)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatInr(inv.total)}</td>
                  <td className="px-3 py-3 text-right font-semibold tabular-nums">
                    {inv.status === "issued" ? formatInr(inv.balance) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <InvoiceStatusBadge status={inv.display_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
