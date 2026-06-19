import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const activeSystemPrompt = await db.systemPrompt.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });

    const localePrompts = await db.localePrompt.findMany({
      orderBy: { locale: 'asc' },
    });

    return NextResponse.json({
      systemPrompt: activeSystemPrompt,
      localePrompts,
    });
  } catch (error: any) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { systemPrompt, localePrompts } = body;

    const updates: any[] = [];

    // Handle system prompt update
    if (typeof systemPrompt === 'string') {
      // Deactivate all current active system prompts
      updates.push(
        db.systemPrompt.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        })
      );
      // Insert the new active system prompt
      updates.push(
        db.systemPrompt.create({
          data: {
            prompt: systemPrompt,
            isActive: true,
          },
        })
      );
    }

    // Handle locale prompts update
    if (localePrompts) {
      if (Array.isArray(localePrompts)) {
        for (const lp of localePrompts) {
          if (lp && typeof lp.locale === 'string' && typeof lp.prompt === 'string') {
            updates.push(
              db.localePrompt.updateMany({
                where: { locale: lp.locale, isActive: true },
                data: { isActive: false },
              })
            );
            updates.push(
              db.localePrompt.create({
                data: {
                  locale: lp.locale,
                  prompt: lp.prompt,
                  isActive: true,
                },
              })
            );
          }
        }
      } else if (typeof localePrompts === 'object') {
        for (const [locale, prompt] of Object.entries(localePrompts)) {
          if (typeof prompt === 'string') {
            updates.push(
              db.localePrompt.updateMany({
                where: { locale, isActive: true },
                data: { isActive: false },
              })
            );
            updates.push(
              db.localePrompt.create({
                data: {
                  locale,
                  prompt,
                  isActive: true,
                },
              })
            );
          }
        }
      }
    }

    if (updates.length > 0) {
      await db.$transaction(updates);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating prompts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update prompts' },
      { status: 500 }
    );
  }
}
