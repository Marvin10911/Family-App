export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, MODEL } from '@/lib/openai/client';

const SYSTEM_PROMPT = `Du bist ein kreativer Familien-Koch-Assistent.
Generiere einen 7-tägigen Wochen-Essensplan für eine Familie.
Die Gerichte sollen alltagstauglich, abwechslungsreich und saisonal sein.

Antworte NUR mit validem JSON:
{
  "plan": [
    { "day": "Montag", "lunch": "...", "dinner": "..." },
    ...
  ]
}

Berücksichtige die Jahreszeit und schlage ausgewogene deutsche/internationale Gerichte vor.`;

export async function POST(req: NextRequest) {
  try {
    const { preferences, mode } = await req.json();
    const openai = getOpenAI();

    if (mode === 'today') {
      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein Koch-Assistent. Schlage EIN leckeres Mittagessen und EIN Abendessen für heute vor. Antworte als JSON: {"lunch": "...", "dinner": "..."}',
          },
          { role: 'user', content: preferences || 'Für eine Familie' },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      return NextResponse.json(JSON.parse(response.choices[0]?.message?.content || '{}'));
    }

    const today = new Date();
    const season = ['Winter', 'Frühling', 'Sommer', 'Herbst'][
      Math.floor(today.getMonth() / 3)
    ];

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Jahreszeit: ${season}. ${preferences || ''}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    return NextResponse.json(JSON.parse(response.choices[0]?.message?.content || '{}'));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'AI request failed' },
      { status: 500 }
    );
  }
}
