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

// ---- Invoicing

const inrExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });
/** ₹1,23,456.70: exact to the paisa, for invoices. */
export const formatInr = (value) => (value == null || value === "" ? "—" : inrExact.format(Number(value)));

/** "2026-10-11" (a calendar date, no timezone) → "11 Oct 2026". */
export function formatDay(isoDate) {
  if (!isoDate) return "—";
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// GST state codes, used for place of supply.
export const INDIAN_STATES = [
  ["01", "Jammu and Kashmir"], ["02", "Himachal Pradesh"], ["03", "Punjab"], ["04", "Chandigarh"], ["05", "Uttarakhand"],
  ["06", "Haryana"], ["07", "Delhi"], ["08", "Rajasthan"], ["09", "Uttar Pradesh"], ["10", "Bihar"], ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"], ["13", "Nagaland"], ["14", "Manipur"], ["15", "Mizoram"], ["16", "Tripura"],
  ["17", "Meghalaya"], ["18", "Assam"], ["19", "West Bengal"], ["20", "Jharkhand"], ["21", "Odisha"],
  ["22", "Chhattisgarh"], ["23", "Madhya Pradesh"], ["24", "Gujarat"], ["26", "Dadra and Nagar Haveli and Daman and Diu"],
  ["27", "Maharashtra"], ["29", "Karnataka"], ["30", "Goa"], ["31", "Lakshadweep"], ["32", "Kerala"],
  ["33", "Tamil Nadu"], ["34", "Puducherry"], ["35", "Andaman and Nicobar Islands"], ["36", "Telangana"],
  ["37", "Andhra Pradesh"], ["38", "Ladakh"], ["97", "Other Territory"], ["96", "Outside India (export)"],
].map(([code, name]) => ({ code, name }));

export const stateName = (code) => INDIAN_STATES.find((s) => s.code === code)?.name || "";

export const TAX_MODE_OPTIONS = [
  { value: "intra", label: "CGST + SGST (same state)" },
  { value: "inter", label: "IGST (other state)" },
  { value: "none", label: "No GST" },
];

export const GST_RATES = [0, 5, 12, 18, 28];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export const INVOICE_STATUS = {
  draft: { label: "Draft", className: "bg-encode-soft text-encode-grey ring-encode-border" },
  issued: { label: "Unpaid", className: "bg-encode-blueTint text-encode-blueDark ring-sky-200" },
  partially_paid: { label: "Part paid", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  paid: { label: "Paid", className: "bg-green-50 text-green-700 ring-green-200" },
  overdue: { label: "Overdue", className: "bg-red-50 text-red-700 ring-red-200" },
  void: { label: "Void", className: "bg-encode-soft text-encode-grey line-through ring-encode-border" },
};
