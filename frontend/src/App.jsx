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
        </header>

        {/* Global Collapsible Tuning Controls */}
        <SettingsPanel
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
