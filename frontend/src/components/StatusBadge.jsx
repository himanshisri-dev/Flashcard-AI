const STYLES = {
  processing: { dot: "bg-amber-400 animate-pulse", pill: "bg-amber-400/10 text-amber-400 border-amber-400/20", label: "Processing" },
  pending:    { dot: "bg-amber-400 animate-pulse", pill: "bg-amber-400/10 text-amber-400 border-amber-400/20", label: "Pending" },
  ready:      { dot: "bg-emerald-400",             pill: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", label: "Ready" },
  failed:     { dot: "bg-rose-400",                pill: "bg-rose-400/10 text-rose-400 border-rose-400/20", label: "Failed" },
};

export default function StatusBadge({ label, status }) {
  const s = STYLES[status] || { dot: "bg-slate-400", pill: "bg-slate-400/10 text-slate-400 border-slate-400/20", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}: {s.label}
    </span>
  );
}
