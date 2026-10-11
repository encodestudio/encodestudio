import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { createInvoice, fetchInvoice, fetchInvoiceSettings, fetchLead, issueInvoice, updateInvoice } from "../../lib/leadsApi.js";
import { addDays, computeInvoice, todayInIndia } from "../../lib/invoiceMath.js";
import { usePortal } from "./PortalContext.jsx";
import { Card, Field } from "./ui.jsx";
import { GST_RATES, INDIAN_STATES, TAX_MODE_OPTIONS, formatInr } from "./format.js";

const CLIENT_FIELDS = ["client_name", "client_company", "client_email", "client_phone", "client_address", "client_gstin", "client_state_code"];

const blankItem = (settings) => ({
  description: "",
  sac: settings?.default_sac || "",
  quantity: 1,
  unit_price: "",
  tax_rate: settings?.default_tax_rate ?? 18,
});

/** Same rule as the API: no GST without a GSTIN; IGST across states; otherwise CGST + SGST. */
function autoTaxMode(settings, clientState) {
  if (!settings?.gstin) return "none";
  if (settings.state_code && clientState && settings.state_code !== clientState) return "inter";
  return "intra";
}

export default function InvoiceEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const leadId = params.get("lead");
  const navigate = useNavigate();
  const { notify } = usePortal();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [lead, setLead] = useState(null);
  const [taxModeTouched, setTaxModeTouched] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchInvoiceSettings();
        if (cancelled) return;
        setSettings(s);
        if (id) {
          const inv = await fetchInvoice(id);
          if (cancelled) return;
          if (inv.status !== "draft") return setLocked(true);
          setLead(inv.lead);
          setForm({
            ...Object.fromEntries(CLIENT_FIELDS.map((f) => [f, inv[f] ?? ""])),
            issue_date: inv.issue_date,
            due_date: inv.due_date ?? "",
            tax_mode: inv.tax_mode,
            discount: inv.discount || "",
            notes: inv.notes,
            terms: inv.terms,
            items: inv.items.map(({ description, sac, quantity, unit_price, tax_rate }) => ({ description, sac, quantity, unit_price, tax_rate })),
          });
          return;
        }
        const today = todayInIndia();
        const base = {
          ...Object.fromEntries(CLIENT_FIELDS.map((f) => [f, ""])),
          issue_date: today,
          due_date: addDays(today, s.default_due_days),
          tax_mode: autoTaxMode(s, ""),
          discount: "",
          notes: s.default_notes,
          terms: s.default_terms,
          items: [blankItem(s)],
        };
        if (leadId) {
          const l = await fetchLead(leadId);
          if (cancelled) return;
          setLead({ id: l.id, name: l.name });
          Object.assign(base, { client_name: l.name, client_company: l.company, client_email: l.email, client_phone: l.phone });
          if (l.deal_value) base.items = [{ ...blankItem(s), description: l.project_description || l.interest || "", unit_price: l.deal_value }];
        }
        setForm(base);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, leadId]);

  const totals = useMemo(
    () => (form ? computeInvoice(form.items, Number(form.discount) || 0, form.tax_mode) : null),
    [form],
  );

  if (locked) return <Navigate to={`/leads/invoices/${id}`} replace />;
  if (error) return <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>;
  if (!form) return <p className="text-sm text-encode-grey">Loading...</p>;

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "client_gstin" && /^\d{2}/.test(value) && value.length >= 2) next.client_state_code = value.slice(0, 2);
      if ((field === "client_state_code" || field === "client_gstin") && !taxModeTouched) {
        next.tax_mode = autoTaxMode(settings, next.client_state_code);
      }
      if (field === "issue_date" && value && f.due_date && f.due_date < value) next.due_date = value;
      return next;
    });
  };
  const setItem = (index, field, value) =>
    setForm((f) => ({ ...f, items: f.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, blankItem(settings)] }));
  const removeItem = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  const payload = () => ({
    ...form,
    due_date: form.due_date || null,
    discount: Number(form.discount) || 0,
    items: form.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price || 0),
      tax_rate: Number(item.tax_rate || 0),
    })),
    ...(id ? {} : { lead_id: lead?.id ?? null }),
  });

  const submit = async (issue) => {
    setSaving(true);
    try {
      let inv = id ? await updateInvoice(id, payload()) : await createInvoice(payload());
      if (issue) {
        inv = await issueInvoice(inv.id);
        notify(`Invoice ${inv.number} issued`);
      } else {
        notify("Draft saved");
      }
      navigate(`/leads/invoices/${inv.id}`, { replace: !id });
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const gstOn = form.tax_mode !== "none";

  return (
    <div>
      <Link to={id ? `/leads/invoices/${id}` : lead ? `/leads/lead/${lead.id}` : "/leads/invoices"} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-encode-grey hover:text-black">
        <ArrowLeft size={15} /> Back
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{id ? "Edit draft invoice" : "New invoice"}</h1>
          <p className="mt-1 text-sm text-encode-grey">
            {lead ? (
              <>
                For lead{" "}
                <Link to={`/leads/lead/${lead.id}`} className="font-semibold text-encode-blueDark hover:underline">
                  {lead.name}
                </Link>
                .{" "}
              </>
            ) : null}
            The invoice number is assigned when you issue it.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => submit(false)} disabled={saving} className="btn-secondary !px-4 !py-2.5">
            Save draft
          </button>
          <button onClick={() => submit(true)} disabled={saving} className="btn-primary !px-4 !py-2.5">
            {saving ? "Saving..." : "Save & issue"}
          </button>
        </div>
      </div>

      {!settings.gstin && (
        <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No GSTIN is set in invoice settings, so invoices are issued without GST.{" "}
          <Link to="/leads/invoices/settings" className="font-semibold underline">
            Add your business details
          </Link>
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card title="Bill to">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Client name *">
                <input value={form.client_name} onChange={set("client_name")} className="input !py-2" required />
              </Field>
              <Field label="Company">
                <input value={form.client_company} onChange={set("client_company")} className="input !py-2" />
              </Field>
              <Field label="Email">
                <input type="email" value={form.client_email} onChange={set("client_email")} className="input !py-2" />
              </Field>
              <Field label="Phone">
                <input value={form.client_phone} onChange={set("client_phone")} className="input !py-2" />
              </Field>
              <Field label="Billing address" className="sm:col-span-2">
                <textarea rows={2} value={form.client_address} onChange={set("client_address")} className="input !py-2" />
              </Field>
              <Field label="Client GSTIN (if registered)">
                <input value={form.client_gstin} onChange={set("client_gstin")} maxLength={15} className="input !py-2 uppercase" placeholder="e.g. 07AAACE1234F1Z5" />
              </Field>
              <Field label="Place of supply (client's state)">
                <select value={form.client_state_code} onChange={set("client_state_code")} className="input !py-2">
                  <option value="">Not specified</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="Line items" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-encode-border text-left text-xs font-semibold text-encode-grey">
                    <th className="px-4 py-2.5">Description</th>
                    <th className="w-28 px-2 py-2.5">SAC/HSN</th>
                    <th className="w-20 px-2 py-2.5">Qty</th>
                    <th className="w-32 px-2 py-2.5">Rate (₹)</th>
                    {gstOn && <th className="w-24 px-2 py-2.5">GST</th>}
                    <th className="w-32 px-2 py-2.5 text-right">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-encode-border">
                  {form.items.map((item, i) => (
                    <tr key={i} className="align-top">
                      <td className="px-4 py-2">
                        <textarea
                          rows={1}
                          value={item.description}
                          onChange={(e) => setItem(i, "description", e.target.value)}
                          placeholder="e.g. Website design & development"
                          className="input min-h-[38px] !py-2"
                          aria-label={`Line ${i + 1} description`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input value={item.sac} onChange={(e) => setItem(i, "sac", e.target.value.replace(/\D/g, ""))} maxLength={8} className="input !px-2.5 !py-2" aria-label="SAC/HSN" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="0" step="any" value={item.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} className="input !px-2.5 !py-2" aria-label="Quantity" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" min="0" step="any" value={item.unit_price} onChange={(e) => setItem(i, "unit_price", e.target.value)} className="input !px-2.5 !py-2" aria-label="Rate" />
                      </td>
                      {gstOn && (
                        <td className="px-2 py-2">
                          <select value={item.tax_rate} onChange={(e) => setItem(i, "tax_rate", e.target.value)} className="input !px-2 !py-2" aria-label="GST rate">
                            {[...new Set([...GST_RATES, Number(item.tax_rate)])].map((r) => (
                              <option key={r} value={r}>
                                {r}%
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="px-2 py-2 pt-4 text-right font-medium tabular-nums">{formatInr(totals.lines[i]?.amount ?? 0)}</td>
                      <td className="py-2 pr-3 pt-3">
                        <button
                          onClick={() => removeItem(i)}
                          disabled={form.items.length === 1}
                          className="rounded p-1.5 text-encode-grey hover:text-red-600 disabled:opacity-30"
                          aria-label={`Remove line ${i + 1}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-encode-border px-4 py-3">
              <button onClick={addItem} className="inline-flex items-center gap-1.5 text-sm font-semibold text-encode-blueDark hover:underline">
                <Plus size={15} /> Add line
              </button>
            </div>
          </Card>

          <Card title="Notes & terms">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Notes (shown on the invoice)">
                <textarea rows={3} value={form.notes} onChange={set("notes")} className="input !py-2" />
              </Field>
              <Field label="Terms">
                <textarea rows={3} value={form.terms} onChange={set("terms")} className="input !py-2" placeholder="e.g. 50% advance, balance on delivery." />
              </Field>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Details">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Invoice date">
                  <input type="date" value={form.issue_date} onChange={set("issue_date")} className="input !py-2" />
                </Field>
                <Field label="Due date">
                  <input type="date" value={form.due_date ?? ""} min={form.issue_date} onChange={set("due_date")} className="input !py-2" />
                </Field>
              </div>
              <Field label="GST">
                <select
                  value={form.tax_mode}
                  onChange={(e) => {
                    setTaxModeTouched(true);
                    set("tax_mode")(e);
                  }}
                  className="input !py-2"
                >
                  {TAX_MODE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Discount (₹, before tax)">
                <input type="number" min="0" step="any" value={form.discount} onChange={set("discount")} placeholder="0" className="input !py-2" />
              </Field>
            </div>
          </Card>

          <Card title="Summary">
            <dl className="space-y-2 text-sm tabular-nums">
              <div className="flex justify-between">
                <dt className="text-encode-grey">Subtotal</dt>
                <dd>{formatInr(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-encode-grey">Discount</dt>
                  <dd>−{formatInr(totals.discount)}</dd>
                </div>
              )}
              {totals.taxes.map((t) =>
                form.tax_mode === "inter" ? (
                  <div key={t.rate} className="flex justify-between">
                    <dt className="text-encode-grey">IGST {t.rate}%</dt>
                    <dd>{formatInr(t.igst)}</dd>
                  </div>
                ) : (
                  <div key={t.rate} className="flex justify-between">
                    <dt className="text-encode-grey">
                      CGST + SGST {t.rate / 2}% + {t.rate / 2}%
                    </dt>
                    <dd>{formatInr(t.total)}</dd>
                  </div>
                ),
              )}
              <div className="flex justify-between border-t border-encode-border pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatInr(totals.total)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
