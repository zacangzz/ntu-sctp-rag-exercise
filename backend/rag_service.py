import os
import shutil
from typing import List, Dict, Any, Optional
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

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
        """Loads, splits, and embeds a document, saving chunks to ChromaDB with telemetry."""
        # 1. Load document
        ext = os.path.splitext(file_path)[1].lower()
        loader_name = "PyPDFLoader" if ext == ".pdf" else "TextLoader"
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

    def query(self, question: str, k: int = 4, temperature: float = 0.0) -> Dict[str, Any]:
        """Queries the vector store and uses proper LangChain LCEL pipeline with ChatOllama to answer."""
        if not self.db:
            return {"error": "Vector database not initialized."}
            
        # 1. Retrieve top K documents
        retriever = self.db.as_retriever(search_kwargs={"k": k})
        relevant_docs = retriever.invoke(question)
        
        # Extract sources
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
        
        # 2. Setup proper LangChain abstractions
        prompt_file_path = os.path.join(os.path.dirname(__file__), "prompt.md")
        try:
            with open(prompt_file_path, "r", encoding="utf-8") as f:
                prompt_template = f.read().strip()
        except Exception as e:
            prompt_template = """You are a professional legal and document assistant. Use the provided context to answer the question at the end.
If you don't know the answer based on the context provided, just say that the information is not present in the document. Do not try to make up an answer.
Keep your response structured, precise, and professional."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", prompt_template),
            ("human", "Context:\n{context}\n\nQuestion: {question}\n\nAnswer:")
        ])
        
        # ChatModel
        chat_model = ChatOllama(
            model=LLM_MODEL,
            base_url=OLLAMA_BASE_URL,
            temperature=temperature
        )
        
        # Output parser
        output_parser = StrOutputParser()
        
        # LCEL Chain
        chain = prompt | chat_model | output_parser
        
        # Generate output using the LCEL chain
        answer = chain.invoke({"context": context, "question": question})
        
        # Compile formatted prompt for visual inspection
        formatted_prompt_messages = prompt.format_messages(context=context, question=question)
        formatted_prompt_str = "\n".join([f"{msg.type.upper()}: {msg.content}" for msg in formatted_prompt_messages])
        
        return {
            "answer": answer.strip(),
            "sources": sources,
            "pipeline": {
                "retriever": {
                    "name": "VectorStoreRetriever",
                    "search_type": "similarity",
                    "k": k,
                    "description": "Queries the Chroma vector index using cosine similarity to fetch the most relevant content segments."
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
