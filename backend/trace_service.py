import os
import json
import uuid
import datetime
from threading import Lock
from typing import List, Dict, Any

# Resolve the absolute path to <repo_root>/logs
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS_DIR = os.path.join(REPO_ROOT, "logs")

INGEST_LOG_PATH = os.path.join(LOGS_DIR, "ingest.jsonl")
ASK_LOG_PATH = os.path.join(LOGS_DIR, "ask.jsonl")

# Ensure logs directory exists
os.makedirs(LOGS_DIR, exist_ok=True)

# Process-level thread lock for safe concurrent writes
_write_lock = Lock()

class TraceService:
    @staticmethod
    def _get_log_path(event_type: str) -> str:
        """Determines the appropriate file path based on event type."""
        if event_type == "ingest":
            return INGEST_LOG_PATH
        return ASK_LOG_PATH

    @classmethod
    def log_trace(cls, event_type: str, duration_ms: float, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Thread-safely logs a structured event trace into the corresponding .jsonl file.
        """
        log_path = cls._get_log_path(event_type)
        
        trace_entry = {
            "id": uuid.uuid4().hex[:12],
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "type": event_type,
            "duration_ms": round(duration_ms, 2),
            "metadata": metadata
        }

        with _write_lock:
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(trace_entry) + "\n")
            except Exception as e:
                print(f"Error writing to trace log: {e}")
                
        return trace_entry

    @classmethod
    def get_traces(cls) -> List[Dict[str, Any]]:
        """
        Reads both ingest and ask logs, merges them, and sorts them chronologically (newest first).
        """
        traces = []
        
        # Read ingest logs
        if os.path.exists(INGEST_LOG_PATH):
            try:
                with open(INGEST_LOG_PATH, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            traces.append(json.loads(line))
            except Exception as e:
                print(f"Error reading ingest logs: {e}")
                
        # Read ask logs
        if os.path.exists(ASK_LOG_PATH):
            try:
                with open(ASK_LOG_PATH, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            traces.append(json.loads(line))
            except Exception as e:
                print(f"Error reading ask logs: {e}")
                
        # Sort by timestamp descending (newest first)
        traces.sort(key=lambda t: t.get("timestamp", ""), reverse=True)
        return traces

    @classmethod
    def clear_traces(cls) -> bool:
        """
        Thread-safely clears all logs by removing or truncating the files.
        """
        with _write_lock:
            try:
                for path in [INGEST_LOG_PATH, ASK_LOG_PATH]:
                    if os.path.exists(path):
                        # Empty the file instead of deleting it to preserve permissions
                        with open(path, "w", encoding="utf-8") as f:
                            pass
                return True
            except Exception as e:
                print(f"Error clearing logs: {e}")
                return False
