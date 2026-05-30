import React, { useState } from 'react';

export default function SettingsPanel({
  chunkSize,
  setChunkSize,
  chunkOverlap,
  setChunkOverlap,
  k,
  setK
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChunkSizeChange = (val) => {
    const size = parseInt(val, 10);
    setChunkSize(size);
    // Ensure overlap stays smaller than chunk size
    if (chunkOverlap >= size) {
      setChunkOverlap(Math.max(0, size - 50));
    }
  };

  const handleOverlapChange = (val) => {
    const overlap = parseInt(val, 10);
    // Enforce overlap < chunk size
    if (overlap >= chunkSize) {
      setChunkOverlap(Math.max(0, chunkSize - 50));
    } else {
      setChunkOverlap(overlap);
    }
  };

  return (
    <div className="glass-panel" style={{ marginBottom: '2rem' }}>
      <div className="tuning-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="var(--accent-purple)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(90deg)' : 'none' }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Advanced RAG Tuning Parameters
        </h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isOpen ? 'Click to collapse' : 'Click to customize settings'}
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      
      <div className={`settings-collapse ${isOpen ? 'open' : ''}`}>
        <div className="tuning-grid">
          <div className="slider-container">
            <div className="slider-info">
              <span className="slider-label">Chunk Size</span>
              <span className="slider-value">{chunkSize} tokens</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="50"
              value={chunkSize}
              onChange={(e) => handleChunkSizeChange(e.target.value)}
              className="slider-input"
            />
            <span className="slider-description">
              Defines the length of each document segment. Larger chunks contain more context, but can dilute specific facts.
            </span>
          </div>

          <div className="slider-container">
            <div className="slider-info">
              <span className="slider-label">Chunk Overlap</span>
              <span className="slider-value">{chunkOverlap} tokens</span>
            </div>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={chunkOverlap}
              onChange={(e) => handleOverlapChange(e.target.value)}
              className="slider-input"
            />
            <span className="slider-description">
              Shared tokens between consecutive chunks. Prevents semantic loss at boundaries. (Automatically capped below Chunk Size).
            </span>
          </div>

          <div className="slider-container">
            <div className="slider-info">
              <span className="slider-label">Context Count (K)</span>
              <span className="slider-value">{k} chunks</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={k}
              onChange={(e) => setK(parseInt(e.target.value, 10))}
              className="slider-input"
            />
            <span className="slider-description">
              The number of top matching document chunks retrieved from ChromaDB to construct the context prompt for Gemma 4.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
