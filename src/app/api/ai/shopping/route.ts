import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, MODEL } from '@/lib/openai/client';

const SYSTEM_PROMPT = `Du bist ein hilfreicher Einkaufslisten-Assistent für eine deutsche Familie.
Analysiere die Benutzereingabe und extrahiere eine strukturierte Einkaufsliste.

Regeln:
- Verstehe natürliche Sprache ("Ich brauche Milch und 2 Brote")
- Verstehe Rezepte ("Ich möchte Spaghetti Carbonara kochen") und gib ALLE Zutaten
- Normalisiere Artikelnamen (z.B. "Tomate" statt "Tomaten")
- Erkenne Mengen und Einheiten
- Kategorisiere in: "Obst & Gemüse", "Milchprodukte", "Fleisch & Fisch", "Backwaren", "Tiefkühl", "Getränke", "Süßwaren", "Haushalt", "Drogerie", "Sonstiges"
- Wähle für jedes Produkt das passende Emoji (z.B. 🍌 für Banane, 🥛 für Milch, 🍎 für Apfel, 🥩 für Fleisch, 🍞 für Brot)
- Antworte NUR mit validem JSON im folgenden Format:
{
  "items": [
    { "name": "Milch", "quantity": 2, "unit": "Liter", "category": "Milchprodukte", "emoji": "🥛" }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { input, apiKey } = await req.json();
    if (!input) {
      return NextResponse.json({ error: 'No input' }, { status: 400 });
    }

    const openai = getOpenAI(apiKey);
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: input },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'AI request failed' },
      { status: 500 }
    );
  }
}
