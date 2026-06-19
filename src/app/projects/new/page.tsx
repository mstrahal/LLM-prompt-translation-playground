'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { createProjectAction } from '../../actions';
import { 
  ArrowLeft, 
  Upload, 
  Loader2, 
  AlertCircle, 
  Check, 
  Table,
  Plus,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';

interface ParsedRecord {
  key: string;
  sourceText: string;
  context?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('cs-CZ');
  const [geminiModel, setGeminiModel] = useState('gemini-3.5-flash');
  
  // Manual Input form states
  const [inputText, setInputText] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [inputContext, setInputContext] = useState('');

  // Segment list state
  const [segmentsList, setSegmentsList] = useState<ParsedRecord[]>([]);

  // CSV toggle state
  const [showCSVHelper, setShowCSVHelper] = useState(false);
  const [fileName, setFileName] = useState('');

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add manual segment to the list
  const handleAddSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError("Source text (English) is required to add a segment.");
      return;
    }

    const newRecord: ParsedRecord = {
      key: inputKey.trim() || `seg_${Math.random().toString(36).substring(2, 9)}`,
      sourceText: inputText.trim(),
      context: inputContext.trim() || undefined
    };

    setSegmentsList(prev => [...prev, newRecord]);
    
    // Clear inputs
    setInputText('');
    setInputKey('');
    setInputContext('');
    setError(null);
  };

  // Remove segment from list
  const handleRemoveSegment = (indexToRemove: number) => {
    setSegmentsList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Parse CSV as an optional helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
  };

  const processCSVFile = (file: File) => {
    setFileName(file.name);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];

        if (headers.length === 0) {
          setError("Empty or invalid CSV headers.");
          return;
        }

        // Auto-detect columns
        const keyHeader = headers.find(h => /key|id|identifier|name/i.test(h)) || headers[0];
        const textHeader = headers.find(h => /text|source|value|english|content|orig/i.test(h)) || headers[1] || headers[0];
        const contextHeader = headers.find(h => /context|desc|comment|note|info/i.test(h));

        const records: ParsedRecord[] = results.data.map((row: any) => {
          return {
            key: String(row[keyHeader] || '').trim(),
            sourceText: String(row[textHeader] || '').trim(),
            context: contextHeader ? String(row[contextHeader] || '').trim() : undefined
          };
        }).filter(rec => rec.sourceText !== ''); // Filter out rows without text

        if (records.length === 0) {
          setError("No valid source text rows found in CSV.");
          return;
        }

        // Auto-generate keys if they were empty in CSV
        const finalizedRecords = records.map((rec, i) => ({
          ...rec,
          key: rec.key || `seg_csv_${i + 1}_${Math.random().toString(36).substring(2, 6)}`
        }));

        setSegmentsList(prev => [...prev, ...finalizedRecords]);
        setFileName('');
        setShowCSVHelper(false);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        setError("Failed to parse CSV file: " + err.message);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (segmentsList.length === 0) {
      setError("Please add at least one English string segment to translate.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter a project name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await createProjectAction(
        name,
        targetLanguage,
        geminiModel,
        segmentsList
      );

      // Navigate to project workspace
      router.push(`/projects/${res.projectId}`);
    } catch (err: any) {
      console.error("Error creating project:", err);
      setError(err.message || "Failed to create project. Verify Gemini API key and prompt settings.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Back Button */}
      <div style={{ marginBottom: '1.5rem' }}>
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
      </div>

      {/* Page Title */}
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.0rem', marginBottom: '0.25rem' }}>New Translation Project</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
            Set up a project workspace by entering English source strings to translate.
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
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: Forms Left, Segment list Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '420px 1fr',
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        
        {/* Left Column - Setup Form & Dynamic segment adder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 1. Project Basic Details */}
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h2 style={{ fontSize: '1.2rem', margin: 0, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              Project Settings
            </h2>

            {/* Project Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Project Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Signup Flow"
                required
                disabled={submitting}
              />
            </div>

            {/* Target Language Locale */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Target Locale</label>
              <select 
                className="select-field"
                value={targetLanguage} 
                onChange={(e) => setTargetLanguage(e.target.value)}
                disabled={submitting}
              >
                <option value="cs-CZ">cs-CZ (Czech)</option>
                <option value="es-ES">es-ES (Spanish)</option>
                <option value="de-DE">de-DE (German)</option>
                <option value="sk-SK">sk-SK (Slovak)</option>
                <option value="fr-FR">fr-FR (French)</option>
              </select>
            </div>

            {/* Gemini Model */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Gemini Model</label>
              <select 
                className="select-field"
                value={geminiModel} 
                onChange={(e) => setGeminiModel(e.target.value)}
                disabled={submitting}
              >
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Fast, New)</option>
                <option value="gemini-3.1-pro">Gemini 3.1 Pro (High Reasoning)</option>
                <option value="gemini-3.0-supernova">Gemini 3.0 Supernova (Experimental)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>
          </div>

          {/* 2. Manual Segment Entry Card */}
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
          }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              Add Segment
            </h2>

            <form onSubmit={handleAddSegment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Source Text (English)*</label>
                <textarea 
                  className="textarea-field" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter text to translate..."
                  style={{ minHeight: '80px', fontSize: '0.875rem' }}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Key ID (Optional)</label>
                <input 
                  type="text"
                  className="input-field"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="e.g. login_welcome_message"
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Context Description (Optional)</label>
                <input 
                  type="text"
                  className="input-field"
                  value={inputContext}
                  onChange={(e) => setInputContext(e.target.value)}
                  placeholder="e.g. Main greeting visible at the top of landing page"
                  disabled={submitting}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={submitting}
                style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--color-bg-body)', border: '1px solid var(--color-border)' }}
              >
                <Plus size={16} />
                <span>Add Segment to List</span>
              </button>
            </form>
          </div>

          {/* 3. CSV Helper Trigger */}
          <div style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <button
              onClick={() => setShowCSVHelper(!showCSVHelper)}
              type="button"
              className="btn"
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <FileSpreadsheet size={16} />
              <span>{showCSVHelper ? 'Hide CSV Import' : 'Import from CSV instead'}</span>
            </button>

            {showCSVHelper && (
              <div 
                onClick={() => !submitting && fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  backgroundColor: 'rgba(15, 23, 42, 0.4)',
                  transition: 'border-color var(--transition-fast)',
                  marginTop: '0.5rem'
                }}
              >
                <Upload size={20} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {fileName ? fileName : 'Click to select CSV file'}
                </p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept=".csv"
                  style={{ display: 'none' }}
                  disabled={submitting}
                />
              </div>
            )}
          </div>

          {/* Main Action Submit Button */}
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            disabled={submitting || segmentsList.length === 0}
            style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', fontSize: '1rem' }}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Translating Workspace ({segmentsList.length} items)...</span>
              </>
            ) : (
              <>
                <Check size={18} />
                <span>Create Project & Translate</span>
              </>
            )}
          </button>

        </div>

        {/* Right Column - Segments Added Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Table size={20} style={{ color: 'var(--color-accent-indigo)' }} />
              Segments List ({segmentsList.length} items)
            </h2>
            {segmentsList.length > 0 && (
              <button 
                type="button" 
                className="btn" 
                onClick={() => setSegmentsList([])}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
              >
                Clear All
              </button>
            )}
          </div>

          <div className="table-wrapper" style={{ maxHeight: '650px', overflowY: 'auto' }}>
            {segmentsList.length === 0 ? (
              <div style={{
                padding: '6rem 2rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)'
              }}>
                <Plus size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.95rem', margin: '0 0 0.25rem' }}>Your segments list is empty.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Use the left form to add your English texts manually or upload a CSV file.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Key / ID</th>
                    <th style={{ width: '45%' }}>Source Text (English)</th>
                    <th style={{ width: '23%' }}>Context Info</th>
                    <th style={{ width: '7%', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {segmentsList.map((row, idx) => (
                    <tr key={idx} style={{ cursor: 'default' }}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
                        {row.key}
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        {row.sourceText}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {row.context || <em style={{ opacity: 0.3 }}>None</em>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveSegment(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-accent-rose)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Remove Segment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

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
