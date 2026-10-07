// Shared constants and formatters for the lead portal.

export const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "social", label: "Social media" },
  { value: "event", label: "Event" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
];

export const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// Chart colors — validated for contrast and colour-blind separation on white.
export const CHART = {
  series1: "#2a78d6",
  series2: "#eb6834",
  ordinal: ["#86b6ef", "#3987e5", "#256abf", "#184f95"],
  sequential: ["#f1f5fb", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"],
  grid: "#EDEFF2",
  axis: "#6B7280",
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatMoney = (value, compact = false) =>
  value == null || value === "" ? "—" : (compact ? inrCompact : inr).format(Number(value));

export function formatDate(iso, withTime = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
export function timeAgo(iso) {
  if (!iso) return "—";
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function formatHours(hours) {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}
