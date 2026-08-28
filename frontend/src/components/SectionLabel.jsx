export default function SectionLabel({ children, dark = false }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="h-1.5 w-1.5 rounded-full bg-encode-blue" />
      <span className={`label ${dark ? "text-white/50" : ""}`}>{children}</span>
    </div>
  );
}
