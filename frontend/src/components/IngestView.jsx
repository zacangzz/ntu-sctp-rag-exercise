import React, { useState, useEffect, useRef } from 'react';

export default function IngestView({ chunkSize, chunkOverlap, documents, setDocuments, refreshDocuments }) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const uploadFile = async (file) => {
    // Basic validation
    const allowedExtensions = ['.pdf', '.txt'];
    const filename = file.name.toLowerCase();
    const isValid = allowedExtensions.some(ext => filename.endsWith(ext));
    
    if (!isValid) {
      setErrorMsg('Invalid file type. Only PDF and TXT files are supported.');
      setSuccessMsg('');
      return;
    }

    setUploading(true);
    setProgressMsg('Uploading file...');
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('chunk_size', chunkSize);
    formData.append('chunk_overlap', chunkOverlap);

    // Simulate processing steps for enhanced UI feel
    const progressTimer = setTimeout(() => {
      setProgressMsg('Splitting text and generating embeddings via Ollama...');
    }, 1200);

    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(progressTimer);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to ingest document.');
      }

      const data = await response.json();
      setSuccessMsg(`"${data.filename}" processed successfully! Created ${data.num_chunks} chunks using Chunk Size: ${data.chunk_size}.`);
      refreshDocuments();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error connecting to the backend server.');
    } finally {
      setUploading(false);
      setProgressMsg('');
    }
  };

  const handleResetCollection = async () => {
    if (!window.confirm('Are you sure you want to purge the entire vector store? This action cannot be undone.')) {
      return;
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const response = await fetch('/api/documents', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset the database.');
      }
      
      setSuccessMsg('Vector database successfully reset!');
      setDocuments([]);
    } catch (err) {
      setErrorMsg(err.message || 'Error resetting collection.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <section className="glass-panel">
        <h3 className="card-title">
          {/* Box Arrow Up icon */}
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Index New Document
        </h3>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Select or drag a PDF or TXT file to split it into chunks and vectorize it in ChromaDB using your active tuning parameters.
        </p>

        {/* Display feedback alerts */}
        {errorMsg && (
          <div className="alert-message alert-error">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="alert-message alert-success">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {successMsg}
          </div>
        )}

        {/* Dynamic configurations banner */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Active Indexing Tuners:</span>
          <div className="tuning-summary">
            <span className="tag">Chunk Size: <strong>{chunkSize}</strong></span>
            <span className="tag">Overlap: <strong>{chunkOverlap}</strong></span>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div 
          className={`drop-zone ${dragOver ? 'drag-over' : ''} ${uploading ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!uploading ? triggerFileSelect : undefined}
          style={{ opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt"
            style={{ display: 'none' }}
          />
          
          <div className="drop-zone-icon">
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          
          <span className="drop-zone-text">
            {uploading ? 'Processing Document...' : 'Drag & Drop PDF or TXT here'}
          </span>
          <span className="drop-zone-subtext">
            {uploading ? 'Please do not close this window.' : 'or click to browse local files'}
          </span>
        </div>

        {/* Progress Tracker */}
        {uploading && (
          <div className="progress-container">
            <div className="progress-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontWeight: '500' }}>
                <span className="spinner"></span>
                {progressMsg}
              </span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: progressMsg.includes('Ollama') ? '75%' : '20%', transition: 'width 2s ease-in-out' }}></div>
            </div>
          </div>
        )}
      </section>

      {/* Ingested Documents Registry */}
      <section className="glass-panel">
        <div className="registry-title-row">
          <h3 className="card-title" style={{ marginBottom: 0 }}>
            {/* Library folder icon */}
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Document Library
          </h3>
          
          {documents.length > 0 && (
            <button className="btn-secondary" onClick={handleResetCollection}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Purge Vector Library
            </button>
          )}
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
          These files are vectorized and queryable. Clear the library to initialize a clean index.
        </p>

        {documents.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <p>No documents indexed yet.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Index the Singapore Employment Act 1968 PDF from your local folder!</p>
          </div>
        ) : (
          <div className="document-grid">
            {documents.map((doc, idx) => (
              <div className="doc-card" key={idx}>
                <div className="doc-icon">
                  <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div className="doc-info">
                  <div className="doc-name" title={doc}>{doc}</div>
                  <div className="doc-meta">Vectorized & Active</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
