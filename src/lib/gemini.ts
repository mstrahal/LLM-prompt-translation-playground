import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface AlternativeTranslation {
  text: string;
  promptDirective: string;
}

export interface TranslationResponse {
  translation: string;
  explanation: string;
  alternatives: AlternativeTranslation[];
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface GeminiQueryParams {
  systemPrompt: string;
  localePrompt: string;
  sourceText: string;
  context?: string | null;
  model: string;
  targetLanguage: string;
}

export async function queryGemini(params: GeminiQueryParams): Promise<TranslationResponse> {
  const { systemPrompt, localePrompt, sourceText, context, model, targetLanguage } = params;

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  // Construct context-enriched prompt text
  let promptContent = `Target Language: ${targetLanguage}\n`;
  if (localePrompt) {
    promptContent += `Locale specific constraints: ${localePrompt}\n`;
  }
  promptContent += `Source Text to translate: "${sourceText}"\n`;
  if (context) {
    promptContent += `Context/Description: ${context}\n`;
  }

  const response = await ai.models.generateContent({
    model: model || 'gemini-2.5-flash',
    contents: promptContent,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          translation: { type: Type.STRING },
          explanation: { type: Type.STRING },
          alternatives: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING, description: "The alternative translation variation" },
                promptDirective: { type: Type.STRING, description: "A global prompt directive (in English) that the user could add to their system or locale instructions to achieve this translation style (e.g. 'Use more emojis', 'Keep sentences under 10 words'). Do not reference specific words of this segment." }
              },
              required: ['text', 'promptDirective']
            }
          }
        },
        required: ['translation', 'explanation', 'alternatives']
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini API returned an empty text response.');
  }

  let parsed: { translation?: string; explanation?: string; alternatives?: AlternativeTranslation[] };
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse Gemini JSON response:', text, error);
    throw new Error('Failed to parse translation response as JSON.');
  }

  // Extract usage metadata
  const usage = response.usageMetadata;
  let inputTokens = usage?.promptTokenCount;
  let outputTokens = usage?.candidatesTokenCount;

  // Fallback to character length approximation: 1 token = 4 characters
  if (typeof inputTokens !== 'number' || typeof outputTokens !== 'number') {
    const totalInputChars = (promptContent || '').length + (systemPrompt || '').length;
    const totalOutputChars = (text || '').length;
    inputTokens = Math.ceil(totalInputChars / 4);
    outputTokens = Math.ceil(totalOutputChars / 4);
  }

  // Cost calculation based on model type pricing per 1M tokens
  let inputRate = 0.075; // default/flash input rate
  let outputRate = 0.30; // default/flash output rate

  if (model.includes('pro') || model.includes('Pro')) {
    inputRate = 1.25;
    outputRate = 5.00;
  } else if (model.includes('supernova') || model.includes('Supernova')) {
    inputRate = 5.00;
    outputRate = 20.00;
  }

  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * outputRate;
  const totalCost = inputCost + outputCost;

  return {
    translation: parsed.translation || '',
    explanation: parsed.explanation || '',
    alternatives: parsed.alternatives || [],
    inputTokens,
    outputTokens,
    cost: totalCost,
  };
}

export async function translateSegment(params: GeminiQueryParams): Promise<TranslationResponse> {
  return queryGemini(params);
}

export async function runSandboxTranslation(params: GeminiQueryParams): Promise<TranslationResponse> {
  return queryGemini(params);
}

export async function translateText(
  sourceText: string,
  systemPrompt: string,
  localePrompt: string,
  targetLanguage: string,
  model: string,
  context?: string | null
): Promise<TranslationResponse> {
  return queryGemini({
    systemPrompt,
    localePrompt,
    sourceText,
    context,
    model,
    targetLanguage,
  });
}

export interface MQMError {
  segmentKey: string;
  source: string;
  translation: string;
  category: string;
  severity: string;
  explanation: string;
}

export interface LQAResponse {
  score: number;
  errorCountCritical: number;
  errorCountMajor: number;
  errorCountMinor: number;
  errors: MQMError[];
}

export async function evaluateLQA(
  segments: { key: string; source: string; translation: string }[],
  targetLanguage: string
): Promise<LQAResponse> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const promptContent = `You are a professional Localization Quality Assurance (LQA) judge. Evaluate the translations in the translation run below into ${targetLanguage} using the MQM (Multidimensional Quality Metrics) framework.

For each translation, check:
1. Accuracy (omissions, mistranslations, additions)
2. Fluency (grammar, spelling, punctuation)
3. Style (tone, address form, guidelines compliance)
4. Terminology (inconsistencies, incorrect term use)

Categorize errors by severity:
- Critical (distorts meaning completely, violates core guidelines, or offensive)
- Major (noticeable error that hinders understanding or violates tone guidelines)
- Minor (small grammatical, spelling, or punctuation error)

Compute an overall score from 0 to 100 based on MQM severity penalties:
Score = 100 - (10 * critical_count + 5 * major_count + 1 * minor_count). Clamp to min 0.

Segments to evaluate:
${segments.map(s => `[Key: ${s.key}]
Source: "${s.source}"
Translation: "${s.translation}"`).join('\n\n')}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: promptContent,
    config: {
      systemInstruction: 'You are an expert LQA evaluator. Run a rigorous MQM translation evaluation. Output valid JSON only.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          errorCountCritical: { type: Type.INTEGER },
          errorCountMajor: { type: Type.INTEGER },
          errorCountMinor: { type: Type.INTEGER },
          errors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                segmentKey: { type: Type.STRING },
                source: { type: Type.STRING },
                translation: { type: Type.STRING },
                category: { type: Type.STRING, description: "Accuracy | Fluency | Style | Terminology" },
                severity: { type: Type.STRING, description: "Critical | Major | Minor" },
                explanation: { type: Type.STRING }
              },
              required: ['segmentKey', 'source', 'translation', 'category', 'severity', 'explanation']
            }
          }
        },
        required: ['score', 'errorCountCritical', 'errorCountMajor', 'errorCountMinor', 'errors']
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini API returned an empty text response.');
  }

  try {
    return JSON.parse(text) as LQAResponse;
  } catch (error) {
    console.error('Failed to parse Gemini LQA response:', text, error);
    throw new Error('Failed to parse LQA report as JSON.');
  }
}

