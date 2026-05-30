import os
import shutil
from typing import List, Dict, Any, Optional
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate

CHROMA_DB_DIR = "./chroma_db"
COLLECTION_NAME = "classical_rag"
OLLAMA_BASE_URL = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text"
LLM_MODEL = "gemma4:e4b"

class RAGManager:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(
            model=EMBED_MODEL,
            base_url=OLLAMA_BASE_URL
        )
        self.db = None
        self._init_db()

    def _init_db(self):
        """Initializes ChromaDB vector store."""
        self.db = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=self.embeddings,
            persist_directory=CHROMA_DB_DIR
        )

    def ingest_file(self, file_path: str, original_filename: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> Dict[str, Any]:
        """Loads, splits, and embeds a document, saving chunks to ChromaDB."""
        # 1. Load document
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path, encoding='utf-8')
            
        docs = loader.load()
        
        # Override source metadata so it shows the original filename in UI
        for doc in docs:
            doc.metadata["source"] = original_filename
            
        # 2. Split text using dynamic UI settings
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        chunks = splitter.split_documents(docs)
        
        # 3. Add to vector store
        self.db.add_documents(chunks)
        
        return {
            "status": "success",
            "filename": original_filename,
            "num_chunks": len(chunks),
            "num_pages": len(docs) if ext == '.pdf' else 1,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap
        }

    def query(self, question: str, k: int = 4) -> Dict[str, Any]:
        """Queries the vector store and uses Ollama to answer based on context."""
        if not self.db:
            return {"error": "Vector database not initialized."}
            
        # Perform similarity search with dynamic K
        retriever = self.db.as_retriever(search_kwargs={"k": k})
        relevant_docs = retriever.invoke(question)
        
        # Extract content & sources
        sources = []
        context_parts = []
        for doc in relevant_docs:
            source_info = {
                "content": doc.page_content,
                "metadata": doc.metadata
            }
            sources.append(source_info)
            context_parts.append(doc.page_content)
            
        context = "\n\n---\n\n".join(context_parts)
        
        # 4. Generate answer using Ollama LLM
        llm = Ollama(
            model=LLM_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=0.0
        )
        
        prompt_template = """You are a professional legal and document assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer based on the context provided, just say that the information is not present in the document. Do not try to make up an answer.
Keep your response structured, precise, and professional.

Context:
{context}

Question: {question}

Answer:"""
        
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        formatted_prompt = prompt.format(context=context, question=question)
        answer = llm.invoke(formatted_prompt)
        
        return {
            "answer": answer.strip(),
            "sources": sources
        }

    def get_ingested_documents(self) -> List[str]:
        """Returns unique filenames of ingested documents from metadata."""
        try:
            results = self.db.get()
            if not results or not results.get("metadatas"):
                return []
            
            sources = set()
            for meta in results["metadatas"]:
                if meta and "source" in meta:
                    sources.add(meta["source"])
            return sorted(list(sources))
        except Exception as e:
            print(f"Error fetching documents: {e}")
            return []

    def reset_db(self) -> Dict[str, str]:
        """Resets the vector database by deleting the collection and recreating a fresh one."""
        try:
            try:
                self.db.delete_collection()
            except Exception:
                pass
            self._init_db()
            return {"status": "success", "message": "Database reset successfully."}
        except Exception as e:
            return {"status": "error", "message": str(e)}
