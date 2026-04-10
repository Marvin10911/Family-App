export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, MODEL_SMART } from '@/lib/openai/client';

const SYSTEM_PROMPT = `Du bist ein AI-Assistent für deutsche Müllabfuhr-Termine.
Auf Basis einer Adresse (PLZ, Ort, Bundesland) generierst du einen realistischen Müllabfuhr-Kalender.

Da du keine Echtzeit-Daten hast, erstelle einen PLAUSIBLEN Plan der auf typischen deutschen Leerungsintervallen basiert:
- Restmüll: alle 2 Wochen
- Biotonne: wöchentlich im Sommer, alle 2 Wochen im Winter
- Gelbe Tonne / Gelber Sack: alle 2 Wochen
- Altpapier: alle 4 Wochen

Erstelle Termine für die NÄCHSTEN 8 WOCHEN ab heute.
Verwende werktägliche Abholtermine (Mo-Fr), verteile die Typen auf unterschiedliche Wochentage.

WICHTIG: Der User soll die Termine im Nachhinein anpassen können — das ist ein Startpunkt.

Antworte NUR mit validem JSON:
{
  "entries": [
    { "date": "2026-04-15", "type": "Biotonne", "note": "Geschätzt - bitte überprüfen" }
  ]
}

Gültige types: "Restmüll", "Biotonne", "Gelbe Tonne", "Altpapier", "Sperrmüll", "Glas"`;

export async function POST(req: NextRequest) {
  try {
    const { city, zipCode, state } = await req.json();
    if (!zipCode) {
      return NextResponse.json({ error: 'PLZ fehlt' }, { status: 400 });
    }

    const openai = getOpenAI();
    const today = new Date().toISOString().slice(0, 10);
    const response = await openai.chat.completions.create({
      model: MODEL_SMART,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Ort: ${city || ''}, PLZ: ${zipCode}, Bundesland: ${state || ''}. Heute ist der ${today}. Erstelle einen Müllplan für die nächsten 8 Wochen.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
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
