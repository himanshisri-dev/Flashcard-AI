import { useState } from "react";

const CARD_COLORS = [
  {
    front: "from-indigo-50 to-indigo-100/60 border-indigo-200 dark:from-indigo-600/20 dark:to-indigo-900/40 dark:border-indigo-500/20",
    back:  "from-purple-50 to-purple-100/60 border-purple-200 dark:from-purple-600/20 dark:to-purple-900/40 dark:border-purple-500/20",
  },
  {
    front: "from-violet-50 to-violet-100/60 border-violet-200 dark:from-violet-600/20 dark:to-violet-900/40 dark:border-violet-500/20",
    back:  "from-fuchsia-50 to-fuchsia-100/60 border-fuchsia-200 dark:from-fuchsia-600/20 dark:to-fuchsia-900/40 dark:border-fuchsia-500/20",
  },
  {
    front: "from-cyan-50 to-cyan-100/60 border-cyan-200 dark:from-cyan-600/20 dark:to-cyan-900/40 dark:border-cyan-500/20",
    back:  "from-teal-50 to-teal-100/60 border-teal-200 dark:from-teal-600/20 dark:to-teal-900/40 dark:border-teal-500/20",
  },
  {
    front: "from-sky-50 to-sky-100/60 border-sky-200 dark:from-sky-600/20 dark:to-sky-900/40 dark:border-sky-500/20",
    back:  "from-blue-50 to-blue-100/60 border-blue-200 dark:from-blue-600/20 dark:to-blue-900/40 dark:border-blue-500/20",
  },
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
            <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Question</span>
            <span className="text-xs text-slate-400 dark:text-slate-600">#{(index + 1).toString().padStart(2, "0")}</span>
          </div>
          <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed line-clamp-4 font-medium">
            {card.front}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Tap to reveal
          </div>
        </div>

        {/* Back */}
        <div className={`flip-card-back flip-card-face bg-gradient-to-br ${color.back} border rounded-2xl p-5 flex flex-col justify-between`}>
          <span className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider">Answer</span>
          <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed line-clamp-5">{card.back}</p>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(card)}
              className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-all"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(card._id)}
              className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-2.5 py-1 rounded-lg transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
