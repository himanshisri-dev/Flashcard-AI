import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import FlipCard from "../components/FlipCard.jsx";
import EditCardModal from "../components/EditCardModal.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import QuizPanel from "../components/QuizPanel.jsx";

export default function PdfDetail() {
  const { id } = useParams();
  const [pdf, setPdf] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [pdfRes, cardsRes] = await Promise.all([
          api.get(`/pdfs/${id}`),
          api.get(`/pdfs/${id}/flashcards`),
        ]);
        setPdf(pdfRes.data.pdf);
        setCards(cardsRes.data.flashcards);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load document");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(cardId, updates) {
    const { data } = await api.patch(`/flashcards/${cardId}`, updates);
    setCards((prev) => prev.map((c) => (c._id === cardId ? data.flashcard : c)));
  }

  async function handleDelete(cardId) {
    if (!window.confirm("Delete this flashcard?")) return;
    try {
      await api.delete(`/flashcards/${cardId}`);
      setCards((prev) => prev.filter((c) => c._id !== cardId));
    } catch (err) {
      window.alert("Delete failed: " + (err.response?.data?.error || err.message));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <div className="flex items-center justify-center mt-32">
          <svg className="w-8 h-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Navbar />
        <p className="text-center text-rose-500 dark:text-rose-400 mt-32">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />

      {/* Hero header */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50/50 to-slate-50 dark:from-indigo-600/15 dark:via-purple-600/10 dark:to-slate-950 border-b border-slate-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-7">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors mb-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">{pdf.originalName}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {pdf.subject && (
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-white/5">
                {pdf.subject}
              </span>
            )}
            <StatusBadge label="Cards" status={pdf.status} />
            <StatusBadge label="Q&A" status={pdf.embeddingStatus} />
            {typeof pdf.chunkCount === "number" && pdf.chunkCount > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-600">{pdf.chunkCount} chunks indexed</span>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Flashcards section */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-slate-900 dark:text-white font-semibold">
                  Flashcards{" "}
                  {cards.length > 0 && (
                    <span className="text-slate-400 dark:text-slate-500 font-normal text-sm">({cards.length})</span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-600">Click any card to flip it</p>
              </div>
            </div>
          </div>

          {pdf.status === "processing" && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5 flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-amber-500 dark:text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-amber-600 dark:text-amber-400 text-sm">Generating flashcards… this may take a minute.</p>
            </div>
          )}

          {pdf.status === "failed" && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-5">
              <p className="text-rose-600 dark:text-rose-400 text-sm">Flashcard generation failed: {pdf.error}</p>
            </div>
          )}

          {pdf.status === "ready" && cards.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-14 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">No flashcards found for this document.</p>
            </div>
          )}

          {cards.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card, i) => (
                <FlipCard
                  key={card._id}
                  card={card}
                  index={i}
                  onEdit={setEditTarget}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {pdf.status === "ready" && cards.length >= 2 && (
          <QuizPanel pdfId={id} cardCount={cards.length} />
        )}

        <ChatPanel pdfId={id} embeddingStatus={pdf.embeddingStatus} />
      </main>

      {editTarget && (
        <EditCardModal
          card={editTarget}
          onSave={handleSave}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
