# Generic Product RAG System

A completely generic, product-independent Retrieval-Augmented Generation (RAG) Question & Answer application built from scratch.

This system works for any domain or product type (Clothing, Electronics, Furniture, Appliances, Software, Automotive, etc.) without hardcoding product-specific fields or schemas.

## Features & Architecture

* **Interface 1 — Knowledge / Admin Interface**:
  * Enter Question and Answer pairs for any product.
  * Dynamically stores data and generates vector embeddings immediately upon submission.
  * Displays active Knowledge Base items with option to delete.

* **Interface 2 — User Search Interface**:
  * Semantic vector similarity search matching direct, rephrased, and indirect questions.
  * Voice Input powered by browser-native Web Speech API (`SpeechRecognition`).
  * Real-time semantic confidence matching score percentage.
  * Strict guardrail cutoff: if no sufficiently relevant answer exists, returns `"I couldn't find a relevant answer in the available knowledge base."` without hallucinating.

* **Tech Stack**:
  * **Backend**: Python 3.10+, FastAPI, Uvicorn, Sentence-Transformers (`all-MiniLM-L6-v2`), NumPy.
  * **Frontend**: React, Vite, Lucide Icons, Custom Glassmorphism CSS.

---

## Project Structure

```text
t8 RAG-2/
├── backend/
│   ├── main.py            # FastAPI REST endpoints
│   ├── rag_engine.py      # Embedding & Cosine Similarity search engine
│   ├── storage.py         # JSON storage layer
│   └── requirements.txt   # Backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── AdminView.jsx
│   │   │   └── UserView.jsx
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── data/                  # Dynamic Knowledge Base storage
└── README.md
```

---

## How to Run

### 1. Setup & Launch Backend

```bash
# Create Python virtual environment (optional)
python -m venv venv
venv\Scripts\activate   # On Windows

# Install dependencies
pip install -r backend/requirements.txt

# Start FastAPI server
python -m backend.main
```
The backend server runs on `http://localhost:8000`.

### 2. Setup & Launch Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```
The frontend application will be accessible at `http://localhost:5173`.

---

## Verification & Testing Workflow

1. **Admin Add Knowledge**:
   * Navigate to the Admin tab.
   * Enter Question: `"What is the recommended maintenance method?"`
   * Enter Answer: `"Follow the maintenance instructions provided with the product."`
   * Click **Save & Index Knowledge**.

2. **Direct Question Test**:
   * Switch to the User Search tab.
   * Ask: `"What is the recommended maintenance method?"`
   * Result: Retrieves exact stored answer with ~100% confidence.

3. **Rephrased Question Test**:
   * Ask: `"How should I maintain this product?"`
   * Result: Retrieves the same relevant answer via semantic similarity search.

4. **Unrelated Question Test**:
   * Ask: `"Who won the world cup?"`
   * Result: Returns `"I couldn't find a relevant answer in the available knowledge base."`
