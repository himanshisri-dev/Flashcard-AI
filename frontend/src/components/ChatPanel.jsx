import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { streamChat } from "../api/streamChat.js";

export default function ChatPanel({ pdfId, embeddingStatus }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const ready = embeddingStatus === "ready";

  useEffect(() => {
    if (!ready) return;
    api.get(`/pdfs/${pdfId}/chat`)
      .then(({ data }) => setMessages(data.messages))
      .catch(() => {});
  }, [pdfId, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    setInput("");
    setError("");
    setStreaming(true);

    const userMsg = { _id: `u-${Date.now()}`, role: "user", content: question };
    const assistantMsg = { _id: `a-${Date.now()}`, role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      for await (const event of streamChat(pdfId, question)) {
        if (event.type === "chunk") {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === assistantMsg._id ? { ...m, content: m.content + event.content } : m
            )
          );
        } else if (event.type === "done") {
          if (event.messageId) {
            setMessages((prev) =>
              prev.map((m) => m._id === assistantMsg._id ? { ...m, _id: event.messageId } : m)
            );
          }
        } else if (event.type === "error") {
          setError(event.message || "Chat failed");
          setMessages((prev) => prev.filter((m) => m._id !== assistantMsg._id));
        }
      }
    } catch (err) {
      setError(err.message || "Chat failed");
      setMessages((prev) => prev.filter((m) => m._id !== assistantMsg._id));
    } finally {
      setStreaming(false);
    }
  }

  async function handleClear() {
    if (!window.confirm("Clear all chat history for this document?")) return;
    try {
      await api.delete(`/pdfs/${pdfId}/chat`);
      setMessages([]);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to clear history");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  return (
    <section className="mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-semibold">Ask your document</h2>
            <p className="text-xs text-slate-500">Powered by RAG + Gemini</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-600 hover:text-rose-400 transition-colors"
          >
            Clear history
          </button>
        )}
      </div>

      {/* Not ready state */}
      {!ready && (
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 text-center">
          {embeddingStatus === "pending" ? (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-7 h-7 animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-amber-400 text-sm font-medium">Preparing your document for Q&A…</p>
              <p className="text-slate-500 text-xs">This takes about a minute on first upload.</p>
            </div>
          ) : embeddingStatus === "failed" ? (
            <p className="text-rose-400 text-sm">Q&A index failed. Use Reindex on the dashboard.</p>
          ) : (
            <p className="text-slate-500 text-sm">Q&A not available for this document.</p>
          )}
        </div>
      )}

      {/* Chat UI */}
      {ready && (
        <div className="bg-slate-900 border border-white/8 rounded-2xl overflow-hidden">
          {/* Messages */}
          <div className="h-[420px] overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-300 text-sm font-medium">Ask anything about this document</p>
                  <p className="text-slate-600 text-xs mt-1">The AI will answer using only the document content.</p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m._id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2.5`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold">
                    AI
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm"
                      : "bg-slate-800 text-slate-200 border border-white/5 rounded-tl-sm"
                  }`}
                >
                  {m.content || (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full dot-1" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full dot-2" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full dot-3" />
                    </span>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-300 text-xs font-bold">
                    U
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-white/8 p-4">
            {error && (
              <p className="text-xs text-rose-400 mb-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question… (Enter to send)"
                disabled={streaming}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                {streaming ? (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
