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
  Info,
  Layers,
  Fingerprint,
  UserCheck,
  Code2,
  Maximize2
} from 'lucide-react';
import Link from 'next/link';

// Constant strings for challenges
const CH1_SOURCE = "Hello! We noticed you haven't completed your profile setup. Please log in now to finish setting up your account.";
const CH3_SOURCE = "Please click reset to clear your cart and log out of the console.";
const CH5_SOURCE = "Click to save your workspace progress.";
const CH5_FUZZY_SRC = "Click to save your profile progress.";
const CH5_FUZZY_TGT = "Kliknutím uložte svůj postup v profilu.";
const CH6_SOURCE = "Book";
const CH7_SOURCE = "I have successfully signed up.";
const CH8_SOURCE = "Welcome back, <strong>{userName}</strong>! You have <a>%d new messages</a>.";
const CH9_SOURCE = "Create new workspace";

export default function AcademyPage() {
  const [activeLesson, setActiveLesson] = useState(1);
  const [studentName, setStudentName] = useState("");
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  
  // Progress state for all 10 challenges
  const [progress, setProgress] = useState({
    challenge1: false,
    challenge2: false,
    challenge3: false,
    challenge4: false,
    challenge5: false,
    challenge6: false,
    challenge7: false,
    challenge8: false,
    challenge9: false,
    challenge10: false,
  });

  // Load progress from localStorage if available
  useEffect(() => {
    const saved = localStorage.getItem('ai_loc_academy_progress_v2');
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
    localStorage.setItem('ai_loc_academy_progress_v2', JSON.stringify(newProgress));
  };

  const resetAllProgress = () => {
    if (window.confirm("Are you sure you want to reset your curriculum progress?")) {
      const reset = {
        challenge1: false,
        challenge2: false,
        challenge3: false,
        challenge4: false,
        challenge5: false,
        challenge6: false,
        challenge7: false,
        challenge8: false,
        challenge9: false,
        challenge10: false,
      };
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
      const hasFormalVerbs = translation.includes('přihlaste') || translation.includes('prihlaste') || 
                             translation.includes('dokončete') || translation.includes('dokoncete') ||
                             translation.includes('prohlédněte') || translation.includes('prohlednete') ||
                             translation.includes('zkontrolujte') || translation.includes('upravte');
      
      const hasFormalPronouns = translation.includes('vaše') || translation.includes('vase') || 
                               translation.includes('vašich') || translation.includes('vasich') ||
                               translation.includes('vám') || translation.includes('vam');

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
          msg += "We detected informal singular address (tykání) like 'přihlas', 'dokonči', or 'tvoje'. In a corporate dashboard, this violates professional guidelines. ";
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

  const totalSegments = 4000;
  const localesCount = 5;
  const avgSourceTokens = 17;
  const avgTargetTokens = 22;

  const totalRequests = Math.ceil(totalSegments / ch2BatchSize) * localesCount;
  const inputTokensPerRequest = ch2PromptSize + (ch2BatchSize * avgSourceTokens);
  const totalInputTokens = totalRequests * inputTokensPerRequest;
  const totalOutputTokens = totalSegments * avgTargetTokens * localesCount;

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
        message: `Budget Exceeded. Current cost is $${totalCost.toFixed(3)}, which is above our $${targetBudget.toFixed(2)} threshold. Try to increase the batch size, trim the system prompt length, or choose a more economical model tier.`
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

  // --- CHALLENGE 5: TM Fuzzy Match Repair ---
  const [ch5Prompt, setCh5Prompt] = useState(
    `# Instructions:\n- Review match and edit.`
  );
  const [ch5Loading, setCh5Loading] = useState(false);
  const [ch5Result, setCh5Result] = useState<any>(null);
  const [ch5Feedback, setCh5Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const runChallenge5 = async () => {
    setCh5Loading(true);
    setCh5Result(null);
    setCh5Feedback({ status: null, message: "" });
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New Source: "${CH5_SOURCE}"\nTM Match Source: "${CH5_FUZZY_SRC}"\nTM Match Target: "${CH5_FUZZY_TGT}"`,
          systemPrompt: "You are a Translation Memory repair engine. Compare the TM Match Source to the New Source. Repair the TM Match Target by changing only the outdated words. Do NOT translate from scratch.",
          localePrompt: ch5Prompt,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setCh5Result(data);

      if (data.error) {
        setCh5Feedback({ status: 'error', message: `API Error: ${data.error}` });
        return;
      }

      const translation = (data.translation || '').toLowerCase();
      const hasWorkspace = translation.includes('pracovn') || translation.includes('workspace');
      const hasProfile = translation.includes('profil');
      const hasKliknutim = translation.includes('klikn');
      const hasUlozte = translation.includes('ulož') || translation.includes('uloz');

      if (hasWorkspace && !hasProfile && hasKliknutim && hasUlozte) {
        setCh5Feedback({
          status: 'success',
          message: "Excellent! The engine successfully patched the outdated term 'profilu' with the new term 'pracovním prostoru' while preserving the rest of the translation and saving human rework time."
        });
        const updated = { ...progress, challenge5: true };
        saveProgress(updated);
      } else {
        let msg = "Validation failed. ";
        if (hasProfile) {
          msg += "The translation still contains the outdated term 'profilu'. ";
        }
        if (!hasWorkspace) {
          msg += "The translation did not introduce the new term (pracovní prostor / workspace). ";
        }
        msg += "Refine the instructions to explicitly command: 'Replace the target word \"profilu\" representing \"profile\" with \"pracovním prostoru\" to match \"workspace\"'.";
        setCh5Feedback({ status: 'error', message: msg });
      }
    } catch (err: any) {
      setCh5Feedback({ status: 'error', message: `Fetch Error: ${err.message}` });
    } finally {
      setCh5Loading(false);
    }
  };

  // --- CHALLENGE 6: Context metadata ---
  const [ch6Prompt, setCh6Prompt] = useState(
    `# Context:\n- Translate the word.`
  );
  const [ch6Loading, setCh6Loading] = useState(false);
  const [ch6Result, setCh6Result] = useState<any>(null);
  const [ch6Feedback, setCh6Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const runChallenge6 = async () => {
    setCh6Loading(true);
    setCh6Result(null);
    setCh6Feedback({ status: null, message: "" });
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: CH6_SOURCE,
          systemPrompt: "You are a professional software translator. Translate the short ambiguous term based on the injected context metadata.",
          localePrompt: `${ch6Prompt}\nContext Metadata:\n- Location: Flight booking checkout screen\n- Element Type: Primary action button\n- Part of Speech: Verb`,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setCh6Result(data);

      if (data.error) {
        setCh6Feedback({ status: 'error', message: `API Error: ${data.error}` });
        return;
      }

      const translation = (data.translation || '').toLowerCase();
      const hasRezervovat = translation.includes('rezerv') || translation.includes('objedn');
      const hasKniha = translation.includes('kniha') || translation.includes('knihy');

      if (hasRezervovat && !hasKniha) {
        setCh6Feedback({
          status: 'success',
          message: "Success! With metadata context indicating a booking checkout button action, the LLM translated 'Book' as the verb 'Rezervovat' rather than the noun 'Kniha'."
        });
        const updated = { ...progress, challenge6: true };
        saveProgress(updated);
      } else {
        let msg = "Validation failed. ";
        if (hasKniha) {
          msg += "The term was translated literally as the reading noun 'Kniha'. ";
        }
        msg += "Update your instructions to tell the model: 'Review the metadata. Since the term is a Verb acting as an checkout action button, translate it as \"Rezervovat\"'.";
        setCh6Feedback({ status: 'error', message: msg });
      }
    } catch (err: any) {
      setCh6Feedback({ status: 'error', message: `Fetch Error: ${err.message}` });
    } finally {
      setCh6Loading(false);
    }
  };

  // --- CHALLENGE 7: Gender Controls ---
  const [ch7Prompt, setCh7Prompt] = useState(
    `# Parameters:\n- Standard translation.`
  );
  const [ch7Loading, setCh7Loading] = useState(false);
  const [ch7Result, setCh7Result] = useState<any>(null);
  const [ch7Feedback, setCh7Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const runChallenge7 = async () => {
    setCh7Loading(true);
    setCh7Result(null);
    setCh7Feedback({ status: null, message: "" });
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: CH7_SOURCE,
          systemPrompt: "You are translating app copy for a user interface. Inflect gender agreements according to the user profile.",
          localePrompt: `${ch7Prompt}\nUser Profile Attribute:\n- User Gender: Female`,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setCh7Result(data);

      if (data.error) {
        setCh7Feedback({ status: 'error', message: `API Error: ${data.error}` });
        return;
      }

      const translation = (data.translation || '').toLowerCase();
      // Check for feminine registration endings
      const hasFeminineEnding = translation.includes('registrovala') || translation.includes('přihlásila') || translation.includes('prihlasila') || translation.includes('úspěšná') || translation.includes('uspesna');
      const hasMasculineEnding = translation.includes('registroval') && !translation.includes('registrovala') || 
                                 translation.includes('přihlásil') && !translation.includes('přihlásila') ||
                                 translation.includes('prihlasil') && !translation.includes('prihlasila');

      if (hasFeminineEnding && !hasMasculineEnding) {
        setCh7Feedback({
          status: 'success',
          message: "Excellent! The LLM successfully inflected the past-tense verb to the feminine gender ending (-la, i.e., 'zaregistrovala se' / 'přihlásila se') matching the user parameter."
        });
        const updated = { ...progress, challenge7: true };
        saveProgress(updated);
      } else {
        let msg = "Validation failed. ";
        if (hasMasculineEnding) {
          msg += "The translation used the default masculine past tense ending (-l, i.e. 'zaregistroval jsem se'). ";
        } else {
          msg += "The translation did not exhibit clear feminine inflection. ";
        }
        msg += "Refine the prompt to say: 'Review the User Profile Gender. If Female, conjugate past tense verbs with feminine endings (e.g., -la)'.";
        setCh7Feedback({ status: 'error', message: msg });
      }
    } catch (err: any) {
      setCh7Feedback({ status: 'error', message: `Fetch Error: ${err.message}` });
    } finally {
      setCh7Loading(false);
    }
  };

  // --- CHALLENGE 8: Tag preservation ---
  const [ch8Prompt, setCh8Prompt] = useState(
    `# Tags:\n- Keep tags.`
  );
  const [ch8Loading, setCh8Loading] = useState(false);
  const [ch8Result, setCh8Result] = useState<any>(null);
  const [ch8Feedback, setCh8Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const runChallenge8 = async () => {
    setCh8Loading(true);
    setCh8Result(null);
    setCh8Feedback({ status: null, message: "" });
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: CH8_SOURCE,
          systemPrompt: "You are a software localization parser. Preserve tags and placeholders exactly as they are in the source string.",
          localePrompt: ch8Prompt,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setCh8Result(data);

      if (data.error) {
        setCh8Feedback({ status: 'error', message: `API Error: ${data.error}` });
        return;
      }

      const translation = data.translation || '';
      
      const hasStrongTag = translation.includes('<strong>{userName}</strong>');
      const hasAnchorStart = translation.includes('<a>');
      const hasAnchorEnd = translation.includes('</a>');
      const hasPercentD = translation.includes('%d');

      const placeholderTranslated = translation.toLowerCase().includes('{uživatel') || translation.toLowerCase().includes('{uzivatel');

      if (hasStrongTag && hasAnchorStart && hasAnchorEnd && hasPercentD && !placeholderTranslated) {
        setCh8Feedback({
          status: 'success',
          message: "Brilliant! You successfully protected the developer's placeholders and markup tags. The variables '{userName}' and '%d' remain completely untouched and syntactically valid."
        });
        const updated = { ...progress, challenge8: true };
        saveProgress(updated);
      } else {
        let msg = "Validation failed. ";
        if (placeholderTranslated) {
          msg += "The placeholder name '{userName}' was incorrectly translated into Czech. ";
        }
        if (!hasStrongTag) {
          msg += "The '<strong>' wrapping syntax was corrupted or removed. ";
        }
        if (!hasPercentD) {
          msg += "The C-style printf variable '%d' was modified. ";
        }
        msg += "Add explicit instructions: 'Do not translate code variables enclosed in curly braces like {userName} or variables starting with %, and preserve HTML tags literally'.";
        setCh8Feedback({ status: 'error', message: msg });
      }
    } catch (err: any) {
      setCh8Feedback({ status: 'error', message: `Fetch Error: ${err.message}` });
    } finally {
      setCh8Loading(false);
    }
  };

  // --- CHALLENGE 9: UI Length Constraints ---
  const [ch9Prompt, setCh9Prompt] = useState(
    `# Constraints:\n- Keep it short.`
  );
  const [ch9Loading, setCh9Loading] = useState(false);
  const [ch9Result, setCh9Result] = useState<any>(null);
  const [ch9Feedback, setCh9Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const runChallenge9 = async () => {
    setCh9Loading(true);
    setCh9Result(null);
    setCh9Feedback({ status: null, message: "" });
    try {
      const res = await fetch('/api/sandbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: CH9_SOURCE,
          systemPrompt: "Translate this UI button text into Czech. The translation must fit in a very tight layout. Keep it short.",
          localePrompt: `${ch9Prompt}\nConstraint: The translation must be maximum 15 characters long.`,
          locale: 'cs-CZ',
          model: 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      setCh9Result(data);

      if (data.error) {
        setCh9Feedback({ status: 'error', message: `API Error: ${data.error}` });
        return;
      }

      const translation = data.translation || '';
      const len = translation.length;

      if (len <= 15) {
        setCh9Feedback({
          status: 'success',
          message: `Success! The translation "${translation}" has only ${len} characters, complying with our layout limit of 15.`
        });
        const updated = { ...progress, challenge9: true };
        saveProgress(updated);
      } else {
        setCh9Feedback({
          status: 'error',
          message: `Layout Overflow! The translation "${translation}" is ${len} characters long, exceeding the 15-character constraint. Czech expanded literal (Vytvořit nový pracovní prostor) is too long. Tell the model to output a short alternative (e.g., 'Nový prostor' or 'Nový workspace').`
        });
      }
    } catch (err: any) {
      setCh9Feedback({ status: 'error', message: `Fetch Error: ${err.message}` });
    } finally {
      setCh9Loading(false);
    }
  };

  // --- CHALLENGE 10: Routing Orchestration ---
  const [ch10Rules, setCh10Rules] = useState({
    rule1: "",
    rule2: "",
    rule3: ""
  });
  const [ch10Feedback, setCh10Feedback] = useState<{ status: 'success' | 'error' | null; message: string }>({ status: null, message: "" });

  const verifyChallenge10 = () => {
    // Correct mappings:
    // Rule 1 (Marketing copy) -> route_pro (Gemini Pro for contextual accuracy)
    // Rule 2 (System logs) -> route_flash (Gemini Flash to minimize cost)
    // Rule 3 (Low QE score) -> route_referee (Gemini Pro for self-correction review)
    const rule1Ok = ch10Rules.rule1 === 'route_pro';
    const rule2Ok = ch10Rules.rule2 === 'route_flash';
    const rule3Ok = ch10Rules.rule3 === 'route_referee';

    if (rule1Ok && rule2Ok && rule3Ok) {
      setCh10Feedback({
        status: 'success',
        message: "Perfect orchestration! Routing high-volume low-complexity logs to Flash, complex marketing to Pro, and flagging low-QE segments for self-correction is the industry-standard workflow for cost-efficient AI localization."
      });
      const updated = { ...progress, challenge10: true };
      saveProgress(updated);
    } else {
      let errors = [];
      if (!rule1Ok) errors.push("Marketing copy requires high-context reasoning and should be routed to Pro.");
      if (!rule2Ok) errors.push("High-volume, simple logs should be routed to Flash to keep costs low.");
      if (!rule3Ok) errors.push("A translation failing quality thresholds (low QE score) needs to be routed to a high-reasoning model for self-correction review.");
      
      setCh10Feedback({
        status: 'error',
        message: `Routing errors: ${errors.join(" ")}`
      });
    }
  };

  // Check if all 10 challenges are completed
  const allCompleted = Object.values(progress).every(Boolean);

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
              {Object.values(progress).filter(Boolean).length} / 10 Challenges Completed
            </strong>
          </div>
          <div style={{ width: '280px', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '0.25rem' }}>
            <div style={{ 
              width: `${(Object.values(progress).filter(Boolean).length / 10) * 100}%`, 
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {[
              { id: 1, title: 'Register & Tone Engineering', icon: Languages, completed: progress.challenge1 },
              { id: 2, title: 'Token Financials & Batching', icon: Coins, completed: progress.challenge2 },
              { id: 3, title: 'Terminology & Brand Control', icon: BookOpen, completed: progress.challenge3 },
              { id: 4, title: 'Automated MQM LQA Audits', icon: Scale, completed: progress.challenge4 },
              { id: 5, title: 'TM Fuzzy Match Repair', icon: Layers, completed: progress.challenge5 },
              { id: 6, title: 'UI Metadata Disambiguation', icon: Fingerprint, completed: progress.challenge6 },
              { id: 7, title: 'Gender & Inclusive Controls', icon: UserCheck, completed: progress.challenge7 },
              { id: 8, title: 'HTML/Markdown Placeholder Preservation', icon: Code2, completed: progress.challenge8 },
              { id: 9, title: 'UI Layout Space Limits', icon: Maximize2, completed: progress.challenge9 },
              { id: 10, title: 'LLM Orchestration Flowchart', icon: Cpu, completed: progress.challenge10 },
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
                    setCh5Feedback({ status: null, message: "" });
                    setCh6Feedback({ status: null, message: "" });
                    setCh7Feedback({ status: null, message: "" });
                    setCh8Feedback({ status: null, message: "" });
                    setCh9Feedback({ status: null, message: "" });
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    padding: '0.65rem 0.85rem',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                    <Icon size={16} style={{ color: isActive ? 'var(--color-accent-indigo)' : 'var(--color-text-muted)', flexShrink: 0 }} />
                    <span style={{ 
                      fontSize: '0.825rem', 
                      fontWeight: isActive ? 600 : 500, 
                      color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden'
                    }}>
                      M{lesson.id}: {lesson.title}
                    </span>
                  </div>
                  {lesson.completed ? (
                    <CheckCircle2 size={14} style={{ color: 'var(--color-accent-emerald)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid var(--color-border)', flexShrink: 0 }} />
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
                  has completed the comprehensive 10-module curriculum of the AI Localization Academy, demonstrating professional mastery in prompt engineering registers, token optimization budget modeling, brand terminology control, markdown tags shielding, UI length constraints, and LLM-as-a-judge LQA orchestration.
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
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Multidimensional Quality Metrics (MQM) Auditor</span>
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
                  
                  {progress.challenge4 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(5)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 5: TM Fuzzy Repair */}
              {activeLesson === 5 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Layers size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Translation Memory Fuzzy Match Repair</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Leveraging Old Translations & Saving Tokens</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      In modern computer-assisted translation (CAT) tools, **Translation Memory (TM)** holds previously approved translations. When a new sentence is extremely similar (e.g. an 80% fuzzy match), we can use the LLM to &quot;repair&quot; the translation rather than starting from scratch.
                    </p>
                    <p>
                      This strategy is called **Fuzzy Match Repair**. It drastically reduces costs by maintaining vocabulary consistency and saving editor review cycles.
                    </p>
                    
                    <p style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      <Info size={18} style={{ color: 'var(--color-accent-indigo)', flexShrink: 0, marginTop: '0.1rem' }} />
                      <span>
                        <strong>Challenge Goal:</strong> You are given an outdated TM translation matching 80% of the source. Command the LLM to replace the outdated word (&quot;profile&quot; &rarr; <i>profilu</i>) with the new term (&quot;workspace&quot; &rarr; <i>pracovním prostoru</i>) without altering the rest of the sentence.
                      </span>
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>TM Repair Prompter</h4>
                      <span className={`status-pill ${progress.challenge5 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge5 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">New Source (English)</label>
                        <div className="details-content-box" style={{ fontSize: '0.85rem' }}>{CH5_SOURCE}</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">TM Target Match (Czech - Outdated)</label>
                        <div className="details-content-box" style={{ fontSize: '0.85rem' }}>{CH5_FUZZY_TGT}</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Repair Instructions</label>
                      <textarea 
                        className="textarea-field" 
                        value={ch5Prompt} 
                        onChange={(e) => setCh5Prompt(e.target.value)}
                        style={{ minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button onClick={runChallenge5} className="btn btn-primary" style={{ width: '100%' }} disabled={ch5Loading}>
                      {ch5Loading ? (
                        <>
                          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Executing TM Match Repair...</span>
                        </>
                      ) : 'Execute Repair Run'}
                    </button>

                    {ch5Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch5Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch5Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch5Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch5Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch5Feedback.message}</span>
                      </div>
                    )}

                    {ch5Result && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>REPAIRED CZECH TRANSLATION:</div>
                        <div className="details-content-box" style={{ fontWeight: 600, color: 'white', fontSize: '1.05rem' }}>
                          {ch5Result.translation}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {progress.challenge5 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(6)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 6: UI Disambiguation */}
              {activeLesson === 6 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Fingerprint size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>UI Metadata & Context Injection</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Homonym Disambiguation via Structured Headers</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      English is highly ambiguous. Short terms like <strong>&quot;Book&quot;</strong> can represent a noun (a physical reading object) or a verb (the action to reserve a seat). Without context, an LLM defaults to the noun (<i>Kniha</i>).
                    </p>
                    <p>
                      In software localization, we solve this by injecting **in-context metadata** (element position, parent screen, and part of speech) alongside the source string.
                    </p>
                    
                    <p style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                      <Info size={18} style={{ color: 'var(--color-accent-indigo)', flexShrink: 0, marginTop: '0.1rem' }} />
                      <span>
                        <strong>Challenge Goal:</strong> Force the translator to translate &quot;Book&quot; as a verb (<i>Rezervovat</i>) by instructing it to use the injected component metadata block in the prompt context.
                      </span>
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Metadata Sandbox</h4>
                      <span className={`status-pill ${progress.challenge6 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge6 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Ambiguous Word</label>
                        <div className="details-content-box" style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{CH6_SOURCE}</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">UI Context Metadata</label>
                        <div style={{ fontSize: '0.8rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                          - Position: checkout_flow_button
                          <br />
                          - POS: Verb (Action)
                          <br />
                          - Target: Reserve a ticket
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Prompt Guidelines</label>
                      <textarea 
                        className="textarea-field" 
                        value={ch6Prompt} 
                        onChange={(e) => setCh6Prompt(e.target.value)}
                        style={{ minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button onClick={runChallenge6} className="btn btn-primary" style={{ width: '100%' }} disabled={ch6Loading}>
                      {ch6Loading ? (
                        <>
                          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Disambiguating word...</span>
                        </>
                      ) : 'Run Context-Enriched Translation'}
                    </button>

                    {ch6Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch6Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch6Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch6Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch6Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch6Feedback.message}</span>
                      </div>
                    )}

                    {ch6Result && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>DISAMBIGUATED CZECH TRANSLATION:</div>
                        <div className="details-content-box" style={{ fontWeight: 600, color: 'white', fontSize: '1.05rem' }}>
                          {ch6Result.translation}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {progress.challenge6 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(7)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 7: Gender Agreements */}
              {activeLesson === 7 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <UserCheck size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Gender & Inclusive Language Controls</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Dynamic Inflection Matching User Attributes</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      Unlike English, many target languages inflect verbs and adjectives based on the gender of the user. In Czech, a past-tense sentence like &quot;I have registered&quot; translates differently:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '0.5rem 0' }}>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <strong>Masculine User (Default)</strong>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                          Zaregistroval jsem se <span style={{ color: 'var(--color-text-muted)' }}>(ends in -l)</span>
                        </div>
                      </div>
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <strong>Feminine User</strong>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)', marginTop: '0.25rem' }}>
                          Zaregistrovala jsem se <span style={{ color: 'var(--color-text-muted)' }}>(ends in -la)</span>
                        </div>
                      </div>
                    </div>
                    <p>
                      An AI Localization PM feeds the active user profile gender as a dynamic prompt variable, instructing the LLM to output the correct gender agreement conjugations.
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Gender Inflection Sandbox</h4>
                      <span className={`status-pill ${progress.challenge7 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge7 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Source string</label>
                        <div className="details-content-box" style={{ fontSize: '0.85rem' }}>{CH7_SOURCE}</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">User Gender Attribute</label>
                        <div className="details-content-box" style={{ fontSize: '0.85rem', color: '#fda4af', fontWeight: 'bold' }}>Female</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dynamic Gender Guidelines</label>
                      <textarea 
                        className="textarea-field" 
                        value={ch7Prompt} 
                        onChange={(e) => setCh7Prompt(e.target.value)}
                        style={{ minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button onClick={runChallenge7} className="btn btn-primary" style={{ width: '100%' }} disabled={ch7Loading}>
                      {ch7Loading ? (
                        <>
                          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Generating inflected text...</span>
                        </>
                      ) : 'Run Gender-Aware Translation'}
                    </button>

                    {ch7Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch7Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch7Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch7Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch7Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch7Feedback.message}</span>
                      </div>
                    )}

                    {ch7Result && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>GENDER-CONJUGATED CZECH RESPONSE:</div>
                        <div className="details-content-box" style={{ fontWeight: 600, color: 'white', fontSize: '1.05rem' }}>
                          {ch7Result.translation}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {progress.challenge7 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(8)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 8: Tag preservation */}
              {activeLesson === 8 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Code2 size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>HTML/Markdown Placeholder Preservation</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Protecting Structural Markup and Developer Code Variables</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      Software strings are packed with markup tags (e.g. <code>{"<a>"}</code>, <code>{"<strong>"}</code>) and runtime code variables (e.g. <code>{"{userName}"}</code>, <code>%d</code>, <code>{"{{count}}"}</code>).
                    </p>
                    <p>
                      LLMs frequently corrupt these elements by translating them (e.g., rewriting <code>{"{userName}"}</code> as <code>{"{uživatelskéJméno}"}</code>) or changing their syntax spacing. When this happens, the application crashes or fails to render tags.
                    </p>
                    <p>
                      Writing strict, negative prompt instructions prevents the model from interacting with tags or placeholders.
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Tag Protection Sandbox</h4>
                      <span className={`status-pill ${progress.challenge8 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge8 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Developer Source string</label>
                      <div className="details-content-box" style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{CH8_SOURCE}</div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Formatting rules prompt</label>
                      <textarea 
                        className="textarea-field" 
                        value={ch8Prompt} 
                        onChange={(e) => setCh8Prompt(e.target.value)}
                        style={{ minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button onClick={runChallenge8} className="btn btn-primary" style={{ width: '100%' }} disabled={ch8Loading}>
                      {ch8Loading ? (
                        <>
                          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Executing code validation...</span>
                        </>
                      ) : 'Validate Code Integrity'}
                    </button>

                    {ch8Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch8Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch8Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch8Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch8Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch8Feedback.message}</span>
                      </div>
                    )}

                    {ch8Result && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>PARSED TRANSLATION OUTPUT:</div>
                        <div className="details-content-box" style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}>
                          {ch8Result.translation}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {progress.challenge8 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(9)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 9: UI Length constraints */}
              {activeLesson === 9 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Maximize2 size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>UI Layout Space Constraints</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Character Constraints to Prevent Truncations</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      Translations from English to European languages often expand by <strong>20% to 30% in length</strong>. On tight UI components (like navigation buttons, badges, and headers), this expansion causes text truncation or layout overlap.
                    </p>
                    <p>
                      An AI Localization PM applies character count instructions to specific layouts, prompting the model to use shorter abbreviations or stylistic alternatives when space is restricted.
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Character Limitation Sandbox</h4>
                      <span className={`status-pill ${progress.challenge9 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge9 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Button English Source</label>
                        <div className="details-content-box" style={{ fontSize: '0.9rem' }}>{CH9_SOURCE}</div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Maximum Allowed Space</label>
                        <div className="details-content-box" style={{ fontSize: '0.9rem', color: 'var(--color-accent-rose)', fontWeight: 'bold' }}>15 characters</div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Shorthand Czech Guidelines</label>
                      <textarea 
                        className="textarea-field" 
                        value={ch9Prompt} 
                        onChange={(e) => setCh9Prompt(e.target.value)}
                        style={{ minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button onClick={runChallenge9} className="btn btn-primary" style={{ width: '100%' }} disabled={ch9Loading}>
                      {ch9Loading ? (
                        <>
                          <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Counting characters...</span>
                        </>
                      ) : 'Test Length Constraint'}
                    </button>

                    {ch9Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch9Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch9Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch9Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch9Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch9Feedback.message}</span>
                      </div>
                    )}

                    {ch9Result && (
                      <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>SHORTENED TRANSLATION RESULT:</div>
                        <div className="details-content-box" style={{ fontWeight: 600, color: 'white', fontSize: '1.05rem' }}>
                          {ch9Result.translation} ({ch9Result.translation.length} characters)
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {progress.challenge9 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setActiveLesson(10)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Next Module <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODULE 10: Orchestration Routing */}
              {activeLesson === 10 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', padding: '0.5rem', borderRadius: '8px' }}>
                      <Cpu size={24} style={{ color: 'var(--color-accent-indigo)' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>LLM Routing & Fallback Orchestration</h2>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Focus: Building Multi-Model Cost/Quality Pipelines</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '2rem' }}>
                    <p>
                      An AI Localization architect does not send all copy to a single expensive model. We design **orchestration routing maps** to divide traffic:
                    </p>
                    <p>
                      &bull; <strong>Gemini 2.5 Flash:</strong> Translates high-volume, simple UI labels, logs, and user search queries at low cost.
                      <br />
                      &bull; <strong>Gemini 2.5 Pro:</strong> Handles nuanced marketing copies, legal policies, or complex context-dependent blocks.
                      <br />
                      &bull; <strong>Referee Evaluation Route:</strong> If a translation fails quality checks (e.g. has low QE/COMET scores or glossary warning badges), it gets routed to a high-reasoning engine (Pro) for self-correction review.
                    </p>
                  </div>

                  {/* Challenge Area */}
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1.5rem', backgroundColor: 'rgba(15,23,42,0.4)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Routing Rules Flowchart</h4>
                      <span className={`status-pill ${progress.challenge10 ? 'status-pill-success' : 'badge-secondary'}`}>
                        {progress.challenge10 ? 'Passed' : 'In Progress'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                      
                      {/* Scenario 1 */}
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <div><strong>Scenario 1:</strong> Nuanced Marketing Campaign copy containing creative idioms and brand vocabulary.</div>
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Orchestrator Route Action</span>
                          <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={ch10Rules.rule1} onChange={(e) => setCh10Rules({ ...ch10Rules, rule1: e.target.value })}>
                            <option value="">-- Select Routing Action --</option>
                            <option value="route_flash">Route to Gemini 2.5 Flash to minimize cost</option>
                            <option value="route_pro">Route to Gemini 2.5 Pro for contextual accuracy</option>
                            <option value="route_referee">Route to Gemini 2.5 Pro for self-correction review</option>
                          </select>
                        </div>
                      </div>

                      {/* Scenario 2 */}
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <div><strong>Scenario 2:</strong> Technical database warning logs (large volume, basic repetitive phrases).</div>
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Orchestrator Route Action</span>
                          <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={ch10Rules.rule2} onChange={(e) => setCh10Rules({ ...ch10Rules, rule2: e.target.value })}>
                            <option value="">-- Select Routing Action --</option>
                            <option value="route_flash">Route to Gemini 2.5 Flash to minimize cost</option>
                            <option value="route_pro">Route to Gemini 2.5 Pro for contextual accuracy</option>
                            <option value="route_referee">Route to Gemini 2.5 Pro for self-correction review</option>
                          </select>
                        </div>
                      </div>

                      {/* Scenario 3 */}
                      <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        <div><strong>Scenario 3:</strong> Translation returned a low Quality Estimation (COMET/QE) score (&lt; 75) on the first run.</div>
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.25rem' }}>Orchestrator Route Action</span>
                          <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem' }} value={ch10Rules.rule3} onChange={(e) => setCh10Rules({ ...ch10Rules, rule3: e.target.value })}>
                            <option value="">-- Select Routing Action --</option>
                            <option value="route_flash">Route to Gemini 2.5 Flash to minimize cost</option>
                            <option value="route_pro">Route to Gemini 2.5 Pro for contextual accuracy</option>
                            <option value="route_referee">Route to Gemini 2.5 Pro for self-correction review</option>
                          </select>
                        </div>
                      </div>

                    </div>

                    <button onClick={verifyChallenge10} className="btn btn-primary" style={{ width: '100%' }}>
                      Submit Flowchart Rules
                    </button>

                    {ch10Feedback.status && (
                      <div style={{ 
                        marginTop: '1.25rem', 
                        padding: '1rem', 
                        borderRadius: '8px', 
                        backgroundColor: ch10Feedback.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        border: `1px solid ${ch10Feedback.status === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        fontSize: '0.9rem',
                        color: ch10Feedback.status === 'success' ? '#a7f3d0' : '#fecaca',
                        display: 'flex',
                        gap: '0.75rem'
                      }}>
                        {ch10Feedback.status === 'success' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
                        <span>{ch10Feedback.message}</span>
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
                        You have successfully validated all 10 challenges in the AI Localization Academy curriculum!
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
