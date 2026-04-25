import { useState } from "react";

const CARD_COLORS = [
  { front: "from-indigo-600/20 to-indigo-900/40 border-indigo-500/20", back: "from-purple-600/20 to-purple-900/40 border-purple-500/20" },
  { front: "from-violet-600/20 to-violet-900/40 border-violet-500/20", back: "from-fuchsia-600/20 to-fuchsia-900/40 border-fuchsia-500/20" },
  { front: "from-cyan-600/20 to-cyan-900/40 border-cyan-500/20",       back: "from-teal-600/20 to-teal-900/40 border-teal-500/20" },
  { front: "from-sky-600/20 to-sky-900/40 border-sky-500/20",          back: "from-blue-600/20 to-blue-900/40 border-blue-500/20" },
];

export default function FlipCard({ card, index = 0, onEdit, onDelete }) {
  const [flipped, setFlipped] = useState(false);
  const color = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <div
      className="flip-card h-56 cursor-pointer select-none"
      onClick={() => setFlipped((f) => !f)}
    >
      <div className={`flip-card-inner ${flipped ? "flipped" : ""}`}>
        {/* Front */}
        <div className={`flip-card-face bg-gradient-to-br ${color.front} border rounded-2xl p-5 flex flex-col justify-between`}>
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Question</span>
            <span className="text-xs text-slate-600">#{(index + 1).toString().padStart(2, "0")}</span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed line-clamp-4 font-medium">
            {card.front}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tap to reveal
          </div>
        </div>

        {/* Back */}
        <div className={`flip-card-back flip-card-face bg-gradient-to-br ${color.back} border rounded-2xl p-5 flex flex-col justify-between`}>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Answer</span>
          <p className="text-slate-200 text-sm leading-relaxed line-clamp-5">{card.back}</p>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(card)}
              className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-all"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(card._id)}
              className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
