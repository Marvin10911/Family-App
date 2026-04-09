import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, MODEL } from '@/lib/openai/client';

const SYSTEM_PROMPT = `Du bist ein AI-Assistent für Familienaufgaben.
Schlage 5 sinnvolle Haushaltsaufgaben vor, basierend auf Jahreszeit, Wochentag und typischen Familienbedürfnissen.

Antworte NUR mit validem JSON:
{
  "tasks": [
    { "title": "...", "description": "...", "priority": "low|medium|high", "category": "...", "pointsReward": 5 }
  ]
}

Kategorien: "Küche", "Bad", "Garten", "Einkauf", "Kinder", "Haustiere", "Allgemein"
Punkte: 5 (leicht), 10 (mittel), 20 (schwer)`;

export async function POST(req: NextRequest) {
  try {
    const { context } = await req.json();
    const openai = getOpenAI();

    const today = new Date();
    const season = ['Winter', 'Frühling', 'Sommer', 'Herbst'][
      Math.floor(today.getMonth() / 3)
    ];
    const weekday = today.toLocaleDateString('de-DE', { weekday: 'long' });

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Jahreszeit: ${season}, Wochentag: ${weekday}. ${context || ''}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    return NextResponse.json(JSON.parse(content));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'AI request failed' },
      { status: 500 }
    );
  }
}
