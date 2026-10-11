import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchInvoiceSettings, saveInvoiceSettings } from "../../lib/leadsApi.js";
import { usePortal } from "./PortalContext.jsx";
import { Card, Field } from "./ui.jsx";
import { GST_RATES, INDIAN_STATES } from "./format.js";

const TEXT_FIELDS = [
  "business_name", "legal_name", "gstin", "pan", "address", "state_code", "email", "phone", "website",
  "bank_name", "account_name", "account_number", "ifsc", "upi_id",
  "invoice_prefix", "default_due_days", "default_tax_rate", "default_sac", "default_notes", "default_terms",
];

export default function InvoiceSettingsPage() {
  const { notify, user } = usePortal();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInvoiceSettings()
      .then((s) => {
        setSaved(s);
        setForm(Object.fromEntries([...TEXT_FIELDS, "next_number"].map((f) => [f, s[f] ?? ""])));
      })
      .catch((e) => notify(e.message, "error"));
  }, [notify]);

  if (!form) return <p className="text-sm text-encode-grey">Loading...</p>;
  const readOnly = !user.is_superuser;
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      if (Number(body.next_number) === saved.next_number) delete body.next_number;
      const s = await saveInvoiceSettings(body);
      setSaved(s);
      setForm(Object.fromEntries([...TEXT_FIELDS, "next_number"].map((f) => [f, s[f] ?? ""])));
      notify("Invoice settings saved");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const input = (field, props = {}) => (
    <input value={form[field]} onChange={set(field)} disabled={readOnly} className="input !py-2" {...props} />
  );
  const preview = `${(form.invoice_prefix || "ES").toUpperCase()}/${saved.current_fy}/${String(form.next_number || 1).padStart(3, "0")}`;

  return (
    <form onSubmit={submit}>
      <Link to="/leads/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-encode-grey hover:text-black">
        <ArrowLeft size={15} /> Invoices
      </Link>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Invoice settings</h1>
          <p className="mt-1 text-sm text-encode-grey">
            {readOnly ? "Only admins can change these." : "Printed on every invoice. Changes apply to all invoices, including ones already issued."}
          </p>
        </div>
        {!readOnly && (
          <button type="submit" disabled={saving} className="btn-primary !px-5 !py-2.5">
            {saving ? "Saving..." : "Save settings"}
          </button>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Business">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name *">{input("business_name", { required: true })}</Field>
            <Field label="Legal name (if different)">{input("legal_name")}</Field>
            <Field label="GSTIN">{input("gstin", { maxLength: 15, className: "input !py-2 uppercase", placeholder: "Leave blank if not registered" })}</Field>
            <Field label="PAN">{input("pan", { maxLength: 10, className: "input !py-2 uppercase" })}</Field>
            <Field label="Address" className="sm:col-span-2">
              <textarea rows={3} value={form.address} onChange={set("address")} disabled={readOnly} className="input !py-2" />
            </Field>
            <Field label="State">
              <select value={form.state_code} onChange={set("state_code")} disabled={readOnly} className="input !py-2">
                <option value="">Select state</option>
                {INDIAN_STATES.filter((s) => s.code !== "96").map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phone">{input("phone")}</Field>
            <Field label="Billing email (replies go here)">{input("email", { type: "email" })}</Field>
            <Field label="Website">{input("website")}</Field>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Payment details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Account name">{input("account_name")}</Field>
              <Field label="Bank">{input("bank_name")}</Field>
              <Field label="Account number">{input("account_number")}</Field>
              <Field label="IFSC">{input("ifsc", { maxLength: 11, className: "input !py-2 uppercase" })}</Field>
              <Field label="UPI ID" className="sm:col-span-2">
                {input("upi_id", { placeholder: "e.g. encodestudio@okhdfcbank" })}
              </Field>
            </div>
          </Card>

          <Card title="Numbering & defaults">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Number prefix">{input("invoice_prefix", { maxLength: 6, className: "input !py-2 uppercase" })}</Field>
              <Field label={`Next number in FY ${saved.current_fy}`}>
                {input("next_number", { type: "number", min: saved.next_number, step: 1 })}
              </Field>
              <p className="-mt-1 text-xs text-encode-grey sm:col-span-2">
                Next invoice: <strong className="text-black">{preview}</strong>. Numbering restarts at 001 each April. If you've already
                issued invoices this year elsewhere, set the next number to continue that series.
              </p>
              <Field label="Payment due after (days)">{input("default_due_days", { type: "number", min: 0, max: 365 })}</Field>
              <Field label="Default GST rate">
                <select value={form.default_tax_rate} onChange={set("default_tax_rate")} disabled={readOnly} className="input !py-2">
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Default SAC code" className="sm:col-span-2">
                {input("default_sac", { placeholder: "998314 = IT design & development services" })}
              </Field>
              <Field label="Default notes" className="sm:col-span-2">
                <textarea rows={2} value={form.default_notes} onChange={set("default_notes")} disabled={readOnly} className="input !py-2" />
              </Field>
              <Field label="Default terms" className="sm:col-span-2">
                <textarea rows={3} value={form.default_terms} onChange={set("default_terms")} disabled={readOnly} className="input !py-2" />
              </Field>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
