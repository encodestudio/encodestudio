const STYLES = {
  new: "bg-encode-blueTint text-encode-blueDark",
  contacted: "bg-encode-soft text-encode-grey",
  qualified: "bg-black text-white",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

const LABELS = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  lost: "Lost",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        STYLES[status] || "bg-encode-soft text-encode-grey"
      }`}
    >
      {LABELS[status] || status}
    </span>
  );
}

export const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];
