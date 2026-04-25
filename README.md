# FlashCard AI

I built this as a full-stack AI project — you upload a PDF, and it automatically generates flashcards from the content. You can also chat with your document and ask it anything, and it answers using only what's actually in the PDF.

🌐 **Live:** [flashcard-ai-psi.vercel.app](https://flashcard-ai-psi.vercel.app)

---

## What it does

Upload any PDF (lecture notes, textbooks, research papers) and the app will:

- Generate 10–20 flashcards covering the key concepts
- Let you flip through them with a 3D card animation
- Edit or delete any card you don't like
- Answer your questions about the document in real time using RAG

The Q&A is not just a chatbot — it actually reads your document, finds the most relevant sections, and answers from those. If something isn't in the document, it tells you that instead of making something up.

---

## Tech I used

**Backend** — Node.js with Express, MongoDB for storing everything, Qdrant as the vector database for semantic search, Groq API (LLaMA 3.3 70B) for generating flashcards and chat responses, and Jina AI for text embeddings.

**Frontend** — React with Vite, Tailwind CSS for the dark UI, React Router for navigation, and the native Fetch API with ReadableStream to handle the streaming chat responses.

**Auth** — JWT tokens with bcrypt password hashing. Stateless, no sessions.

---

## How the Q&A actually works (RAG)

This was the most interesting part to build:

1. When you upload a PDF, the text gets split into overlapping chunks (~500 chars each)
2. Each chunk gets converted into a 768-dimensional vector using Jina AI embeddings
3. All vectors get stored in Qdrant with metadata (which PDF, which user)
4. When you ask a question, your question also gets embedded
5. Qdrant finds the 5 most semantically similar chunks
6. Those chunks + your question go into a prompt for LLaMA 3.3 70B
7. The answer streams back word by word via Server-Sent Events

The model is explicitly told not to answer from its training data — only from the retrieved chunks. This prevents hallucination.

---

## Running it locally

You'll need Node.js 20+, MongoDB, and Docker for Qdrant.

```bash
git clone https://github.com/himanshisri-dev/Flashcard-AI.git
cd Flashcard-AI

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

Create `backend/.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/flashcard-ai
JWT_SECRET=any_random_secret
GROQ_API_KEY=get free key at console.groq.com
JINA_API_KEY=get free key at jina.ai
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=pdf_chunks
NODE_ENV=development
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000/api
```

```bash
# Start Qdrant
docker start qdrant

# Start backend (in /backend)
node server.js

# Start frontend (in /frontend)
npm run dev
```

Open **http://localhost:5173**

---

## Deployment

- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas
- Vector DB → Qdrant Cloud

---

## A few things I learned building this

- Transformers.js is great locally but crashes Render's free 512MB RAM limit — switched to Jina AI API for embeddings
- `EventSource` only supports GET requests so you can't use it for POST-based SSE streams — had to use `fetch` + `ReadableStream` with an async generator instead
- Overlapping chunks in RAG matter a lot — without overlap, answers at chunk boundaries get missed
- The `@` in MongoDB passwords breaks connection strings unless you encode it as `%40`
