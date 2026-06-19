'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Languages, Cpu, HelpCircle, BadgeCheck } from 'lucide-react';
import { getPromptsAction } from '@/app/actions';

interface SandboxResult {
  translation: string;
  explanation: string;
  alternatives: Array<string | { text: string; promptDirective: string }>;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  isMock: boolean;
}

export default function SandboxLab() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('Welcome to our application! Enjoy your stay and explore all the features.');
  const [locale, setLocale] = useState('cs-CZ');
  const [model, setModel] = useState('gemini-2.5-flash');
  
  const [systemPrompt, setSystemPrompt] = useState('');
  const [localePrompts, setLocalePrompts] = useState<Record<string, string>>({});
  const [activeLocalePrompt, setActiveLocalePrompt] = useState('');
  
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State to track applied prompt directive index for animation
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const handleApplyDirective = (directive: string, index: number) => {
    setActiveLocalePrompt(prev => {
      const trimmed = prev.trim();
      if (trimmed.includes(directive)) {
        return prev;
      }
      return `${trimmed}\n\n- ${directive}`;
    });
    setAppliedIndex(index);
    setTimeout(() => setAppliedIndex(null), 2000);
  };

  // Load active prompts when open
  useEffect(() => {
    async function loadPrompts() {
      try {
        const data = await getPromptsAction();
        setSystemPrompt(data.systemPrompt);
        setLocalePrompts(data.localePrompts);
        setActiveLocalePrompt(data.localePrompts[locale] || '');
      } catch (err) {
        console.error("Failed to load prompts in sandbox:", err);
      }
    }
    loadPrompts();
  }, [locale]);

  // Update locale prompt text when target language changes
  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    setLocale(nextLocale);
    setActiveLocalePrompt(localePrompts[nextLocale] || '');
  };

  const runTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          systemPrompt,
          localePrompt: activeLocalePrompt,
          locale,
          model,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate sandbox translation');
      }

      const data: SandboxResult = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during translation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button to Trigger Drawer */}
      <button onClick={() => setIsOpen(true)} className="sandbox-trigger-btn">
        <Sparkles size={18} />
        <span>Sandbox Lab</span>
      </button>

      {/* Backdrop */}
      <div 
        className={`sheet-backdrop ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sliding Sheet Panel */}
      <div className={`sheet-content ${isOpen ? 'open' : ''}`}>
        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} style={{ color: 'var(--color-accent-indigo)' }} />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Interactive Sandbox Lab</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="close-btn">
            <X size={20} />
          </button>
        </div>

        <div className="sheet-body">
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Test prompts and settings on-the-fly. This environment is isolated and does not affect your projects.
          </p>

          <form onSubmit={runTest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Source text */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Source Text</label>
              <textarea 
                className="textarea-field" 
                value={text} 
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter source text to test..."
                required
                style={{ minHeight: '90px' }}
              />
            </div>

            {/* Model & Language Select Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Locale</label>
                <select 
                  className="select-field" 
                  value={locale} 
                  onChange={handleLocaleChange}
                >
                  <option value="cs-CZ">cs-CZ (Czech)</option>
                  <option value="es-ES">es-ES (Spanish)</option>
                  <option value="de-DE">de-DE (German)</option>
                  <option value="sk-SK">sk-SK (Slovak)</option>
                  <option value="fr-FR">fr-FR (French)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Gemini Model</label>
                <select 
                  className="select-field" 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
              </div>
            </div>

            {/* Editable System Prompt */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">System Prompt</label>
              <textarea 
                className="textarea-field" 
                value={systemPrompt} 
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Loading active system prompt..."
                style={{ minHeight: '100px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>

            {/* Editable Locale Prompt */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Locale Prompt ({locale})</label>
              <textarea 
                className="textarea-field" 
                value={activeLocalePrompt} 
                onChange={(e) => setActiveLocalePrompt(e.target.value)}
                placeholder="Loading locale prompt..."
                style={{ minHeight: '80px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '0.8rem' }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Translating in Sandbox...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Run Sandbox Test</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div style={{ 
              marginTop: '1.5rem', 
              padding: '1rem', 
              backgroundColor: 'rgba(244, 63, 94, 0.1)', 
              border: '1px solid rgba(244, 63, 94, 0.3)', 
              borderRadius: '8px',
              color: '#fda4af',
              fontSize: '0.9rem'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Languages size={18} style={{ color: 'var(--color-accent-emerald)' }} />
                    Translation Result
                  </h3>
                  {result.isMock && (
                    <span className="badge badge-secondary" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#fde047', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                      MOCK MODE (NO KEY)
                    </span>
                  )}
                </div>
                <div className="details-content-box" style={{ borderColor: 'var(--color-accent-emerald)', borderWidth: '1px', fontSize: '1.05rem', fontWeight: 500 }}>
                  {result.translation}
                </div>
              </div>

              <div>
                <h4 className="details-section-title">Reasoning / Explanation</h4>
                <div className="details-content-box" style={{ fontSize: '0.9rem' }}>
                  {result.explanation}
                </div>
              </div>

              {result.alternatives && result.alternatives.length > 0 && (
                <div>
                  <h4 className="details-section-title">Alternative Stylistic Translations</h4>
                  <div className="details-alternative-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {result.alternatives.map((altItem, idx) => {
                      const altText = typeof altItem === 'string' ? altItem : (altItem.text || '');
                      const directive = typeof altItem === 'string' ? null : (altItem.promptDirective || null);

                      return (
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
                            {altText}
                          </div>
                          {directive && (
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
                                {directive}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyDirective(directive, idx)}
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                border: '1px solid var(--color-border)', 
                borderRadius: '8px'
              }}>
                <h4 className="details-section-title" style={{ marginBottom: '0.5rem' }}>Token & Cost Metrics</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  <span>Model: <strong>{model}</strong></span>
                  <span>Tokens: <strong>{result.inputTokens + result.outputTokens}</strong> ({result.inputTokens} In / {result.outputTokens} Out)</span>
                  <span>Cost: <strong style={{ color: 'var(--color-accent-emerald)' }}>${result.cost.toFixed(6)}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Skeleton state during loading */}
          {loading && (
            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
              <div>
                <div className="skeleton" style={{ height: '20px', width: '120px', marginBottom: '0.75rem' }} />
                <div className="skeleton" style={{ height: '60px', width: '100%' }} />
              </div>
              <div>
                <div className="skeleton" style={{ height: '15px', width: '150px', marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ height: '80px', width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
