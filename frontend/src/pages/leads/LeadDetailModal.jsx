import { useState } from "react";
import { motion } from "framer-motion";
import { X, Mail, Phone, Building2, Send, Check } from "lucide-react";
import StatusBadge, { STATUS_OPTIONS } from "./StatusBadge.jsx";
import { updateLead, resendLeadEmails } from "../../lib/leadsApi.js";

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function LeadDetailModal({ lead, onClose, onUpdated }) {
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty = status !== lead.status || notes !== (lead.notes || "");

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateLead(lead.id, { status, notes });
      onUpdated(updated);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (err) {
      alert(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await resendLeadEmails(lead.id);
      onUpdated(res.lead);
    } catch (err) {
      alert(err.message || "Failed to resend emails.");
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-encode-border p-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-display font-bold">{lead.name}</h2>
              <StatusBadge status={lead.status} />
            </div>
            <p className="mt-1 text-sm text-encode-grey">Submitted {formatDate(lead.created_at)}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-encode-grey hover:bg-encode-soft hover:text-black">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1.5 text-black/80 hover:text-encode-blue">
              <Mail size={14} /> {lead.email}
            </a>
            {lead.phone && (
              <span className="flex items-center gap-1.5 text-black/80">
                <Phone size={14} /> {lead.phone}
              </span>
            )}
            {lead.company && (
              <span className="flex items-center gap-1.5 text-black/80">
                <Building2 size={14} /> {lead.company}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {lead.interest && (
              <div>
                <p className="label mb-1">Interested in</p>
                <p className="text-black/90">{lead.interest}</p>
              </div>
            )}
            {lead.timeline && (
              <div>
                <p className="label mb-1">Timeline</p>
                <p className="text-black/90">{lead.timeline}</p>
              </div>
            )}
            {lead.project_description && (
              <div className="col-span-2">
                <p className="label mb-1">Project</p>
                <p className="text-black/90">{lead.project_description}</p>
              </div>
            )}
          </div>

          <div>
            <p className="label mb-1.5">Message</p>
            <p className="whitespace-pre-wrap rounded-xl bg-encode-soft p-4 text-sm leading-relaxed text-black/90">
              {lead.message}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="btn-primary w-full justify-center disabled:opacity-40"
              >
                {savedFlash ? (
                  <>
                    <Check size={16} /> Saved
                  </>
                ) : saving ? (
                  "Saving..."
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">Internal notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input resize-none"
              placeholder="Not visible to the lead..."
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-encode-border p-4 text-xs text-encode-grey">
            <div className="space-y-1">
              <p>Confirmation email: {lead.confirmation_email_sent_at ? `sent ${formatDate(lead.confirmation_email_sent_at)}` : "not sent"}</p>
              <p>Admin notification: {lead.admin_notification_sent_at ? `sent ${formatDate(lead.admin_notification_sent_at)}` : "not sent"}</p>
            </div>
            <button
              onClick={handleResend}
              disabled={resending}
              className="btn-secondary shrink-0 !px-4 !py-2 text-xs disabled:opacity-50"
            >
              <Send size={13} /> {resending ? "Sending..." : "Resend"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
