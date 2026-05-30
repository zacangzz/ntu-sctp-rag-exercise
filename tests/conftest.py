import os
import sys
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from langchain_core.documents import Document

# 1. Setup global mocks before any backend imports to prevent real initialization
mock_embeddings = MagicMock()
mock_embeddings.embed_query.return_value = [0.1] * 128
mock_embeddings.embed_documents.return_value = [[0.1] * 128]

class MockChroma:
    def __init__(self, collection_name, embedding_function, persist_directory=None):
        self.collection_name = collection_name
        self.embedding_function = embedding_function
        self.persist_directory = persist_directory
        self.documents = []

    def add_documents(self, documents):
        self.documents.extend(documents)
        return [f"doc_id_{i}" for i in range(len(documents))]

    def as_retriever(self, search_kwargs=None):
        mock_retriever = MagicMock()
        k = search_kwargs.get("k", 4) if search_kwargs else 4
        # Mock invoke to return up to k documents from our saved documents
        mock_retriever.invoke = MagicMock(side_effect=lambda q: self.documents[:k])
        return mock_retriever

    def get(self):
        # Standard chroma get returns a dict with 'metadatas' list
        metadatas = [doc.metadata for doc in self.documents]
        return {"metadatas": metadatas}

    def delete_collection(self):
        self.documents = []

# Mock ChatOllama as a generic runnable chain component
mock_chat_ollama = MagicMock()

# Setup patchers
embeddings_patcher = patch("backend.rag_service.OllamaEmbeddings", return_value=mock_embeddings)
chroma_patcher = patch("backend.rag_service.Chroma", side_effect=MockChroma)
chat_ollama_patcher = patch("backend.rag_service.ChatOllama", return_value=mock_chat_ollama)

# Start patches
embeddings_patcher.start()
chroma_patcher.start()
chat_ollama_patcher.start()

# Now import RAGManager and FastAPI app safely without triggering real network/Chroma initialization
from backend.rag_service import RAGManager
from backend.main import app, rag_manager

# Ensure that the tests can cleanup mock states after each test run
@pytest.fixture(autouse=True)
def clean_mock_state():
    """Resets mock counts and clears any stored documents in the mock Chroma DB."""
    mock_embeddings.reset_mock()
    mock_chat_ollama.reset_mock()
    if rag_manager.db:
        rag_manager.db.delete_collection()
    yield

@pytest.fixture
def test_rag_manager():
    """Fixture providing the active, mocked RAGManager instance."""
    return rag_manager

@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def temp_txt_file(tmp_path):
    """Fixture that creates a temporary text file for loading tests."""
    file_path = tmp_path / "test_doc.txt"
    file_path.write_text("This is a mock legal document content used for generic LangChain unit testing.", encoding="utf-8")
    return str(file_path)

@pytest.fixture
def temp_pdf_file(tmp_path):
    """Fixture that creates a temporary dummy PDF file path."""
    file_path = tmp_path / "test_doc.pdf"
    # Write some simple bytes
    file_path.write_bytes(b"%PDF-1.4 ... dummy content ...")
    return str(file_path)
