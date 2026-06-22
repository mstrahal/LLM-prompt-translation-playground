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
  Trophy, 
  Cpu, 
  Trash2,
  AlertTriangle,
  Award,
  ShieldAlert,
  Check,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';

// Constant strings for challenges
const CH1_SOURCE = "Hello! We noticed you haven't completed your profile setup. Please log in now to finish setting up your account.";
const CH3_SOURCE = "Please click reset to clear your cart and log out of the console.";

export default function AcademyPage() {
  const [activeLesson, setActiveLesson] = useState(1);
  const [studentName, setStudentName] = useState("");
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  
  // Progress state
  const [progress, setProgress] = useState({
    challenge1: false,
    challenge2: false,
    challenge3: false,
    challenge4: false,
  });

  // Load progress from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem('ai_loc_academy_progress');
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveProgress = (newProgress: typeof progress) => {
    setProgress(newProgress);
    localStorage.setItem('ai_loc_academy_progress', JSON.stringify(newProgress));
  };

  const resetAllProgress = () => {
    if (window.confirm("Are you sure you want to reset your curriculum progress?")) {
      const reset = { challenge1: false, challenge2: false, challenge3: false, challenge4: false };
      saveProgress(reset);
      setCertificateGenerated(false);
    }
  };

  // --- CHALLENGE 1: Register Enforcement ---
  const [ch1Prompt, setCh1Prompt] = useState(
    `# Locale Instructions: Czech (cs-CZ)\n\n- Translate into Czech.\n- Maintain standard tone.`
  );
  const [ch1Loading, setCh1Loading] = useState(false);
  const [ch1Result, setCh1Result] = useState<any>(null);
  const [ch1Feedback, setCh1Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const runChallenge1 = async () => {
    setCh1Loading(true);
    setCh1Result(null);
    setCh1Feedback({ status: null, message: "" });
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: CH1_SOURCE,
          systemPrompt: "You are an expert software localization engine. Translate the source text accurately.",
          localePrompt: ch1Prompt,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setCh1Result(data);

      if (data.error) {
        setCh1Feedback({ status: 'error', message: `API Error: ${data.error}` });
        return;
      }

      const translation = (data.translation || '').toLowerCase();

      // Programmatic validator for Vykání (formal) vs Tykání (informal)
      // Check for formal indicators
      const hasFormalVerbs = translation.includes('přihlaste') || translation.includes('prihlaste') || 
                             translation.includes('dokončete') || translation.includes('dokoncete') ||
                             translation.includes('prohlédněte') || translation.includes('prohlednete') ||
                             translation.includes('zkontrolujte') || translation.includes('upravte');
      
      const hasFormalPronouns = translation.includes('vaše') || translation.includes('vase') || 
                               translation.includes('vašich') || translation.includes('vasich') ||
                               translation.includes('vám') || translation.includes('vam');

      // Check for informal indicators
      const hasInformalVerbs = translation.includes('přihlas') || translation.includes('prihlas') || 
                               translation.includes('dokonči') || translation.includes('dokonci') ||
                               translation.includes('zkontroluj') || translation.includes('uprav');

      const hasInformalPronouns = translation.includes('tvoje') || translation.includes('tvoji') || 
                                 translation.includes('tvůj') || translation.includes('tvuj') ||
                                 translation.includes('ti') || translation.includes('tě') || translation.includes('tebe');

      if ((hasFormalVerbs || hasFormalPronouns) && !hasInformalVerbs && !hasInformalPronouns) {
        setCh1Feedback({
          status: 'success',
          message: "Excellent work! The translation uses correct, consistent formal register (vykání) with polite verb conjugations and formal possessive pronouns."
        });
        const updated = { ...progress, challenge1: true };
        saveProgress(updated);
      } else {
        let msg = "Validation failed. ";
        if (hasInformalVerbs || hasInformalPronouns) {
          msg += "We detected informal singular address (tykání) like 'přihlas', 'dokonči', or 'tvoje'. In a corporate or customer dashboard, this violates professional guidelines. ";
        } else {
          msg += "The translation did not contain clear formal addressing markers (vykání). ";
        }
        msg += "Add strict guidelines telling the model to 'Use formal register (vykání)' and specifically forbid 'tykání'.";
        setCh1Feedback({ status: 'error', message: msg });
      }
    } catch (err: any) {
      setCh1Feedback({ status: 'error', message: `Fetch Error: ${err.message}` });
    } finally {
      setCh1Loading(false);
    }
  };

  // --- CHALLENGE 2: Token Economics & Budgeting ---
  const [ch2Model, setCh2Model] = useState<'flash' | 'pro'>('pro');
  const [ch2BatchSize, setCh2BatchSize] = useState<number>(1);
  const [ch2PromptSize, setCh2PromptSize] = useState<number>(1200);
  const [ch2Feedback, setCh2Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  // Calculation parameters
  const totalSegments = 4000;
  const localesCount = 5;
  const avgSourceTokens = 17;
  const avgTargetTokens = 22;

  const totalRequests = Math.ceil(totalSegments / ch2BatchSize) * localesCount;
  const inputTokensPerRequest = ch2PromptSize + (ch2BatchSize * avgSourceTokens);
  const totalInputTokens = totalRequests * inputTokensPerRequest;
  const totalOutputTokens = totalSegments * avgTargetTokens * localesCount;

  // Pricing: Flash (Input $0.075 / 1M, Output $0.30 / 1M) vs Pro (Input $1.25 / 1M, Output $5.00 / 1M)
  const inputPrice = ch2Model === 'pro' ? 1.25 / 1_000_000 : 0.075 / 1_000_000;
  const outputPrice = ch2Model === 'pro' ? 5.00 / 1_000_000 : 0.30 / 1_000_000;

  const totalCost = (totalInputTokens * inputPrice) + (totalOutputTokens * outputPrice);
  const targetBudget = 2.80;

  const verifyChallenge2 = () => {
    if (totalCost <= targetBudget) {
      setCh2Feedback({
        status: 'success',
        message: `Success! You managed to route and package this localization run for $${totalCost.toFixed(3)}, staying under the $${targetBudget.toFixed(2)} budget. Note how batching amortizes prompt overhead!`
      });
      const updated = { ...progress, challenge2: true };
      saveProgress(updated);
    } else {
      setCh2Feedback({
        status: 'error',
        message: `Budget Exceeded. Current cost is $${totalCost.toFixed(3)}, which is above our $${targetBudget.toFixed(2)} threshold. Try to increase the batch size to send more segments per request, or trim the system prompt length, or choose a more economical model tier.`
      });
    }
  };

  // --- CHALLENGE 3: Terminology Enforcement ---
  const [ch3Prompt, setCh3Prompt] = useState(
    `# Glossary Rules:\n- Translate terms freely.`
  );
  const [ch3Loading, setCh3Loading] = useState(false);
  const [ch3Result, setCh3Result] = useState<any>(null);
  const [ch3Feedback, setCh3Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const runChallenge3 = async () => {
    setCh3Loading(true);
    setCh3Result(null);
    setCh3Feedback({ status: null, message: "" });
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: CH3_SOURCE,
          systemPrompt: "You are a professional software translator. You must follow the provided glossary mappings strictly.",
          localePrompt: ch3Prompt,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setCh3Result(data);

      if (data.error) {
        setCh3Feedback({ status: 'error', message: `API Error: ${data.error}` });
        return;
      }

      const translation = (data.translation || '').toLowerCase();

      // Programmatic check:
      // 1. reset -> obnovit (NOT resetovat)
      // 2. clear -> vyprázdnit (NOT vymazat / smazat)
      // 3. console -> administrace (NOT konzole)
      const hasObnovit = translation.includes('obnov');
      const hasResetovat = translation.includes('reset');
      
      const hasVyprazdnit = translation.includes('vyprázdn') || translation.includes('vyprazdn');
      const hasVymazat = translation.includes('vymaz') || translation.includes('smaz');

      const hasAdministrace = translation.includes('administr');
      const hasKonzole = translation.includes('konzol');

      const glossary1Ok = hasObnovit && !hasResetovat;
      const glossary2Ok = hasVyprazdnit && !hasVymazat;
      const glossary3Ok = hasAdministrace && !hasKonzole;

      if (glossary1Ok && glossary2Ok && glossary3Ok) {
        setCh3Feedback({
          status: 'success',
          message: "Excellent! The translator successfully rejected standard literal cognates (konzole, resetovat) and adhered perfectly to the brand glossary instructions."
        });
        const updated = { ...progress, challenge3: true };
        saveProgress(updated);
      } else {
        let msg = "Validation failed. Terminology mismatches detected: ";
        const errors = [];
        if (!hasObnovit) errors.push("Source term 'reset' was not translated as 'obnovit'.");
        if (hasResetovat) errors.push("Source term 'reset' was translated as the unauthorized literal 'resetovat'.");
        if (!hasVyprazdnit) errors.push("Source term 'clear' was not translated as 'vyprázdnit'.");
        if (hasVymazat) errors.push("Source term 'clear' used the unauthorized 'vymazat/smazat'.");
        if (!hasAdministrace) errors.push("Source term 'console' was not translated as 'administrace'.");
        if (hasKonzole) errors.push("Source term 'console' used the unauthorized literal 'konzole'.");

        msg += errors.join(" ");
        msg += " Update your Glossary rules to be explicit, e.g.: '- Translate \"reset\" as \"obnovit\" (never \"resetovat\")'.";
        setCh3Feedback({ status: 'error', message: msg });
      }
    } catch (err: any) {
      setCh3Feedback({ status: 'error', message: `Fetch Error: ${err.message}` });
    } finally {
      setCh3Loading(false);
    }
  };

  // --- CHALLENGE 4: LQA Auditing ---
  const [l4Seg1Cat, setL4Seg1Cat] = useState("");
  const [l4Seg1Sev, setL4Seg1Sev] = useState("");
  
  const [l4Seg2Cat, setL4Seg2Cat] = useState("");
  const [l4Seg2Sev, setL4Seg2Sev] = useState("");

  const [l4Seg3Cat, setL4Seg3Cat] = useState("");
  const [l4Seg3Sev, setL4Seg3Sev] = useState("");

  const [ch4Feedback, setCh4Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const verifyChallenge4 = () => {
    const seg1Ok = l4Seg1Cat === 'style_register' && l4Seg1Sev === 'minor';
    const seg2Ok = l4Seg2Cat === 'accuracy_mistranslation' && l4Seg2Sev === 'major';
    const seg3Ok = (l4Seg3Cat === 'accuracy_mistranslation' || l4Seg3Cat === 'offensive') && l4Seg3Sev === 'critical';

    if (seg1Ok && seg2Ok && seg3Ok) {
      setCh4Feedback({
        status: 'success',
        message: "Perfect! You correctly audited the segments. Assigning 'Critical' to severe hallucinations that output offensive language, 'Major' for complete meaning changes, and 'Minor' for style register mismatches matches industry standard MQM rules."
      });
      const updated = { ...progress, challenge4: true };
      saveProgress(updated);
    } else {
      let errors = [];
      if (!seg1Ok) errors.push("Segment 1: Informality (Tvoje) in a formal dashboard is a Style/Register issue. It is typically a Minor error since context is preserved.");
      if (!seg2Ok) errors.push("Segment 2: Translating 'denied' as 'allowed' (povolen) changes the functional outcome completely, making it an Accuracy/Mistranslation Major error.");
      if (!seg3Ok) errors.push("Segment 3: Offensively hallucinating 'análního znásilnění' (anal rape) instead of a simple security check error is a Critical issue that must trigger blocker release procedures.");
      
      setCh4Feedback({
        status: 'error',
        message: `Audit discrepancies found: ${errors.join(" ")}`
      });
    }
  };

  // Certification check
  const allCompleted = progress.challenge1 && progress.challenge2 && progress.challenge3 && progress.challenge4;

  return (
    <div style={{ paddingBottom: '5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Academy Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '2.5rem',
        marginBottom: '2.5rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
          filter: 'blur(40px)'
        }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Trophy size={26} style={{ color: 'var(--color-accent-indigo)' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--color-accent-indigo)' }}>
            Professional Certification Program
          </span>
        </div>
        <h1 style={{ fontSize: '2.8rem', marginBottom: '0.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          AI Localization Project Manager (CAIL-PM)
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.15rem', maxWidth: '800px', lineHeight: '1.6' }}>
          Traditional localization workflows are obsolete. Master the operational skills required to coordinate LLM pipelines, engineer registers, control glossary compliance, audit cost economics, and manage referee-driven LQA.
        </p>
      </div>

      {/* Progress Dashboard */}
      <div style={{
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '1.5rem 2rem',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>CURRICULUM PROGRESS:</span>
            <strong style={{ color: allCompleted ? 'var(--color-accent-emerald)' : 'var(--color-text-primary)' }}>
              {Object.values(progress).filter(Boolean).length} / 4 Challenges Completed
            </strong>
          </div>
          <div style={{ width: '280px', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.25rem' }}>
            <div style={{ 
              width: `${(Object.values(progress).filter(Boolean).length / 4) * 100}%`, 
              height: '100%', 
              backgroundColor: allCompleted ? 'var(--color-accent-emerald)' : 'var(--color-accent-indigo)',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            padding: '0.4rem 0.8rem', 
            borderRadius: '6px', 
            backgroundColor: allCompleted ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
            color: allCompleted ? 'var(--color-accent-emerald)' : 'var(--color-text-muted)',
            border: `1px solid ${allCompleted ? 'rgba(16,185,129,0.3)' : 'var(--color-border)'}`
          }}>
            {allCompleted ? "Status: Certified AI Localization PM 🎓" : "Status: Certification Candidate 🎓"}
          </span>
          <button onClick={resetAllProgress} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}>
            Reset Progress
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Sidebar Navigation */}
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '1rem',
          position: 'sticky',
          top: '90px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', fontWeight: 700 }}>
            Curriculum Syllabus
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { id: 1, title: 'Register & Tone Engineering', icon: Languages, completed: progress.challenge1 },
              { id: 2, title: 'Token Financials & Batching', icon: Coins, completed: progress.challenge2 },
              { id: 3, title: 'Terminology & Brand Control', icon: BookOpen, completed: progress.challenge3 },
              { id: 4, title: 'Automated MQM LQA Audits', icon: Scale, completed: progress.challenge4 },
            ].map((lesson) => {
              const Icon = lesson.icon;
              const isActive = activeLesson === lesson.id;
              return (
                <button
                  key={lesson.id}
                  onClick={() => {
                    setActiveLesson(lesson.id);
                    setCh1Feedback({ status: null, message: "" });
                    setCh3Feedback({ status: null, message: "" });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    transition: 'all var(--transition-fast)',
                    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    borderLeft: isActive ? '4px solid var(--color-accent-indigo)' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Icon size={18} style={{ color: isActive ? 'var(--color-accent-indigo)' : 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                      Module {lesson.id}
                    </span>
                  </div>
                  {lesson.completed ? (
                    <CheckCircle2 size={16} style={{ color: 'var(--color-accent-emerald)' }} />
                  ) : (
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--color-border)' }} />
                  )}
                </button>
              );
            })}
          </div>

          {allCompleted && (
            <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '1.25rem', paddingTop: '1.25rem', padding: '0.5rem' }}>
              <button 
                onClick={() => setCertificateGenerated(true)} 
                className="btn btn-primary" 
                style={{ width: '100%', fontSize: '0.85rem', display: 'flex', justifyItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Award size={16} /> Claim Certificate
              </button>
            </div>
          )}

          <div style={{ borderTop: allCompleted ? 'none' : '1px solid var(--color-border)', marginTop: allCompleted ? '0.5rem' : '1.25rem', paddingTop: allCompleted ? '0.5rem' : '1.25rem', padding: '0.5rem' }}>
            <Link href="/" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', textAlign: 'center' }}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Course Details Content */}
        <div style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '2.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>

          {/* Certificate View */}
          {certificateGenerated && allCompleted ? (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{
                border: '6px double #d4af37',
                padding: '3rem',
                backgroundColor: '#0a0d16',
                backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 80%)',
                borderRadius: '8px',
                position: 'relative',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}>
                <div style={{ position: 'absolute', top: '15px', right: '15px', border: '2px solid #d4af37', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4af37', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  SEAL
                </div>
                <Award size={64} style={{ color: '#d4af37', margin: '0 auto 1.5rem' }} />
                <h2 style={{ fontFamily: 'Georgia, serif', color: '#d4af37', fontSize: '2.2rem', marginBottom: '0.5rem', fontWeight: 400 }}>Certificate of Accomplishment</h2>
                <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>This certifies that</p>
                
                {studentName ? (
                  <h3 style={{ fontSize: '2rem', fontWeight: 800, margin: '1rem 0', color: 'white', textDecoration: 'underline', textDecorationColor: '#d4af37' }}>
                    {studentName}
                  </h3>
                ) : (
                  <div style={{ maxWidth: '300px', margin: '0 auto 2rem' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Enter your full name" 
                      value={studentName} 
                      onChange={(e) => setStudentName(e.target.value)}
                      style={{ textAlign: 'center', fontSize: '1.2rem', borderColor: '#d4af37' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Type your name to complete the certificate</span>
                  </div>
                )}

                <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '1.5rem auto', lineHeight: '1.6' }}>
                  has completed the practical curriculum of the AI Localization Academy, demonstrating proficiency in prompt-driven register controls, token budgeting, glossary engineering, and MQM-based automated quality assurance evaluation.
                </p>
                <div style={{ borderTop: '1px solid rgba(212,175,55,0.3)', width: '200px', margin: '2rem auto 0.5rem' }} />
                <div style={{ fontSize: '0.8rem', color: '#d4af37', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Certified AI Localization PM (CAIL-PM)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                  Verification ID: LQA-{Math.random().toString(36).substr(2, 9).toUpperCase()}
                </div>
              </div>
              <button onClick={() => setCertificateGenerated(false)} className="btn btn-secondary" style={{ marginTop: '2rem' }}>
                Back to Syllabus
              </button>
            </div>
          ) : (
            <>
              {/* MODULE 1: Register Controls */}
              {activeLesson === 1 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Languages size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Register & Tone Engineering</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Linguistic Register Compliance</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      Traditional translation databases map words statically. AI-driven localization relies on <strong>Prompt Guidelines</strong> to adjust grammatical registers on-the-fly depending on user demographics.
                    </p>
                    <p>
                      In Czech, addressing a customer incorrectly creates brand friction:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '0.75rem 0' }}>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--color-accent-rose)' }}>Tykání (Informal singular - &quot;ty&quot;)</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                          Used for gaming, colloquial social apps, and Gen Z. Verb endings look like <i>-i, -ej, -š</i> (e.g. <i>přihlas se, stáhni si</i>).
                        </p>
                      </div>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--color-accent-emerald)' }}>Vykání (Formal plural - &quot;Vy&quot;)</strong>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                          Standard for business, enterprise portals, SaaS, and financial apps. Verb endings look like <i>-te, -te se</i> (e.g. <i>přihlaste se, stáhněte si</i>).
                        </p>
                      </div>
                    </div>
                    <p style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      <Info size={18} style={{ color: 'var(--color-accent-indigo)', flexShrink: 0, marginTop: '0.1rem' }} />
                      <span>
                        <strong>Challenge Goal:</strong> The source text below must be translated using <strong>formal register (vykání)</strong>. Without prompt directives, LLMs default to informal or mixed registers. Refine the locale guidelines box below to enforce formal register and suppress informal verbs/pronouns.
                      </span>
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Interactive Sandbox Try</h4>
                      <span className={`status-pill ${progress.challenge1 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge1 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Source Segment (English)</label>
                      <div className="details-content-box" style={{ fontSize: '0.95rem' }}>{CH1_SOURCE}</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Locale Guidelines (cs-CZ)</label>
                      <textarea 
                        className="textarea-field" 
                        value={ch1Prompt} 
                        onChange={(e) => setCh1Prompt(e.target.value)}
                        style={{ minHeight: '120px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button onClick={runChallenge1} className="btn btn-primary" style={{ width: '100%' }} disabled={ch1Loading}>
                      {ch1Loading ? (
                        <>
                          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Executing API Validation...</span>
                        </>
                      ) : 'Run & Validate Translation'}
                    </button>

                    {ch1Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch1Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch1Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch1Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch1Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch1Feedback.message}</span>
                      </div>
                    )}

                    {ch1Result && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>MODEL RESPONSE CZECH:</div>
                        <div className="details-content-box" style={{ fontWeight: 600, color: 'white', fontSize: '1.05rem' }}>
                          {ch1Result.translation}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                          <strong>Explanation:</strong> {ch1Result.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {progress.challenge1 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(2)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 2: Token Economics */}
              {activeLesson === 2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Coins size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Token Economics & Batching</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Cost Optimization & Payload Sizing</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      Every API call to an LLM incurs pricing based on input prompts and output tokens. A central challenge in AI localization is **context window overhead**.
                    </p>
                    <p>
                      Since LLMs are stateless, if you translate a catalog of <strong>4,000 strings</strong> one-by-one, the system instructions (e.g. 1,200 tokens) are sent and billed 4,000 times. That accumulates millions of redundant input tokens!
                    </p>
                    <p>
                      By **batching segments** (combining multiple strings in a single JSON payload) and **trimming system prompts**, a Localization PM can optimize pipeline costs by over **90%**.
                    </p>
                    
                    <div style={{ 
                      padding: '1.25rem', 
                      backgroundColor: 'rgba(99,102,241,0.05)', 
                      border: '1px dashed rgba(99,102,241,0.3)', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem' 
                    }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Zap size={14} style={{ color: 'var(--color-accent-indigo)' }} />
                        The Optimization Challenge Scenario:
                      </h4>
                      <ul style={{ marginLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <li>Translate a software app containing <strong>4,000 segments</strong> across <strong>5 locales</strong>.</li>
                        <li>Average source tokens: 17 per segment. Average target tokens: 22 per segment.</li>
                        <li>Your strict budget allocation: <strong>$2.80</strong>.</li>
                        <li>Find a model, batch size, and prompt footprint configuration to squeeze the run under budget.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Challenge Controls */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '2rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Interactive Calculator & Tries</h4>
                      <span className={`status-pill ${progress.challenge2 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge2 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Model Engine Tier</span>
                          <strong>{ch2Model === 'pro' ? 'Gemini 2.5 Pro (Premium)' : 'Gemini 2.5 Flash (Economy)'}</strong>
                        </label>
                        <select className="input-field" value={ch2Model} onChange={(e: any) => setCh2Model(e.target.value)}>
                          <option value="pro">Gemini 2.5 Pro (High Reasoning - $1.25 in / $5.00 out per 1M)</option>
                          <option value="flash">Gemini 2.5 Flash (Fast/Cheap - $0.075 in / $0.30 out per 1M)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>System Prompt Footprint</span>
                          <strong>{ch2PromptSize} tokens</strong>
                        </label>
                        <input 
                          type="range" 
                          min="100" 
                          max="1500" 
                          step="50" 
                          value={ch2PromptSize} 
                          onChange={(e) => setCh2PromptSize(Number(e.target.value))} 
                          style={{ width: '100%', accentColor: 'var(--color-accent-indigo)' }}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Minimize prompt verbosity to reduce overhead.</span>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Batch Size (Segments per API Request)</span>
                        <strong>{ch2BatchSize} string(s)</strong>
                      </label>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        step="1" 
                        value={ch2BatchSize} 
                        onChange={(e) => setCh2BatchSize(Number(e.target.value))} 
                        style={{ width: '100%', accentColor: 'var(--color-accent-indigo)' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Grouping segments reduces how many times prompt guidelines are duplicated.</span>
                    </div>

                    {/* Cost Output metrics */}
                    <div style={{ 
                      padding: '1.25rem', 
                      backgroundColor: 'rgba(255,255,255,0.02)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: '8px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      textAlign: 'center',
                      gap: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>TOTAL REQUESTS</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{totalRequests.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>INPUT TOKENS</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{totalInputTokens.toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>PROJECT COST</div>
                        <div style={{ 
                          fontSize: '1.5rem', 
                          fontWeight: 800, 
                          color: totalCost <= targetBudget ? 'var(--color-accent-emerald)' : 'var(--color-accent-rose)' 
                        }}>
                          ${totalCost.toFixed(3)}
                        </div>
                      </div>
                    </div>

                    <button onClick={verifyChallenge2} className="btn btn-emerald" style={{ width: '100%' }}>
                      Verify Budget Compliance
                    </button>

                    {ch2Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch2Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch2Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch2Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch2Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch2Feedback.message}</span>
                      </div>
                    )}
                  </div>

                  {progress.challenge2 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(3)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 3: Glossary Control */}
              {activeLesson === 3 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <BookOpen size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Terminology & Brand Control</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Terminology Mappings & Cognate Restraints</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      LLMs are prone to translating terms into literal cognates (e.g. translating software &quot;console&quot; literally to <i>konzole</i>, which sounds like gaming hardware, or &quot;reset&quot; to <i>resetovat</i> instead of standard brand terminology).
                    </p>
                    <p>
                      To prevent this drift, a Localization PM must feed explicit terminology mappings to the translation context, instruct the engine to override its default vocabulary, and validate outputs.
                    </p>
                    
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>Brand Glossary Requirements (English &rarr; Czech):</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.5rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        <div><strong>reset</strong></div>
                        <div style={{ color: 'var(--color-accent-emerald)' }}>obnovit <span style={{ color: 'var(--color-text-muted)' }}>(never use resetovat)</span></div>
                        
                        <div><strong>clear</strong></div>
                        <div style={{ color: 'var(--color-accent-emerald)' }}>vyprázdnit <span style={{ color: 'var(--color-text-muted)' }}>(never use vymazat/smazat)</span></div>
                        
                        <div><strong>console</strong></div>
                        <div style={{ color: 'var(--color-accent-emerald)' }}>administrace <span style={{ color: 'var(--color-text-muted)' }}>(never use konzole)</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Glossary Prompt Sandbox</h4>
                      <span className={`status-pill ${progress.challenge3 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge3 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Source Segment (English)</label>
                      <div className="details-content-box" style={{ fontSize: '0.95rem' }}>{CH3_SOURCE}</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Glossary Prompt Instructions</label>
                      <textarea 
                        className="textarea-field" 
                        value={ch3Prompt} 
                        onChange={(e) => setCh3Prompt(e.target.value)}
                        style={{ minHeight: '120px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                        placeholder={`Provide explicit guidelines enforcing the glossary, for example:
- Translate "reset" as "obnovit" (never use "resetovat")
- Translate "clear" as "vyprázdnit"`}
                      />
                    </div>

                    <button onClick={runChallenge3} className="btn btn-primary" style={{ width: '100%' }} disabled={ch3Loading}>
                      {ch3Loading ? (
                        <>
                          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Validating Terminology Alignment...</span>
                        </>
                      ) : 'Run & Check Glossary Compliance'}
                    </button>

                    {ch3Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch3Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch3Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch3Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch3Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch3Feedback.message}</span>
                      </div>
                    )}

                    {ch3Result && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>MODEL OUTPUT CZECH:</div>
                        <div className="details-content-box" style={{ fontWeight: 600, color: 'white', fontSize: '1.05rem' }}>
                          {ch3Result.translation}
                        </div>
                      </div>
                    )}
                  </div>

                  {progress.challenge3 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(4)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 4: LQA Auditing */}
              {activeLesson === 4 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Scale size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Automated MQM LQA Audits</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Focus: Multidimensional Quality Metrics (MQM) Auditor</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      Automated LQA uses advanced referee models (e.g. Gemini 2.5 Pro) to proofread and index translation errors. This process is based on the **MQM (Multidimensional Quality Metrics)** framework.
                    </p>
                    <p>
                      Errors are classified by category and severity. Severity ratings carry penalty points:
                      <br />
                      &bull; <strong>Minor (1pt):</strong> Minor spelling, styling register mismatches, or punctuation.
                      <br />
                      &bull; <strong>Major (5pts):</strong> Mistranslation that alters meaning, or glossary deviations.
                      <br />
                      &bull; <strong>Critical (10pts):</strong> Offensive translations, massive hallucinations, or functional blockers (e.g. reversing access states).
                    </p>
                    <p>
                      As an AI Localization PM, you must review translations and correctly classify errors to generate the final scorecard.
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>MQM Audit sheet</h4>
                      <span className={`status-pill ${progress.challenge4 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge4 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                      
                      {/* Segment 1 */}
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Context: Formal enterprise banking app</div>
                        <div style={{ margin: '0.5rem 0' }}>
                          <strong>Source:</strong> <code>Your subscription will renew tomorrow.</code>
                          <br />
                          <strong>Target Translation:</strong> <code>Tvoje předplatné se obnoví zítra.</code>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Error Category</span>
                            <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={l4Seg1Cat} onChange={(e) => setL4Seg1Cat(e.target.value)}>
                              <option value="">-- Select Category --</option>
                              <option value="accuracy_mistranslation">Accuracy (Mistranslation)</option>
                              <option value="style_register">Style (Register/Tone)</option>
                              <option value="fluency_punctuation">Fluency (Punctuation)</option>
                            </select>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Severity</span>
                            <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={l4Seg1Sev} onChange={(e) => setL4Seg1Sev(e.target.value)}>
                              <option value="">-- Select Severity --</option>
                              <option value="minor">Minor (1 point)</option>
                              <option value="major">Major (5 points)</option>
                              <option value="critical">Critical (10 points)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Segment 2 */}
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Context: Login screen security block</div>
                        <div style={{ margin: '0.5rem 0' }}>
                          <strong>Source:</strong> <code>Access denied. You do not have permissions.</code>
                          <br />
                          <strong>Target Translation:</strong> <code>Přístup povolen. Nemáte oprávnění.</code>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Error Category</span>
                            <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={l4Seg2Cat} onChange={(e) => setL4Seg2Cat(e.target.value)}>
                              <option value="">-- Select Category --</option>
                              <option value="accuracy_mistranslation">Accuracy (Mistranslation)</option>
                              <option value="style_register">Style (Register/Tone)</option>
                              <option value="fluency_punctuation">Fluency (Punctuation)</option>
                            </select>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Severity</span>
                            <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={l4Seg2Sev} onChange={(e) => setL4Seg2Sev(e.target.value)}>
                              <option value="">-- Select Severity --</option>
                              <option value="minor">Minor (1 point)</option>
                              <option value="major">Major (5 points)</option>
                              <option value="critical">Critical (10 points)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Segment 3 */}
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Context: Security error window</div>
                        <div style={{ margin: '0.5rem 0' }}>
                          <strong>Source:</strong> <code>Failure executing security login verification.</code>
                          <br />
                          <strong>Target Translation:</strong> <code>Selhání spuštění bezpečnostního přihlášení análního znásilnění.</code>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Error Category</span>
                            <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={l4Seg3Cat} onChange={(e) => setL4Seg3Cat(e.target.value)}>
                              <option value="">-- Select Category --</option>
                              <option value="accuracy_mistranslation">Accuracy (Mistranslation)</option>
                              <option value="style_register">Style (Register/Tone)</option>
                              <option value="offensive">Style (Offensive Wording)</option>
                            </select>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Severity</span>
                            <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={l4Seg3Sev} onChange={(e) => setL4Seg3Sev(e.target.value)}>
                              <option value="">-- Select Severity --</option>
                              <option value="minor">Minor (1 point)</option>
                              <option value="major">Major (5 points)</option>
                              <option value="critical">Critical (10 points)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                    </div>

                    <button onClick={verifyChallenge4} className="btn btn-primary" style={{ width: '100%' }}>
                      Submit Audit Sheet
                    </button>

                    {ch4Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch4Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch4Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch4Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch4Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch4Feedback.message}</span>
                      </div>
                    )}
                  </div>
                  
                  {allCompleted && !certificateGenerated && (
                    <div style={{ 
                      marginTop: '2rem',
                      padding: '1.5rem', 
                      backgroundColor: 'rgba(16,185,129,0.08)', 
                      border: '1px solid rgba(16,185,129,0.3)', 
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#a7f3d0', fontWeight: 700, marginBottom: '0.5rem' }}>🎉 Congratulations!</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
                        You have successfully validated all challenges in the AI Localization Academy curriculum!
                      </p>
                      <button 
                        onClick={() => setCertificateGenerated(true)} 
                        className="btn btn-emerald" 
                        style={{ padding: '0.6rem 2rem', fontWeight: 700 }}
                      >
                        Claim Graduation Certificate
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
