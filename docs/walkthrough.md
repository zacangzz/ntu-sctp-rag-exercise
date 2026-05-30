# Classical RAG App Verification Walkthrough

The classical RAG application is fully built, integrated, and verified to be working perfectly. 

Below is a detailed summary of the architecture, file additions, testing methods, and exact verification outcomes.

---

## 🛠️ Changes Implemented

We created a structured, modular RAG application split into a unified Python FastAPI backend and a beautiful Vite React frontend.

### 🐍 Backend Infrastructure (Python 3.13)
1.  **[rag_service.py](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/backend/rag_service.py)**:
    *   Implements the core LangChain RAG pipeline.
    *   `PyPDFLoader` & `TextLoader` load files.
    *   `RecursiveCharacterTextSplitter` divides text using dynamic, frontend-specified `chunk_size` and `chunk_overlap`.
    *   `OllamaEmbeddings` using the `nomic-embed-text` model generates vector representations.
    *   `Chroma` manages vector retrieval.
    *   `Ollama` using the `gemma4:e4b` model generates answers with precise legal contexts.
    *   A safe `reset_db()` method clears Chroma DB collections cleanly without locking SQLite.
2.  **[main.py](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/backend/main.py)**:
    *   A robust FastAPI application with CORS enabled.
    *   `/api/ingest`: Accepts multipart file uploads and form parameters for chunk size and overlap.
    *   `/api/ask`: Accepts query JSON body with question and retriever count $K$.
    *   `/api/documents`: Returns lists of unique indexed files.
    *   `/api/documents` (DELETE): Clears collection vectors.
3.  **[main.py](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/main.py) (Root)**:
    *   Updated the runner script to boot the FastAPI backend server on port `8000` via Uvicorn.
4.  **[pyproject.toml](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/pyproject.toml)**:
    *   Added required Python dependencies: `fastapi`, `uvicorn`, `python-multipart`, `chromadb`, `pypdf`, and `langchain-community`.

### ⚛️ Frontend UI (Vite + React)
1.  **[vite.config.js](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/frontend/vite.config.js)**:
    *   Configured Vite dev server to proxy `/api` calls directly to `http://localhost:8000`.
2.  **[App.css](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/frontend/src/App.css)**:
    *   Engineered a stunning, dark futuristic visual style.
    *   Integrates glassmorphic panels, glowing neomorphic borders, sliders, pulsing loading skeletons, and interactive buttons.
3.  **[App.jsx](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/frontend/src/App.jsx)**:
    *   Orchestrates global state for tuning parameters, loaded files, and view layout configurations.
4.  **[Navbar.jsx](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/frontend/src/components/Navbar.jsx)**:
    *   A gorgeous sidebar navigation using high-fidelity custom SVG icons with micro-interactions.
5.  **[SettingsPanel.jsx](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/frontend/src/components/SettingsPanel.jsx)**:
    *   An collapsible RAG tuner controlling **Chunk Size** (100–2000), **Overlap** (automatically capped below size), and **Context $K$** (1–10).
6.  **[IngestView.jsx](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/frontend/src/components/IngestView.jsx)**:
    *   A drag-and-drop zone that displays indexing status, lists loaded library documents, and triggers collection purge.
7.  **[AskView.jsx](file:///Users/zacang/Documents/School/NTU_SCTP_DS4/Mod6/ntu-sctp-rag-exercise/frontend/src/components/AskView.jsx)**:
    *   A dedicated QA playground. Features skeleton animations during generation and expandable source accordions with precise pages and document snippets.

---

## 🧪 Verification & Integration Testing

We verified the entire system using automated integration scripts. The test executed end-to-end flawlessly.

### Step 1: Ingestion Validation
*   **Action**: Uploaded the local PDF `corpus/Employment Act 1968.pdf` (139 pages) to the API using `chunk_size = 1000` and `chunk_overlap = 200`.
*   **Result**: 
    *   ChromaDB created a new vector collection.
    *   Ollama computed embeddings using `nomic-embed-text` in real-time.
    *   Successfully created and saved **316 database chunks**!
    ```json
    {
      "status": "success",
      "filename": "Employment Act 1968.pdf",
      "num_chunks": 316,
      "num_pages": 139,
      "chunk_size": 1000,
      "chunk_overlap": 200
    }
    ```

### Step 2: Querying & RAG Reasoning Validation
*   **Action**: Queried the database: *"What is the maximum hours of work per week under the Singapore Employment Act?"* requesting $K=3$ passages.
*   **Result**:
    *   ChromaDB successfully fetched top 3 matching chunks (citing pages 116, 41, and 43).
    *   Local model `gemma4:e4b` generated an accurate response based *strictly* on retrieved contexts.

#### 🤖 Generated Answer:
> [!NOTE]
> **Answer:** Based on the provided context from the Employment Act 1968, the maximum hours of work per week are subject to the following limits:
> 
> 1. **General Limit:** An employee is generally not required to work more than **44 hours in one week**.
> 2. **Alternative Limit (Under Agreement):** If, by agreement under the contract of service, the number of hours of work in every alternate week is less than 44, the limit of 44 hours in one week may be exceeded in the other week, but the employee cannot be required to work more than **48 hours in one week**.
> 
> The context also specifies that no employee can be required to work more than 88 hours in any continuous period of 2 weeks.

#### 📚 Retained Page Citations:
*   **[1] Document:** `Employment Act 1968.pdf` | **Page 116** (Calculation definitions)
*   **[2] Document:** `Employment Act 1968.pdf` | **Page 41** (Exceeded work limits of 44 hours)
*   **[3] Document:** `Employment Act 1968.pdf` | **Page 43** (Subsection rules and exception scenarios)

---

## 🚀 How to Run locally

Follow these simple instructions to open the premium interface in your browser:

### 1. Launch the Backend API
In your root workspace folder, run the following command (which launches Uvicorn on `http://localhost:8000`):
```bash
uv run main.py
```

### 2. Launch the React UI
Open a second terminal window, navigate to the `frontend/` directory, and run the development server:
```bash
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser. Drag and drop the `Employment Act 1968.pdf` in the Ingest View and query the Assistant!
