'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Coins, 
  Languages, 
  Scale, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Loader2, 
  HelpCircle, 
  Trophy, 
  Cpu, 
  Plus, 
  Trash2,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

// Preset Czech tone strings
const CZ_TONE_SOURCE = "Welcome to your account page. Please check your settings before proceeding. Let us know if you need any assistance.";

const LESSONS = [
  { id: 1, title: 'Tone & Address Control', icon: Languages, summary: 'Learn how to enforce informal (tykání) vs. formal (vykání) addressing.' },
  { id: 2, title: 'Token Economics & Costs', icon: Coins, summary: 'Understand prompt overhead, API billing, and model selection cost differences.' },
  { id: 3, title: 'Glossary & Terminology', icon: BookOpen, summary: 'Enforce brand terminology and validate model compliance automatically.' },
  { id: 4, title: 'LLM-as-a-Judge LQA', icon: Scale, summary: 'Perform automated MQM-based evaluation using advanced referee models.' },
];

export default function AcademyPage() {
  const [activeLesson, setActiveLesson] = useState(1);
  const [quizScore, setQuizScore] = useState<Record<number, boolean | null>>({ 1: null, 2: null, 3: null, 4: null });
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  
  // Lesson 1 State
  const [l1Text, setL1Text] = useState(CZ_TONE_SOURCE);
  const [l1SystemPrompt, setL1SystemPrompt] = useState(`# System Instruction: General Translator\nYou are an expert localization engine translating content into Czech.`);
  const [l1LocalePrompt, setL1LocalePrompt] = useState(`# Locale Guidelines: Czech (cs-CZ)\n\n- Use formal address (vykání)\n- Tone should be professional.`);
  const [l1Loading, setL1Loading] = useState(false);
  const [l1Result, setL1Result] = useState<any>(null);
  const [l1ToneDetection, setL1ToneDetection] = useState<string | null>(null);

  // Lesson 2 State (Cost Calculator)
  const [calcWords, setCalcWords] = useState(2500);
  const [calcLocales, setCalcLocales] = useState(3);
  const [calcSystemPromptTokens, setCalcSystemPromptTokens] = useState(800);
  const [calcLocalePromptTokens, setCalcLocalePromptTokens] = useState(200);

  // Lesson 3 State (Glossary Manager)
  const [l3Text, setL3Text] = useState("Please click cancel to abort the current checkout on your dashboard.");
  const [l3Glossary, setL3Glossary] = useState([
    { source: "cancel", target: "zrušit" },
    { source: "dashboard", target: "nástěnka" }
  ]);
  const [newSource, setNewSource] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [l3Loading, setL3Loading] = useState(false);
  const [l3Result, setL3Result] = useState<any>(null);
  const [l3Violations, setL3Violations] = useState<any[]>([]);

  // Lesson 4 State (LQA)
  const [l4Loading, setL4Loading] = useState(false);
  const [l4Result, setL4Result] = useState<any>(null);
  const [l4Step, setL4Step] = useState(0); // 0 = idle, 1 = running, 2 = results

  const handleQuizSubmit = (lessonId: number, selectedOptionIdx: number, correctOptionIdx: number) => {
    setSelectedAnswers(prev => ({ ...prev, [lessonId]: selectedOptionIdx }));
    setQuizScore(prev => ({ ...prev, [lessonId]: selectedOptionIdx === correctOptionIdx }));
  };

  // Run Lesson 1 translation via Sandbox endpoint
  const runL1Translation = async () => {
    setL1Loading(true);
    setL1Result(null);
    setL1ToneDetection(null);
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: l1Text,
          systemPrompt: l1SystemPrompt,
          localePrompt: l1LocalePrompt,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setL1Result(data);

      // Simple regex detector for Tykání/Vykání
      const textLower = (data.translation || '').toLowerCase();
      // Czech formal features
      const isFormal = textLower.includes('klikněte') || textLower.includes('kliknete') || 
                       textLower.includes('vás') || textLower.includes('vas') || 
                       textLower.includes('váš') || textLower.includes('vas') || 
                       textLower.includes('využijte') || textLower.includes('dejte');
      // Czech informal features
      const isInformal = textLower.includes('klikni') || textLower.includes('tě') || 
                         textLower.includes('tebe') || textLower.includes('tvůj') || 
                         textLower.includes('tvuj') || textLower.includes('tvém');

      if (isFormal && !isInformal) {
        setL1ToneDetection('Formal (Vykání) 👔');
      } else if (isInformal && !isFormal) {
        setL1ToneDetection('Informal (Tykání) 🤝');
      } else if (isFormal && isInformal) {
        setL1ToneDetection('Mixed Tone (Warning!) ⚠️');
      } else {
        setL1ToneDetection('Neutral / Undetermined 🔍');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setL1Loading(false);
    }
  };

  // Add Glossary Term
  const addGlossaryTerm = () => {
    if (newSource && newTarget) {
      setL3Glossary([...l3Glossary, { source: newSource.toLowerCase().trim(), target: newTarget.toLowerCase().trim() }]);
      setNewSource("");
      setNewTarget("");
    }
  };

  // Remove Glossary Term
  const removeGlossaryTerm = (index: number) => {
    setL3Glossary(l3Glossary.filter((_, idx) => idx !== index));
  };

  // Run Glossary translation
  const runL3Translation = async () => {
    setL3Loading(true);
    setL3Result(null);
    setL3Violations([]);
    try {
      // Append glossary rules to the locale prompt
      let glossaryPrompt = `# Glossary Constraints:\n`;
      l3Glossary.forEach(g => {
        glossaryPrompt += `- Translate "${g.source}" as "${g.target}"\n`;
      });

      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: l3Text,
          systemPrompt: `# System Instruction\nYou are a professional translator. Follow glossary rules strictly.`,
          localePrompt: glossaryPrompt,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setL3Result(data);

      // Perform local violation check
      const violations: any[] = [];
      const translationText = (data.translation || '').toLowerCase();
      const sourceText = l3Text.toLowerCase();

      l3Glossary.forEach(g => {
        // If source text contains the glossary term, does target translation contain the target term?
        const hasSource = sourceText.includes(g.source);
        if (hasSource) {
          const hasTarget = translationText.includes(g.target);
          if (!hasTarget) {
            violations.push(g);
          }
        }
      });
      setL3Violations(violations);
    } catch (err) {
      console.error(err);
    } finally {
      setL3Loading(false);
    }
  };

  // Run Lesson 4 LQA simulation
  const runL4Lqa = async () => {
    setL4Loading(true);
    setL4Step(1);
    setL4Result(null);

    // Mock an MQM LQA process by a judge model
    setTimeout(() => {
      setL4Result({
        score: 84,
        errorCountCritical: 0,
        errorCountMajor: 2,
        errorCountMinor: 2,
        errors: [
          {
            key: 'seg_login',
            source: 'Sign in to access your dashboard settings.',
            translation: 'Zaregistrujte se pro přístup k nastavení panelu.',
            category: 'Accuracy (Mistranslation)',
            severity: 'Major',
            explanation: 'The source states "Sign in" (Přihlaste se), but the translation says "Zaregistrujte se" (Sign up), changing the meaning entirely.'
          },
          {
            key: 'seg_reset',
            source: 'Reset your password now.',
            translation: 'Resetuj si své heslo hned.',
            category: 'Style (Address Form)',
            severity: 'Major',
            explanation: 'Violated Vykání rule. Used informal address "Resetuj si své" instead of formal "Resetujte si své".'
          },
          {
            key: 'seg_dashboard',
            source: 'Dashboard loaded.',
            translation: 'Palubní deska načtena.',
            category: 'Terminology (Hallucination)',
            severity: 'Minor',
            explanation: '"Palubní deska" is a literal translation of dashboard (like in a car). In software, "Nástěnka" or "Přehled" is the standard term.'
          },
          {
            key: 'seg_cancel',
            source: 'Cancel subscription?',
            translation: 'Zrušit předplatné ?',
            category: 'Fluency (Punctuation)',
            severity: 'Minor',
            explanation: 'Incorrect space added before the question mark in Czech.'
          }
        ]
      });
      setL4Loading(false);
      setL4Step(2);
    }, 2500);
  };

  // Cost calculator variables
  const sourceTokens = Math.round(calcWords * 1.35);
  const totalInputTokensPerLocale = sourceTokens + calcSystemPromptTokens + calcLocalePromptTokens;
  const totalOutputTokensPerLocale = Math.round(sourceTokens * 1.25); // Target text usually longer + json structure
  const totalTokensUsed = (totalInputTokensPerLocale + totalOutputTokensPerLocale) * calcLocales;

  // Flash pricing: input $0.075 / 1M, output $0.30 / 1M
  const costFlash = ((totalInputTokensPerLocale * calcLocales) / 1_000_000) * 0.075 + 
                    ((totalOutputTokensPerLocale * calcLocales) / 1_000_000) * 0.30;

  // Pro pricing: input $1.25 / 1M, output $5.00 / 1M
  const costPro = ((totalInputTokensPerLocale * calcLocales) / 1_000_000) * 1.25 + 
                  ((totalOutputTokensPerLocale * calcLocales) / 1_000_000) * 5.00;

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Academy Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '2.5rem',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          filter: 'blur(30px)'
        }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Sparkles size={24} style={{ color: 'var(--color-accent-indigo)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent-indigo)' }}>
            AI Localization Academy
          </span>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', fontWeight: 800 }}>Master LLM Translation Workflows</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', maxWidth: '750px', lineHeight: '1.6' }}>
          Learn the principles of AI-driven localization. Complete 4 hands-on labs detailing tone control, token financials, glossary injection, and automated LQA referee models.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sidebar Lesson Selector */}
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '1rem',
          position: 'sticky',
          top: '90px'
        }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.5rem 0.75rem', marginBottom: '0.5rem' }}>
            Course Directory
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {LESSONS.map((lesson) => {
              const Icon = lesson.icon;
              const isActive = activeLesson === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLesson(lesson.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: '1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    transition: 'all var(--transition-fast)',
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderLeft: isActive ? '4px solid var(--color-accent-indigo)' : '4px solid transparent'
                  }}
                >
                  <Icon size={20} style={{ color: isActive ? 'var(--color-accent-indigo)' : 'var(--color-text-muted)', marginTop: '0.1rem', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>
                      Lesson {lesson.id}: {lesson.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                      {lesson.summary}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '1.5rem', paddingTop: '1.5rem', padding: '0.5rem' }}>
            <Link href="/" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Lesson View Panel */}
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '2.5rem'
        }}>
          {activeLesson === 1 && (
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Languages style={{ color: 'var(--color-accent-indigo)' }} />
                Lesson 1: Tone & Address Control (Tykání vs. Vykání)
              </h2>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.975rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <p>
                  Many languages distinguish between formal and informal modes of address. In Czech, this is known as **Tykání** (informal, address as *ty*) and **Vykání** (formal, address as *Vy*). 
                </p>
                <p>
                  By default, standard translation prompts can lead to mixed tones, especially when translating short strings out of context. To achieve consistency, localization PMs must instruct the LLM on:
                </p>
                <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>The **Target Persona** (e.g. Generation Z vs. corporate professionals).</li>
                  <li>The **Explicit Form of Address** (e.g. "Use informal singular Czech tykání").</li>
                  <li>**Negative Constraints** (e.g. "Do not address the user formally").</li>
                </ol>
              </div>

              {/* Lab 1 Container */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-accent-indigo)' }} />
                  Tone & Prompt Sandbox Lab
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                  Configure the Czech locale prompt below to translate the English text formally (*vykání*). Notice the automatic tone check after generating.
                </p>

                <div className="form-group">
                  <label className="form-label">English Source String</label>
                  <input type="text" className="input-field" value={l1Text} onChange={(e) => setL1Text(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">System Instruction</label>
                    <textarea 
                      className="textarea-field" 
                      value={l1SystemPrompt} 
                      onChange={(e) => setL1SystemPrompt(e.target.value)}
                      style={{ minHeight: '80px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Czech Locale Prompt (cs-CZ)</label>
                    <textarea 
                      className="textarea-field" 
                      value={l1LocalePrompt} 
                      onChange={(e) => setL1LocalePrompt(e.target.value)}
                      style={{ minHeight: '80px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>

                <button onClick={runL1Translation} className="btn btn-primary" style={{ width: '100%' }} disabled={l1Loading}>
                  {l1Loading ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Running Prompt Engineering Test...</span>
                    </>
                  ) : 'Run Prompt Test'}
                </button>

                {l1Result && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>CZECH TRANSLATION:</span>
                      {l1ToneDetection && (
                        <span className={`status-pill ${
                          l1ToneDetection.includes('Mixed') ? 'status-pill-pending' : 
                          l1ToneDetection.includes('Neutral') ? 'badge-secondary' : 'status-pill-success'
                        }`}>
                          Tone: {l1ToneDetection}
                        </span>
                      )}
                    </div>
                    <div className="details-content-box" style={{ fontSize: '1.05rem', fontWeight: 500, borderColor: 'var(--color-accent-indigo)' }}>
                      {l1Result.translation}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                      <strong>LLM Explanation:</strong> {l1Result.explanation}
                    </div>
                  </div>
                )}
              </div>

              {/* Quiz 1 */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={18} style={{ color: 'var(--color-accent-rose)' }} />
                  Knowledge Assessment
                </h3>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.25rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>
                    What is the most reliable way to enforce formal address (*vykání*) in Czech translations?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      'Tell the model to "be polite".',
                      'Explicitly specify the form of address (vykání) and add negative constraints (e.g., "Do not use tykání").',
                      'Rely on the model\'s default settings, as it naturally defaults to polite modes.'
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuizSubmit(1, idx, 1)}
                        style={{
                          backgroundColor: selectedAnswers[1] === idx ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${selectedAnswers[1] === idx ? 'var(--color-accent-indigo)' : 'var(--color-border)'}`,
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.9rem',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {quizScore[1] !== null && (
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: quizScore[1] ? 'var(--color-accent-emerald)' : 'var(--color-accent-rose)' }}>
                      {quizScore[1] ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Correct! Explicit styling instructions and negative constraints are the industry best practice.</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>Incorrect. Try again! Simply saying "be polite" is too ambiguous.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeLesson === 2 && (
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coins style={{ color: 'var(--color-accent-indigo)' }} />
                Lesson 2: Token Economics & Cost Calculation
              </h2>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.975rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <p>
                  API-based LLMs charge based on **Tokens** (sub-word fragments). Input prompt tokens (system instructions, locale files, context) and output tokens (translations, explanations, json structure) are billed separately.
                </p>
                <p>
                  A major financial trap in batch localization is **Input Token Accumulation**. If you translate 100 strings individually, the system prompt (e.g. 1,000 tokens) is sent and billed 100 times. That is **100,000 input tokens** for only a few hundred words!
                </p>
                <p>
                  Understanding when to batch strings, which model is best suited, and how model tiers differ in pricing is crucial to keeping localization budgets under control.
                </p>
              </div>

              {/* Lab 2 Calculator */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Coins size={18} style={{ color: 'var(--color-accent-indigo)' }} />
                  Localization Cost Estimator Tool
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Source Words</span>
                      <strong>{calcWords.toLocaleString()} words</strong>
                    </label>
                    <input 
                      type="range" 
                      min="100" 
                      max="20000" 
                      step="100" 
                      value={calcWords} 
                      onChange={(e) => setCalcWords(Number(e.target.value))} 
                      style={{ width: '100%', accentColor: 'var(--color-accent-indigo)' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Target Locales</span>
                      <strong>{calcLocales} locales</strong>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1" 
                      value={calcLocales} 
                      onChange={(e) => setCalcLocales(Number(e.target.value))} 
                      style={{ width: '100%', accentColor: 'var(--color-accent-indigo)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>System Prompt Tokens</span>
                      <strong>{calcSystemPromptTokens} tokens</strong>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="3000" 
                      step="100" 
                      value={calcSystemPromptTokens} 
                      onChange={(e) => setCalcSystemPromptTokens(Number(e.target.value))} 
                      style={{ width: '100%', accentColor: 'var(--color-accent-indigo)' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Locale Instructions Tokens</span>
                      <strong>{calcLocalePromptTokens} tokens</strong>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1000" 
                      step="50" 
                      value={calcLocalePromptTokens} 
                      onChange={(e) => setCalcLocalePromptTokens(Number(e.target.value))} 
                      style={{ width: '100%', accentColor: 'var(--color-accent-indigo)' }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                    Financial Comparison (Batch Run)
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Gemini 2.5 Flash</span>
                        <span className="badge badge-emerald">Standard</span>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent-emerald)', marginBottom: '0.5rem' }}>
                        ${costFlash.toFixed(6)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Input tokens: {(totalInputTokensPerLocale * calcLocales).toLocaleString()}<br />
                        Output tokens: {(totalOutputTokensPerLocale * calcLocales).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Gemini 2.5 Pro</span>
                        <span className="badge badge-indigo">Premium</span>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-accent-indigo)', marginBottom: '0.5rem' }}>
                        ${costPro.toFixed(6)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Input tokens: {(totalInputTokensPerLocale * calcLocales).toLocaleString()}<br />
                        Output tokens: {(totalOutputTokensPerLocale * calcLocales).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    marginTop: '1.25rem', 
                    padding: '0.75rem 1rem', 
                    backgroundColor: 'rgba(99,102,241,0.05)', 
                    border: '1px dashed rgba(99,102,241,0.3)', 
                    borderRadius: '8px', 
                    fontSize: '0.85rem', 
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Cpu size={16} style={{ color: 'var(--color-accent-indigo)' }} />
                    <span>Gemini 2.5 Flash is <strong>{(costPro / costFlash).toFixed(0)}x cheaper</strong> than Gemini 2.5 Pro for this workload.</span>
                  </div>
                </div>
              </div>

              {/* Quiz 2 */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={18} style={{ color: 'var(--color-accent-rose)' }} />
                  Knowledge Assessment
                </h3>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.25rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>
                    If you have a system prompt of 1,000 tokens and translate 10 words (approx. 15 tokens) into 5 languages individually (5 calls), how does token billing work for input?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      'You only pay for the 10 source words once, and the system prompt is billed once.',
                      'The system prompt (1,000 tokens) is billed once globally, and you pay for 15 input tokens 5 times.',
                      'The system prompt is billed as input for *each* of the 5 requests, resulting in 5,075 total input tokens.'
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuizSubmit(2, idx, 2)}
                        style={{
                          backgroundColor: selectedAnswers[2] === idx ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${selectedAnswers[2] === idx ? 'var(--color-accent-indigo)' : 'var(--color-border)'}`,
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.9rem',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {quizScore[2] !== null && (
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: quizScore[2] ? 'var(--color-accent-emerald)' : 'var(--color-accent-rose)' }}>
                      {quizScore[2] ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Correct! LLMs are stateless; the entire prompt context must be sent on every request and is billed every time.</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>Incorrect. Remember that the API has no state. Review prompt accumulation principles.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeLesson === 3 && (
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen style={{ color: 'var(--color-accent-indigo)' }} />
                Lesson 3: Glossary & Terminology Control
              </h2>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.975rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <p>
                  A **Glossary** is a list of standardized terms mapping source vocabulary to approved target translations (e.g. `Home` &rarr; `Hlavní stránka` in a software app, rather than `Domov` or `Bydliště`).
                </p>
                <p>
                  If glossaries are ignored, LLMs will translate contextually, resulting in inconsistent terminology across your app. 
                </p>
                <p>
                  To control this, we must **inject glossary terms** directly into the generation payload, instruct the model to prioritize them, and implement **automated terminology validation** on the output to flag violations.
                </p>
              </div>

              {/* Lab 3 Container */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} style={{ color: 'var(--color-accent-indigo)' }} />
                  Glossary Enforcement Lab
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                  Add terminology pairings to the glossary, run the translation, and test how the model enforces it.
                </p>

                <div className="form-group">
                  <label className="form-label">English Source Text</label>
                  <input type="text" className="input-field" value={l3Text} onChange={(e) => setL3Text(e.target.value)} />
                </div>

                {/* Glossary list */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Glossary Definitions</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {l3Glossary.map((g, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem 1rem', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '0.9rem' }}>
                          <code style={{ color: 'var(--color-accent-indigo)' }}>{g.source}</code> &rarr; <code style={{ color: 'var(--color-accent-emerald)' }}>{g.target}</code>
                        </span>
                        <button onClick={() => removeGlossaryTerm(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-accent-rose)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem' }}>
                    <input type="text" className="input-field" placeholder="Source term (e.g. abort)" value={newSource} onChange={(e) => setNewSource(e.target.value)} />
                    <input type="text" className="input-field" placeholder="Target term (e.g. přerušit)" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} />
                    <button onClick={addGlossaryTerm} className="btn btn-secondary">
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>

                <button onClick={runL3Translation} className="btn btn-primary" style={{ width: '100%' }} disabled={l3Loading}>
                  {l3Loading ? (
                    <>
                      <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Translating with Glossary Enforcement...</span>
                    </>
                  ) : 'Run Glossary Translation'}
                </button>

                {l3Result && (
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>TRANSLATION:</span>
                      {l3Violations.length === 0 ? (
                        <span className="status-pill status-pill-success">
                          Glossary Compliant ✅
                        </span>
                      ) : (
                        <span className="status-pill status-pill-pending" style={{ backgroundColor: 'rgba(244,63,94,0.15)', color: '#fda4af', borderColor: 'rgba(244,63,94,0.3)' }}>
                          Glossary Violation ❌ ({l3Violations.length})
                        </span>
                      )}
                    </div>
                    <div className="details-content-box" style={{ fontSize: '1.05rem', fontWeight: 500, borderColor: l3Violations.length > 0 ? 'var(--color-accent-rose)' : 'var(--color-accent-emerald)' }}>
                      {l3Result.translation}
                    </div>

                    {l3Violations.length > 0 && (
                      <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(244,63,94,0.05)',
                        border: '1px solid rgba(244,63,94,0.2)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#fda4af',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                          <AlertTriangle size={14} />
                          <span>Detected Terminology Deviations:</span>
                        </div>
                        <ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                          {l3Violations.map((v, i) => (
                            <li key={i}>
                              Source term <code>"{v.source}"</code> was NOT translated as <code>"{v.target}"</code>.
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quiz 3 */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={18} style={{ color: 'var(--color-accent-rose)' }} />
                  Knowledge Assessment
                </h3>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.25rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>
                    What is the main benefit of performing automated glossary checks on LLM output?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      'It speeds up API execution latency.',
                      'It flags where the LLM ignored or deviated from glossary terms, ensuring brand consistency.',
                      'It deletes wrong translations from the database automatically.'
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuizSubmit(3, idx, 1)}
                        style={{
                          backgroundColor: selectedAnswers[3] === idx ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${selectedAnswers[3] === idx ? 'var(--color-accent-indigo)' : 'var(--color-border)'}`,
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.9rem',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {quizScore[3] !== null && (
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: quizScore[3] ? 'var(--color-accent-emerald)' : 'var(--color-accent-rose)' }}>
                      {quizScore[3] ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Correct! Post-process validation ensures that glossary instructions were actually followed.</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>Incorrect. Remember glossary checks evaluate quality post-translation.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeLesson === 4 && (
            <div>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Scale style={{ color: 'var(--color-accent-indigo)' }} />
                Lesson 4: LLM-as-a-Judge LQA (MQM)
              </h2>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.975rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <p>
                  Traditional human **Language Quality Assurance (LQA)** is slow and expensive. Modern workflows employ the **"Two-Model Approach"** to automate LQA.
                </p>
                <p>
                  A smaller, faster model (e.g. Gemini 2.5 Flash) translates strings at a high velocity and low cost. Then, a larger "Ref-Judge" model (e.g. Gemini 2.5 Pro) reviews the translations using the standard **MQM (Multidimensional Quality Metrics)** framework.
                </p>
                <p>
                  The Judge acts as an editor, classifying errors into categories (Accuracy, Fluency, Terminology, Style) and severities (Critical, Major, Minor), generating an MQM scorecard.
                </p>
              </div>

              {/* Lab 4 Container */}
              <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scale size={18} style={{ color: 'var(--color-accent-indigo)' }} />
                  Automated LQA Referee Lab
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
                  Trigger the LQA judge to evaluate a translation run batch containing stylistic and accuracy errors.
                </p>

                {l4Step === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem', opacity: 0.7 }}>
                      <div style={{ textAlign: 'left', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', width: '220px' }}>
                        <strong>Source:</strong> Reset password<br />
                        <strong>Translation:</strong> Resetuj si heslo
                      </div>
                      <div style={{ textAlign: 'left', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem', width: '220px' }}>
                        <strong>Source:</strong> Dashboard loaded<br />
                        <strong>Translation:</strong> Palubní deska
                      </div>
                    </div>
                    <button onClick={l4Step === 0 ? runL4Lqa : undefined} className="btn btn-emerald" style={{ padding: '0.8rem 2rem' }}>
                      Begin LQA Audit Run
                    </button>
                  </div>
                )}

                {l4Step === 1 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <Loader2 size={36} className="spinner" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--color-accent-emerald)', margin: '0 auto 1rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                      Judge is proofreading and mapping error severities...
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                      Employing MQM framework in Gemini 2.5 Pro.
                    </div>
                  </div>
                )}

                {l4Step === 2 && l4Result && (
                  <div>
                    {/* Scorecard stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MQM SCORE</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--color-accent-emerald)' }}>{l4Result.score}/100</div>
                      </div>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CRITICAL</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f43f5e' }}>{l4Result.errorCountCritical}</div>
                      </div>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MAJOR</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f59e0b' }}>{l4Result.errorCountMajor}</div>
                      </div>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>MINOR</div>
                        <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#6366f1' }}>{l4Result.errorCountMinor}</div>
                      </div>
                    </div>

                    {/* Table of errors */}
                    <div className="table-wrapper" style={{ marginBottom: 0 }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Segment</th>
                            <th>Category</th>
                            <th>Severity</th>
                            <th>Judge Explanation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {l4Result.errors.map((err: any, i: number) => (
                            <tr key={i} style={{ cursor: 'default' }}>
                              <td>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Source: "{err.source}"</div>
                                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>Tgt: "{err.translation}"</div>
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>{err.category}</td>
                              <td>
                                <span className={`badge ${
                                  err.severity === 'Critical' ? 'btn-danger' : 
                                  err.severity === 'Major' ? 'badge-indigo' : 'badge-secondary'
                                }`} style={{ color: 'white', backgroundColor: err.severity === 'Critical' ? 'var(--color-accent-rose)' : err.severity === 'Major' ? 'var(--color-accent-amber)' : 'var(--color-border)' }}>
                                  {err.severity}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{err.explanation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                      <button onClick={() => setL4Step(0)} className="btn btn-secondary btn-sm" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                        Reset Simulation
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quiz 4 */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HelpCircle size={18} style={{ color: 'var(--color-accent-rose)' }} />
                  Knowledge Assessment
                </h3>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '1.25rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>
                    In the "two-model" LQA approach, why do we use a smaller model for translation and a larger model for LQA?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {[
                      'Because smaller models translate at a higher quality than larger models.',
                      'To optimize cost: translations run on large volumes of words (making smaller model cost-effective), while LQA can evaluate runs in batch selectively using a higher-reasoning judge.',
                      'Because larger models are too slow to output JSON.'
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuizSubmit(4, idx, 1)}
                        style={{
                          backgroundColor: selectedAnswers[4] === idx ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${selectedAnswers[4] === idx ? 'var(--color-accent-indigo)' : 'var(--color-border)'}`,
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          textAlign: 'left',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.9rem',
                          transition: 'all var(--transition-fast)'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {quizScore[4] !== null && (
                    <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: quizScore[4] ? 'var(--color-accent-emerald)' : 'var(--color-accent-rose)' }}>
                      {quizScore[4] ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Correct! This model combination delivers high translation speed and low cost while retaining the quality oversight of large LLMs.</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>Incorrect. Think about cost efficiency and scaling of batch data operations.</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* CSS Animation spinner styles */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
