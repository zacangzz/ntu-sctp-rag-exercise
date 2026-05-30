import os
import time
from typing import List, Dict, Any
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from backend.trace_service import TraceService

CHROMA_DB_DIR = "./chroma_db"
COLLECTION_NAME = "classical_rag"
OLLAMA_BASE_URL = "http://localhost:11434"
EMBED_MODEL = "embeddinggemma"
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

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------
    def ingest_file(self, file_path: str, original_filename: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> Dict[str, Any]:
        """Loads, splits, and embeds a document, saving chunks to ChromaDB with telemetry."""
        ingest_start = time.perf_counter()

        ext = os.path.splitext(file_path)[1].lower()
        loader_name = "PyPDFLoader" if ext == ".pdf" else "TextLoader"

        load_start = time.perf_counter()
        if ext == '.pdf':
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path, encoding='utf-8')

        docs = loader.load()
        load_time_ms = (time.perf_counter() - load_start) * 1000

        # Override source metadata so it shows the original filename in UI
        for doc in docs:
            doc.metadata["source"] = original_filename

        split_start = time.perf_counter()
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        chunks = splitter.split_documents(docs)
        split_time_ms = (time.perf_counter() - split_start) * 1000

        db_start = time.perf_counter()
        self.db.add_documents(chunks)
        db_time_ms = (time.perf_counter() - db_start) * 1000

        total_time_ms = (time.perf_counter() - ingest_start) * 1000

        TraceService.log_trace(
            event_type="ingest",
            duration_ms=total_time_ms,
            metadata={
                "filename": original_filename,
                "num_chunks": len(chunks),
                "num_pages": len(docs) if ext == '.pdf' else 1,
                "chunk_size": chunk_size,
                "chunk_overlap": chunk_overlap,
                "loader": loader_name,
                "load_time_ms": round(load_time_ms, 2),
                "split_time_ms": round(split_time_ms, 2),
                "db_time_ms": round(db_time_ms, 2)
            }
        )

        return {
            "status": "success",
            "filename": original_filename,
            "num_chunks": len(chunks),
            "num_pages": len(docs) if ext == '.pdf' else 1,
            "chunk_size": chunk_size,
            "chunk_overlap": chunk_overlap,
            "pipeline": {
                "loader": {
                    "name": loader_name,
                    "description": f"Loads {ext.upper()} documents and extracts content page-by-page."
                },
                "splitter": {
                    "name": "RecursiveCharacterTextSplitter",
                    "chunk_size": chunk_size,
                    "chunk_overlap": chunk_overlap,
                    "description": "Splits documents recursively by standard delimiters (\\n\\n, \\n, space) to preserve semantic cohesion."
                },
                "embeddings": {
                    "name": "OllamaEmbeddings",
                    "model": EMBED_MODEL,
                    "base_url": OLLAMA_BASE_URL,
                    "description": f"Computes dense vector representations using {EMBED_MODEL} model on local Ollama server."
                },
                "vector_store": {
                    "name": "Chroma",
                    "collection": COLLECTION_NAME,
                    "directory": CHROMA_DB_DIR,
                    "description": "An open-source embedding database. Chroma stores documents and vectors for ultra-fast semantic similarity retrieval."
                }
            }
        }

    # ------------------------------------------------------------------
    # Retrieval helpers
    # ------------------------------------------------------------------
    def _vector_search(self, question: str, k: int) -> List[Dict[str, Any]]:
        """Cosine-similarity dense vector search via ChromaDB."""
        docs_with_scores = self.db.similarity_search_with_score(question, k=k)
        return [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score),
                "score_label": "Cosine Score"
            }
            for doc, score in docs_with_scores
        ]

    def _bm25_search(self, question: str, k: int) -> List[Dict[str, Any]]:
        """Keyword-based BM25 retrieval over all ChromaDB documents (rank_bm25)."""
        from rank_bm25 import BM25Okapi

        result = self.db.get(include=["documents", "metadatas"])
        all_docs = result.get("documents", [])
        all_metas = result.get("metadatas", [])

        if not all_docs:
            return []

        tokenised_corpus = [doc.lower().split() for doc in all_docs]
        bm25 = BM25Okapi(tokenised_corpus)
        query_tokens = question.lower().split()
        raw_scores = bm25.get_scores(query_tokens)

        scored = sorted(
            zip(all_docs, all_metas, raw_scores),
            key=lambda x: x[2],
            reverse=True
        )

        return [
            {
                "content": content,
                "metadata": meta or {},
                "score": round(float(score), 4),
                "score_label": "BM25 Score"
            }
            for content, meta, score in scored[:k]
        ]

    def _hybrid_search(self, question: str, k: int) -> List[Dict[str, Any]]:
        """
        Fuses Vector + BM25 results via Reciprocal Rank Fusion (RRF).
        RRF score = 1/(K + rank_vector) + 1/(K + rank_bm25)
        """
        RRF_K = 60
        candidate_k = max(k * 3, 20)

        vector_results = self._vector_search(question, candidate_k)
        bm25_results = self._bm25_search(question, candidate_k)

        # Build rank maps keyed by document content
        vector_rank = {doc["content"]: idx for idx, doc in enumerate(vector_results)}
        bm25_rank = {doc["content"]: idx for idx, doc in enumerate(bm25_results)}

        # All unique candidates
        all_contents = set(vector_rank.keys()) | set(bm25_rank.keys())

        # Metadata lookup
        meta_lookup: Dict[str, dict] = {}
        for doc in vector_results + bm25_results:
            meta_lookup[doc["content"]] = doc["metadata"]

        rrf_scored = []
        for content in all_contents:
            v_rank = vector_rank.get(content, candidate_k + 1)
            b_rank = bm25_rank.get(content, candidate_k + 1)
            rrf_score = 1.0 / (RRF_K + v_rank) + 1.0 / (RRF_K + b_rank)
            rrf_scored.append((content, meta_lookup.get(content, {}), rrf_score))

        rrf_scored.sort(key=lambda x: x[2], reverse=True)

        return [
            {
                "content": content,
                "metadata": meta,
                "score": round(score, 6),
                "score_label": "RRF Score"
            }
            for content, meta, score in rrf_scored[:k]
        ]

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------
    def query(self, question: str, k: int = 4, temperature: float = 0.0, retrieval_mode: str = "vector") -> Dict[str, Any]:
        """Queries using Vector, BM25, or Hybrid (RRF) retrieval, then generates answer via ChatOllama LCEL chain."""
        if not self.db:
            return {"error": "Vector database not initialized."}

        query_start = time.perf_counter()

        # 1. Retrieve using selected strategy
        retrieval_start = time.perf_counter()
        if retrieval_mode == "bm25":
            sources = self._bm25_search(question, k)
        elif retrieval_mode == "hybrid":
            sources = self._hybrid_search(question, k)
        else:
            sources = self._vector_search(question, k)
        retrieval_time_ms = (time.perf_counter() - retrieval_start) * 1000

        context = "\n\n---\n\n".join(s["content"] for s in sources)

        # 2. Load prompt template
        prompt_file_path = os.path.join(os.path.dirname(__file__), "prompt.md")
        try:
            with open(prompt_file_path, "r", encoding="utf-8") as f:
                prompt_template = f.read().strip()
        except Exception as e:
            print(f"Warning: Could not load prompt.md ({e}). Using minimal fallback prompt.")
            prompt_template = "You are a professional document assistant. Use the provided context to answer the question at the end. Keep your response succinct, structured, precise, and professional."

        prompt = ChatPromptTemplate.from_messages([
            ("system", prompt_template),
            ("human", "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:")
        ])

        chat_model = ChatOllama(
            model=LLM_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=temperature
        )
        output_parser = StrOutputParser()
        chain = prompt | chat_model | output_parser

        llm_start = time.perf_counter()
        answer = chain.invoke({"context": context, "question": question})
        llm_time_ms = (time.perf_counter() - llm_start) * 1000

        total_time_ms = (time.perf_counter() - query_start) * 1000

        # Compile formatted prompt for telemetry display
        formatted_prompt_messages = prompt.format_messages(context=context, question=question)
        formatted_prompt_str = "\n".join([f"{msg.type.upper()}: {msg.content}" for msg in formatted_prompt_messages])

        # Per-mode retriever metadata
        retriever_meta = {
            "vector": {
                "name": "VectorStoreRetriever",
                "search_type": "similarity_with_relevance_scores",
                "description": "Queries the Chroma vector index using cosine similarity to fetch the most relevant content segments."
            },
            "bm25": {
                "name": "BM25Retriever (rank_bm25)",
                "search_type": "bm25_okapi",
                "description": "Ranks all stored document chunks using BM25 Okapi keyword scoring. Relevance is based purely on term frequency and inverse document frequency — no embeddings used."
            },
            "hybrid": {
                "name": "HybridRetriever (RRF)",
                "search_type": "reciprocal_rank_fusion",
                "description": "Fuses Vector (cosine similarity) and BM25 (keyword) results via Reciprocal Rank Fusion (RRF). Each document's rank position in both lists contributes equally to the final score, capturing both semantic and lexical signals."
            }
        }
        score_label = {"vector": "Cosine Score", "bm25": "BM25 Score", "hybrid": "RRF Score"}.get(retrieval_mode, "Score")

        TraceService.log_trace(
            event_type="query",
            duration_ms=total_time_ms,
            metadata={
                "question": question,
                "answer": answer.strip(),
                "k": k,
                "temperature": temperature,
                "retrieval_mode": retrieval_mode,
                "prompt_template": prompt_template,
                "formatted_prompt": formatted_prompt_str,
                "retrieval_time_ms": round(retrieval_time_ms, 2),
                "llm_time_ms": round(llm_time_ms, 2),
                "sources": sources,
                "model": LLM_MODEL,
                "base_url": OLLAMA_BASE_URL
            }
        )

        return {
            "answer": answer.strip(),
            "sources": sources,
            "retrieval_mode": retrieval_mode,
            "pipeline": {
                "retriever": {
                    **retriever_meta.get(retrieval_mode, retriever_meta["vector"]),
                    "retrieval_mode": retrieval_mode,
                    "score_label": score_label,
                    "k": k,
                },
                "prompt": {
                    "name": "ChatPromptTemplate",
                    "template": f"System: {prompt_template}\n\nHuman: Context:\n{{context}}\n\nQuestion: {{question}}\n\nAnswer:",
                    "formatted_prompt": formatted_prompt_str,
                    "description": "Constructs a structured ChatPromptTemplate with a system prompt and context-injected user query."
                },
                "chat_model": {
                    "name": "ChatOllama",
                    "model": LLM_MODEL,
                    "temperature": temperature,
                    "base_url": OLLAMA_BASE_URL,
                    "description": f"LangChain ChatModel driving generative reasoning via {LLM_MODEL} at temperature {temperature}."
                },
                "output_parser": {
                    "name": "StrOutputParser",
                    "description": "Processes the chat response message object, extracting the clean text content stream seamlessly."
                }
            }
        }

    # ------------------------------------------------------------------
    # Document management
    # ------------------------------------------------------------------
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
        start_time = time.perf_counter()
        try:
            try:
                self.db.delete_collection()
            except Exception:
                pass
            self._init_db()
            duration_ms = (time.perf_counter() - start_time) * 1000
            TraceService.log_trace(
                event_type="reset",
                duration_ms=duration_ms,
                metadata={"message": "Database reset successfully."}
            )
            return {"status": "success", "message": "Database reset successfully."}
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            TraceService.log_trace(
                event_type="reset",
                duration_ms=duration_ms,
                metadata={"message": f"Database reset failed: {str(e)}"}
            )
            return {"status": "error", "message": str(e)}
