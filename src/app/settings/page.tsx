'use client';

import React, { useState, useEffect } from 'react';
import { getPromptsAction, savePromptsAction } from '../actions';
import { Save, Loader2, Sparkles, Languages, Check, Sliders } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for prompt texts
  const [systemPrompt, setSystemPrompt] = useState('');
  const [localePrompts, setLocalePrompts] = useState<Record<string, string>>({
    'cs-CZ': '',
    'es-ES': '',
    'de-DE': '',
    'sk-SK': '',
    'fr-FR': '',
  });

  // Load prompts on mount
  useEffect(() => {
    async function loadPrompts() {
      try {
        setLoading(true);
        const data = await getPromptsAction();
        setSystemPrompt(data.systemPrompt);
        setLocalePrompts(data.localePrompts);
      } catch (err: any) {
        console.error("Failed to load prompts:", err);
        setError("Could not load prompts. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadPrompts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      await savePromptsAction(systemPrompt, localePrompts);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save prompts settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLocalePromptChange = (locale: string, value: string) => {
    setLocalePrompts(prev => ({
      ...prev,
      [locale]: value
    }));
  };

  if (loading) {
    return (
      <div>
        <div className="section-header" style={{ marginBottom: '2rem' }}>
          <div>
            <h1 className="skeleton" style={{ width: '200px', height: '2.5rem', marginBottom: '0.5rem' }} />
            <p className="skeleton" style={{ width: '400px', height: '1.25rem' }} />
          </div>
        </div>
        
        <div className="settings-container">
          <div className="sidebar-menu">
            <div className="skeleton" style={{ height: '40px', borderRadius: '8px' }} />
            <div className="skeleton" style={{ height: '40px', borderRadius: '8px' }} />
          </div>
          <div className="settings-card">
            <div className="skeleton" style={{ height: '20px', width: '150px', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: '120px', marginBottom: '2rem' }} />
            <div className="skeleton" style={{ height: '20px', width: '150px', marginBottom: '1rem' }} />
            <div className="skeleton" style={{ height: '120px' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Prompts Settings</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            Configure default system-level and locale-level prompts for translation runs.
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          color: '#fda4af',
          marginBottom: '1.5rem',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="settings-container">
          {/* Sidebar Info Panel */}
          <div className="sidebar-menu">
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={18} style={{ color: 'var(--color-accent-indigo)' }} />
                Configuration
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                These prompts define how Gemini behaves.
              </p>
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  <strong>System Prompt</strong> establishes constraints, response structure (JSON), and translator role.
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  <strong>Locale Prompts</strong> append language-specific rules (grammar, tone, formal/informal tykání).
                </p>
              </div>

              {/* Action Button inside Sidebar */}
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Saving...</span>
                  </>
                ) : success ? (
                  <>
                    <Check size={16} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Prompts</span>
                  </>
                )}
              </button>

              {success && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-accent-emerald)',
                  textAlign: 'center',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                }}>
                  Prompts updated successfully!
                </div>
              )}
            </div>
          </div>

          {/* Main Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* System Prompt Box */}
            <div className="settings-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--color-accent-indigo)' }} />
                Active System Prompt
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Instructs the model on output formatting, tone, and JSON structure requirements.
              </p>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <textarea 
                  className="textarea-field" 
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter active system prompt instructions..."
                  style={{ minHeight: '160px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}
                  required
                />
              </div>
            </div>

            {/* Locale Prompts Box */}
            <div className="settings-card">
              <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Languages size={18} style={{ color: 'var(--color-accent-emerald)' }} />
                Target Language Prompts
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Add locale-specific constraints, grammatical guidelines, and glossaries.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* cs-CZ */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Czech (cs-CZ)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-indigo)' }}>Active</span>
                  </label>
                  <textarea 
                    className="textarea-field" 
                    value={localePrompts['cs-CZ']} 
                    onChange={(e) => handleLocalePromptChange('cs-CZ', e.target.value)}
                    style={{ minHeight: '90px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                {/* es-ES */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Spanish (es-ES)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-indigo)' }}>Active</span>
                  </label>
                  <textarea 
                    className="textarea-field" 
                    value={localePrompts['es-ES']} 
                    onChange={(e) => handleLocalePromptChange('es-ES', e.target.value)}
                    style={{ minHeight: '90px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                {/* de-DE */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>German (de-DE)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-indigo)' }}>Active</span>
                  </label>
                  <textarea 
                    className="textarea-field" 
                    value={localePrompts['de-DE']} 
                    onChange={(e) => handleLocalePromptChange('de-DE', e.target.value)}
                    style={{ minHeight: '90px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                {/* sk-SK */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Slovak (sk-SK)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-indigo)' }}>Active</span>
                  </label>
                  <textarea 
                    className="textarea-field" 
                    value={localePrompts['sk-SK']} 
                    onChange={(e) => handleLocalePromptChange('sk-SK', e.target.value)}
                    style={{ minHeight: '90px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                {/* fr-FR */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    <span>French (fr-FR)</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-indigo)' }}>Active</span>
                  </label>
                  <textarea 
                    className="textarea-field" 
                    value={localePrompts['fr-FR']} 
                    onChange={(e) => handleLocalePromptChange('fr-FR', e.target.value)}
                    style={{ minHeight: '90px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    required
                  />
                </div>

              </div>
            </div>

          </div>
        </div>
      </form>
      
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
