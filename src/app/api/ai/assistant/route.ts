export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, MODEL } from '@/lib/openai/client';

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json();

    const systemPrompt = `Du bist ein hilfreicher, freundlicher Familien-Assistent namens "Familie AI".
Du hilfst bei Fragen rund um:
- Einkaufsliste
- Aufgaben & Haushalt
- Essensplanung & Rezepte
- Kalender & Termine
- Müllplan
- Allgemeine Haushalts-Tipps

Du antwortest auf Deutsch, freundlich und kompakt. Verwende gelegentlich Emojis.

${context ? `\n\nAktueller Kontext:\n${context}` : ''}`;

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      message: response.choices[0]?.message?.content || '',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'AI request failed' },
      { status: 500 }
    );
  }
}
