import React, { useState } from 'react';

// Retrieval mode configuration
const RETRIEVAL_MODES = [
  {
    id: 'vector',
    label: 'Vector',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
    description: 'Dense cosine-similarity search via ChromaDB embeddings.',
    scoreLabel: 'Cosine Score',
    color: 'var(--accent-cyan)',
  },
  {
    id: 'bm25',
    label: 'BM25',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    description: 'Keyword-based Okapi BM25 ranking. No embeddings required.',
    scoreLabel: 'BM25 Score',
    color: 'var(--accent-purple)',
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    ),
    description: 'Reciprocal Rank Fusion of Vector + BM25. Best of both worlds.',
    scoreLabel: 'RRF Score',
    color: '#f59e0b',
  },
];

export default function AskView({ k, documents, retrievalMode, setRetrievalMode }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [lastQuestion, setLastQuestion] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedSources, setExpandedSources] = useState({});
  const [pipelineData, setPipelineData] = useState(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState('retriever');
  const [showTelemetry, setShowTelemetry] = useState(false);

  const activeModeConfig = RETRIEVAL_MODES.find(m => m.id === retrievalMode) || RETRIEVAL_MODES[0];

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
    setPipelineData(null);
    setShowTelemetry(false);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question,
          k: k,
          retrieval_mode: retrievalMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to complete query.');
      }

      const data = await response.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
      setPipelineData(data.pipeline);
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Ask a question about the active indexed document collection. Gemma 4 will review relevant passages and provide an answer with citations.
            </p>

            {/* Retrieval Mode Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                Retrieval Strategy
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {RETRIEVAL_MODES.map(mode => {
                  const isActive = retrievalMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setRetrievalMode(mode.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 1rem',
                        borderRadius: '999px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: isActive ? `1.5px solid ${mode.color}` : '1.5px solid var(--border-color)',
                        background: isActive
                          ? `linear-gradient(135deg, ${mode.color}22, ${mode.color}11)`
                          : 'rgba(255,255,255,0.02)',
                        color: isActive ? mode.color : 'var(--text-secondary)',
                        boxShadow: isActive ? `0 0 12px ${mode.color}33` : 'none',
                      }}
                    >
                      <span style={{ color: isActive ? mode.color : 'var(--text-muted)' }}>{mode.icon}</span>
                      {mode.label}
                    </button>
                  );
                })}
              </div>
              {/* Active mode description */}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0, fontStyle: 'italic' }}>
                {activeModeConfig.description}
              </p>
            </div>

            {/* Metrics bar */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--accent-cyan)', display: 'inline-block', boxShadow: '0 0 8px var(--accent-cyan)' }}></span>
                Library active: <strong>{documents.length} document{documents.length > 1 ? 's' : ''}</strong>
              </span>
              <div className="tuning-summary">
                <span className="tag">Retrieve Top K: <strong>{k}</strong></span>
                <span className="tag" style={{ color: activeModeConfig.color }}>
                  Mode: <strong>{activeModeConfig.label}</strong>
                </span>
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
              <div className="answer-text">{renderMarkdown(answer)}</div>

              {/* Context Source Citations */}
              {sources.length > 0 && (
                <div className="sources-section">
                  <div className="sources-heading">
                    Source Contexts ({sources.length}) — scored by <em style={{ color: activeModeConfig.color }}>{activeModeConfig.scoreLabel}</em>
                  </div>
                  <div className="sources-list">
                    {sources.map((source, index) => {
                      const isExpanded = !!expandedSources[index];
                      const filename = source.metadata?.source || 'Unknown File';
                      const page = source.metadata?.page !== undefined ? source.metadata.page + 1 : null;
                      const score = source.score;
                      const scoreLabel = source.score_label || activeModeConfig.scoreLabel;

                      return (
                        <div className={`source-item ${isExpanded ? 'expanded' : ''}`} key={index}>
                          <div className="source-header" onClick={() => handleToggleSource(index)}>
                            <div className="source-title-group">
                              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>#{index + 1}</span>
                              <span style={{ color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>{filename}</span>
                              {page && <span className="source-badge">Page {page}</span>}
                              {score !== undefined && (
                                <span className="source-badge" style={{ color: activeModeConfig.color, borderColor: activeModeConfig.color }}>
                                  {scoreLabel}: {typeof score === 'number' ? score.toFixed(4) : score}
                                </span>
                              )}
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

          {/* Toggle telemetry accordion */}
          {pipelineData && (
            <>
              <div className="telemetry-toggle-area">
                <button
                  type="button"
                  className={`btn-telemetry-toggle ${showTelemetry ? 'active' : ''}`}
                  onClick={() => setShowTelemetry(!showTelemetry)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.3s ease', transform: showTelemetry ? 'rotate(180deg)' : 'none' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span>{showTelemetry ? 'Hide Telemetry Trace' : '🛰️ View LCEL Execution Trace'}</span>
                </button>
              </div>

              <div className={`telemetry-collapse-wrapper ${showTelemetry ? 'open' : ''}`}>
                {/* LangChain Execution Pipeline Inspector */}
                <div className="pipeline-inspector glass-panel" style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div className="inspector-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-purple)', fontSize: '1.1rem' }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px var(--accent-purple))' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      LangChain Pipeline Execution Telemetry
                    </h4>
                    <span style={{ background: 'linear-gradient(135deg, var(--accent-purple), #7928CA)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', boxShadow: '0 0 10px rgba(121, 40, 202, 0.4)' }}>LCEL Chain</span>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
                    Inspect real-time telemetry from each abstracted LangChain component in the active query-retrieval loop.
                  </p>

                  {/* Tab navigation */}
                  <div className="inspector-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '0.5rem', paddingBottom: '0.1rem' }}>
                    {['retriever', 'prompt', 'chat_model', 'output_parser'].map((tab, i) => (
                      <button
                        key={tab}
                        type="button"
                        className={`inspector-tab-btn ${activeInspectorTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveInspectorTab(tab)}
                      >
                        {i + 1}. {tab === 'retriever' ? 'Retriever' : tab === 'prompt' ? 'Prompt Template' : tab === 'chat_model' ? 'ChatModel' : 'Output Parser'}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="inspector-content" style={{ marginTop: '1.25rem' }}>

                    {activeInspectorTab === 'retriever' && (
                      <div>
                        {/* Retrieval mode badge */}
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                          {RETRIEVAL_MODES.map(mode => (
                            <span
                              key={mode.id}
                              style={{
                                padding: '0.2rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: `1.5px solid ${pipelineData.retriever.retrieval_mode === mode.id ? mode.color : 'var(--border-color)'}`,
                                color: pipelineData.retriever.retrieval_mode === mode.id ? mode.color : 'var(--text-muted)',
                                background: pipelineData.retriever.retrieval_mode === mode.id ? `${mode.color}18` : 'transparent',
                              }}
                            >
                              {pipelineData.retriever.retrieval_mode === mode.id ? '✓ ' : ''}{mode.label}
                            </span>
                          ))}
                        </div>
                        <div className="inspector-meta-row" style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span><strong>Class:</strong> <code className="code-tag">{pipelineData.retriever.name}</code></span>
                          <span><strong>Method:</strong> <code className="code-tag">{pipelineData.retriever.search_type}</code></span>
                          <span><strong>K:</strong> <code className="code-tag">{pipelineData.retriever.k} chunks</code></span>
                          <span><strong>Score:</strong> <code className="code-tag">{pipelineData.retriever.score_label}</code></span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                          {pipelineData.retriever.description}
                        </p>
                        <div style={{ marginTop: '1rem' }}>
                          <div className="sources-heading" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Retrieved Document Chunks ({sources.length})</div>
                          <div className="inspector-sources-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                            {sources.map((src, index) => {
                              const modeColor = RETRIEVAL_MODES.find(m => m.id === pipelineData.retriever.retrieval_mode)?.color || 'var(--accent-cyan)';
                              return (
                                <div className="inspector-source-card" key={index} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                    <span>Chunk #{index + 1}</span>
                                    <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                      <span>{src.metadata?.source || 'Unknown'} {src.metadata?.page !== undefined ? `| Page ${src.metadata.page + 1}` : ''}</span>
                                      {src.score !== undefined && (
                                        <span style={{ color: modeColor, fontWeight: 600 }}>
                                          {src.score_label || pipelineData.retriever.score_label}: {typeof src.score === 'number' ? src.score.toFixed(4) : src.score}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'inherit', margin: 0, maxHeight: '80px', overflowY: 'auto' }}>
                                    {src.content}
                                  </pre>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeInspectorTab === 'prompt' && (
                      <div>
                        <div className="inspector-meta-row" style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span><strong>Class:</strong> <code className="code-tag">{pipelineData.prompt.name}</code></span>
                          <span><strong>Input variables:</strong> <code className="code-tag">context, question</code></span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                          {pipelineData.prompt.description}
                        </p>
                        <div style={{ marginTop: '1rem' }}>
                          <div className="sources-heading" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Formatted Prompt Sent to Ollama ChatModel</div>
                          <pre className="formatted-prompt-viewer" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace', maxHeight: '250px', overflowY: 'auto', marginTop: '0.5rem', lineHeight: '1.4' }}>
                            {pipelineData.prompt.formatted_prompt}
                          </pre>
                        </div>
                      </div>
                    )}

                    {activeInspectorTab === 'chat_model' && (
                      <div>
                        <div className="inspector-meta-row" style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span><strong>Class:</strong> <code className="code-tag">{pipelineData.chat_model.name}</code></span>
                          <span><strong>Model:</strong> <code className="code-tag">{pipelineData.chat_model.model}</code></span>
                          <span><strong>Temp:</strong> <code className="code-tag">{pipelineData.chat_model.temperature}</code></span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                          {pipelineData.chat_model.description}
                        </p>
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Ollama Server Integration</span>
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <tbody>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Host URL</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontFamily: 'monospace' }}>{pipelineData.chat_model.base_url}</td>
                              </tr>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Execution Format</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>Message Object Sequence (System/User/Assistant)</td>
                              </tr>
                              <tr>
                                <td style={{ padding: '0.5rem 0', color: 'var(--text-secondary)' }}>Streaming Support</td>
                                <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--accent-cyan)' }}>Enabled</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activeInspectorTab === 'output_parser' && (
                      <div>
                        <div className="inspector-meta-row" style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span><strong>Class:</strong> <code className="code-tag">{pipelineData.output_parser.name}</code></span>
                          <span><strong>Output Type:</strong> <code className="code-tag">str</code></span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1rem 0' }}>
                          {pipelineData.output_parser.description}
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Parsed Output Tokens</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                              {answer.split(/\s+/).length} words
                            </div>
                          </div>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Output Character Size</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-purple)' }}>
                              {answer.length} chars
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

// Simple and safe markdown-like renderer to output gorgeous, styled HTML nodes
function renderMarkdown(text) {
  if (!text) return null;

  // Split into paragraphs by double newlines
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((para, pIdx) => {
    const trimmedPara = para.trim();
    if (!trimmedPara) return null;

    // Check if it's a heading
    if (trimmedPara.startsWith('### ')) {
      return <h5 key={pIdx} className="markdown-h5">{parseInlineMarkdown(trimmedPara.slice(4))}</h5>;
    }
    if (trimmedPara.startsWith('## ')) {
      return <h4 key={pIdx} className="markdown-h4">{parseInlineMarkdown(trimmedPara.slice(3))}</h4>;
    }
    if (trimmedPara.startsWith('# ')) {
      return <h3 key={pIdx} className="markdown-h3">{parseInlineMarkdown(trimmedPara.slice(2))}</h3>;
    }

    // Check if it's a bulleted list block
    if (trimmedPara.startsWith('- ') || trimmedPara.startsWith('* ')) {
      const items = para.split(/\n[-*]\s+/);
      const cleanedItems = items.map(item => item.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
      return (
        <ul key={pIdx} className="markdown-ul">
          {cleanedItems.map((item, iIdx) => (
            <li key={iIdx} className="markdown-li">{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
    }

    // Standard list with single newlines
    const lines = trimmedPara.split('\n');
    if (lines.length > 1 && lines.every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '))) {
      return (
        <ul key={pIdx} className="markdown-ul">
          {lines.map((line, lIdx) => {
            const content = line.trim().replace(/^[-*]\s+/, '');
            return <li key={lIdx} className="markdown-li">{parseInlineMarkdown(content)}</li>;
          })}
        </ul>
      );
    }

    return <p key={pIdx} className="markdown-p">{parseInlineMarkdown(trimmedPara)}</p>;
  });
}

function parseInlineMarkdown(text) {
  const parts = [];
  let remaining = text;

  // Regex to match bold (**text**) or inline code (`text`)
  const tokenRegex = /(\*\*.*?\*\*|`.*?`)/;

  while (remaining) {
    const match = remaining.match(tokenRegex);
    if (!match) {
      parts.push(remaining);
      break;
    }

    const index = match.index;
    if (index > 0) {
      parts.push(remaining.slice(0, index));
    }

    const matchedText = match[0];
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      parts.push(<strong key={parts.length}>{matchedText.slice(2, -2)}</strong>);
    } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
      parts.push(<code key={parts.length} className="inline-code">{matchedText.slice(1, -1)}</code>);
    } else {
      parts.push(matchedText);
    }

    remaining = remaining.slice(index + matchedText.length);
  }

  return parts;
}
