'use client';

import React from 'react';
import { X, Scale, AlertTriangle, ShieldCheck, AlertCircle, Info } from 'lucide-react';

interface MQMError {
  segmentKey: string;
  source: string;
  translation: string;
  category: string;
  severity: string;
  explanation: string;
}

interface LqaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lqa: {
    id: string;
    score: number;
    errorCountCritical: number;
    errorCountMajor: number;
    errorCountMinor: number;
    reportJson: string;
    createdAt: string;
  } | null;
  modelUsed?: string;
}

export default function LqaReportModal({ isOpen, onClose, lqa, modelUsed }: LqaReportModalProps) {
  if (!isOpen || !lqa) return null;

  let errors: MQMError[] = [];
  try {
    errors = JSON.parse(lqa.reportJson);
  } catch (err) {
    console.error("Failed to parse LQA report JSON", err);
  }

  // Get status color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'var(--color-accent-emerald)';
    if (score >= 75) return 'var(--color-accent-amber)';
    return 'var(--color-accent-rose)';
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'btn-danger';
      case 'major':
        return 'badge-indigo'; // using amber colors manually
      default:
        return 'badge-secondary';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="sheet-backdrop open"
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      {/* Modal / Sheet Container */}
      <div 
        className="sheet-content open"
        style={{ 
          zIndex: 1101, 
          maxWidth: '750px',
          width: '100%',
          right: '0',
          position: 'fixed'
        }}
      >
        {/* Header */}
        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={20} style={{ color: 'var(--color-accent-indigo)' }} />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>LQA Audit Scorecard</h2>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="sheet-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Top Scorecard & Stats Card */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
            gap: '1rem',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '1.5rem',
            alignItems: 'center'
          }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                MQM Grade
              </span>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 800, 
                color: getScoreColor(lqa.score),
                marginTop: '0.25rem' 
              }}>
                {lqa.score}/100
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', justifyItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                {lqa.score >= 90 ? (
                  <ShieldCheck size={14} style={{ color: 'var(--color-accent-emerald)' }} />
                ) : (
                  <AlertTriangle size={14} style={{ color: 'var(--color-accent-amber)' }} />
                )}
                {lqa.score >= 90 ? 'LQA Passed' : lqa.score >= 75 ? 'Needs Review' : 'LQA Failed'}
              </span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Critical</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-accent-rose)', marginTop: '0.25rem' }}>
                {lqa.errorCountCritical}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Major</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-accent-amber)', marginTop: '0.25rem' }}>
                {lqa.errorCountMajor}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Minor</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-accent-indigo)', marginTop: '0.25rem' }}>
                {lqa.errorCountMinor}
              </div>
            </div>
          </div>

          {/* Model info banner */}
          <div style={{ 
            fontSize: '0.85rem', 
            color: 'var(--color-text-secondary)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Evaluator: <strong>Gemini 2.5 Pro (Referee)</strong></span>
            {modelUsed && <span>Translation Model: <strong>{modelUsed}</strong></span>}
            <span>Audited on: <strong>{new Date(lqa.createdAt).toLocaleDateString()}</strong></span>
          </div>

          {/* Detailed Issues List */}
          <div>
            <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              Detailed LQA Findings ({errors.length})
            </h3>

            {errors.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px dashed var(--color-accent-emerald)',
                borderRadius: '8px',
                color: 'var(--color-accent-emerald)'
              }}>
                <ShieldCheck size={32} style={{ margin: '0 auto 0.75rem' }} />
                <strong>Flawless translation run!</strong>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                  The judge model did not find any accuracy, fluency, style, or terminology errors.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {errors.map((error, idx) => (
                  <div 
                    key={idx}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '1rem',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Header line of error */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Segment ID: {error.segmentKey}
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span className="badge badge-secondary" style={{ textTransform: 'none' }}>
                          {error.category}
                        </span>
                        <span 
                          className={`badge ${getSeverityBadgeClass(error.severity)}`}
                          style={{
                            color: 'white',
                            backgroundColor: error.severity.toLowerCase() === 'critical' ? 'var(--color-accent-rose)' :
                                             error.severity.toLowerCase() === 'major' ? 'var(--color-accent-amber)' : 'var(--color-border)'
                          }}
                        >
                          {error.severity}
                        </span>
                      </div>
                    </div>

                    {/* Source and Translation diff views */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                      <div style={{ padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Source</div>
                        <div style={{ marginTop: '0.15rem', color: 'var(--color-text-secondary)' }}>"{error.source}"</div>
                      </div>
                      <div style={{ padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Translation</div>
                        <div style={{ marginTop: '0.15rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>"{error.translation}"</div>
                      </div>
                    </div>

                    {/* Explanations */}
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: 'var(--color-text-secondary)',
                      borderTop: '1px dashed var(--color-border)',
                      paddingTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem'
                    }}>
                      <Info size={14} style={{ color: 'var(--color-accent-indigo)', flexShrink: 0, marginTop: '0.1rem' }} />
                      <span>{error.explanation}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sheet-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close Scorecard
          </button>
        </div>
      </div>
    </>
  );
}
