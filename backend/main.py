import os
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.rag_service import RAGManager

app = FastAPI(title="Classical RAG API")

# Enable CORS for frontend local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits requests from React Vite server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize single instance of our RAGManager
rag_manager = RAGManager()

# Temporary upload folder in backend workspace
DATA_DIR = "./backend/data"
os.makedirs(DATA_DIR, exist_ok=True)

class QueryRequest(BaseModel):
    question: str
    k: int = 4

@app.post("/api/ingest")
async def ingest_document(
    file: UploadFile = File(...),
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200)
):
    """Saves file to disk, triggers LangChain loader & splitter, indexes into ChromaDB."""
    file_path = os.path.join(DATA_DIR, file.filename)
    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Call RAGManager with dynamic chunking values
        result = rag_manager.ingest_file(
            file_path=file_path,
            original_filename=file.filename,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        return result
    except Exception as e:
        print(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Guarantee cleanup of local temp file after ingestion
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/api/ask")
async def ask_question(request: QueryRequest):
    """Executes similarity search on ChromaDB and queries Gemma 4 for answer."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    try:
        result = rag_manager.query(
            question=request.question,
            k=request.k
        )
        return result
    except Exception as e:
        print(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
async def get_documents():
    """Lists filenames of all currently indexed files."""
    try:
        docs = rag_manager.get_ingested_documents()
        return {"documents": docs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents")
async def reset_documents():
    """Wipes all documents out of vector storage."""
    try:
        result = rag_manager.reset_db()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
