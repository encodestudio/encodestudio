import { motion } from "framer-motion";

const rows = [
  { label: "PRODUCTS", width: "100%" },
  { label: "SERVICES", width: "72%" },
  { label: "TECHNOLOGY", width: "100%" },
];

export default function EMotif({ className = "" }) {
  return (
    <div className={`inline-flex flex-col gap-3 ${className}`}>
      {rows.map((row, i) => (
        <motion.div
          key={row.label}
          className="group flex items-center gap-4"
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
        >
          <span
            className="h-3 rounded-full bg-black transition-all duration-500 group-hover:bg-encode-blue"
            style={{ width: row.width }}
          />
          <span className="label whitespace-nowrap">{row.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
