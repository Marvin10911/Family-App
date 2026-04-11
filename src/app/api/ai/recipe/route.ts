export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, MODEL } from '@/lib/openai/client';

const SYSTEM_PROMPT = `Du bist ein Familien-Koch-Assistent. Erstelle ein vollständiges Rezept basierend auf der Eingabe.

Antworte NUR mit validem JSON in diesem Format:
{
  "name": "Spaghetti Carbonara",
  "emoji": "🍝",
  "category": "Abendessen",
  "duration": 25,
  "servings": 4,
  "ingredients": [
    { "name": "Spaghetti", "amount": "400 g", "emoji": "🍝" },
    { "name": "Eier", "amount": "4 Stk", "emoji": "🥚" }
  ],
  "steps": [
    "Nudeln in Salzwasser al dente kochen.",
    "Speck in einer Pfanne knusprig braten."
  ],
  "notes": "Kein Sahne verwenden — das ist nicht original!"
}

Regeln:
- category: nur "Frühstück", "Mittagessen", "Abendessen", "Dessert", "Snack" oder "Sonstiges"
- duration: Minuten als Zahl
- servings: Personen als Zahl
- emoji: passendes Gericht-Emoji
- ingredients: jede Zutat mit passendem emoji
- steps: klar und präzise, auf Deutsch
- notes: optionaler Tipp oder Hinweis (kann leer-String sein)`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, servings } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Kein Rezept-Wunsch angegeben' }, { status: 400 });
    }

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Erstelle ein Rezept für: ${prompt}${servings ? ` (für ${servings} Personen)` : ''}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Keine Antwort vom AI');

    return NextResponse.json(JSON.parse(content));
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI-Fehler' }, { status: 500 });
  }
}
