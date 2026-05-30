import React, { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import SettingsPanel from './components/SettingsPanel';
import IngestView from './components/IngestView';
import AskView from './components/AskView';

function App() {
  const [view, setView] = useState('ingest'); // 'ingest' | 'ask'
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [k, setK] = useState(4);
  const [documents, setDocuments] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch document registry on mount
  useEffect(() => {
    refreshDocuments();
  }, []);

  const refreshDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error('API failed to return document list.');
      }
    } catch (err) {
      console.error('Error fetching indexed documents:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Sleek navigation sidebar */}
      <Navbar view={view} setView={setView} />
      
      {/* Central workspace */}
      <main className="main-content">
        {/* Dynamic Page Header */}
        <header className="page-header">
          <div className="page-header-row">
            <div className="page-header-info">
              {view === 'ingest' ? (
                <>
                  <h1 className="page-title">Document Management Center</h1>
                  <p className="page-subtitle">Configure text parsing models, upload records, and inspect ChromaDB vector indices.</p>
                </>
              ) : (
                <>
                  <h1 className="page-title">Intelligence Q&A Hub</h1>
                  <p className="page-subtitle">Formulate queries and consult Gemma 4 based on similarity matches retrieved from your index.</p>
                </>
              )}
            </div>
            <button className="btn-configure-rag" onClick={() => setIsSettingsOpen(true)}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Configure RAG</span>
            </button>
          </div>
        </header>

        {/* Global Collapsible Tuning Controls */}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          chunkSize={chunkSize}
          setChunkSize={setChunkSize}
          chunkOverlap={chunkOverlap}
          setChunkOverlap={setChunkOverlap}
          k={k}
          setK={setK}
        />

        {/* Dynamic content area depending on active view */}
        {view === 'ingest' ? (
          <IngestView
            chunkSize={chunkSize}
            chunkOverlap={chunkOverlap}
            documents={documents}
            setDocuments={setDocuments}
            refreshDocuments={refreshDocuments}
          />
        ) : (
          <AskView
            k={k}
            documents={documents}
          />
        )}
      </main>
    </div>
  );
}

export default App;
