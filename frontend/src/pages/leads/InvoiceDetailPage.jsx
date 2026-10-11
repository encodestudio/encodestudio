import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Ban, Copy, CopyPlus, Download, ExternalLink, Pencil, Send, Trash2 } from "lucide-react";
import {
  addInvoicePayment,
  deleteInvoice,
  deleteInvoicePayment,
  duplicateInvoice,
  fetchInvoice,
  fetchInvoiceSettings,
  issueInvoice,
  sendInvoice,
  voidInvoice,
} from "../../lib/leadsApi.js";
import { todayInIndia } from "../../lib/invoiceMath.js";
import { usePortal } from "./PortalContext.jsx";
import InvoiceDocument from "./InvoiceDocument.jsx";
import { Card, Field, InvoiceStatusBadge, Modal } from "./ui.jsx";
import { PAYMENT_METHOD_OPTIONS, formatDate, formatDay, formatInr, timeAgo } from "./format.js";

function SendModal({ invoice, onClose, onSent }) {
  const { notify } = usePortal();
  const [to, setTo] = useState(invoice.client_email);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      onSent(await sendInvoice(invoice.id, { to, message }));
      notify(`Invoice emailed to ${to}`);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal title={`Email ${invoice.number}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="To">
          <input type="email" required value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </Field>
        <Field label="Message (optional)">
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please find your invoice below. You can view, download or print it using the button."
            className="input"
          />
        </Field>
        <p className="text-xs text-encode-grey">
          The client gets a link to view and download the invoice. You're CC'd, and replies come to your business email.
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary !px-4 !py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={sending} className="btn-primary !px-4 !py-2.5">
            <Send size={15} /> {sending ? "Sending..." : "Send invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentForm({ invoice, onSaved }) {
  const { notify } = usePortal();
  const [form, setForm] = useState({ amount: invoice.balance, paid_on: todayInIndia(), method: "bank_transfer", reference: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm((f) => ({ ...f, amount: invoice.balance })), [invoice.balance]);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await addInvoicePayment(invoice.id, { ...form, amount: Number(form.amount) });
      notify(updated.balance > 0 ? `Payment recorded · ${formatInr(updated.balance)} still due` : "Paid in full");
      onSaved(updated);
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl bg-encode-soft p-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Amount (₹)">
          <input type="number" min="0.01" step="0.01" max={invoice.balance} required value={form.amount} onChange={set("amount")} className="input !py-2" />
        </Field>
        <Field label="Received on">
          <input type="date" required value={form.paid_on} onChange={set("paid_on")} className="input !py-2" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Method">
          <select value={form.method} onChange={set("method")} className="input !py-2">
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference / UTR">
          <input value={form.reference} onChange={set("reference")} className="input !py-2" />
        </Field>
      </div>
      <button type="submit" disabled={saving} className="btn-primary w-full justify-center !py-2 text-xs">
        {saving ? "Saving..." : "Record payment"}
      </button>
    </form>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = usePortal();
  const [invoice, setInvoice] = useState(null);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");
  const [sendOpen, setSendOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInvoice(null);
    Promise.all([fetchInvoice(id), fetchInvoiceSettings()])
      .then(([inv, settings]) => {
        setInvoice(inv);
        setBusiness(settings);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const run = useCallback(
    async (action, message) => {
      setBusy(true);
      try {
        const result = await action();
        if (message) notify(typeof message === "function" ? message(result) : message);
        return result;
      } catch (err) {
        notify(err.message, "error");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [notify],
  );

  if (error) return <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>;
  if (!invoice || !business) return <p className="text-sm text-encode-grey">Loading...</p>;

  const issue = async () => {
    if (!window.confirm("Issue this invoice? It gets the next invoice number and can no longer be edited.")) return;
    const inv = await run(() => issueInvoice(invoice.id), (i) => `Invoice ${i.number} issued`);
    if (inv) setInvoice(inv);
  };
  const remove = async () => {
    if (!window.confirm("Delete this draft?")) return;
    const deleted = await run(async () => {
      await deleteInvoice(invoice.id);
      return true;
    }, "Draft deleted");
    if (deleted) navigate("/leads/invoices");
  };
  const voidIt = async () => {
    const reason = window.prompt(`Void ${invoice.number}? The number stays used and the invoice is kept for your records.\n\nReason (optional):`);
    if (reason === null) return;
    const inv = await run(() => voidInvoice(invoice.id, reason), "Invoice voided");
    if (inv) setInvoice(inv);
  };
  const duplicate = async () => {
    const inv = await run(() => duplicateInvoice(invoice.id), "Copied to a new draft");
    if (inv) navigate(`/leads/invoices/${inv.id}/edit`);
  };
  const removePayment = async (payment) => {
    if (!window.confirm(`Remove the ${formatInr(payment.amount)} payment from ${formatDay(payment.paid_on)}?`)) return;
    const inv = await run(() => deleteInvoicePayment(invoice.id, payment.id), "Payment removed");
    if (inv) setInvoice(inv);
  };
  const copyLink = () => navigator.clipboard?.writeText(invoice.public_url).then(() => notify("Client link copied"));

  const issued = invoice.status === "issued";
  const actionClass = "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-black/80 hover:bg-encode-soft disabled:opacity-50";

  return (
    <div>
      <Link to="/leads/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-encode-grey hover:text-black">
        <ArrowLeft size={15} /> Invoices
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">{invoice.number || `Draft #${invoice.id}`}</h1>
            <InvoiceStatusBadge status={invoice.display_status} />
          </div>
          <p className="mt-1 text-sm text-encode-grey">
            {invoice.client_company || invoice.client_name}
            {invoice.lead && (
              <>
                {" · Lead "}
                <Link to={`/leads/lead/${invoice.lead.id}`} className="font-semibold text-encode-blueDark hover:underline">
                  {invoice.lead.name}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <>
              <Link to={`/leads/invoices/${invoice.id}/edit`} className="btn-secondary !px-4 !py-2.5">
                <Pencil size={15} /> Edit
              </Link>
              <button onClick={issue} disabled={busy} className="btn-primary !px-4 !py-2.5">
                Issue invoice
              </button>
            </>
          )}
          {issued && (
            <>
              <a href={`${invoice.public_url}?print=1`} target="_blank" rel="noreferrer" className="btn-secondary !px-4 !py-2.5">
                <Download size={15} /> PDF
              </a>
              <button onClick={() => setSendOpen(true)} className="btn-primary !px-4 !py-2.5">
                <Send size={15} /> {invoice.sent_at ? "Send again" : "Send to client"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-encode-border bg-white shadow-sm">
          <InvoiceDocument invoice={invoice} business={business} />
        </div>

        <div className="space-y-5">
          <Card title="Balance">
            <dl className="space-y-2 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-encode-grey">Total</dt>
                <dd>{formatInr(invoice.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-encode-grey">Paid</dt>
                <dd className="text-green-700">{formatInr(invoice.amount_paid)}</dd>
              </div>
              <div className="flex justify-between border-t border-encode-border pt-2 text-base font-bold">
                <dt>Balance due</dt>
                <dd className={invoice.display_status === "overdue" ? "text-red-600" : ""}>
                  {invoice.status === "void" ? "—" : formatInr(invoice.balance)}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-encode-grey">
              {invoice.status === "void"
                ? `Voided ${formatDate(invoice.voided_at)}${invoice.void_reason ? ` · ${invoice.void_reason}` : ""}`
                : invoice.sent_at
                  ? `Emailed ${timeAgo(invoice.sent_at)}`
                  : issued
                    ? "Not emailed to the client yet"
                    : "Draft. Issue it to assign a number and share it."}
            </p>
          </Card>

          {issued && (
            <Card title="Payments">
              {invoice.payments.length > 0 && (
                <ul className="mb-3 divide-y divide-encode-border">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="group flex items-start justify-between gap-2 py-2 text-sm">
                      <div>
                        <p className="font-semibold tabular-nums">{formatInr(p.amount)}</p>
                        <p className="text-xs text-encode-grey">
                          {formatDay(p.paid_on)} · {p.method_display}
                          {p.reference && ` · ${p.reference}`}
                        </p>
                      </div>
                      <button onClick={() => removePayment(p)} className="rounded p-1 text-encode-grey opacity-0 hover:text-red-600 group-hover:opacity-100" aria-label="Remove payment">
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {invoice.balance > 0 ? (
                <PaymentForm invoice={invoice} onSaved={setInvoice} />
              ) : (
                <p className="text-sm font-semibold text-green-700">Paid in full.</p>
              )}
            </Card>
          )}

          <Card title="Actions" bodyClassName="p-2">
            {issued && (
              <>
                <button onClick={copyLink} className={actionClass}>
                  <Copy size={15} /> Copy client link
                </button>
                <a href={invoice.public_url} target="_blank" rel="noreferrer" className={actionClass}>
                  <ExternalLink size={15} /> Open client view
                </a>
              </>
            )}
            {invoice.status !== "draft" && (
              <button onClick={duplicate} disabled={busy} className={actionClass}>
                <CopyPlus size={15} /> Duplicate as new draft
              </button>
            )}
            {issued && (
              <button
                onClick={voidIt}
                disabled={busy || invoice.amount_paid > 0}
                title={invoice.amount_paid > 0 ? "Remove recorded payments before voiding" : undefined}
                className={`${actionClass} !text-red-600`}
              >
                <Ban size={15} /> Void invoice
              </button>
            )}
            {invoice.status === "draft" && (
              <button onClick={remove} disabled={busy} className={`${actionClass} !text-red-600`}>
                <Trash2 size={15} /> Delete draft
              </button>
            )}
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {sendOpen && (
          <SendModal
            invoice={invoice}
            onClose={() => setSendOpen(false)}
            onSent={(inv) => {
              setInvoice(inv);
              setSendOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
