# LearnAble (Local AI Learning Assistant)

LearnAble is a local-first AI-powered learning application that helps users understand documents through summaries, flashcards, and chat — all running on local models via Ollama.

## Features

- Upload and analyze documents
- AI-generated summaries (adjustable reading levels)
- Flashcard generation
- Chat with your documents (RAG)
- Podcast-style audio summaries
- Accessibility features (font size, spacing, reading levels)
- Fully local AI (no external API required)

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript

### Backend
- Python
- FastAPI

### AI / Local Models
- Ollama
- Embeddings + vector search (FAISS or similar)
- Retrieval-Augmented Generation (RAG)  [oai_citation:0‡Week 2 Applications Survey & Review.docx.pdf](sediment://file_0000000053f071fdbeb6c8a0eb727915)

---

## Prerequisites

Install the following:

- Node.js (v18+)
- Python (3.10+)
- Ollama → https://ollama.com

---

## 1. Install & Run Ollama

### Install Ollama
```bash
brew install ollama   # Mac

Or download from: https://ollama.com

Start Ollama

ollama serve

Pull a model (example)

ollama pull llama3

You can also use:

ollama pull mistral
ollama pull phi3


⸻

2. Clone the Project

git clone https://github.com/stevenehab/LearnAble.git
cd learnable


⸻

3. Backend Setup

cd backend
python -m venv venv

Activate venv

Mac/Linux:

source venv/bin/activate

Windows:

venv\Scripts\activate




⸻

4. Configure Environment Variables

Create .env inside backend/

Example:

LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHUNK_SIZE=500


⸻

5. Run Backend

uvicorn main:app --reload

Backend runs on:

http://127.0.0.1:8000


⸻

6. Frontend Setup

Open a new terminal:

cd frontend
npm install


⸻

7. Run Frontend

npm run dev

Frontend runs on:

http://localhost:3000


⸻

How It Works
	1.	Upload a document
	2.	Backend splits it into chunks
	3.	Chunks are converted into embeddings
	4.	Stored in a vector database
	5.	When you ask a question:
	•	Relevant chunks are retrieved
	•	Ollama generates an answer based on them

This approach reduces hallucinations and ensures responses are grounded in your data  ￼.

⸻

Common Issues

Ollama not running

ollama serve

Model not found

ollama pull llama3

Port already in use

Kill process on port:

lsof -i :8000
kill -9 <PID>

Backend not connecting to Ollama

Make sure Ollama is running on:

http://localhost:11434


⸻

Example Run (2 terminals)

Terminal 1 (Backend)

cd backend
source venv/bin/activate
uvicorn main:app --reload

Terminal 2 (Frontend)

cd frontend
npm install
npm run dev


⸻

Notes
	•	Everything runs locally (privacy-first)
	•	Performance depends on your machine (RAM + CPU/GPU)
	•	No internet required after model download

⸻

Authors
	•	John Thomas
	•	Aashray Rout
	•	Steven Agayby

⸻

License

Academic project (DS 440 – Penn State)
