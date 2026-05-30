import os
from unittest.mock import MagicMock, patch
import pytest
from langchain_core.documents import Document
from langchain_core.messages import AIMessage
from backend.rag_service import RAGManager

def test_rag_manager_initialization(test_rag_manager):
    """Verifies that RAGManager initializes with correct mock properties."""
    assert test_rag_manager.embeddings is not None
    assert test_rag_manager.db is not None
    assert test_rag_manager.db.collection_name == "classical_rag"

def test_ingest_txt_file(test_rag_manager, temp_txt_file):
    """Tests the ingestion process for a text file using standard TextLoader."""
    # Run the ingestion
    result = test_rag_manager.ingest_file(
        file_path=temp_txt_file,
        original_filename="test_doc.txt",
        chunk_size=100,
        chunk_overlap=20
    )

    # Verify response structure
    assert result["status"] == "success"
    assert result["filename"] == "test_doc.txt"
    assert result["num_chunks"] > 0
    assert result["num_pages"] == 1
    assert result["chunk_size"] == 100
    assert result["chunk_overlap"] == 20
    assert result["pipeline"]["loader"]["name"] == "TextLoader"

    # Verify document is stored in MockChroma
    assert len(test_rag_manager.db.documents) > 0
    first_chunk = test_rag_manager.db.documents[0]
    assert isinstance(first_chunk, Document)
    assert first_chunk.metadata["source"] == "test_doc.txt"

def test_ingest_pdf_file(test_rag_manager, temp_pdf_file):
    """Tests the ingestion process for a PDF file by mocking PyPDFLoader."""
    mock_pdf_pages = [
        Document(page_content="PDF Page 1 Content.", metadata={"source": "dummy.pdf", "page": 0}),
        Document(page_content="PDF Page 2 Content.", metadata={"source": "dummy.pdf", "page": 1})
    ]

    with patch("backend.rag_service.PyPDFLoader") as MockPyPDFLoader:
        mock_loader_instance = MockPyPDFLoader.return_value
        mock_loader_instance.load.return_value = mock_pdf_pages

        result = test_rag_manager.ingest_file(
            file_path=temp_pdf_file,
            original_filename="test_doc.pdf",
            chunk_size=100,
            chunk_overlap=10
        )

        assert result["status"] == "success"
        assert result["filename"] == "test_doc.pdf"
        assert result["num_pages"] == 2
        assert result["pipeline"]["loader"]["name"] == "PyPDFLoader"

        # Verify documents got saved with overridden source metadata
        for doc in test_rag_manager.db.documents:
            assert doc.metadata["source"] == "test_doc.pdf"

def test_query_success(test_rag_manager):
    """Tests RAG query flow, ensuring retrieval and LCEL prompt assembly and model execution."""
    # 1. Pre-populate our mock vector database with some context documents
    test_rag_manager.db.add_documents([
        Document(page_content="NTU SCTP stands for Singapore Certified Training Programme.", metadata={"source": "ntu_info.txt"}),
        Document(page_content="RAG represents Retrieval-Augmented Generation.", metadata={"source": "rag_info.txt"})
    ])

    # 2. Setup mock LLM behavior
    from tests.conftest import mock_chat_ollama
    # Make sure we mock BOTH invoke and __call__ to handle any LangChain LCEL wrap-around
    mock_response = AIMessage(content="NTU SCTP is a certified training program.")
    mock_chat_ollama.invoke.return_value = mock_response
    mock_chat_ollama.return_value = mock_response

    # 3. Execute query
    response = test_rag_manager.query(question="What is NTU SCTP?", k=2, temperature=0.0)

    # 4. Assert response details
    assert "answer" in response
    assert response["answer"] == "NTU SCTP is a certified training program."
    assert len(response["sources"]) == 2
    assert response["sources"][0]["content"] == "NTU SCTP stands for Singapore Certified Training Programme."
    assert response["sources"][0]["metadata"]["source"] == "ntu_info.txt"
    assert "score" in response["sources"][0]
    assert response["sources"][0]["score"] == 0.15
    assert response["pipeline"]["chat_model"]["name"] == "ChatOllama"

def test_get_ingested_documents(test_rag_manager):
    """Tests retrieval of unique document names from database metadata."""
    test_rag_manager.db.add_documents([
        Document(page_content="doc1 content", metadata={"source": "doc1.txt"}),
        Document(page_content="doc2 content", metadata={"source": "doc2.txt"}),
        Document(page_content="doc1 content part 2", metadata={"source": "doc1.txt"})
    ])

    docs = test_rag_manager.get_ingested_documents()
    assert docs == ["doc1.txt", "doc2.txt"]

def test_reset_db(test_rag_manager):
    """Tests resetting the vector database."""
    test_rag_manager.db.add_documents([
        Document(page_content="doc1 content", metadata={"source": "doc1.txt"})
    ])
    assert len(test_rag_manager.db.documents) == 1

    reset_res = test_rag_manager.reset_db()
    assert reset_res["status"] == "success"
    assert len(test_rag_manager.db.documents) == 0

def test_query_no_context(test_rag_manager):
    """Tests querying when the database has no documents, verifying the system's resilience."""
    # Ensure database is empty
    test_rag_manager.db.delete_collection()

    from tests.conftest import mock_chat_ollama
    mock_response = AIMessage(content="I'm sorry, but the requested information is not present in the ingested documents.")
    mock_chat_ollama.invoke.return_value = mock_response
    mock_chat_ollama.return_value = mock_response

    response = test_rag_manager.query(question="What is Quantum Physics?", k=2, temperature=0.0)

    assert "answer" in response
    assert response["answer"] == "I'm sorry, but the requested information is not present in the ingested documents."
    assert len(response["sources"]) == 0

