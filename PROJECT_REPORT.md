# FlashCard AI — Project Report

**Submitted by:** Himanshi Srivastava  
**Email:** himanshi.srivastava@zimyo.com  
**Date:** April 2026  
**Assignment:** Company Selection Process — Full-Stack AI Application

---

## 1. Project Overview

FlashCard AI is a full-stack web application that allows students to upload PDF documents and instantly receive AI-generated flashcards for study. The app also supports natural language Q&A over the document using Retrieval-Augmented Generation (RAG), enabling students to ask questions and receive context-aware answers streamed in real time.

---

## 2. Features

| Feature | Description |
|---|---|
| User Authentication | Secure register/login with JWT tokens and bcrypt password hashing |
| PDF Upload | Upload PDFs up to 10MB; files stored on disk with UUID filenames |
| AI Flashcard Generation | Automatically generates 10–20 study flashcards per document using LLaMA 3.3 70B via Groq |
| 3D Flip Cards | Interactive flip-card UI with CSS 3D perspective transforms |
| Flashcard CRUD | Edit and delete individual flashcards inline |
| Document Embeddings | Text is chunked and embedded locally (no API cost) using Transformers.js |
| Vector Search | Semantic similarity search via Qdrant vector database |
| RAG Chat | Ask any question about the document; answers are streamed in real time using retrieved context |
| Chat History | Conversations are persisted per document per user |
| Responsive UI | Dark-themed, modern UI built with React + Tailwind CSS v3 |

---

## 3. Tech Stack

### Backend
| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 20 (ES Modules) | Server runtime |
| Framework | Express.js | REST API + SSE streaming |
| Database | MongoDB + Mongoose | Users, PDFs, Flashcards, Chat messages |
| Vector DB | Qdrant (Docker) | Semantic search over document chunks |
| LLM | Groq API — LLaMA 3.3 70B | Flashcard generation + chat responses |
| Embeddings | Transformers.js (Xenova/all-mpnet-base-v2) | Local 768-dim text embeddings |
| Auth | JSON Web Tokens + bcrypt | Stateless authentication |
| File Upload | Multer | PDF ingestion |
| PDF Parsing | pdf-parse | Text extraction from PDFs |

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 | UI component tree |
| Build Tool | Vite 5 | Dev server + production bundling |
| Styling | Tailwind CSS v3 | Utility-first styling |
| Routing | React Router v6 | Client-side navigation |
| HTTP Client | Axios | API calls with JWT interceptor |
| Streaming | Fetch + ReadableStream | SSE chat stream consumption |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                   │
│  Login/Register → Dashboard → PdfDetail + ChatPanel │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / SSE
┌──────────────────────▼──────────────────────────────┐
│               Express API (Node.js)                  │
│  /api/auth   /api/pdfs   /api/flashcards             │
└──────┬──────────────┬──────────────────┬────────────┘
       │              │                  │
┌──────▼──────┐ ┌─────▼──────┐ ┌────────▼────────┐
│   MongoDB   │ │   Qdrant   │ │   Groq API      │
│ Users, PDFs │ │ Embeddings │ │ LLaMA 3.3 70B   │
│ Flashcards  │ │ (768-dim)  │ │ Flashcards+Chat │
│ ChatMessages│ │            │ │                 │
└─────────────┘ └────────────┘ └─────────────────┘
                      ▲
               ┌──────┴──────┐
               │Transformers │
               │.js (local)  │
               │all-mpnet-   │
               │base-v2      │
               └─────────────┘
```

---

## 5. API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Sign in, receive JWT |

### PDFs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pdfs/` | List all PDFs for the user |
| POST | `/api/pdfs/` | Upload a new PDF (multipart/form-data) |
| GET | `/api/pdfs/:id` | Get a single PDF with metadata |
| DELETE | `/api/pdfs/:id` | Delete PDF + flashcards + chat history |
| POST | `/api/pdfs/:id/reindex` | Re-run embedding pipeline only |
| GET | `/api/pdfs/:id/flashcards` | List all flashcards for a PDF |
| GET | `/api/pdfs/:id/chat` | Get chat history |
| POST | `/api/pdfs/:id/chat` | Send a message (SSE stream response) |
| DELETE | `/api/pdfs/:id/chat` | Clear chat history |

### Flashcards
| Method | Endpoint | Description |
|---|---|---|
| PATCH | `/api/flashcards/:id` | Edit front/back of a flashcard |
| DELETE | `/api/flashcards/:id` | Delete a single flashcard |

---

## 6. Data Models

### User
```
name, email (unique), password (hashed), timestamps
```

### PDF
```
userId, filename, originalName, filePath, subject,
status (processing|ready|failed),
embeddingStatus (pending|ready|failed),
chunkCount, error, embeddingError, timestamps
```

### Flashcard
```
pdfId, userId, front (max 300 chars), back (max 800 chars), timestamps
```

### ChatMessage
```
pdfId, userId, role (user|assistant), content, timestamps
```

---

## 7. RAG Pipeline (Retrieval-Augmented Generation)

The Q&A feature uses a full RAG pipeline:

```
User Question
     │
     ▼
Embed question locally (Transformers.js)
     │
     ▼
Search Qdrant for top-5 similar chunks
(filtered by pdfId + userId for data isolation)
     │
     ▼
Build prompt: System rules + Context chunks + Question
     │
     ▼
Stream response from Groq LLaMA 3.3 70B
     │
     ▼
SSE chunks → frontend → progressive rendering
     │
     ▼
Persist full assistant message to MongoDB
```

**Guardrails built in:**
- If answer not in context → "I couldn't find that in the document"
- Greetings/casual messages → handled naturally without the fallback
- Off-topic requests → politely redirected

---

## 8. Background Processing Pipeline

When a PDF is uploaded, two independent jobs run in parallel via `Promise.allSettled`:

```
PDF Upload
    │
    ├── Extract text (pdf-parse)
    │
    ├─────────────────────────────────┐
    │                                 │
    ▼                                 ▼
Flashcard Job                  Embedding Job
(Groq LLaMA)                   (Transformers.js → Qdrant)
    │                                 │
    ▼                                 ▼
status: ready/failed       embeddingStatus: ready/failed
```

One job failing does not block the other.

---

## 9. Key Design Decisions

| Decision | Reason |
|---|---|
| Local embeddings (Transformers.js) | Eliminated Gemini embedding API quota limits entirely — runs offline after first model download |
| Groq instead of Gemini | Gemini free tier hit 429 quota errors; Groq provides 14,400 req/day free with faster inference |
| SSE over WebSockets for chat | Simpler unidirectional stream; no socket library needed |
| Fetch + ReadableStream (not EventSource) | EventSource only supports GET; chat requires POST with a request body |
| Promise.allSettled for pipeline | Decouples flashcard and embedding failures; one doesn't block the other |
| UUIDv5 deterministic Qdrant point IDs | Re-embedding a PDF overwrites existing vectors instead of duplicating them |
| JWT stateless auth | No session store needed; scales horizontally |

---

## 10. Project Structure

```
FlashCard AI/
├── backend/
│   ├── server.js
│   ├── .env
│   └── src/
│       ├── config/          env.js, db.js
│       ├── models/          User, Pdf, Flashcard, ChatMessage
│       ├── middleware/       authenticate.js, upload.js, errorHandler.js
│       ├── controllers/     auth, pdf, flashcard, chat
│       ├── routes/          auth, pdf, flashcard
│       └── services/        groq, embeddings, qdrant, pdf, pipeline
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── api/             client.js, streamChat.js
        ├── context/         AuthContext.jsx
        ├── components/      Navbar, StatusBadge, FlipCard,
        │                    EditCardModal, ChatPanel, ProtectedRoute
        └── pages/           Login, Register, Dashboard, PdfDetail
```

---

## 11. Running the Project Locally

**Prerequisites:** Node.js 20+, MongoDB, Docker (for Qdrant)

```bash
# 1. Start Qdrant
docker start qdrant

# 2. Start backend
cd backend
node server.js

# 3. Start frontend
cd frontend
npm run dev
```

App runs at **http://localhost:5173**  
API runs at **http://localhost:5000**

---

## 12. Environment Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for signing JWTs |
| `GROQ_API_KEY` | Groq API key (free at console.groq.com) |
| `QDRANT_URL` | Qdrant instance URL |
| `QDRANT_COLLECTION` | Qdrant collection name |

---

*FlashCard AI — Built as a company selection process assignment.*
