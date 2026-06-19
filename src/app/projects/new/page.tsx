'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { createProjectAction } from '../../actions';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Upload, 
  Loader2, 
  AlertCircle, 
  Check, 
  Table 
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
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  
  // CSV processing states
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ParsedRecord[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState({
    keyCol: '',
    textCol: '',
    contextCol: ''
  });

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Triggered when file is uploaded / dropped
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
        setDetectedColumns(headers);

        if (headers.length < 2) {
          setError("CSV must contain at least 2 columns (e.g., Key, Source Text).");
          setParsedData([]);
          return;
        }

        // Auto-detect columns based on name matches
        const keyHeader = headers.find(h => 
          /key|id|identifier|name/i.test(h)
        ) || headers[0];

        const textHeader = headers.find(h => 
          /text|source|value|english|content|orig/i.test(h)
        ) || headers[1];

        const contextHeader = headers.find(h => 
          /context|desc|comment|note|info/i.test(h)
        ) || headers[2] || '';

        const detectedMap = {
          keyCol: keyHeader,
          textCol: textHeader,
          contextCol: contextHeader
        };
        setMappings(detectedMap);

        // Map records
        mapCSVData(results.data, detectedMap);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err);
        setError("Failed to parse CSV file: " + err.message);
      }
    });
  };

  const mapCSVData = (rawData: any[], currentMappings: typeof mappings) => {
    const records: ParsedRecord[] = rawData.map((row) => {
      return {
        key: String(row[currentMappings.keyCol] || '').trim(),
        sourceText: String(row[currentMappings.textCol] || '').trim(),
        context: currentMappings.contextCol ? String(row[currentMappings.contextCol] || '').trim() : ''
      };
    }).filter(rec => rec.key !== '' || rec.sourceText !== ''); // Filter empty rows

    setParsedData(records);
    if (records.length === 0) {
      setError("No valid translation records found in the CSV.");
    }
  };

  const handleMappingChange = (type: 'keyCol' | 'textCol' | 'contextCol', value: string) => {
    const newMappings = {
      ...mappings,
      [type]: value
    };
    setMappings(newMappings);
    
    // Reparse mapping list with original parsed CSV data cache if available
    if (fileInputRef.current?.files?.[0]) {
      // Re-run the parse, this time using cached file object
      Papa.parse(fileInputRef.current.files[0], {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          mapCSVData(results.data, newMappings);
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedData.length === 0) {
      setError("Please upload and parse a valid CSV file first.");
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
        parsedData
      );

      // Successfully created, navigate to project workspace
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
            Set up a project workspace by uploading your translation template.
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

      {/* Main Grid: Form Left, Preview Right */}
      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>
        
        {/* Left Column - Setup Form */}
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Workspace Settings</h2>

          {/* Project Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Project Name</label>
            <input 
              type="text" 
              className="input-field" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mobile App Localized"
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
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast, Cheap)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (High Reasoning)</option>
            </select>
          </div>

          {/* CSV File Upload Box */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Upload CSV File</label>
            
            <div 
              onClick={() => !submitting && fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: submitting ? 'not-allowed' : 'pointer',
                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                transition: 'border-color var(--transition-fast)',
              }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (submitting) return;
                const file = e.dataTransfer.files?.[0];
                if (file) processCSVFile(file);
              }}
            >
              <Upload size={24} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {fileName ? fileName : 'Click or drag CSV file to upload'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Expects headers: Key, SourceText, Context
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
          </div>

          {/* Column Mapper (Shows only if file uploaded and columns parsed) */}
          {detectedColumns.length > 0 && (
            <div style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Header Column Mapping</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Key ID</span>
                  <select 
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', width: '180px' }}
                    className="select-field"
                    value={mappings.keyCol}
                    onChange={(e) => handleMappingChange('keyCol', e.target.value)}
                    disabled={submitting}
                  >
                    {detectedColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Source Text</span>
                  <select 
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', width: '180px' }}
                    className="select-field"
                    value={mappings.textCol}
                    onChange={(e) => handleMappingChange('textCol', e.target.value)}
                    disabled={submitting}
                  >
                    {detectedColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Context (Opt)</span>
                  <select 
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', width: '180px' }}
                    className="select-field"
                    value={mappings.contextCol}
                    onChange={(e) => handleMappingChange('contextCol', e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">-- Ignore --</option>
                    {detectedColumns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger Button */}
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting || parsedData.length === 0}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Translating Batch...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Create & Run Translations</span>
              </>
            )}
          </button>

          {submitting && (
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--color-accent-amber)',
              textAlign: 'center',
              lineHeight: '1.4',
              margin: '0.25rem 0 0'
            }}>
              ⚙️ Starting first run with Gemini. This can take a moment depending on the size of your CSV.
            </p>
          )}
        </div>

        {/* Right Column - Preview Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Table size={20} style={{ color: 'var(--color-accent-indigo)' }} />
              Preview Parsed CSV ({parsedData.length} records)
            </h2>
          </div>

          <div className="table-wrapper" style={{ maxHeight: '550px', overflowY: 'auto' }}>
            {parsedData.length === 0 ? (
              <div style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)'
              }}>
                <FileSpreadsheet size={36} style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.9rem' }}>Upload a CSV file to preview parsed records.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Key / ID</th>
                    <th style={{ width: '45%' }}>Source Text (English)</th>
                    <th style={{ width: '30%' }}>Context Info</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 20).map((row, idx) => (
                    <tr key={idx} style={{ cursor: 'default' }}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>
                        {row.key}
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        {row.sourceText}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {row.context || <em style={{ opacity: 0.5 }}>None</em>}
                      </td>
                    </tr>
                  ))}
                  {parsedData.length > 20 && (
                    <tr>
                      <td colSpan={3} style={{ 
                        textAlign: 'center', 
                        color: 'var(--color-accent-indigo)', 
                        fontSize: '0.8rem', 
                        fontWeight: 600,
                        backgroundColor: 'rgba(255,255,255,0.01)'
                      }}>
                        + {parsedData.length - 20} more records are loaded but truncated in preview...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
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
