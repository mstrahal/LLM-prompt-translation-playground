import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface TranslationResponse {
  translation: string;
  explanation: string;
  alternatives: string[];
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
            items: { type: Type.STRING }
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

  let parsed: { translation?: string; explanation?: string; alternatives?: string[] };
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
