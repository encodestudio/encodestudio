import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  Mail,
  MailCheck,
  MessageSquare,
  Pencil,
  Phone,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { formatDate, timeAgo } from "./format.js";

const STATUS_LABELS = { new: "New", contacted: "Contacted", qualified: "Qualified", converted: "Converted", lost: "Lost" };

const TYPES = {
  created: { icon: Sparkles, tone: "bg-encode-blueTint text-encode-blueDark", verb: "added the lead" },
  note: { icon: MessageSquare, tone: "bg-amber-50 text-amber-700", verb: "added a note" },
  call: { icon: Phone, tone: "bg-green-50 text-green-700", verb: "logged a call" },
  email: { icon: Mail, tone: "bg-violet-50 text-violet-700", verb: "logged an email" },
  meeting: { icon: Users, tone: "bg-sky-50 text-sky-700", verb: "logged a meeting" },
  status_change: { icon: ArrowRightLeft, tone: "bg-black text-white", verb: "moved the lead" },
  assignment: { icon: UserPlus, tone: "bg-encode-soft text-black", verb: "changed the owner" },
  field_update: { icon: Pencil, tone: "bg-encode-soft text-encode-grey", verb: "edited the lead" },
  task_created: { icon: CalendarClock, tone: "bg-encode-soft text-black", verb: "scheduled a follow-up" },
  task_completed: { icon: CheckCircle2, tone: "bg-green-50 text-green-700", verb: "completed a follow-up" },
  email_sent: { icon: MailCheck, tone: "bg-encode-soft text-encode-grey", verb: "Email sent" },
};

function describe(a) {
  if (a.type === "status_change" && a.meta) {
    return (
      <>
        moved the lead from <strong>{STATUS_LABELS[a.meta.from] || a.meta.from}</strong> to{" "}
        <strong>{STATUS_LABELS[a.meta.to] || a.meta.to}</strong>
      </>
    );
  }
  if (a.type === "task_created" || a.type === "task_completed") {
    return (
      <>
        {TYPES[a.type].verb}: <strong>{a.body}</strong>
        {a.type === "task_created" && a.meta?.due_at && <> · due {formatDate(a.meta.due_at, true)}</>}
      </>
    );
  }
  if (a.type === "assignment" || a.type === "field_update") return a.body;
  return TYPES[a.type]?.verb || a.type;
}

/** One timeline entry. `compact` adds the lead's name (dashboard feed). */
export default function ActivityItem({ activity: a, compact = false, onDelete }) {
  const meta = TYPES[a.type] || TYPES.field_update;
  const Icon = meta.icon;
  const showBody = ["note", "call", "email", "meeting"].includes(a.type) || (a.type === "status_change" && a.body);
  const system = !a.user;
  return (
    <li className="group flex gap-3">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-black/80">
          {!system && <strong className="text-black">{a.user.name} </strong>}
          {system && (a.type === "created" || a.type === "email_sent") ? (
            <span className="text-black">{a.body || meta.verb}</span>
          ) : (
            describe(a)
          )}
          {compact && a.lead && (
            <>
              {" · "}
              <Link to={`/leads/lead/${a.lead.id}`} className="font-semibold text-encode-blueDark hover:underline">
                {a.lead.name}
              </Link>
            </>
          )}
        </p>
        {showBody && (
          <p className={`mt-1.5 whitespace-pre-wrap rounded-xl bg-encode-soft px-3 py-2 text-sm text-black/90 ${compact ? "line-clamp-2" : ""}`}>
            {a.type === "status_change" ? `Reason: ${a.body}` : a.body}
          </p>
        )}
        <p className="mt-1 text-[11px] text-encode-grey" title={formatDate(a.created_at, true)}>
          {timeAgo(a.created_at)}
        </p>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(a)}
          className="h-7 shrink-0 rounded-lg p-1.5 text-encode-grey opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
          aria-label="Delete entry"
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );
}
