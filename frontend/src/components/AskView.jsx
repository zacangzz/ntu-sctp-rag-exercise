import React, { useState } from 'react';

export default function AskView({ k, documents }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [lastQuestion, setLastQuestion] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedSources, setExpandedSources] = useState({});

  const handleToggleSource = (idx) => {
    setExpandedSources(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setAnswer('');
    setSources([]);
    setLastQuestion(question);
    setExpandedSources({});

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question,
          k: k,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete query.');
      }

      const data = await response.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
      setQuestion('');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error communicating with Gemma 4 model.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ask-workspace">
      {/* Search and Ask bar */}
      <section className="glass-panel">
        <h3 className="card-title">
          {/* Magnifying Glass with glowing stars icon */}
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Ask the Document Assistant
        </h3>
        
        {documents.length === 0 ? (
          <div className="alert-message alert-error" style={{ marginBottom: 0 }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>
              <strong>Warning:</strong> No documents are currently indexed in ChromaDB. Go to the <strong>Ingest Document</strong> view to index files first.
            </span>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Ask a question about the active indexed document collection. Gemma 4 will review relevant passages and provide an answer with citations.
            </p>

            {/* Ingestion metrics bar */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-cyan)', display: 'inline-block', boxShadow: '0 0 8px var(--accent-cyan)' }}></span>
                Library active: <strong>{documents.length} document{documents.length > 1 ? 's' : ''}</strong>
              </span>
              <div className="tuning-summary">
                <span className="tag">Retrieve Top K: <strong>{k}</strong></span>
              </div>
            </div>

            <form onSubmit={handleAsk} className="query-form">
              <div className="input-container">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., What are the terms of employment contract termination?"
                  className="query-input"
                  disabled={loading}
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading || !question.trim()}
                style={{ height: '54px', padding: '0 2rem' }}
              >
                {loading ? 'Thinking...' : 'Ask'}
                {!loading && (
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </form>
          </>
        )}
      </section>

      {/* Answer & Citations Area */}
      {(loading || answer || errorMsg) && (
        <section className="glass-panel response-container">
          {lastQuestion && (
            <div className="bubble bubble-user">
              <h4>Your Question</h4>
              <p style={{ fontWeight: 500 }}>{lastQuestion}</p>
            </div>
          )}

          {errorMsg && (
            <div className="alert-message alert-error" style={{ width: '100%' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMsg}
            </div>
          )}

          {loading && (
            <div className="bubble bubble-assistant" style={{ animation: 'pulse 2s infinite' }}>
              <h4>Gemma 4 is processing</h4>
              <div className="skeleton-box">
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
          )}

          {answer && (
            <div className="bubble bubble-assistant">
              <h4>Response</h4>
              <div className="answer-text">{answer}</div>
              
              {/* Context Source Citations */}
              {sources.length > 0 && (
                <div className="sources-section">
                  <div className="sources-heading">Source Contexts from ChromaDB ({sources.length})</div>
                  <div className="sources-list">
                    {sources.map((source, index) => {
                      const isExpanded = !!expandedSources[index];
                      const filename = source.metadata.source || 'Unknown File';
                      const page = source.metadata.page !== undefined ? source.metadata.page + 1 : null; // Chroma is often 0-indexed, display as 1-indexed

                      return (
                        <div className={`source-item ${isExpanded ? 'expanded' : ''}`} key={index}>
                          <div className="source-header" onClick={() => handleToggleSource(index)}>
                            <div className="source-title-group">
                              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>#{index + 1}</span>
                              <span style={{ color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '250px' }}>{filename}</span>
                              {page && <span className="source-badge">Page {page}</span>}
                            </div>
                            <svg className="source-arrow" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                          <div className="source-body">
                            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                              {source.content}
                            </pre>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
