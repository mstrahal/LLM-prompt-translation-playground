'use server';

import db from '@/lib/db';
import { translateText } from '@/lib/gemini';
import { revalidatePath } from 'next/cache';

// Interface for segments passed to project creation
interface CSVRecordInput {
  key: string;
  sourceText: string;
  context?: string;
}

// 1. Fetch system prompt and locale prompts
export async function getPromptsAction() {
  try {
    let systemPrompt = await db.systemPrompt.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    // If none active, find any or seed a default
    if (!systemPrompt) {
      systemPrompt = await db.systemPrompt.findFirst();
      if (!systemPrompt) {
        systemPrompt = await db.systemPrompt.create({
          data: {
            prompt: `# System Instruction: Forum Comment Translator

## Role & Goal
You are an expert translator specializing in localizing online forum comments (such as Reddit) into a target language. 

## Target Persona: Global Digital Native
- **Age Demographic**: Gen Z and Millennials (18-35 years old).
- **Tone**: Casual, conversational, authentic, highly opinionated, and often humorous.
- **Style**: Use internet slang, digital references, popular memes, and colloquialisms matching the target culture. Ensure the translation feels native to online spaces.

## Output Format Constraints
You must respond ONLY with a valid JSON object matching the following structure:
\`\`\`json
{
  "translation": "The localized translation of the comment",
  "explanation": "Brief explanation of specific slang translation, grammar adaptation, or informal tone selection",
  "alternatives": [
    "Alternative stylistic translation variation 1",
    "Alternative stylistic translation variation 2"
  ]
}
\`\`\``,
            isActive: true,
          },
        });
      } else {
        await db.systemPrompt.update({
          where: { id: systemPrompt.id },
          data: { isActive: true },
        });
      }
    }

    const localePromptsList = await db.localePrompt.findMany({
      where: { isActive: true },
    });

    const locales = ['cs-CZ', 'es-ES', 'de-DE', 'sk-SK', 'fr-FR'];
    const localePromptsMap: Record<string, string> = {};

    for (const locale of locales) {
      let lp: any = localePromptsList.find((p: any) => p.locale === locale);
      if (!lp) {
        // Find inactive or create default
        lp = await db.localePrompt.findFirst({ where: { locale } });
        if (!lp) {
          const defaults: Record<string, string> = {
            'cs-CZ': `# Locale Guidelines: Czech (cs-CZ)

## Core Constraints
- **Tone**: Conversational, informal, and authentic.
- **Form of Address**: Always use informal singular address (*tykání*).

## Linguistic Style
- Incorporate common Czech internet slang, colloquial speech patterns, and popular digital expressions.
- Use code-switching (Czenglish) where it fits naturally into digital native conversations.`,
            'es-ES': `# Locale Guidelines: Spanish (es-ES)

## Core Constraints
- **Tone**: Natural, informal, and conversational.
- **Form of Address**: Use informal singular (*tú*).

## Linguistic Style
- Adopt popular Spanish digital slang and local expressions common on forums (e.g., Forocoches/Reddit).
- Keep the tone direct and reactive.`,
            'de-DE': `# Locale Guidelines: German (de-DE)

## Core Constraints
- **Tone**: Conversational, informal, and relaxed.
- **Form of Address**: Use informal address (*Du* / *ihr*).

## Linguistic Style
- Incorporate typical German internet jargon (Netzjargon), common Anglicisms, and casual colloquial German.`,
            'sk-SK': `# Locale Guidelines: Slovak (sk-SK)

## Core Constraints
- **Tone**: Informal, casual, and highly conversational.
- **Form of Address**: Use informal address (*tykanie*).

## Linguistic Style
- Incorporate Slovak internet slang, colloquialisms, and digital native expressions.
- Adapt common Anglicisms popular among Slovak Gen Z and Millennials.`,
            'fr-FR': `# Locale Guidelines: French (fr-FR)

## Core Constraints
- **Tone**: Casual, conversational, and energetic.
- **Form of Address**: Use informal address (*tutoiement*).

## Linguistic Style
- Incorporate typical French internet slang, Verlan (e.g., *relou*, *ouf*), and common digital anglicisms.
- Respect French spacing before double punctuation (e.g., exclamation marks, colons).`,
          };
          lp = await db.localePrompt.create({
            data: {
              locale,
              prompt: defaults[locale] || "Translate carefully into the target language.",
              isActive: true,
            },
          });
        } else {
          await db.localePrompt.update({
            where: { id: lp.id },
            data: { isActive: true },
          });
        }
      }
      localePromptsMap[locale] = lp.prompt;
    }

    return {
      systemPrompt: systemPrompt.prompt,
      localePrompts: localePromptsMap,
    };
  } catch (error) {
    console.error("Error in getPromptsAction:", error);
    throw new Error("Failed to load prompts.");
  }
}

// 2. Save active prompts
export async function savePromptsAction(systemPromptText: string, localePromptsMap: Record<string, string>) {
  try {
    // Update active system prompt
    const systemPrompt = await db.systemPrompt.findFirst({
      where: { isActive: true },
    });

    if (systemPrompt) {
      await db.systemPrompt.update({
        where: { id: systemPrompt.id },
        data: { prompt: systemPromptText },
      });
    } else {
      await db.systemPrompt.create({
        data: {
          prompt: systemPromptText,
          isActive: true,
        },
      });
    }

    // Update active locale prompts
    for (const [locale, promptText] of Object.entries(localePromptsMap)) {
      const lp = await db.localePrompt.findFirst({
        where: { locale, isActive: true },
      });

      if (lp) {
        await db.localePrompt.update({
          where: { id: lp.id },
          data: { prompt: promptText },
        });
      } else {
        await db.localePrompt.create({
          data: {
            locale,
            prompt: promptText,
            isActive: true,
          },
        });
      }
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error("Error in savePromptsAction:", error);
    throw new Error("Failed to save prompts.");
  }
}

// 3. Create project and perform first translation run
export async function createProjectAction(
  name: string,
  targetLanguage: string,
  geminiModel: string,
  segments: CSVRecordInput[]
) {
  try {
    if (!name || !targetLanguage || !geminiModel || segments.length === 0) {
      throw new Error("All fields and at least one source segment are required.");
    }

    // Get active prompts
    const prompts = await getPromptsAction();
    const systemPromptUsed = prompts.systemPrompt;
    const localePromptUsed = prompts.localePrompts[targetLanguage] || "Translate carefully.";

    // 1. Create project
    const project = await db.project.create({
      data: {
        name,
        targetLanguage,
        geminiModel,
      },
    });

    // 2. Create Source Segments
    const sourceSegmentsData = segments.map(seg => ({
      projectId: project.id,
      key: seg.key,
      sourceText: seg.sourceText,
      context: seg.context || '',
    }));

    // Standard loop or prisma createMany (if supported, let's create individually to be safe in SQLite)
    const createdSegments = [];
    for (const seg of sourceSegmentsData) {
      const createdSeg = await db.sourceSegment.create({
        data: seg,
      });
      createdSegments.push(createdSeg);
    }

    // 3. Run translations in parallel
    const translationPromises = createdSegments.map(async (seg: any) => {
      const result = await translateText(
        seg.sourceText,
        systemPromptUsed,
        localePromptUsed,
        targetLanguage,
        geminiModel,
        seg.context
      );
      return {
        segmentId: seg.id,
        ...result,
      };
    });

    const translationResults = await Promise.all(translationPromises);

    // 4. Calculate total tokens and cost
    const totalTokens = translationResults.reduce((acc, curr) => acc + curr.inputTokens + curr.outputTokens, 0);
    const totalCost = translationResults.reduce((acc, curr) => acc + curr.cost, 0);

    // 5. Create Translation Run
    const translationRun = await db.translationRun.create({
      data: {
        projectId: project.id,
        modelUsed: geminiModel,
        systemPromptUsed,
        localePromptUsed,
        totalTokens,
        totalCost,
      },
    });

    // 6. Save Translations
    for (const res of translationResults) {
      await db.translation.create({
        data: {
          sourceSegmentId: res.segmentId,
          translationRunId: translationRun.id,
          targetText: res.translation,
          explanation: res.explanation,
          alternatives: JSON.stringify(res.alternatives),
          tokensUsed: res.inputTokens + res.outputTokens,
          cost: res.cost,
        },
      });
    }

    revalidatePath('/');
    return { projectId: project.id };

  } catch (error: any) {
    console.error("Error in createProjectAction:", error);
    throw new Error(error.message || "Failed to create project.");
  }
}

// 4. Regenerate / Run translations with inline tweaks (active prompts update option)
export async function regenerateTranslationRunAction(
  projectId: string,
  overrideSystemPrompt?: string,
  overrideLocalePrompt?: string,
  overrideModel?: string,
  selectedSegmentIds?: string[]
) {
  try {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { sourceSegments: true },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    // Load active prompts as fallback
    const prompts = await getPromptsAction();
    const systemPromptUsed = overrideSystemPrompt || prompts.systemPrompt;
    const localePromptUsed = overrideLocalePrompt || prompts.localePrompts[project.targetLanguage] || "Translate carefully.";
    const modelUsed = overrideModel || project.geminiModel;

    // Fetch the last run if we need to copy unselected segments
    const lastRun = await db.translationRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { translations: true },
    });

    const isSelective = Array.isArray(selectedSegmentIds) && selectedSegmentIds.length > 0;

    // Run translations in parallel for selected segments, copy others from previous run
    const translationPromises = project.sourceSegments.map(async (seg: any) => {
      const shouldTranslate = !isSelective || selectedSegmentIds.includes(seg.id);

      if (shouldTranslate) {
        const result = await translateText(
          seg.sourceText,
          systemPromptUsed,
          localePromptUsed,
          project.targetLanguage,
          modelUsed,
          seg.context
        );
        return {
          segmentId: seg.id,
          targetText: result.translation,
          explanation: result.explanation,
          alternatives: JSON.stringify(result.alternatives),
          tokensUsed: result.inputTokens + result.outputTokens,
          cost: result.cost,
        };
      } else {
        const prevTranslation = lastRun?.translations.find((t: any) => t.sourceSegmentId === seg.id);
        return {
          segmentId: seg.id,
          targetText: prevTranslation?.targetText || '',
          explanation: prevTranslation?.explanation || '',
          alternatives: prevTranslation?.alternatives || '[]',
          tokensUsed: 0,
          cost: 0.0,
        };
      }
    });

    const translationResults = await Promise.all(translationPromises);

    // Calculate total tokens and cost
    const totalTokens = translationResults.reduce((acc, curr) => acc + curr.tokensUsed, 0);
    const totalCost = translationResults.reduce((acc, curr) => acc + curr.cost, 0);

    // Create Translation Run
    const translationRun = await db.translationRun.create({
      data: {
        projectId: project.id,
        modelUsed,
        systemPromptUsed,
        localePromptUsed,
        totalTokens,
        totalCost,
      },
    });

    // Save Translations
    for (const res of translationResults) {
      await db.translation.create({
        data: {
          sourceSegmentId: res.segmentId,
          translationRunId: translationRun.id,
          targetText: res.targetText,
          explanation: res.explanation,
          alternatives: res.alternatives,
          tokensUsed: res.tokensUsed,
          cost: res.cost,
        },
      });
    }

    // Update the project's model if they changed it
    if (overrideModel && overrideModel !== project.geminiModel) {
      await db.project.update({
        where: { id: projectId },
        data: { geminiModel: overrideModel },
      });
    }

    revalidatePath(`/projects/${projectId}`);
    return { runId: translationRun.id };

  } catch (error: any) {
    console.error("Error in regenerateTranslationRunAction:", error);
    throw new Error(error.message || "Failed to regenerate translation run.");
  }
}

// 4b. Add source segment on the fly
export async function addSourceSegmentAction(
  projectId: string,
  sourceText: string,
  key?: string,
  context?: string
) {
  try {
    if (!projectId || !sourceText) {
      throw new Error("Project ID and English string are required.");
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    // Find latest run to extract parameters
    const latestRun = await db.translationRun.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    // If no run exists, fetch active prompt settings or standard defaults
    const prompts = await getPromptsAction();
    const systemPromptUsed = latestRun?.systemPromptUsed || prompts.systemPrompt;
    const localePromptUsed = latestRun?.localePromptUsed || prompts.localePrompts[project.targetLanguage] || "Translate carefully.";
    const modelUsed = latestRun?.modelUsed || project.geminiModel;

    // Generate custom key if none provided
    const finalKey = key?.trim() || `seg_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Create Source Segment
    const segment = await db.sourceSegment.create({
      data: {
        projectId,
        key: finalKey,
        sourceText: sourceText.trim(),
        context: context?.trim() || '',
      },
    });

    // 2. Query Gemini for translation
    const result = await translateText(
      segment.sourceText,
      systemPromptUsed,
      localePromptUsed,
      project.targetLanguage,
      modelUsed,
      segment.context
    );

    // 3. Save translation if a run exists
    if (latestRun) {
      const tokens = result.inputTokens + result.outputTokens;

      await db.translation.create({
        data: {
          sourceSegmentId: segment.id,
          translationRunId: latestRun.id,
          targetText: result.translation,
          explanation: result.explanation,
          alternatives: JSON.stringify(result.alternatives),
          tokensUsed: tokens,
          cost: result.cost,
        },
      });

      // Update latest run totals
      await db.translationRun.update({
        where: { id: latestRun.id },
        data: {
          totalTokens: latestRun.totalTokens + tokens,
          totalCost: latestRun.totalCost + result.cost,
        },
      });
    } else {
      // Create a new run if there wasn't one (fallback)
      const tokens = result.inputTokens + result.outputTokens;
      const newRun = await db.translationRun.create({
        data: {
          projectId,
          modelUsed,
          systemPromptUsed,
          localePromptUsed,
          totalTokens: tokens,
          totalCost: result.cost,
        },
      });

      await db.translation.create({
        data: {
          sourceSegmentId: segment.id,
          translationRunId: newRun.id,
          targetText: result.translation,
          explanation: result.explanation,
          alternatives: JSON.stringify(result.alternatives),
          tokensUsed: tokens,
          cost: result.cost,
        },
      });
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, segmentId: segment.id };
  } catch (error: any) {
    console.error("Error in addSourceSegmentAction:", error);
    throw new Error(error.message || "Failed to add source segment.");
  }
}

// 5. Delete project action
export async function deleteProjectAction(projectId: string) {
  try {
    await db.project.delete({
      where: { id: projectId },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteProjectAction:", error);
    throw new Error(error.message || "Failed to delete project.");
  }
}

// 6. Get Global Summary Stats
export async function getGlobalStatsAction() {
  try {
    const totalProjects = await db.project.count();
    const totalRuns = await db.translationRun.count();
    
    const aggregates = await db.translationRun.aggregate({
      _sum: {
        totalTokens: true,
        totalCost: true
      }
    });

    return {
      totalProjects,
      totalRuns,
      totalTokens: aggregates._sum.totalTokens || 0,
      totalCost: aggregates._sum.totalCost || 0,
    };
  } catch (error) {
    console.error("Error in getGlobalStatsAction:", error);
    return {
      totalProjects: 0,
      totalRuns: 0,
      totalTokens: 0,
      totalCost: 0,
    };
  }
}
