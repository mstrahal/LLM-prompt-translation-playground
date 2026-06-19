import { NextRequest, NextResponse } from 'next/server';
import { translateText } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, systemPrompt, localePrompt, locale, model } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (!systemPrompt) {
      return NextResponse.json({ error: 'System prompt is required' }, { status: 400 });
    }
    if (!localePrompt) {
      return NextResponse.json({ error: 'Locale prompt is required' }, { status: 400 });
    }
    if (!locale) {
      return NextResponse.json({ error: 'Locale is required' }, { status: 400 });
    }

    const result = await translateText(
      text,
      systemPrompt,
      localePrompt,
      locale,
      model || 'gemini-2.5-flash'
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sandbox API Route Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
