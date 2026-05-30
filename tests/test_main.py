import os
import io
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from backend.main import DATA_DIR

def test_api_ingest_success(client):
    """Tests POST /api/ingest with valid file and parameters."""
    file_content = b"This is dummy text in a file upload test."
    file_name = "upload_test.txt"

    # We mock ingest_file method on the shared rag_manager instance
    with patch("backend.main.rag_manager.ingest_file") as mock_ingest:
        mock_ingest.return_value = {
            "status": "success",
            "filename": file_name,
            "num_chunks": 3,
            "num_pages": 1,
            "chunk_size": 500,
            "chunk_overlap": 50
        }

        response = client.post(
            "/api/ingest",
            files={"file": (file_name, io.BytesIO(file_content), "text/plain")},
            data={"chunk_size": 500, "chunk_overlap": 50}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["filename"] == file_name
        assert data["num_chunks"] == 3

        # Verify that temp file got cleaned up after completion
        temp_file_path = os.path.join(DATA_DIR, file_name)
        assert not os.path.exists(temp_file_path)

def test_api_ingest_exception_handling(client):
    """Tests that ingestion handles exceptions gracefully, returns 500, and cleans up files."""
    file_name = "crash_test.txt"
    with patch("backend.main.rag_manager.ingest_file", side_effect=Exception("Database ingestion failure")):
        response = client.post(
            "/api/ingest",
            files={"file": (file_name, io.BytesIO(b"content"), "text/plain")}
        )
        assert response.status_code == 500
        assert "Database ingestion failure" in response.json()["detail"]

        # Temp file must still be cleaned up
        temp_file_path = os.path.join(DATA_DIR, file_name)
        assert not os.path.exists(temp_file_path)

def test_api_ask_success(client):
    """Tests POST /api/ask with valid query."""
    with patch("backend.main.rag_manager.query") as mock_query:
        mock_query.return_value = {
            "answer": "This is a mocked answer from LangChain.",
            "sources": [{"content": "Source context", "metadata": {"source": "doc.txt"}}],
            "pipeline": {}
        }

        response = client.post(
            "/api/ask",
            json={"question": "What is the meaning of RAG?", "k": 3, "temperature": 0.2}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "This is a mocked answer from LangChain."
        assert len(data["sources"]) == 1
        mock_query.assert_called_once_with(question="What is the meaning of RAG?", k=3, temperature=0.2)

def test_api_ask_empty_question(client):
    """Tests POST /api/ask with empty question string, verifying validation."""
    response = client.post("/api/ask", json={"question": "   "})
    assert response.status_code == 400
    assert response.json()["detail"] == "Question cannot be empty."

def test_api_ask_error_handling(client):
    """Tests POST /api/ask when RAGManager raises an error."""
    with patch("backend.main.rag_manager.query", side_effect=ValueError("LLM Model not loaded")):
        response = client.post("/api/ask", json={"question": "Hi"})
        assert response.status_code == 500
        assert "LLM Model not loaded" in response.json()["detail"]

def test_api_get_documents(client):
    """Tests GET /api/documents to list indexed files."""
    with patch("backend.main.rag_manager.get_ingested_documents", return_value=["agreement.pdf", "notes.txt"]):
        response = client.get("/api/documents")
        assert response.status_code == 200
        assert response.json() == {"documents": ["agreement.pdf", "notes.txt"]}

def test_api_reset_documents(client):
    """Tests DELETE /api/documents to clear vectors."""
    with patch("backend.main.rag_manager.reset_db", return_value={"status": "success", "message": "Cleared"}):
        response = client.delete("/api/documents")
        assert response.status_code == 200
        assert response.json() == {"status": "success", "message": "Cleared"}

def test_frontend_catchall_not_found(client):
    """Tests frontend catchall path when dist/index.html is absent."""
    with patch("os.path.exists", return_value=False):
        response = client.get("/some-random-ui-page")
        assert response.status_code == 404
        assert "Frontend index.html not found" in response.json()["detail"]

def test_frontend_catchall_file_exists(client):
    """Tests frontend catchall path when dist/index.html is present."""
    # Mocking os.path.exists to simulate front-end production build exists
    def mock_exists(path):
        # The main frontend directory must exist, and the index.html fallback must exist,
        # but the requested virtual path (e.g. dashboard) does not exist on disk.
        if path in ["./frontend/dist", "./frontend/dist/assets"] or "index.html" in path:
            return True
        return False

    with patch("os.path.exists", side_effect=mock_exists), \
         patch("os.path.isfile", side_effect=lambda p: "index.html" in p), \
         patch("backend.main.FileResponse") as MockFileResponse:
        
        MockFileResponse.return_value = MagicMock()
        response = client.get("/dashboard")
        assert response.status_code == 200
        MockFileResponse.assert_called_once()
        # Verify that it serves index.html
        args, kwargs = MockFileResponse.call_args
        assert "index.html" in args[0]

def test_api_get_traces(client):
    """Tests GET /api/traces to retrieve aggregated chronological traces."""
    from tests.conftest import mock_trace_service
    mock_trace_service.get_traces.return_value = [
        {"id": "t1", "timestamp": "2026-05-30T10:00:00Z", "type": "query", "duration_ms": 120.0, "metadata": {}}
    ]
    response = client.get("/api/traces")
    assert response.status_code == 200
    data = response.json()
    assert len(data["traces"]) == 1
    assert data["traces"][0]["id"] == "t1"

def test_api_clear_traces(client):
    """Tests DELETE /api/traces to clear all trace files."""
    from tests.conftest import mock_trace_service
    mock_trace_service.clear_traces.return_value = True
    response = client.delete("/api/traces")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["message"] == "All traces cleared."

