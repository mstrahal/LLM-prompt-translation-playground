'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  History, 
  Sparkles, 
  Languages, 
  Cpu, 
  X, 
  Play, 
  Loader2, 
  FileText,
  GitCompare,
  Plus,
  CheckSquare,
  Square
} from 'lucide-react';
import { regenerateTranslationRunAction, addSourceSegmentAction } from '@/app/actions';
import { diffWords } from '@/lib/diff';

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

  // Checkbox selection states
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);

  // Add segment modal states
  const [showAddSegmentModal, setShowAddSegmentModal] = useState(false);
  const [newSegText, setNewSegText] = useState('');
  const [newSegKey, setNewSegKey] = useState('');
  const [newSegContext, setNewSegContext] = useState('');
  const [addingSegment, setAddingSegment] = useState(false);

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

  // Handle regeneration action (for selected or all segments)
  const handleRegenerate = async (e: React.FormEvent, runSelective = false) => {
    e.preventDefault();
    setRegenerating(true);
    setError(null);

    try {
      const selectedIds = runSelective ? selectedSegmentIds : undefined;
      const res = await regenerateTranslationRunAction(
        project.id,
        systemPrompt,
        localePrompt,
        modelUsed,
        selectedIds
      );

      if (res && !res.success) {
        setError(res.error || 'Failed to regenerate translations.');
        setRegenerating(false);
        return;
      }

      // Force-refresh to fetch updated data from the server components
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to regenerate translations.');
      setRegenerating(false);
    }
  };

  // Handle Add Segment Submit
  const handleAddSegmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegText.trim()) return;

    setAddingSegment(true);
    setError(null);

    try {
      const res = await addSourceSegmentAction(
        project.id,
        newSegText,
        newSegKey || undefined,
        newSegContext || undefined
      );

      if (res && !res.success) {
        setError(res.error || "Failed to add segment.");
        setAddingSegment(false);
        return;
      }

      // Reset states & reload workspace
      setNewSegText('');
      setNewSegKey('');
      setNewSegContext('');
      setShowAddSegmentModal(false);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to add segment.");
      setAddingSegment(false);
    }
  };

  // Toggle individual segment checkbox
  const handleCheckboxToggle = (segId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent opening the detail sheet drawer
    setSelectedSegmentIds(prev => 
      prev.includes(segId) ? prev.filter(id => id !== segId) : [...prev, segId]
    );
  };

  // Toggle all checkboxes
  const handleSelectAllToggle = () => {
    if (selectedSegmentIds.length === project.sourceSegments.length) {
      // Uncheck all
      setSelectedSegmentIds([]);
    } else {
      // Check all
      setSelectedSegmentIds(project.sourceSegments.map(s => s.id));
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
                  <option key={run.id} value={run.id} suppressHydrationWarning>
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
                        <option key={run.id} value={run.id} suppressHydrationWarning>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
              {project.name}
              <span className="badge badge-indigo" style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>
                {project.targetLanguage}
              </span>
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', marginTop: '0.25rem', margin: 0 }}>
              Translation workspace. Add source strings, tweak prompts, and review translations.
            </p>
          </div>

          {/* Add Segment on the fly button */}
          <button 
            onClick={() => setShowAddSegmentModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', gap: '0.4rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            <Plus size={16} />
            <span>Add Segment</span>
          </button>
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
            <div className="stat-label" style={{ fontSize: '0.75rem' }}>Total Run Tokens</div>
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
            <div className="stat-value" style={{ fontSize: '1.1rem', whiteSpace: 'nowrap' }} suppressHydrationWarning>
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

      {/* Selective Action Toolbar if checkboxes selected */}
      {selectedSegmentIds.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          border: '1px dashed var(--color-accent-indigo)',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <CheckSquare size={16} style={{ color: 'var(--color-accent-indigo)' }} />
            <span><strong>{selectedSegmentIds.length}</strong> segments selected for selective regeneration.</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setSelectedSegmentIds([])}
              className="btn"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              Clear Selection
            </button>
            <button 
              onClick={(e) => handleRegenerate(e, true)}
              className="btn btn-primary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', gap: '0.25rem' }}
            >
              <Play size={12} />
              <span>Regenerate Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
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
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Running Translation API</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', maxWidth: '380px', textAlign: 'center' }}>
                Invoking Gemini model. Only selected segments will incur API token calls.
              </p>
            </div>
          )}

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '5%', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={selectedSegmentIds.length === project.sourceSegments.length && project.sourceSegments.length > 0}
                      onChange={handleSelectAllToggle}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '18%' }}>Key / ID</th>
                  <th style={{ width: '32%' }}>Source Text (English)</th>
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

                  const isChecked = selectedSegmentIds.includes(segment.id);

                  return (
                    <tr 
                      key={segment.id} 
                      onClick={() => setSelectedSegId(segment.id)}
                      style={{ backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.02)' : undefined }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleCheckboxToggle(segment.id, e)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

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
                          <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Pending (Click Regenerate)</span>
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
          <form onSubmit={(e) => handleRegenerate(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                <option value="gemini-3.0-supernova">Gemini 3.0 Supernova</option>
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
                  <span>Regenerate All</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Add Segment Modal */}
      {showAddSegmentModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            width: '450px',
            padding: '1.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} style={{ color: 'var(--color-accent-indigo)' }} />
                Add Source Segment
              </h3>
              <button 
                onClick={() => setShowAddSegmentModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSegmentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Source Text (English)*</label>
                <textarea 
                  className="textarea-field" 
                  value={newSegText}
                  onChange={(e) => setNewSegText(e.target.value)}
                  placeholder="Enter string to translate..."
                  style={{ minHeight: '80px', fontSize: '0.875rem' }}
                  required
                  disabled={addingSegment}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Key ID (Optional)</label>
                <input 
                  type="text"
                  className="input-field"
                  value={newSegKey}
                  onChange={(e) => setNewSegKey(e.target.value)}
                  placeholder="e.g. settings_title"
                  disabled={addingSegment}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Context Description (Optional)</label>
                <input 
                  type="text"
                  className="input-field"
                  value={newSegContext}
                  onChange={(e) => setNewSegContext(e.target.value)}
                  placeholder="e.g. Header label of settings screen"
                  disabled={addingSegment}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddSegmentModal(false)}
                  className="btn"
                  style={{ padding: '0.5rem 1rem' }}
                  disabled={addingSegment}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.25rem' }}
                  disabled={addingSegment || !newSegText.trim()}
                >
                  {addingSegment ? (
                    <>
                      <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare size={14} />
                      <span>Save Segment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
