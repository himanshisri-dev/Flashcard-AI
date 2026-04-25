import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import Navbar from "../components/Navbar.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

export default function Dashboard() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  async function fetchPdfs() {
    try {
      const { data } = await api.get("/pdfs/");
      setPdfs(data.pdfs);
    } catch (err) {
      console.error("Failed to fetch PDFs:", err);
    }
  }

  useEffect(() => {
    fetchPdfs().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const hasActive = pdfs.some(
      (p) => p.status === "processing" || p.embeddingStatus === "pending"
    );
    if (!hasActive) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchPdfs, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [pdfs]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      if (subject.trim()) form.append("subject", subject.trim());
      const { data } = await api.post("/pdfs/", form);
      setPdfs((prev) => [data.pdf, ...prev]);
      setFile(null);
      setSubject("");
      const input = document.getElementById("file-input");
      if (input) input.value = "";
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this PDF and all its flashcards / chat history?")) return;
    try {
      await api.delete(`/pdfs/${id}`);
      setPdfs((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      window.alert("Delete failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function handleReindex(id) {
    try {
      await api.post(`/pdfs/${id}/reindex`);
      setPdfs((prev) =>
        prev.map((p) => p._id === id ? { ...p, embeddingStatus: "pending", embeddingError: "" } : p)
      );
    } catch (err) {
      window.alert("Reindex failed: " + (err.response?.data?.error || err.message));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      {/* Hero strip */}
      <div className="bg-gradient-to-r from-indigo-600/20 via-purple-600/10 to-slate-950 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold text-white">Your Study Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Upload a PDF — AI will generate flashcards and enable Q&A instantly.</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Upload card */}
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h3 className="text-white font-semibold">Upload a PDF</h3>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group">
                <svg className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mb-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
                  {file ? file.name : "Choose PDF file"}
                </span>
                <input
                  id="file-input"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              <input
                type="text"
                placeholder="Subject (e.g. Machine Learning)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!file || uploading}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 text-sm"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Uploading…
                </span>
              ) : "Generate flashcards"}
            </button>
          </form>
        </div>

        {/* Documents list */}
        <div>
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Your documents
            {pdfs.length > 0 && (
              <span className="text-xs text-slate-500 font-normal">({pdfs.length})</span>
            )}
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="w-8 h-8 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : pdfs.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-white/10 rounded-2xl p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">No documents yet. Upload a PDF above to get started.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pdfs.map((p) => (
                <li
                  key={p._id}
                  className="group bg-slate-900 border border-white/8 hover:border-indigo-500/30 rounded-2xl p-4 flex items-start justify-between gap-4 transition-all"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/pdfs/${p._id}`}
                        className="font-medium text-white hover:text-indigo-300 truncate block transition-colors text-sm"
                      >
                        {p.originalName}
                      </Link>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {p.subject && (
                          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">{p.subject}</span>
                        )}
                        <StatusBadge label="Cards" status={p.status} />
                        <StatusBadge label="Q&A" status={p.embeddingStatus} />
                        {typeof p.chunkCount === "number" && p.chunkCount > 0 && (
                          <span className="text-xs text-slate-600">{p.chunkCount} chunks</span>
                        )}
                      </div>
                      {p.error && <p className="text-xs text-rose-400 mt-1 truncate">{p.error}</p>}
                      {p.embeddingError && <p className="text-xs text-rose-400 mt-1 truncate">{p.embeddingError}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.embeddingStatus !== "ready" && p.embeddingStatus !== "pending" && (
                      <button
                        onClick={() => handleReindex(p._id)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg transition-all"
                      >
                        Reindex
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="text-xs text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
