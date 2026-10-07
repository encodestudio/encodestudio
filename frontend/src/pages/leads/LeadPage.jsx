import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { interestOptions } from "../../lib/content.js";
import {
  addActivity,
  createTask,
  deleteActivity,
  deleteLead,
  deleteTask,
  fetchActivities,
  fetchLead,
  fetchRelatedLeads,
  fetchTasks,
  resendLeadEmails,
  updateLead,
  updateTask,
} from "../../lib/leadsApi.js";
import { usePortal } from "./PortalContext.jsx";
import ActivityItem from "./ActivityItem.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { Avatar, Card, Field, Modal, ScoreRing, Tag } from "./ui.jsx";
import { PRIORITY_OPTIONS, SOURCE_OPTIONS, formatDate, formatMoney, timeAgo } from "./format.js";

const STAGES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Won" },
];
const LOST_REASONS = ["Budget", "Chose a competitor", "No response", "Timing / not now", "Not a fit", "Duplicate / spam"];
const COMPOSER_TYPES = [
  { value: "note", label: "Note", icon: Pencil, placeholder: "Add a note for the team..." },
  { value: "call", label: "Call", icon: Phone, placeholder: "What was discussed on the call?" },
  { value: "email", label: "Email", icon: Mail, placeholder: "Summarise the email you sent or received..." },
  { value: "meeting", label: "Meeting", icon: Users, placeholder: "Meeting notes and next steps..." },
];

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
const toLocalInput = (date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const tomorrowAt10 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return toLocalInput(d);
};

function StageStepper({ status, onChange }) {
  const current = STAGES.findIndex((s) => s.value === status);
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <ol className="flex flex-1 overflow-hidden rounded-xl border border-encode-border bg-white">
        {STAGES.map((s, i) => {
          const done = status !== "lost" && i <= current;
          return (
            <li key={s.value} className="flex-1">
              <button
                onClick={() => s.value !== status && onChange(s.value)}
                className={`flex h-full w-full items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                  done ? (s.value === "converted" ? "bg-green-600 text-white" : "bg-black text-white") : "text-black/60 hover:bg-encode-soft"
                } ${i > 0 ? "border-l border-white/20" : ""}`}
                aria-current={s.value === status ? "step" : undefined}
              >
                {done && i < current && <Check size={13} />}
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
      <button
        onClick={() => status !== "lost" && onChange("lost")}
        className={`rounded-xl border px-4 text-xs font-semibold sm:text-sm ${
          status === "lost" ? "border-red-600 bg-red-600 text-white" : "border-encode-border bg-white text-red-600 hover:border-red-300 hover:bg-red-50"
        }`}
      >
        Lost
      </button>
    </div>
  );
}

function TagEditor({ tags, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <Tag key={t} onRemove={() => onChange(tags.filter((x) => x !== t))}>
            {t}
          </Tag>
        ))}
        {tags.length === 0 && <span className="text-xs text-encode-grey">No tags yet</span>}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder="Add tag + Enter"
        className="input mt-2 !py-2 text-xs"
      />
    </div>
  );
}

function ContactEditor({ lead, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    interest: lead.interest,
    timeline: lead.timeline,
    project_description: lead.project_description,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-3"
    >
      <Field label="Name">
        <input required value={form.name} onChange={set("name")} className="input !py-2" />
      </Field>
      <Field label="Email">
        <input required type="email" value={form.email} onChange={set("email")} className="input !py-2" />
      </Field>
      <Field label="Phone">
        <input value={form.phone} onChange={set("phone")} className="input !py-2" />
      </Field>
      <Field label="Company">
        <input value={form.company} onChange={set("company")} className="input !py-2" />
      </Field>
      <Field label="Interested in">
        <select value={form.interest} onChange={set("interest")} className="input !py-2">
          <option value="">—</option>
          {[...new Set([form.interest, ...interestOptions].filter(Boolean))].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </Field>
      <Field label="Timeline">
        <input value={form.timeline} onChange={set("timeline")} className="input !py-2" />
      </Field>
      <Field label="Project">
        <textarea rows={2} value={form.project_description} onChange={set("project_description")} className="input resize-none !py-2" />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary !px-4 !py-2 text-xs">
          Cancel
        </button>
        <button type="submit" className="btn-primary !px-4 !py-2 text-xs">
          Save
        </button>
      </div>
    </form>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-encode-grey">{label}</span>
      <span className="min-w-0 break-words text-right text-black">{children || "—"}</span>
    </div>
  );
}

export default function LeadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, activeUsers, notify, refreshTasks } = usePortal();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState("");
  const [composerType, setComposerType] = useState("note");
  const [composerText, setComposerText] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [summary, setSummary] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", due_at: tomorrowAt10(), assigned_to: "" });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [resending, setResending] = useState(false);
  const [valueDraft, setValueDraft] = useState("");

  const loadTimeline = useCallback(() => fetchActivities(id).then(setActivities).catch(() => {}), [id]);
  const loadTasks = useCallback(() => fetchTasks({ lead: id, state: "all" }).then(setTasks).catch(() => {}), [id]);

  useEffect(() => {
    setLead(null);
    setError("");
    fetchLead(id)
      .then((l) => {
        setLead(l);
        setSummary(l.notes || "");
        setValueDraft(l.deal_value ?? "");
      })
      .catch((e) => setError(e.message));
    loadTimeline();
    loadTasks();
    fetchRelatedLeads(id).then(setRelated).catch(() => {});
  }, [id, loadTimeline, loadTasks]);

  const save = async (patch, message) => {
    try {
      const updated = await updateLead(lead.id, patch);
      setLead(updated);
      setValueDraft(updated.deal_value ?? "");
      if (message) notify(message);
      loadTimeline();
      return updated;
    } catch (err) {
      notify(err.message, "error");
      return null;
    }
  };

  const changeStage = (status) => {
    if (status === "lost") {
      setLostReason("");
      setLostOpen(true);
    } else {
      save({ status }, `Moved to ${status === "converted" ? "Won" : STAGES.find((s) => s.value === status)?.label}`);
    }
  };

  const postActivity = async (e) => {
    e.preventDefault();
    if (!composerText.trim()) return;
    setPosting(true);
    try {
      await addActivity(lead.id, composerType, composerText.trim());
      setComposerText("");
      await loadTimeline();
      setLead(await fetchLead(lead.id));
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setPosting(false);
    }
  };

  const removeActivity = async (a) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteActivity(lead.id, a.id);
      setActivities((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    try {
      await createTask({
        lead_id: lead.id,
        title: taskForm.title,
        due_at: taskForm.due_at ? new Date(taskForm.due_at).toISOString() : null,
        assigned_to: taskForm.assigned_to || user.id,
      });
      setTaskForm({ title: "", due_at: tomorrowAt10(), assigned_to: "" });
      setShowTaskForm(false);
      loadTasks();
      loadTimeline();
      refreshTasks();
      setLead(await fetchLead(lead.id));
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const toggleTask = async (task) => {
    try {
      await updateTask(task.id, { completed: !task.completed_at });
      loadTasks();
      loadTimeline();
      refreshTasks();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const removeTask = async (task) => {
    try {
      await deleteTask(task.id);
      loadTasks();
      refreshTasks();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await resendLeadEmails(lead.id);
      setLead(res.lead);
      loadTimeline();
      notify(res.confirmation_sent && res.admin_notification_sent ? "Emails sent" : "Some emails failed — check the server log", res.confirmation_sent && res.admin_notification_sent ? "default" : "error");
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setResending(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${lead.name}? This removes the lead, its timeline and tasks.`)) return;
    try {
      await deleteLead(lead.id);
      notify("Lead deleted");
      navigate("/leads/list");
    } catch (err) {
      notify(err.message, "error");
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-encode-border bg-white p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link to="/leads/list" className="mt-4 inline-block text-sm font-semibold text-encode-blueDark hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }
  if (!lead) return <p className="text-sm text-encode-grey">Loading lead...</p>;

  const phoneDigits = lead.phone.replace(/[^\d]/g, "");
  const openTasks = tasks.filter((t) => !t.completed_at);
  const doneTasks = tasks.filter((t) => t.completed_at);
  const composer = COMPOSER_TYPES.find((t) => t.value === composerType);
  const hasAttribution = lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.referrer || lead.landing_page;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-encode-grey hover:text-black">
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={lead.name} size="lg" className="!bg-encode-blue !text-black" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-display font-bold tracking-tight">{lead.name}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <p className="mt-0.5 text-sm text-encode-grey">
              {[lead.company, lead.source_display, `received ${timeAgo(lead.created_at)}`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`mailto:${lead.email}`} className="btn-secondary !px-4 !py-2 text-xs">
            <Mail size={14} /> Email
          </a>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="btn-secondary !px-4 !py-2 text-xs">
              <Phone size={14} /> Call
            </a>
          )}
          {phoneDigits.length >= 10 && (
            <a href={`https://wa.me/${phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits}`} target="_blank" rel="noreferrer" className="btn-secondary !px-4 !py-2 text-xs">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          <button onClick={handleDelete} className="rounded-full border border-encode-border bg-white p-2.5 text-encode-grey hover:border-red-300 hover:text-red-600" aria-label="Delete lead">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <StageStepper status={lead.status} onChange={changeStage} />
      {lead.status === "lost" && lead.lost_reason && (
        <p className="mt-2 text-sm text-red-700">
          Lost reason: <strong>{lead.lost_reason}</strong>
        </p>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {/* Main column */}
        <div className="space-y-5 xl:col-span-2">
          {/* Submission */}
          <Card title="Enquiry">
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="label mb-1 !text-[10px]">Interested in</p>
                <p>{lead.interest || "—"}</p>
              </div>
              <div>
                <p className="label mb-1 !text-[10px]">Timeline</p>
                <p>{lead.timeline || "—"}</p>
              </div>
              <div>
                <p className="label mb-1 !text-[10px]">Project</p>
                <p>{lead.project_description || "—"}</p>
              </div>
            </div>
            {lead.message && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-encode-soft p-4 text-sm leading-relaxed text-black/90">{lead.message}</p>}
          </Card>

          {/* Composer + timeline */}
          <Card title="Activity" bodyClassName="p-0">
            <form onSubmit={postActivity} className="border-b border-encode-border p-5">
              <div className="mb-3 flex gap-1" role="tablist" aria-label="Activity type">
                {COMPOSER_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={composerType === value}
                    onClick={() => setComposerType(value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      composerType === value ? "bg-black text-white" : "text-black/60 hover:bg-encode-soft"
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postActivity(e);
                }}
                placeholder={composer.placeholder}
                className="input resize-none"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-encode-grey">Ctrl + Enter to save</span>
                <button type="submit" disabled={posting || !composerText.trim()} className="btn-primary !px-4 !py-2 text-xs disabled:opacity-40">
                  {posting ? "Saving..." : `Log ${composer.label.toLowerCase()}`}
                </button>
              </div>
            </form>
            <ul className="space-y-5 p-5">
              {activities.map((a) => (
                <ActivityItem
                  key={a.id}
                  activity={a}
                  onDelete={["note", "call", "email", "meeting"].includes(a.type) && (a.user?.id === user.id || user.is_superuser) ? removeActivity : undefined}
                />
              ))}
            </ul>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-5">
          <Card title="Deal">
            <div className="space-y-3">
              <Field label="Owner">
                <select
                  value={lead.owner?.id ?? ""}
                  onChange={(e) => save({ owner_id: e.target.value || null }, "Owner updated")}
                  className="input !py-2"
                >
                  <option value="">Unassigned</option>
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.id === user.id ? " (me)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <select value={lead.priority} onChange={(e) => save({ priority: e.target.value }, "Priority updated")} className="input !py-2">
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Source">
                  <select value={lead.source} onChange={(e) => save({ source: e.target.value }, "Source updated")} className="input !py-2">
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Deal value (₹)">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={valueDraft}
                  onChange={(e) => setValueDraft(e.target.value)}
                  onBlur={() => {
                    const next = valueDraft === "" ? null : Number(valueDraft);
                    if (next !== lead.deal_value) save({ deal_value: next }, "Deal value updated");
                  }}
                  placeholder="Not estimated"
                  className="input !py-2"
                />
              </Field>
              <Field label="Tags">
                <TagEditor tags={lead.tags} onChange={(tags) => save({ tags })} />
              </Field>
            </div>
          </Card>

          <Card
            title="Follow-ups"
            action={
              <button onClick={() => setShowTaskForm((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-encode-blueDark hover:underline">
                <Plus size={13} /> Add
              </button>
            }
          >
            {showTaskForm && (
              <form onSubmit={addTask} className="mb-4 space-y-2 rounded-xl bg-encode-soft p-3">
                <input required autoFocus value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Send proposal" className="input !py-2" />
                <input type="datetime-local" value={taskForm.due_at} onChange={(e) => setTaskForm((f) => ({ ...f, due_at: e.target.value }))} className="input !py-2" aria-label="Due" />
                <select value={taskForm.assigned_to} onChange={(e) => setTaskForm((f) => ({ ...f, assigned_to: e.target.value }))} className="input !py-2" aria-label="Assign to">
                  <option value="">Assign to me</option>
                  {activeUsers
                    .filter((u) => u.id !== user.id)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
                <button type="submit" className="btn-primary w-full justify-center !py-2 text-xs">
                  Schedule follow-up
                </button>
              </form>
            )}
            {openTasks.length === 0 && !showTaskForm && <p className="text-sm text-encode-grey">No follow-ups scheduled.</p>}
            <ul className="space-y-2">
              {[...openTasks, ...doneTasks.slice(0, 3)].map((t) => {
                const overdue = !t.completed_at && t.due_at && new Date(t.due_at) < new Date();
                return (
                  <li key={t.id} className="group flex items-start gap-2.5">
                    <input type="checkbox" checked={Boolean(t.completed_at)} onChange={() => toggleTask(t)} className="mt-1 h-4 w-4 accent-black" aria-label={`Complete ${t.title}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${t.completed_at ? "text-encode-grey line-through" : "font-medium"}`}>{t.title}</p>
                      <p className={`text-xs ${overdue ? "font-semibold text-red-600" : "text-encode-grey"}`}>
                        {t.due_at ? `${overdue ? "Overdue · " : ""}${formatDate(t.due_at, true)}` : "No due date"}
                        {t.assigned_to && ` · ${t.assigned_to.name}`}
                      </p>
                    </div>
                    <button onClick={() => removeTask(t)} className="rounded p-1 text-encode-grey opacity-0 hover:text-red-600 group-hover:opacity-100" aria-label="Delete follow-up">
                      <Trash2 size={13} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card
            title="Contact"
            action={
              !editingContact && (
                <button onClick={() => setEditingContact(true)} className="flex items-center gap-1 text-xs font-semibold text-encode-blueDark hover:underline">
                  <Pencil size={12} /> Edit
                </button>
              )
            }
          >
            {editingContact ? (
              <ContactEditor
                lead={lead}
                onCancel={() => setEditingContact(false)}
                onSave={async (patch) => {
                  if (await save(patch, "Contact updated")) setEditingContact(false);
                }}
              />
            ) : (
              <div className="divide-y divide-encode-border">
                <InfoRow label="Email">
                  <span className="inline-flex items-center gap-1.5">
                    <a href={`mailto:${lead.email}`} className="text-encode-blueDark hover:underline">
                      {lead.email}
                    </a>
                    <button onClick={() => navigator.clipboard?.writeText(lead.email).then(() => notify("Email copied"))} className="text-encode-grey hover:text-black" aria-label="Copy email">
                      <Copy size={12} />
                    </button>
                  </span>
                </InfoRow>
                <InfoRow label="Phone">{lead.phone}</InfoRow>
                <InfoRow label="Company">{lead.company}</InfoRow>
                <InfoRow label="First response">
                  {lead.first_contacted_at ? `${timeAgo(lead.first_contacted_at)}` : <span className="text-amber-700">Not contacted yet</span>}
                </InfoRow>
                <InfoRow label="Last activity">{timeAgo(lead.last_activity_at)}</InfoRow>
              </div>
            )}
          </Card>

          <Card title="Lead score" action={<ScoreRing score={lead.score} />}>
            {lead.score_factors.length ? (
              <ul className="space-y-1.5 text-sm">
                {lead.score_factors.map((f) => (
                  <li key={f.label} className="flex justify-between">
                    <span className="text-black/80">{f.label}</span>
                    <span className="font-semibold text-green-700">+{f.points}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-encode-grey">Add a phone number, deal value or priority to raise the score.</p>
            )}
          </Card>

          <Card title="Team summary">
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Pinned context for anyone picking this lead up..."
              className="input resize-none"
            />
            {summary !== (lead.notes || "") && (
              <button onClick={() => save({ notes: summary }, "Summary saved")} className="btn-primary mt-2 !px-4 !py-2 text-xs">
                Save summary
              </button>
            )}
          </Card>

          {hasAttribution && (
            <Card title={<span className="flex items-center gap-2"><Globe size={14} /> Source tracking</span>}>
              <div className="divide-y divide-encode-border">
                <InfoRow label="UTM source">{lead.utm_source}</InfoRow>
                <InfoRow label="UTM medium">{lead.utm_medium}</InfoRow>
                <InfoRow label="UTM campaign">{lead.utm_campaign}</InfoRow>
                <InfoRow label="Referrer">{lead.referrer}</InfoRow>
                <InfoRow label="Landing page">{lead.landing_page}</InfoRow>
              </div>
            </Card>
          )}

          <Card title="Emails">
            <div className="space-y-1 text-xs text-encode-grey">
              <p>Confirmation to lead: {lead.confirmation_email_sent_at ? `sent ${formatDate(lead.confirmation_email_sent_at, true)}` : "not sent"}</p>
              <p>Team notification: {lead.admin_notification_sent_at ? `sent ${formatDate(lead.admin_notification_sent_at, true)}` : "not sent"}</p>
            </div>
            <button onClick={handleResend} disabled={resending} className="btn-secondary mt-3 !px-4 !py-2 text-xs disabled:opacity-50">
              <Send size={13} /> {resending ? "Sending..." : "Resend both"}
            </button>
          </Card>

          {related.length > 0 && (
            <Card title={`Other enquiries from this person (${related.length})`} bodyClassName="p-3">
              {related.map((r) => (
                <Link key={r.id} to={`/leads/lead/${r.id}`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-2 hover:bg-encode-soft">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{r.interest || r.name}</span>
                    <span className="text-xs text-encode-grey">{formatDate(r.created_at)}</span>
                  </span>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </Card>
          )}

          <p className="px-1 text-xs text-encode-grey">
            {formatMoney(lead.deal_value)} · Lead #{lead.id} · created {formatDate(lead.created_at, true)}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {lostOpen && (
          <Modal title="Mark as lost" onClose={() => setLostOpen(false)}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await save({ status: "lost", lost_reason: lostReason }, "Marked as lost");
                setLostOpen(false);
              }}
              className="space-y-4"
            >
              <Field label="Why was it lost?">
                <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} className="input">
                  <option value="">Choose a reason (optional)</option>
                  {LOST_REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setLostOpen(false)} className="btn-secondary !px-5 !py-2.5">
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
