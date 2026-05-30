import React, { useState, useEffect } from 'react';

export default function TraceView() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'query' | 'ingest' | 'reset'
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'prompt' | 'retriever' | 'response'

  useEffect(() => {
    fetchTraces();
  }, []);

  const fetchTraces = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch('/api/traces');
      if (!response.ok) {
        throw new Error('Failed to retrieve execution traces.');
      }
      const data = await response.json();
      setTraces(data.traces || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error fetching trace logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearTraces = async () => {
    if (!window.confirm('Are you sure you want to permanently delete all historical trace logs?')) {
      return;
    }
    setErrorMsg('');
    try {
      const response = await fetch('/api/traces', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to wipe trace logs.');
      }
      setTraces([]);
      setSelectedTrace(null);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error purging logs.');
    }
  };

  const handleOpenTrace = (trace) => {
    setSelectedTrace(trace);
    setIsDrawerOpen(true);
    setActiveTab('overview');
  };

  const handleCloseTrace = () => {
    setIsDrawerOpen(false);
    setTimeout(() => {
      setSelectedTrace(null);
    }, 300); // Wait for transition animation
  };

  // Helper formatting functions
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLatencyBadgeClass = (latency) => {
    if (latency < 200) return 'latency-fast';
    if (latency < 1000) return 'latency-medium';
    return 'latency-slow';
  };

  const getLatencyLabel = (latency) => {
    if (latency < 1000) {
      return `${latency} ms`;
    }
    return `${(latency / 1000).toFixed(2)} s`;
  };

  // Filter & Search Logic
  const filteredTraces = traces.filter(trace => {
    // 1. Filter by event type
    if (filterType !== 'all' && trace.type !== filterType) {
      return false;
    }
    
    // 2. Filter by search term
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase();
    const meta = trace.metadata || {};
    
    if (trace.type === 'query') {
      const question = (meta.question || '').toLowerCase();
      const answer = (meta.answer || '').toLowerCase();
      return question.includes(term) || answer.includes(term);
    }
    
    if (trace.type === 'ingest') {
      const filename = (meta.filename || '').toLowerCase();
      const loader = (meta.loader || '').toLowerCase();
      return filename.includes(term) || loader.includes(term);
    }
    
    if (trace.type === 'reset') {
      const msg = (meta.message || '').toLowerCase();
      return msg.includes(term);
    }
    
    return false;
  });

  // Calculate high-level metrics
  const totalOperations = traces.length;
  const queries = traces.filter(t => t.type === 'query');
  const ingests = traces.filter(t => t.type === 'ingest');
  
  const avgQueryLatency = queries.length > 0 
    ? Math.round(queries.reduce((acc, curr) => acc + curr.duration_ms, 0) / queries.length) 
    : 0;

  const totalDocumentsIndexed = ingests.reduce((acc, curr) => acc + (curr.metadata.num_chunks || 0), 0);

  return (
    <div className="ask-workspace">
      {/* CSS Stylesheet Injector to keep TraceView isolated & responsive */}
      <style>{`
        .trace-grid-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .metric-card {
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          border-radius: var(--radius-default);
        }
        .metric-num {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--primary);
          letter-spacing: -0.02em;
        }
        .metric-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .trace-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }
        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 250px;
        }
        .search-wrapper svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          stroke: var(--outline);
          width: 18px;
          height: 18px;
        }
        .search-wrapper input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          background: #ffffff;
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-default);
          outline: none;
          font-size: 0.9rem;
          color: var(--on-surface);
          transition: var(--transition-smooth);
        }
        .search-wrapper input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(60, 93, 157, 0.08);
        }
        .filter-tabs {
          display: flex;
          background: var(--surface-container);
          padding: 0.25rem;
          border-radius: var(--radius-default);
          border: 1px solid var(--border-color);
          gap: 0.25rem;
        }
        .filter-btn {
          border: none;
          background: transparent;
          padding: 0.45rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          color: var(--on-surface-variant);
          transition: var(--transition-smooth);
        }
        .filter-btn.active {
          background: #ffffff;
          color: var(--primary);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
        }
        
        /* Table Layout */
        .table-container {
          overflow-x: auto;
          margin-top: 0.5rem;
        }
        .trace-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.9rem;
        }
        .trace-table th {
          padding: 1rem 1.25rem;
          border-bottom: 2px solid var(--border-color);
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .trace-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-color);
          vertical-align: middle;
          color: var(--on-surface-variant);
        }
        .trace-row {
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .trace-row:hover {
          background: var(--bg-hover);
        }
        
        /* Event Badges */
        .event-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .event-query {
          background: rgba(60, 93, 157, 0.08);
          color: var(--primary);
          border: 1px solid rgba(60, 93, 157, 0.15);
        }
        .event-ingest {
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.15);
        }
        .event-reset {
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.15);
        }

        .latency-badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: var(--font-family-mono);
        }
        .latency-fast {
          background: rgba(16, 185, 129, 0.08);
          color: #10b981;
        }
        .latency-medium {
          background: rgba(245, 158, 11, 0.08);
          color: #f59e0b;
        }
        .latency-slow {
          background: rgba(186, 26, 26, 0.08);
          color: var(--error);
        }

        /* Detail Drawer styling */
        .drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.15);
          backdrop-filter: blur(4px);
          z-index: 110;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .drawer-overlay.open {
          opacity: 1;
          pointer-events: auto;
        }
        .trace-drawer {
          position: fixed;
          top: 0;
          right: -550px;
          bottom: 0;
          width: 520px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border-left: 1px solid var(--border-color);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.08);
          z-index: 120;
          display: flex;
          flex-direction: column;
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 2rem 1.5rem;
        }
        .trace-drawer.open {
          right: 0;
        }
        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 1rem;
          margin-bottom: 1.25rem;
        }
        .drawer-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-right: 0.25rem;
        }
        
        .chunk-card {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-default);
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .score-pill {
          background: var(--bg-hover);
          border: 1px solid rgba(60, 93, 157, 0.1);
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-family: var(--font-family-mono);
          font-weight: bold;
          font-size: 0.75rem;
          color: var(--primary);
        }
        
        .sub-timeline {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(0,0,0,0.01);
          border: 1px solid var(--border-color);
          padding: 1rem;
          border-radius: var(--radius-default);
        }
        .timeline-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          border-bottom: 1px dashed rgba(0,0,0,0.05);
          padding-bottom: 0.4rem;
        }
        .timeline-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
      `}</style>

      {/* 1. Statistics Cards */}
      <section className="trace-grid-summary">
        <div className="glass-panel metric-card">
          <span className="metric-label">Total Traces</span>
          <span className="metric-num">{totalOperations}</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-label">Query Calls</span>
          <span className="metric-num" style={{ color: 'var(--primary-container)' }}>{queries.length}</span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-label">Avg Query Latency</span>
          <span className="metric-num" style={{ color: avgQueryLatency > 1500 ? 'var(--error)' : 'var(--primary)' }}>
            {getLatencyLabel(avgQueryLatency)}
          </span>
        </div>
        <div className="glass-panel metric-card">
          <span className="metric-label">Chroma Chunks Indexed</span>
          <span className="metric-num" style={{ color: '#10b981' }}>{totalDocumentsIndexed}</span>
        </div>
      </section>

      {/* 2. Interactive Table & Search Toolbar */}
      <section className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            {/* Activities/Search list SVG */}
            <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8H12.01M12 12H12.01M12 16H12.01M8 8H8.01M8 12H8.01M8 16H8.01M16 8H16.01M16 12H16.01M16 16H16.01" />
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            Historical Operations & Trace Logs
          </h3>
          
          {traces.length > 0 && (
            <button 
              onClick={handleClearTraces} 
              className="btn-secondary"
              style={{ border: '1px solid rgba(186, 26, 26, 0.25)' }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear Log History
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="alert-message alert-error" style={{ marginBottom: '1.25rem' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {errorMsg}
          </div>
        )}

        <div className="trace-toolbar">
          <div className="search-wrapper">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search traces (by query, file names, outputs...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            <button 
              className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Events
            </button>
            <button 
              className={`filter-btn ${filterType === 'query' ? 'active' : ''}`}
              onClick={() => setFilterType('query')}
            >
              Queries
            </button>
            <button 
              className={`filter-btn ${filterType === 'ingest' ? 'active' : ''}`}
              onClick={() => setFilterType('ingest')}
            >
              Ingestions
            </button>
            <button 
              className={`filter-btn ${filterType === 'reset' ? 'active' : ''}`}
              onClick={() => setFilterType('reset')}
            >
              Resets
            </button>
          </div>
        </div>

        <div className="table-container">
          {loading && traces.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem auto', width: '32px', height: '32px', borderWidth: '3px' }}></div>
              <p style={{ color: 'var(--text-secondary)' }}>Loading telemetry logs...</p>
            </div>
          ) : filteredTraces.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
              <strong>No traces logged</strong>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {traces.length === 0 
                  ? 'Perform document ingests or query ask assistant to record traces.'
                  : 'No logs match your active search terms or filters.'
                }
              </p>
            </div>
          ) : (
            <table className="trace-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Execution Summary</th>
                  <th>Latency</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredTraces.map((trace) => {
                  const meta = trace.metadata || {};
                  let summary = '';
                  if (trace.type === 'query') {
                    summary = `Q: "${meta.question}" → A: "${meta.answer ? meta.answer.slice(0, 50) + '...' : ''}"`;
                  } else if (trace.type === 'ingest') {
                    summary = `Ingested: "${meta.filename}" (${meta.num_chunks} chunks, ${meta.num_pages} pages)`;
                  } else if (trace.type === 'reset') {
                    summary = meta.message || 'Chroma database wipe';
                  }

                  return (
                    <tr 
                      key={trace.id} 
                      className="trace-row"
                      onClick={() => handleOpenTrace(trace)}
                    >
                      <td style={{ width: '120px' }}>
                        <span className={`event-badge event-${trace.type}`}>
                          {trace.type === 'query' && (
                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2.5" fill="none">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                          )}
                          {trace.type === 'ingest' && (
                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2.5" fill="none">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="17 8 12 3 7 8" />
                              <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                          )}
                          {trace.type === 'reset' && (
                            <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" strokeWidth="2.5" fill="none">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="15" y1="9" x2="9" y2="15" />
                              <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                          )}
                          {trace.type}
                        </span>
                      </td>
                      <td style={{ maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {summary}
                      </td>
                      <td style={{ width: '100px' }}>
                        <span className={`latency-badge ${getLatencyBadgeClass(trace.duration_ms)}`}>
                          {getLatencyLabel(trace.duration_ms)}
                        </span>
                      </td>
                      <td style={{ width: '180px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {formatDate(trace.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 3. Sliding Detail Drawer Details Inspector */}
      <div 
        className={`drawer-overlay ${isDrawerOpen ? 'open' : ''}`}
        onClick={handleCloseTrace}
      />
      
      <aside className={`trace-drawer ${isDrawerOpen ? 'open' : ''}`}>
        {selectedTrace && (
          <>
            <div className="drawer-header">
              <div>
                <span className={`event-badge event-${selectedTrace.type}`} style={{ marginBottom: '0.35rem' }}>
                  {selectedTrace.type} TRACE
                </span>
                <h3 style={{ margin: 0, color: 'var(--on-surface)', fontSize: '1.2rem', fontWeight: 700 }}>
                  Operation ID: <code style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--primary)', fontSize: '0.9rem' }}>#{selectedTrace.id}</code>
                </h3>
              </div>
              <button className="btn-close-drawer" onClick={handleCloseTrace} aria-label="Close details">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="drawer-content">
              {/* Timeline duration and timestamps summary */}
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LATENCY</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{getLatencyLabel(selectedTrace.duration_ms)}</strong>
                </div>
                <div style={{ flex: 1.5 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIMESTAMP (UTC)</div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{formatDate(selectedTrace.timestamp)}</span>
                </div>
              </div>

              {/* Dynamic content rendering depending on operation */}
              {selectedTrace.type === 'query' && (
                <>
                  {/* Query Tabs Navigation */}
                  <div className="inspector-tabs" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <button 
                      className={`inspector-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setActiveTab('overview')}
                      style={{ paddingBottom: '0.5rem' }}
                    >
                      Overview
                    </button>
                    <button 
                      className={`inspector-tab-btn ${activeTab === 'retriever' ? 'active' : ''}`}
                      onClick={() => setActiveTab('retriever')}
                      style={{ paddingBottom: '0.5rem' }}
                    >
                      Vector Matches
                    </button>
                    <button 
                      className={`inspector-tab-btn ${activeTab === 'prompt' ? 'active' : ''}`}
                      onClick={() => setActiveTab('prompt')}
                      style={{ paddingBottom: '0.5rem' }}
                    >
                      Generated Prompt
                    </button>
                    <button 
                      className={`inspector-tab-btn ${activeTab === 'response' ? 'active' : ''}`}
                      onClick={() => setActiveTab('response')}
                      style={{ paddingBottom: '0.5rem' }}
                    >
                      Response
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {activeTab === 'overview' && (
                      <>
                        <div>
                          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Question Asked</h4>
                          <p style={{ fontWeight: 600, color: 'var(--on-surface)', background: 'var(--bg-hover)', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                            {selectedTrace.metadata.question}
                          </p>
                        </div>

                        <div>
                          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Sub-Latency Timeline</h4>
                          <div className="sub-timeline">
                            <div className="timeline-item">
                              <span>ChromaDB Retrieval</span>
                              <strong>{getLatencyLabel(selectedTrace.metadata.retrieval_time_ms || 0)}</strong>
                            </div>
                            <div className="timeline-item">
                              <span>Ollama Generation ({selectedTrace.metadata.model})</span>
                              <strong>{getLatencyLabel(selectedTrace.metadata.llm_time_ms || 0)}</strong>
                            </div>
                            <div className="timeline-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                              <span>Total Transaction</span>
                              <strong>{getLatencyLabel(selectedTrace.duration_ms)}</strong>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Hyperparameters</h4>
                          <table style={{ width: '100%', fontSize: '0.85rem' }}>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Ollama Model</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>{selectedTrace.metadata.model}</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Retrieve K</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>{selectedTrace.metadata.k} chunks</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Temperature</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>{selectedTrace.metadata.temperature}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {activeTab === 'retriever' && (
                      <div>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                          Retrieved Document Segments ({selectedTrace.metadata.sources?.length || 0})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          {selectedTrace.metadata.sources?.map((source, index) => {
                            const filename = source.metadata?.source || 'Unknown';
                            const page = source.metadata?.page !== undefined ? source.metadata.page + 1 : null;
                            const distance = source.score;
                            
                            return (
                              <div className="chunk-card" key={index}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                                    Chunk #{index + 1}
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>
                                      {filename} {page && `| Page ${page}`}
                                    </span>
                                  </div>
                                  {distance !== undefined && (
                                    <span className="score-pill">
                                      Dist: {distance.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'inherit', margin: 0, maxHeight: '110px', overflowY: 'auto' }}>
                                  {source.content}
                                </pre>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'prompt' && (
                      <div>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          Full Injected Prompt
                        </h4>
                        <pre style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace', maxHeight: '350px', overflowY: 'auto', lineHeight: '1.4' }}>
                          {selectedTrace.metadata.formatted_prompt}
                        </pre>
                      </div>
                    )}

                    {activeTab === 'response' && (
                      <div>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                          Synthesized Answer
                        </h4>
                        <div style={{ background: 'rgba(60, 93, 157, 0.02)', border: '1px solid rgba(60, 93, 157, 0.08)', borderLeft: '4px solid var(--primary)', borderRadius: '8px', padding: '1.25rem', color: 'var(--on-surface)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                          {selectedTrace.metadata.answer}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {selectedTrace.type === 'ingest' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ingested File</h4>
                    <p style={{ fontWeight: 600, color: 'var(--on-surface)', background: 'var(--bg-hover)', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                      📁 {selectedTrace.metadata.filename}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Sub-Latency Breakdown</h4>
                    <div className="sub-timeline" style={{ borderLeft: '3px solid #10b981' }}>
                      <div className="timeline-item">
                        <span>Document Loading ({selectedTrace.metadata.loader})</span>
                        <strong>{getLatencyLabel(selectedTrace.metadata.load_time_ms || 0)}</strong>
                      </div>
                      <div className="timeline-item">
                        <span>Splitting & Partitioning</span>
                        <strong>{getLatencyLabel(selectedTrace.metadata.split_time_ms || 0)}</strong>
                      </div>
                      <div className="timeline-item">
                        <span>Embedding & Vector Insertion</span>
                        <strong>{getLatencyLabel(selectedTrace.metadata.db_time_ms || 0)}</strong>
                      </div>
                      <div className="timeline-item" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                        <span>Total Latency</span>
                        <strong>{getLatencyLabel(selectedTrace.duration_ms)}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Index Statistics</h4>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                          <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Total Pages Load</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>{selectedTrace.metadata.num_pages} pages</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                          <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Generated Text Chunks</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>{selectedTrace.metadata.num_chunks} chunks</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                          <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Tuning Chunk Size</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>{selectedTrace.metadata.chunk_size} tokens</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                          <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Tuning Chunk Overlap</td>
                          <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 600 }}>{selectedTrace.metadata.chunk_overlap} tokens</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedTrace.type === 'reset' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Reset Details</h4>
                    <p style={{ fontWeight: 600, color: 'var(--on-surface)', background: 'rgba(245, 158, 11, 0.05)', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b' }}>
                      ⚠️ {selectedTrace.metadata.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
