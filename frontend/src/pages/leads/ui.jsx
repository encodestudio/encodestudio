import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { initials } from "./format.js";

export function Avatar({ name, size = "sm", className = "" }) {
  const sizes = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg" };
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-black font-semibold text-white ${sizes[size]} ${className}`}
    >
      {initials(name)}
    </span>
  );
}

const PRIORITY_STYLES = {
  high: "bg-red-50 text-red-700 ring-red-200",
  medium: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-encode-soft text-encode-grey ring-encode-border",
};

export function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${
        PRIORITY_STYLES[priority] || PRIORITY_STYLES.low
      }`}
    >
      <span aria-hidden className="text-[9px]">
        {priority === "high" ? "▲" : priority === "low" ? "▼" : "■"}
      </span>
      {priority}
    </span>
  );
}

export function ScoreRing({ score, size = 36 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 60 ? "#16A34A" : score >= 30 ? "#2a78d6" : "#9CA3AF";
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} title={`Lead score ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDEFF2" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-black">{score}</span>
    </span>
  );
}

export function Tag({ children, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-encode-blueTint px-2 py-0.5 text-[11px] font-medium text-encode-blueDark">
      #{children}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-black" aria-label={`Remove tag ${children}`}>
          <X size={11} />
        </button>
      )}
    </span>
  );
}

export function Modal({ title, onClose, children, width = "max-w-lg" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full ${width} overflow-y-auto rounded-3xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-encode-border px-6 py-4">
          <h2 className="text-lg font-display font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-encode-grey hover:bg-encode-soft hover:text-black" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  );
}

export function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold text-black/70">{label}</span>
      {children}
    </label>
  );
}

export function Card({ title, action, children, className = "", bodyClassName = "p-5" }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-encode-border bg-white ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-encode-border px-5 py-3.5">
          <h3 className="text-sm font-semibold text-black">{title}</h3>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-encode-soft text-encode-grey">
          <Icon size={20} />
        </span>
      )}
      <p className="text-sm font-semibold text-black">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-encode-grey">{children}</p>}
    </div>
  );
}

/** Small toast shown at the bottom of the portal. */
export function Toast({ message, tone = "default", onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [message, onDone]);
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium shadow-lg ${
        tone === "error" ? "bg-red-600 text-white" : "bg-black text-white"
      }`}
    >
      {message}
    </motion.div>
  );
}
