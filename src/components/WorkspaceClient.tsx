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
  Square,
  BookOpen,
  Scale,
  Trash2,
  AlertTriangle,
  Award,
  Sliders,
  CheckCircle,
  Info
} from 'lucide-react';
import { 
  regenerateTranslationRunAction, 
  addSourceSegmentAction,
  getGlossaryTermsAction,
  addGlossaryTermAction,
  deleteGlossaryTermAction,
  evaluateTranslationLQAAction
} from '@/app/actions';
import { diffWords } from '@/lib/diff';
import LqaReportModal from '@/components/LqaReportModal';

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
  qeScore?: number | null;
}

interface TranslationLQA {
  id: string;
  translationRunId: string;
  score: number;
  errorCountCritical: number;
  errorCountMajor: number;
  errorCountMinor: number;
  reportJson: string;
  createdAt: string;
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
  translationLQA?: TranslationLQA | null;
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
  
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'grid' | 'glossary' | 'lqa' | 'orchestration'>('grid');

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

  // Glossary states
  const [glossaryTerms, setGlossaryTerms] = useState<any[]>([]);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [addingTerm, setAddingTerm] = useState(false);

  // LQA states
  const [evaluatingLqa, setEvaluatingLqa] = useState(false);
  const [lqaReportModalOpen, setLqaReportModalOpen] = useState(false);

  // Orchestration states
  const [routingRule, setRoutingRule] = useState<'all-flash' | 'cost-optimized' | 'pro-heavy'>('cost-optimized');

  // Regeneration state
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State to track applied prompt directive index for animation
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

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

  // Load glossary terms
  const loadGlossary = async () => {
    const res = await getGlossaryTermsAction(project.id);
    if (res.success && res.terms) {
      setGlossaryTerms(res.terms);
    }
  };

  useEffect(() => {
    loadGlossary();
  }, [project.id]);

  // Handle Add Glossary Term
  const handleAddTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) return;
    setAddingTerm(true);
    const res = await addGlossaryTermAction(project.id, newSource, newTarget);
    if (res.success) {
      setNewSource('');
      setNewTarget('');
      loadGlossary();
    } else {
      setError(res.error || "Failed to add glossary term.");
    }
    setAddingTerm(false);
  };

  // Handle Delete Glossary Term
  const handleDeleteTerm = async (termId: string) => {
    const res = await deleteGlossaryTermAction(termId, project.id);
    if (res.success) {
      loadGlossary();
    } else {
      setError(res.error || "Failed to delete glossary term.");
    }
  };

  // Handle LQA evaluation
  const handleEvaluateLqa = async () => {
    if (!activeRunId) return;
    setEvaluatingLqa(true);
    setError(null);
    try {
      const res = await evaluateTranslationLQAAction(activeRunId);
      if (res.success && res.lqa) {
        // Update runs state with the new LQA record attached to the active run
        setRuns(prev => prev.map(r => r.id === activeRunId ? { 
          ...r, 
          translationLQA: {
            ...res.lqa,
            createdAt: res.lqa.createdAt instanceof Date ? res.lqa.createdAt.toISOString() : String(res.lqa.createdAt)
          } 
        } : r));
        setLqaReportModalOpen(true);
      } else {
        setError(res.error || "Failed to evaluate LQA.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during LQA evaluation.");
    } finally {
      setEvaluatingLqa(false);
    }
  };

  // Check glossary violations on-the-fly
  const checkViolations = (source: string, target: string) => {
    if (!target) return [];
    const violations = [];
    const escapeRegex = (s: string) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    for (const term of glossaryTerms) {
      const sourceRegex = new RegExp(`\\b${escapeRegex(term.source)}\\b`, 'i');
      if (sourceRegex.test(source)) {
        const targetRegex = new RegExp(`\\b${escapeRegex(term.target)}\\b`, 'i');
        if (!targetRegex.test(target)) {
          violations.push(term);
        }
      }
    }
    return violations;
  };

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

  // Handle Apply Prompt Directive to Project Locale Instructions
  const handleApplyDirective = (directive: string, index: number) => {
    setLocalePrompt(prev => {
      const trimmed = prev.trim();
      if (trimmed.includes(directive)) {
        return prev;
      }
      return `${trimmed}\n\n- ${directive}`;
    });
    setAppliedIndex(index);
    setTimeout(() => setAppliedIndex(null), 2000);
  };

  // Get active translation for a segment
  const getTranslation = (segmentId: string, run: TranslationRun | undefined) => {
    if (!run) return null;
    return run.translations.find(t => t.sourceSegmentId === segmentId) || null;
  };

  // Find selected segment and translation for details drawer
  const selectedSegment = project.sourceSegments.find(s => s.id === selectedSegId);
  const selectedTranslation = selectedSegment ? getTranslation(selectedSegment.id, activeRun) : null;
  
  let alternativesList: Array<{ text: string; promptDirective?: string }> = [];
  if (selectedTranslation?.alternatives) {
    try {
      const parsed = JSON.parse(selectedTranslation.alternatives);
      if (Array.isArray(parsed)) {
        alternativesList = parsed.map((item: any) => {
          if (typeof item === 'string') {
            return { text: item };
          }
          return {
            text: item.text || '',
            promptDirective: item.promptDirective || undefined
          };
        });
      }
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

        {activeRun && activeTab === 'grid' && (
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
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
              {project.name}
              <span className="badge badge-indigo" style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>
                {project.targetLanguage}
              </span>
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginTop: '0.25rem', margin: 0 }}>
              AI Localization Academy Sandbox & Project Workspace
            </p>
          </div>

          {/* Add Segment on the fly button */}
          {activeTab === 'grid' && (
            <button 
              onClick={() => setShowAddSegmentModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', gap: '0.4rem', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
            >
              <Plus size={16} />
              <span>Add Segment</span>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem', gap: '1rem' }}>
        {[
          { id: 'grid', label: 'Translation Grid', icon: Languages },
          { id: 'glossary', label: 'Glossary Manager', icon: BookOpen },
          { id: 'lqa', label: 'LQA Audit Center', icon: Scale },
          { id: 'orchestration', label: 'Orchestration Rules', icon: Sliders }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.75rem 1rem',
                borderBottom: isActive ? '3px solid var(--color-accent-indigo)' : '3px solid transparent',
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={16} style={{ color: isActive ? 'var(--color-accent-indigo)' : 'var(--color-text-muted)' }} />
              {tab.label}
            </button>
          );
        })}
      </div>

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

      {/* Tab 1: Translation Grid */}
      {activeTab === 'grid' && (
        <div>
          {/* Active Run Statistics Summary */}
          {activeRun && (
            <div className="stats-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div className="stat-card" style={{ padding: '1rem 1.25rem' }}>
                <div className="stat-label" style={{ fontSize: '0.75rem' }}>Active Model</div>
                <div className="stat-value" style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Cpu size={16} style={{ color: 'var(--color-accent-indigo)' }} />
                  {activeRun.modelUsed}
                </div>
              </div>
              <div className="stat-card" style={{ padding: '1rem 1.25rem' }}>
                <div className="stat-label" style={{ fontSize: '0.75rem' }}>Total Run Tokens</div>
                <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                  {activeRun.totalTokens.toLocaleString()}
                </div>
              </div>
              <div className="stat-card stat-card-emerald" style={{ padding: '1rem 1.25rem' }}>
                <div className="stat-label" style={{ fontSize: '0.75rem' }}>Run Cost</div>
                <div className="stat-value" style={{ fontSize: '1.15rem', color: 'var(--color-accent-emerald)' }}>
                  ${activeRun.totalCost.toFixed(5)}
                </div>
              </div>
              <div className="stat-card" style={{ padding: '1rem 1.25rem' }}>
                <div className="stat-label" style={{ fontSize: '0.75rem' }}>LQA Audit</div>
                <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                  {activeRun.translationLQA ? (
                    <button 
                      onClick={() => setLqaReportModalOpen(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, color: activeRun.translationLQA.score >= 90 ? 'var(--color-accent-emerald)' : 'var(--color-accent-amber)', fontSize: '1.15rem' }}
                    >
                      Score: {activeRun.translationLQA.score}%
                    </button>
                  ) : (
                    <button 
                      onClick={() => setActiveTab('lqa')} 
                      style={{ background: 'none', border: 'none', color: 'var(--color-accent-indigo)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}
                    >
                      Audit Run
                    </button>
                  )}
                </div>
              </div>
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
                    Invoking Gemini model. Active glossary terms are being enforced.
                  </p>
                </div>
              )}

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '4%', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={selectedSegmentIds.length === project.sourceSegments.length && project.sourceSegments.length > 0}
                          onChange={handleSelectAllToggle}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ width: '12%' }}>Key / ID</th>
                      <th style={{ width: '28%' }}>Source Text (English)</th>
                      <th style={{ width: compareRun ? '20%' : '38%' }}>
                        {compareRun ? `Active Run (Run #${runs.length - runs.indexOf(activeRun!)})` : 'Translation'}
                      </th>
                      {compareRun && (
                        <th style={{ width: '20%' }}>
                          Visual Word Diff (vs. Run #{runs.length - runs.indexOf(compareRun)})
                        </th>
                      )}
                      <th style={{ width: '16%' }}>Quality Estimation</th>
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div>{translationActive.targetText}</div>
                                {/* Glossary Violations check */}
                                {(() => {
                                  const violations = checkViolations(segment.sourceText, translationActive.targetText);
                                  if (violations.length > 0) {
                                    return (
                                      <div 
                                        className="status-pill" 
                                        style={{ 
                                          alignSelf: 'flex-start',
                                          backgroundColor: 'rgba(244, 63, 94, 0.1)', 
                                          color: '#fda4af', 
                                          border: '1px solid rgba(244, 63, 94, 0.3)',
                                          fontSize: '0.7rem',
                                          padding: '0.1rem 0.4rem',
                                          cursor: 'help'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        title={`Glossary Violation: Expected ${violations.map(v => `"${v.source}" -> "${v.target}"`).join(', ')}`}
                                      >
                                        <AlertTriangle size={10} /> Glossary Violation
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
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

                          {/* QE score */}
                          <td style={{ fontSize: '0.875rem', verticalAlign: 'middle' }}>
                            {translationActive ? (
                              translationActive.qeScore !== undefined && translationActive.qeScore !== null ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                  <span style={{ 
                                    fontWeight: 600, 
                                    color: translationActive.qeScore >= 90 ? 'var(--color-accent-emerald)' : 
                                           translationActive.qeScore >= 75 ? 'var(--color-accent-amber)' : 'var(--color-accent-rose)'
                                  }}>
                                    {translationActive.qeScore.toFixed(1)}%
                                  </span>
                                  <div style={{ 
                                    flex: 1, 
                                    height: '4px', 
                                    backgroundColor: 'rgba(255,255,255,0.05)', 
                                    borderRadius: '2px', 
                                    minWidth: '40px',
                                    overflow: 'hidden' 
                                  }}>
                                    <div style={{ 
                                      height: '100%', 
                                      width: `${translationActive.qeScore}%`, 
                                      backgroundColor: translationActive.qeScore >= 90 ? 'var(--color-accent-emerald)' : 
                                                       translationActive.qeScore >= 75 ? 'var(--color-accent-amber)' : 'var(--color-accent-rose)'
                                    }} />
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                              )
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Side: Inline Prompt Playground Sidebar */}
            <div className="workspace-sidebar">
              <form onSubmit={(e) => handleRegenerate(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Sparkles size={16} style={{ color: 'var(--color-accent-indigo)' }} />
                  Prompt Playground
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', lineHeight: '1.4', margin: 0 }}>
                  Tweak prompts and models. Active glossaries will be automatically appended to the locale prompt in the background.
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
                      <span>Regenerate All</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Glossary Manager */}
      {activeTab === 'glossary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Active Glossary Terms */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} style={{ color: 'var(--color-accent-indigo)' }} />
              Active Glossary (cs-CZ)
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Glossary terms are injected into the prompt context during translation to enforce consistent translation of critical brand terminology.
            </p>

            {glossaryTerms.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'rgba(255,255,255,0.01)',
                border: '1px dashed var(--color-border)',
                borderRadius: '12px'
              }}>
                <BookOpen size={36} style={{ color: 'var(--color-text-muted)', marginBottom: '0.75rem' }} />
                <h4>No glossary terms defined yet</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  Use the form on the right to define your first project glossary rule.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Source Term (English)</th>
                      <th>Target Term (Czech)</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {glossaryTerms.map((term) => (
                      <tr key={term.id} style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{term.source}</td>
                        <td style={{ color: 'var(--color-accent-emerald)', fontWeight: 600 }}>{term.target}</td>
                        <td>
                          <button 
                            onClick={() => handleDeleteTerm(term.id)}
                            className="btn btn-danger"
                            style={{ padding: '0.35rem', borderRadius: '6px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Glossary Form */}
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} style={{ color: 'var(--color-accent-indigo)' }} />
              Add Terminology Pair
            </h3>
            <form onSubmit={handleAddTerm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Source Term (English)*</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. settings"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  required
                  disabled={addingTerm}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>Target Term (Czech)*</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. nastavení"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  required
                  disabled={addingTerm}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                disabled={addingTerm || !newSource.trim() || !newTarget.trim()}
              >
                {addingTerm ? (
                  <>
                    <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Adding term...</span>
                  </>
                ) : 'Add to Glossary'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 3: LQA Audit Center */}
      {activeTab === 'lqa' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* LQA Audit Scorecard details */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scale size={20} style={{ color: 'var(--color-accent-indigo)' }} />
              Language Quality Assurance (LQA) Audit
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              LQA evaluation analyzes translations using the Multidimensional Quality Metrics (MQM) framework. It uses Gemini 2.5 Pro as a judge referee model.
            </p>

            {activeRun?.translationLQA ? (
              <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid var(--color-border)',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <Award size={48} style={{ color: 'var(--color-accent-emerald)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Active Run Evaluated</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  Evaluated: {new Date(activeRun.translationLQA.createdAt).toLocaleDateString()}
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '1rem', margin: '2rem 0' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>MQM GRADE</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent-emerald)' }}>
                      {activeRun.translationLQA.score}%
                    </div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CRITICAL</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent-rose)' }}>
                      {activeRun.translationLQA.errorCountCritical}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>MAJOR</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent-amber)' }}>
                      {activeRun.translationLQA.errorCountMajor}
                    </div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>MINOR</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-accent-indigo)' }}>
                      {activeRun.translationLQA.errorCountMinor}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button onClick={handleEvaluateLqa} className="btn btn-secondary" disabled={evaluatingLqa}>
                    {evaluatingLqa ? 'Re-auditing...' : 'Run LQA Audit Again'}
                  </button>
                  <button onClick={() => setLqaReportModalOpen(true)} className="btn btn-emerald">
                    View Detailed MQM Scorecard
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: 'rgba(255,255,255,0.01)',
                border: '1px dashed var(--color-border)',
                borderRadius: '12px'
              }}>
                <Scale size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                <h4>No LQA Audit performed on this translation run</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', marginBottom: '2rem', maxWidth: '400px', margin: '0.25rem auto 2rem' }}>
                  Run an LQA audit to have a larger referee model evaluate these translations for accuracy, fluency, terminology, and formatting issues.
                </p>
                <button 
                  onClick={handleEvaluateLqa} 
                  className="btn btn-emerald"
                  style={{ padding: '0.75rem 2rem' }}
                  disabled={evaluatingLqa || !activeRunId}
                >
                  {evaluatingLqa ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Judge Evaluator is proofreading...</span>
                    </>
                  ) : 'Begin LQA Audit'}
                </button>
              </div>
            )}
          </div>

          {/* LQA Info Sidebar */}
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Scale size={16} style={{ color: 'var(--color-accent-indigo)' }} />
              Educational Context
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              In the translation industry, **MQM (Multidimensional Quality Metrics)** is a standardized framework for evaluating translations.
            </p>
            <p style={{ marginBottom: '1rem' }}>
              Errors are categorized (e.g. Accuracy, Fluency, Terminology) and assigned severities that carry different score penalties:
            </p>
            <ul style={{ marginLeft: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Critical (Penalty: -10)</strong>: Renders translation misleading or offensive.</li>
              <li><strong>Major (Penalty: -5)</strong>: Seriously impacts translation fluency or style guidelines.</li>
              <li><strong>Minor (Penalty: -1)</strong>: Typographical or grammar error that doesn't hinder communication.</li>
            </ul>
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(99,102,241,0.05)',
              border: '1px dashed rgba(99,102,241,0.3)',
              borderRadius: '8px',
              fontSize: '0.8rem'
            }}>
              <strong>Orchestration Strategy:</strong> We use the cheaper model for translations and only invoke the expensive Pro model for LQA, achieving maximum quality audit with minimum token cost!
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Orchestration Rules */}
      {activeTab === 'orchestration' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Orchestration Rules configuration */}
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={20} style={{ color: 'var(--color-accent-indigo)' }} />
              Model Orchestration & Content-Type Routing
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Orchestrating localization workflows allows routing specific types of text segments to different LLMs, ensuring optimal balance between translation quality and token financial cost.
            </p>

            {/* Selector */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              {[
                { id: 'all-flash', title: 'All Flash (Fast/Cheap)', cost: '$', desc: 'All strings route to Gemini 2.5 Flash. Low latency, lowest cost.' },
                { id: 'cost-optimized', title: 'Hybrid (Optimized)', cost: '$$', desc: 'Short UI strings route to Flash; long descriptions/sentences route to Pro.' },
                { id: 'pro-heavy', title: 'All Pro (Max Quality)', cost: '$$$', desc: 'All strings route to Gemini 2.5 Pro. Highest reasoning, maximum cost.' }
              ].map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => setRoutingRule(rule.id as any)}
                  style={{
                    backgroundColor: routingRule === rule.id ? 'rgba(99,102,241,0.1)' : 'var(--color-bg-card)',
                    border: `1px solid ${routingRule === rule.id ? 'var(--color-accent-indigo)' : 'var(--color-border)'}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '130px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>{rule.title}</span>
                      <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>{rule.cost}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: '1.3' }}>
                      {rule.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Simulating segment routing */}
            <h4 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              Simulation: Segment Routing Map
            </h4>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>Type / Length</th>
                    <th>Routed Model</th>
                    <th style={{ textAlign: 'right' }}>Est. Cost per Locale</th>
                  </tr>
                </thead>
                <tbody>
                  {project.sourceSegments.map((segment) => {
                    const isLong = segment.sourceText.length > 80;
                    let routedModel = 'Gemini 2.5 Flash';
                    let estCost = 0.000002;

                    if (routingRule === 'cost-optimized') {
                      routedModel = isLong ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash';
                      estCost = isLong ? 0.000035 : 0.000002;
                    } else if (routingRule === 'pro-heavy') {
                      routedModel = 'Gemini 2.5 Pro';
                      estCost = 0.000035;
                    }

                    return (
                      <tr key={segment.id} style={{ cursor: 'default' }}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{segment.key}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                            "{segment.sourceText}"
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isLong ? 'badge-indigo' : 'badge-secondary'}`}>
                            {isLong ? 'Long Paragraph' : 'Short UI string'}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            fontWeight: 600, 
                            color: routedModel.includes('Pro') ? 'var(--color-accent-indigo)' : 'var(--color-accent-emerald)'
                          }}>
                            {routedModel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          ${estCost.toFixed(6)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Orchestration info sidebar */}
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} style={{ color: 'var(--color-accent-indigo)' }} />
              Orchestration Heuristics
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              Localization coordinators write orchestration filters based on **content parameters**:
            </p>
            <ul style={{ marginLeft: '1.25rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>UI Strings</strong>: Short labels, placeholders. High volume, simple semantics. Routed to small models (e.g. Flash) to save tokens.</li>
              <li><strong>Marketing & Legal</strong>: Rich descriptions, disclaimers. Low volume, high consequence. Routed to large models (e.g. Pro) to leverage complex stylistic reasoning.</li>
            </ul>
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(99,102,241,0.05)',
              border: '1px dashed rgba(99,102,241,0.3)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--color-accent-indigo)'
            }}>
              Tip: Standardizing hybrid routing rules reduces overall project cost by up to 65% while retaining human-like marketing translations!
            </div>
          </div>
        </div>
      )}

      {/* Add Segment Modal */}
      {showAddSegmentModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1200,
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
                <div className="details-alternative-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {alternativesList.map((alt, idx) => (
                    <div key={idx} className="details-alternative-item" style={{ 
                      padding: '0.75rem', 
                      backgroundColor: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                        {alt.text}
                      </div>
                      {alt.promptDirective && (
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--color-text-secondary)',
                          borderTop: '1px dashed var(--color-border)',
                          paddingTop: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '1rem',
                          marginTop: '0.25rem'
                        }}>
                          <div style={{ flex: 1, lineHeight: '1.4' }}>
                            <span style={{ color: 'var(--color-accent-indigo)', fontWeight: 600 }}>Prompt Directive: </span>
                            {alt.promptDirective}
                          </div>
                          <button
                            onClick={() => handleApplyDirective(alt.promptDirective!, idx)}
                            className="btn"
                            style={{ 
                              padding: '0.25rem 0.5rem', 
                              fontSize: '0.75rem', 
                              flexShrink: 0,
                              backgroundColor: appliedIndex === idx ? 'var(--color-accent-emerald)' : 'var(--color-accent-indigo)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            {appliedIndex === idx ? 'Applied!' : 'Apply'}
                          </button>
                        </div>
                      )}
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

      {/* LQA Scorecard Report Modal */}
      <LqaReportModal 
        isOpen={lqaReportModalOpen} 
        onClose={() => setLqaReportModalOpen(false)} 
        lqa={activeRun?.translationLQA || null}
        modelUsed={activeRun?.modelUsed}
      />

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
