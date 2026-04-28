import { useState } from "react";
import { api } from "../api/client.js";

const STATES = { IDLE: "idle", LOADING: "loading", ACTIVE: "active", DONE: "done" };

export default function QuizPanel({ pdfId, cardCount }) {
  const [state, setState] = useState(STATES.IDLE);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState("");

  async function startQuiz() {
    setState(STATES.LOADING);
    setError("");
    try {
      const { data } = await api.get(`/pdfs/${pdfId}/quiz`);
      setQuestions(data.questions);
      setCurrent(0);
      setSelected(null);
      setScore(0);
      setState(STATES.ACTIVE);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate quiz");
      setState(STATES.IDLE);
    }
  }

  function handleSelect(option) {
    if (selected !== null) return;
    setSelected(option);
    if (option === questions[current].correct) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setState(STATES.DONE);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }

  const q = questions[current];
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;

  return (
    <section className="mt-10">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
        <div>
          <h2 className="text-slate-900 dark:text-white font-semibold">Blind Quiz</h2>
          <p className="text-xs text-slate-400 dark:text-slate-600">Test your knowledge with multiple-choice questions</p>
        </div>
      </div>

      {/* IDLE */}
      {state === STATES.IDLE && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/15 flex items-center justify-center">
            <svg className="w-7 h-7 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-slate-700 dark:text-slate-300 font-medium">Ready to test yourself?</p>
            <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">
              {cardCount >= 2
                ? `AI will generate MCQs from your ${cardCount} flashcards`
                : "Need at least 2 flashcards to start a quiz"}
            </p>
          </div>
          {error && <p className="text-rose-500 dark:text-rose-400 text-sm">{error}</p>}
          <button
            onClick={startQuiz}
            disabled={cardCount < 2}
            className="mt-1 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            Start Quiz
          </button>
        </div>
      )}

      {/* LOADING */}
      {state === STATES.LOADING && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-10 flex flex-col items-center gap-3">
          <svg className="w-7 h-7 animate-spin text-violet-500 dark:text-violet-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Generating quiz questions…</p>
        </div>
      )}

      {/* ACTIVE */}
      {state === STATES.ACTIVE && q && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-6">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Question {current + 1} of {questions.length}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Score: {score}/{current + (selected !== null ? 1 : 0)}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 mb-6">
            <div
              className="bg-violet-500 h-1 rounded-full transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Question */}
          <p className="text-slate-800 dark:text-slate-100 font-medium text-base leading-relaxed mb-6">{q.question}</p>

          {/* Options */}
          <div className="flex flex-col gap-3">
            {q.options.map((opt) => {
              let style = "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-violet-50 dark:hover:bg-violet-500/10 cursor-pointer";
              if (selected !== null) {
                if (opt === q.correct) style = "border-emerald-400 dark:border-emerald-500/60 bg-emerald-50 dark:bg-emerald-500/10 cursor-default";
                else if (opt === selected) style = "border-rose-400 dark:border-rose-500/60 bg-rose-50 dark:bg-rose-500/10 cursor-default";
                else style = "border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/30 opacity-50 cursor-default";
              }
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(opt)}
                  className={`text-left w-full px-4 py-3 rounded-xl border text-sm text-slate-700 dark:text-slate-200 transition-all ${style}`}
                >
                  <span className="flex items-center gap-3">
                    {selected !== null && opt === q.correct && (
                      <svg className="w-4 h-4 text-emerald-500 dark:text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {selected !== null && opt === selected && opt !== q.correct && (
                      <svg className="w-4 h-4 text-rose-500 dark:text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Next / Finish */}
          {selected !== null && (
            <div className="mt-5 flex justify-end">
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {current + 1 >= questions.length ? "See Results" : "Next Question"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* DONE */}
      {state === STATES.DONE && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${pct >= 70 ? "bg-emerald-500/20" : "bg-amber-500/20"}`}>
            <span className={`text-2xl font-bold ${pct >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{pct}%</span>
          </div>
          <div>
            <p className="text-slate-900 dark:text-white font-semibold text-lg">
              {pct === 100 ? "Perfect score!" : pct >= 70 ? "Great job!" : "Keep studying!"}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              You got {score} out of {questions.length} correct
            </p>
          </div>
          <button
            onClick={startQuiz}
            className="mt-1 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      )}
    </section>
  );
}
