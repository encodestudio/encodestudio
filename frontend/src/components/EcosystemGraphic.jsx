import { motion } from "framer-motion";

const nodes = [
  { key: "campus", label: "Encode Campus", x: 260, y: 40, color: "#000000" },
  { key: "learn", label: "Encode Learn", x: 70, y: 200, color: "#38B6FF" },
  { key: "verify", label: "Encode Verify", x: 450, y: 200, color: "#000000" },
];

export default function EcosystemGraphic({ className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 520 260" className="w-full" fill="none">
        <motion.path
          d="M260 60 L90 190"
          stroke="#38B6FF"
          strokeWidth="2"
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <motion.path
          d="M260 60 L430 190"
          stroke="#38B6FF"
          strokeWidth="2"
          strokeDasharray="4 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
        />
        <motion.path
          d="M100 200 L420 200"
          stroke="#E5E7EB"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>

      {nodes.map((n, i) => (
        <motion.div
          key={n.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.15, duration: 0.5 }}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
          style={{ left: `${(n.x / 520) * 100}%`, top: `${(n.y / 260) * 100}%` }}
        >
          <span
            className="h-3.5 w-3.5 rounded-full ring-4 ring-white"
            style={{ backgroundColor: n.color }}
          />
          <span className="whitespace-nowrap rounded-full border border-encode-border bg-white px-3 py-1 text-xs font-semibold shadow-sm">
            {n.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
