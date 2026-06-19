'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  History, 
  Sparkles, 
  Languages, 
  Cpu, 
  Coins, 
  Clock, 
  X, 
  Play, 
  Loader2, 
  FileText,
  Columns,
  GitCompare
} from 'lucide-react';
import { regenerateTranslationRunAction } from '@/app/actions';
import { diffWords, DiffToken } from '@/lib/diff';

interface SourceSegment {
  id: string;
  key: string;
  sourceText: string;
  context: string | null;
}

interface Translation {
  id: string;
  sourceSegmentId: string;
  translationRunId: string;
  targetText: string;
  explanation: string | null;
  alternatives: string | null; // JSON string
  tokensUsed: number;
  cost: number;
}

interface TranslationRun {
  id: string;
  modelUsed: string;
  systemPromptUsed: string;
  localePromptUsed: string;
  totalTokens: number;
  totalCost: number;
  createdAt: Date | string;
  translations: Translation[];
}

interface Project {
  id: string;
  name: string;
  targetLanguage: string;
  geminiModel: string;
  createdAt: Date | string;
  sourceSegments: SourceSegment[];
}

interface WorkspaceClientProps {
  project: Project;
  initialRuns: TranslationRun[];
}

export default function WorkspaceClient({ project, initialRuns }: WorkspaceClientProps) {
  const [runs, setRuns] = useState<TranslationRun[]>(initialRuns);
  
  // Run states
  const [activeRunId, setActiveRunId] = useState<string>(initialRuns[0]?.id || '');
  const [compareRunId, setCompareRunId] = useState<string>(''); // Empty string = None
  
  // Prompt overrides states (initialized with active run prompts or standard project defaults)
  const [systemPrompt, setSystemPrompt] = useState('');
  const [localePrompt, setLocalePrompt] = useState('');
  const [modelUsed, setModelUsed] = useState(project.geminiModel);

  // Regeneration state
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail sheet state
  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);

  // Find active and comparison runs
  const activeRun = runs.find(r => r.id === activeRunId);
  const compareRun = runs.find(r => r.id === compareRunId);

  // Update prompt inputs when the active run changes
  useEffect(() => {
    if (activeRun) {
      setSystemPrompt(activeRun.systemPromptUsed);
      setLocalePrompt(activeRun.localePromptUsed);
      setModelUsed(activeRun.modelUsed);
    }
  }, [activeRunId, runs]);

  // Handle regeneration action
  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegenerating(true);
    setError(null);

    try {
      const res = await regenerateTranslationRunAction(
        project.id,
        systemPrompt,
        localePrompt,
        modelUsed
      );

      // Fetch the updated runs list (or we can query it, let's just refresh page or handle smoothly)
      // To get the latest runs list client-side, we reload page components or do a window reload since Server Actions revalidate path
      // Reload is simplest, but to keep state smooth, let's refresh or fetch. A page reload is robust since it fetches fresh Server Component data!
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to regenerate translations.');
      setRegenerating(false);
    }
  };

  // Get active translation for a segment
  const getTranslation = (segmentId: string, run: TranslationRun | undefined) => {
    if (!run) return null;
    return run.translations.find(t => t.sourceSegmentId === segmentId) || null;
  };

  // Find selected segment and translation for details drawer
  const selectedSegment = project.sourceSegments.find(s => s.id === selectedSegId);
  const selectedTranslation = selectedSegment ? getTranslation(selectedSegment.id, activeRun) : null;
  
  let alternativesList: string[] = [];
  if (selectedTranslation?.alternatives) {
    try {
      alternativesList = JSON.parse(selectedTranslation.alternatives);
    } catch (e) {
      console.error("Failed to parse alternatives JSON:", e);
    }
  }

  // Format date utility
  const formatRunDate = (dateVal: Date | string) => {
    const d = new Date(dateVal);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {/* Top Breadcrumb & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link href="/" style={{ 
          color: 'var(--color-text-secondary)', 
          textDecoration: 'none', 
          fontSize: '0.9rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>

        {activeRun && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Run Selection Dropdowns */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <History size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Active Run:</span>
              <select 
                className="select-field" 
                value={activeRunId} 
                onChange={(e) => setActiveRunId(e.target.value)}
                style={{ padding: '0.35rem 0.75rem', width: '220px', fontSize: '0.85rem' }}
              >
                {runs.map((run, idx) => (
                  <option key={run.id} value={run.id}>
                    Run #{runs.length - idx} ({formatRunDate(run.createdAt)})
                  </option>
                ))}
              </select>
            </div>

            {runs.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <GitCompare size={14} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Compare with:</span>
                <select 
                  className="select-field" 
                  value={compareRunId} 
                  onChange={(e) => setCompareRunId(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', width: '220px', fontSize: '0.85rem' }}
                >
                  <option value="">None (Single view)</option>
                  {runs
                    .filter(run => run.id !== activeRunId)
                    .map((run, idx) => {
                      const actualIdx = runs.indexOf(run);
                      return (
                        <option key={run.id} value={run.id}>
                          Run #{runs.length - actualIdx} ({formatRunDate(run.createdAt)})
                        </option>
                      );
                    })}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Project Title Banner */}
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {project.name}
            <span className="badge badge-indigo" style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>
              {project.targetLanguage}
            </span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', marginTop: '0.25rem' }}>
            Translation workspace. Review parsed segments, inspect explanations, or compare different prompt configurations.
          </p>
        </div>
      </div>

      {/* Active Run Statistics Summary */}
      {activeRun && (
        <div className="stats-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="stat-card" style={{ padding: '1rem 1.25rem' }}>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Active Model</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Cpu size={16} style={{ color: 'var(--color-accent-indigo)' }} />
              {activeRun.modelUsed}
            </div>
          </div>
          <div className="stat-card" style={{ padding: '1rem 1.25rem' }}>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Total Tokens</div>
            <div className="stat-value" style={{ fontSize: '1.25rem' }}>
              {activeRun.totalTokens.toLocaleString()}
            </div>
          </div>
          <div className="stat-card stat-card-emerald" style={{ padding: '1rem 1.25rem' }}>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Run Cost</div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--color-accent-emerald)' }}>
              ${activeRun.totalCost.toFixed(5)}
            </div>
          </div>
          <div className="stat-card" style={{ padding: '1rem 1.25rem' }}>
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Run Date</div>
            <div className="stat-value" style={{ fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              {formatRunDate(activeRun.createdAt)}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: 'rgba(244, 63, 94, 0.1)', 
          border: '1px solid rgba(244, 63, 94, 0.3)', 
          borderRadius: '8px', 
          color: '#fda4af', 
          marginBottom: '1.5rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Main Workspace Workspace */}
      <div className="workspace-container">
        
        {/* Left Side: Translation Grid / Table */}
        <div style={{ position: 'relative' }}>
          {regenerating && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(11, 15, 25, 0.7)',
              backdropFilter: 'blur(4px)',
              zIndex: 5,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              padding: '4rem 2rem'
            }}>
              <Loader2 className="spinner" size={48} style={{ color: 'var(--color-accent-indigo)', animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Regenerating Workspace Translations</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '380px', textAlign: 'center' }}>
                Executing prompt updates using Gemini model. Cost estimates will recalculate.
              </p>
            </div>
          )}

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Key / ID</th>
                  <th style={{ width: '35%' }}>Source Text (English)</th>
                  <th style={{ width: compareRun ? '22%' : '45%' }}>
                    {compareRun ? `Active Run (Run #${runs.length - runs.indexOf(activeRun!)})` : 'Translation'}
                  </th>
                  {compareRun && (
                    <th style={{ width: '23%' }}>
                      Visual Word Diff (vs. Run #{runs.length - runs.indexOf(compareRun)})
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {project.sourceSegments.map((segment) => {
                  const translationActive = getTranslation(segment.id, activeRun);
                  const translationCompare = compareRun ? getTranslation(segment.id, compareRun) : null;
                  
                  // Compute visual diffs if comparing runs
                  let diffElements: React.ReactNode = null;
                  if (compareRun && translationActive && translationCompare) {
                    const diffTokens = diffWords(translationCompare.targetText, translationActive.targetText);
                    
                    diffElements = (
                      <div className="diff-container" style={{ padding: 0, border: 'none', background: 'none', fontStyle: 'normal', fontSize: '0.85rem' }}>
                        {diffTokens.map((token, idx) => {
                          if (token.type === 'added') {
                            return <span key={idx} className="diff-ins">{token.value}</span>;
                          } else if (token.type === 'removed') {
                            return <span key={idx} className="diff-del">{token.value}</span>;
                          } else {
                            return <span key={idx}>{token.value}</span>;
                          }
                        })}
                      </div>
                    );
                  }

                  return (
                    <tr key={segment.id} onClick={() => setSelectedSegId(segment.id)}>
                      {/* Key ID */}
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
                        {segment.key}
                      </td>

                      {/* Source English */}
                      <td style={{ fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: 500 }}>{segment.sourceText}</div>
                        {segment.context && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            Ctx: {segment.context}
                          </div>
                        )}
                      </td>

                      {/* Active Translation */}
                      <td style={{ fontSize: '0.875rem' }}>
                        {translationActive ? (
                          translationActive.targetText
                        ) : (
                          <span style={{ color: 'var(--color-accent-rose)' }}>Error / None</span>
                        )}
                      </td>

                      {/* Diff View */}
                      {compareRun && (
                        <td style={{ fontSize: '0.875rem' }}>
                          {diffElements ? diffElements : (
                            <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No data</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Inline Prompt Tweaking Sidebar */}
        <div className="workspace-sidebar">
          <form onSubmit={handleRegenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Sparkles size={16} style={{ color: 'var(--color-accent-indigo)' }} />
              Prompt Playground
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
              Tweak prompt directives for this workspace and regenerate translations to compare metrics and quality.
            </p>

            {/* Model Select */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Gemini Model</label>
              <select 
                className="select-field" 
                value={modelUsed} 
                onChange={(e) => setModelUsed(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                disabled={regenerating}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>

            {/* System Prompt Override */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>System Prompt Directive</label>
              <textarea 
                className="textarea-field" 
                value={systemPrompt} 
                onChange={(e) => setSystemPrompt(e.target.value)}
                style={{ minHeight: '120px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', padding: '0.5rem' }}
                disabled={regenerating}
                required
              />
            </div>

            {/* Locale Prompt Override */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Locale Instructions ({project.targetLanguage})</label>
              <textarea 
                className="textarea-field" 
                value={localePrompt} 
                onChange={(e) => setLocalePrompt(e.target.value)}
                style={{ minHeight: '100px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', padding: '0.5rem' }}
                disabled={regenerating}
                required
              />
            </div>

            {/* Regenerate Button */}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={regenerating}
              style={{ width: '100%', padding: '0.7rem', display: 'flex', justifyContent: 'center' }}
            >
              {regenerating ? (
                <>
                  <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Regenerate Run</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Segment Translation Details Slide-in Sheet (Drawer) */}
      <div 
        className={`sheet-backdrop ${selectedSegId ? 'open' : ''}`}
        onClick={() => setSelectedSegId(null)}
      />

      <div className={`sheet-content ${selectedSegId ? 'open' : ''}`}>
        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--color-accent-indigo)' }} />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Segment Translation Details</h2>
          </div>
          <button onClick={() => setSelectedSegId(null)} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {selectedSegment && (
          <div className="sheet-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Key ID & Metadata */}
            <div>
              <h4 className="details-section-title">Key / Identifier</h4>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                {selectedSegment.key}
              </div>
            </div>

            {/* Context (if any) */}
            {selectedSegment.context && (
              <div>
                <h4 className="details-section-title">Context Info</h4>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  {selectedSegment.context}
                </div>
              </div>
            )}

            {/* Source text */}
            <div>
              <h4 className="details-section-title">Source English String</h4>
              <div className="details-content-box" style={{ fontWeight: 500 }}>
                {selectedSegment.sourceText}
              </div>
            </div>

            {/* Selected Run Translation */}
            <div>
              <h4 className="details-section-title">
                Active Translation (Run #{runs.length - runs.indexOf(activeRun!)})
              </h4>
              <div className="details-content-box" style={{ borderColor: 'var(--color-accent-emerald)', borderWidth: '1px', fontWeight: 600, fontSize: '1.05rem' }}>
                {selectedTranslation ? selectedTranslation.targetText : 'No translation generated.'}
              </div>
            </div>

            {/* Gemini reasoning (Explanation) */}
            <div>
              <h4 className="details-section-title">Gemini Translation Reasoning</h4>
              <div className="details-content-box" style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {selectedTranslation?.explanation || 'No explanation or grammatical reasoning was provided by the model.'}
              </div>
            </div>

            {/* Alternative styles */}
            {alternativesList.length > 0 && (
              <div>
                <h4 className="details-section-title">Stylistic Alternatives</h4>
                <div className="details-alternative-list">
                  {alternativesList.map((alt, idx) => (
                    <div key={idx} className="details-alternative-item">
                      {alt}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comparison translation details if Compare Run is selected */}
            {compareRun && (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4 className="details-section-title">
                    Comparison Translation (Run #{runs.length - runs.indexOf(compareRun)})
                  </h4>
                  <div className="details-content-box" style={{ fontSize: '0.95rem' }}>
                    {getTranslation(selectedSegment.id, compareRun)?.targetText || 'No translation generated in comparison run.'}
                  </div>
                </div>
              </div>
            )}

            {/* Metrics */}
            {selectedTranslation && (
              <div style={{ 
                padding: '1.25rem', 
                backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '8px',
                marginTop: 'auto'
              }}>
                <h4 className="details-section-title" style={{ marginBottom: '0.75rem' }}>Usage & Cost Metrics</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Estimated Cost:</span>
                    <strong style={{ color: 'var(--color-accent-emerald)' }}>${selectedTranslation.cost.toFixed(6)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Tokens Consumed:</span>
                    <span><strong>{selectedTranslation.tokensUsed} tokens</strong></span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
