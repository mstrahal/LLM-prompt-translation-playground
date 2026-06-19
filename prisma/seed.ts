import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (for clean runs)
  await prisma.translation.deleteMany({});
  await prisma.translationRun.deleteMany({});
  await prisma.sourceSegment.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.systemPrompt.deleteMany({});
  await prisma.localePrompt.deleteMany({});

  // Seed System Prompts
  await prisma.systemPrompt.create({
    data: {
      prompt: "You are a professional software localization specialist and translator. You are translating comments from an online forum (like Reddit) to a target language. The target audience is the 'Global Digital Native': predominantly 18-35 years old (Gen Z and millennials), deeply embedded in internet culture, opinionated, culture-savvy, and reactive. Maintain a casual, conversational, authentic, and often humorous tone. Use internet slang, digital references, and memes where appropriate. Ensure translations feel natural and native to online communities. Return a JSON object containing:\n1. \"translation\": the translated comment.\n2. \"explanation\": reasoning behind choices (e.g. slang translation, tone selection).\n3. \"alternatives\": an array of 1-2 stylistic variations.",
      isActive: true,
    },
  });

  await prisma.systemPrompt.create({
    data: {
      prompt: "You are an expert translator. Translate the given UI text. Be concise, match the length and tone of the original text, and preserve all HTML tags and variables.",
      isActive: false,
    },
  });

  // Seed Locale Prompts
  const localePrompts = [
    {
      locale: "cs-CZ",
      prompt: "Translate into casual, conversational Czech matching a Reddit comment. Use informal address (tykání). Incorporate common Czech internet slang, code-switching (Czenglish), and cultural references where appropriate to keep it authentic.",
      isActive: true,
    },
    {
      locale: "es-ES",
      prompt: "Translate into natural, conversational Castilian Spanish (es-ES) suitable for a Reddit forum. Adopt popular Spanish digital slang and local expressions. Maintain an informal, direct tone.",
      isActive: true,
    },
    {
      locale: "de-DE",
      prompt: "Translate into casual, conversational German (de-DE) suitable for a Reddit comment. Use informal address (Du/ihr). Incorporate typical German internet jargon, Anglicisms, and colloquialisms natural to German digital natives.",
      isActive: true,
    },
    {
      locale: "sk-SK",
      prompt: "Translate into casual, conversational Slovak (sk-SK) matching a Reddit comment. Use informal address (tykání). Adapt internet slang, colloquialisms, and expressions popular among Slovak Gen Z and Millennials.",
      isActive: true,
    },
    {
      locale: "fr-FR",
      prompt: "Translate into casual, conversational French (fr-FR) suitable for a Reddit comment. Use informal address (tutoiement). Incorporate common French internet slang (Verlan, digital jargon) and anglicisms natural to French digital natives.",
      isActive: true,
    },
  ];

  for (const lp of localePrompts) {
    await prisma.localePrompt.create({
      data: lp,
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
