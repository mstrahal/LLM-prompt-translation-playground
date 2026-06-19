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
      prompt: "You are a professional software localization specialist. Translate the provided string into the target language. Respond with a JSON object containing:\n1. \"translation\": the translated string\n2. \"explanation\": a brief explanation of choices or context (optional)\n3. \"alternatives\": an array of 1-3 alternative translations with slight stylistic variations.",
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
      prompt: "Přelož do češtiny. Používej přirozený, moderní tón vhodný pro softwarové rozhraní. Rozlišuj tykání/vykání podle kontextu.",
      isActive: true,
    },
    {
      locale: "es-ES",
      prompt: "Traduce al español de España. Usa un tono profesional y neutral. Asegúrate de que las palabras sean claras y legibles.",
      isActive: true,
    },
    {
      locale: "de-DE",
      prompt: "Übersetze ins Deutsche. Achte auf korrekte Grammatik und Rechtschreibung. Verwende standardmäßig die höfliche Anrede (Sie), falls nicht anders vorgegeben.",
      isActive: true,
    },
    {
      locale: "sk-SK",
      prompt: "Prelož do slovenčiny. Používaj modernú terminológiu pre aplikácie a dbaj na gramatickú správnosť.",
      isActive: true,
    },
    {
      locale: "fr-FR",
      prompt: "Traduire en français de France. Utiliser un ton professionnel. Respecter la ponctuation française (ex. espace insécable avant les deux-points).",
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
