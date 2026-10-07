import { useState } from "react";
import { interestOptions } from "../../lib/content.js";
import { createLead } from "../../lib/leadsApi.js";
import { STATUS_OPTIONS } from "./StatusBadge.jsx";
import { usePortal } from "./PortalContext.jsx";
import { Field, Modal } from "./ui.jsx";
import { PRIORITY_OPTIONS, SOURCE_OPTIONS } from "./format.js";

export default function NewLeadModal({ onClose, onCreated }) {
  const { user, activeUsers } = usePortal();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    interest: "",
    source: "phone",
    status: "new",
    priority: "medium",
    owner_id: String(user.id),
    deal_value: "",
    tags: "",
    message: "",
    send_emails: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const lead = await createLead({
        ...form,
        owner_id: form.owner_id || null,
        deal_value: form.deal_value === "" ? null : form.deal_value,
      });
      onCreated(lead);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title="New lead" onClose={onClose} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *">
          <input required autoFocus value={form.name} onChange={set("name")} className="input" />
        </Field>
        <Field label="Email *">
          <input required type="email" value={form.email} onChange={set("email")} className="input" />
        </Field>
        <Field label="Phone">
          <input value={form.phone} onChange={set("phone")} className="input" />
        </Field>
        <Field label="Company">
          <input value={form.company} onChange={set("company")} className="input" />
        </Field>
        <Field label="Source">
          <select value={form.source} onChange={set("source")} className="input">
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Interested in">
          <select value={form.interest} onChange={set("interest")} className="input">
            <option value="">—</option>
            {interestOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Stage">
          <select value={form.status} onChange={set("status")} className="input">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={set("priority")} className="input">
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select value={form.owner_id} onChange={set("owner_id")} className="input">
            <option value="">Unassigned</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estimated deal value (₹)">
          <input type="number" min="0" step="1000" value={form.deal_value} onChange={set("deal_value")} className="input" />
        </Field>
        <Field label="Tags (comma-separated)" className="sm:col-span-2">
          <input value={form.tags} onChange={set("tags")} className="input" placeholder="enterprise, follow-up" />
        </Field>
        <Field label="Details" className="sm:col-span-2">
          <textarea rows={3} value={form.message} onChange={set("message")} className="input resize-none" placeholder="What do they need?" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-black/80 sm:col-span-2">
          <input type="checkbox" checked={form.send_emails} onChange={set("send_emails")} className="h-4 w-4 accent-black" />
          Send the confirmation email to the lead and notify the team
        </label>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 sm:col-span-2">{error}</p>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary !px-5 !py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary !px-5 !py-2.5 disabled:opacity-50">
            {saving ? "Creating..." : "Create lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
