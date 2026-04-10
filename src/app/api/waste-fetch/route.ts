import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI, MODEL_SMART } from '@/lib/openai/client';

const WASTE_TYPE_MAP: Record<string, string> = {
  restmüll: 'Restmüll', restmuell: 'Restmüll', 'rest-müll': 'Restmüll',
  'grauer sack': 'Restmüll', 'graue tonne': 'Restmüll',
  biotonne: 'Biotonne', bioabfall: 'Biotonne', bio: 'Biotonne', biomüll: 'Biotonne',
  'grüne tonne': 'Biotonne',
  'gelbe tonne': 'Gelbe Tonne', 'gelber sack': 'Gelbe Tonne', lvp: 'Gelbe Tonne',
  leichtverpackungen: 'Gelbe Tonne', 'gelb': 'Gelbe Tonne',
  altpapier: 'Altpapier', papier: 'Altpapier', 'blaue tonne': 'Altpapier',
  glas: 'Glas', glascontainer: 'Glas', altglas: 'Glas',
  sperrmüll: 'Sperrmüll', sperrabfall: 'Sperrmüll', sperrmuell: 'Sperrmüll',
};

const VALID_TYPES = ['Restmüll', 'Biotonne', 'Gelbe Tonne', 'Altpapier', 'Sperrmüll', 'Glas'];

function normalizeWasteType(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  for (const [key, value] of Object.entries(WASTE_TYPE_MAP)) {
    if (lower.includes(key)) return value;
  }
  return VALID_TYPES.find((t) => lower.includes(t.toLowerCase())) || null;
}

function normalizeCityForAWIDO(city: string): string[] {
  const base = city
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const variants = [
    base,
    base.split('-')[0],
    base.replace(/-/g, ''),
    // Common AWIDO naming patterns
    `${base}-land`,
    `kreis-${base}`,
    `lk-${base}`,
  ];
  return [...new Set(variants)].filter(Boolean);
}

async function tryAWIDO(city: string, zip: string): Promise<{ entries: any[]; client: string } | null> {
  const candidates = normalizeCityForAWIDO(city);
  const today = new Date().toISOString().split('T')[0];
  const end = new Date(Date.now() + 70 * 864e5).toISOString().split('T')[0];

  for (const candidate of candidates) {
    try {
      const ortsUrl = `https://${candidate}.awido-online.de/WebServices/GetOrtschaften.ashx`;
      const ortsRes = await fetch(ortsUrl, {
        signal: AbortSignal.timeout(4000),
        headers: { Accept: 'application/json' },
      });
      if (!ortsRes.ok) continue;

      const orts: any[] = await ortsRes.json();
      if (!Array.isArray(orts) || orts.length === 0) continue;

      // Find best matching city
      const cityLower = city.toLowerCase();
      const match =
        orts.find((o) => o.scene?.toLowerCase() === cityLower) ||
        orts.find((o) => o.scene?.toLowerCase().includes(cityLower.substring(0, 4))) ||
        orts[0];

      const datesUrl =
        `https://${candidate}.awido-online.de/WebServices/GetPickupDates.ashx` +
        `?sTyp=&sOrt=${match.key}&sStr=&sHnr=&dStart=${today}&dEnd=${end}`;

      const datesRes = await fetch(datesUrl, { signal: AbortSignal.timeout(5000) });
      if (!datesRes.ok) continue;

      const raw: any[] = await datesRes.json();
      if (!Array.isArray(raw) || raw.length === 0) continue;

      const entries = raw
        .map((d) => ({
          date: d.dt,
          type: normalizeWasteType(d.anl_34_art || d.art || ''),
          note: '',
        }))
        .filter((e) => e.date && e.type);

      if (entries.length === 0) continue;
      return { entries, client: candidate };
    } catch {
      continue;
    }
  }
  return null;
}

async function tryICalFeed(icalUrl: string): Promise<any[] | null> {
  try {
    const res = await fetch(icalUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) return null;

    const events: any[] = [];
    const blocks = text.split('BEGIN:VEVENT');
    for (const block of blocks.slice(1)) {
      const dtMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{4})(\d{2})(\d{2})/);
      const summaryMatch = block.match(/SUMMARY:(.+)/);
      if (!dtMatch || !summaryMatch) continue;

      const date = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
      const rawType = summaryMatch[1].trim().replace(/\r/g, '');
      const type = normalizeWasteType(rawType);
      if (!type || date < new Date().toISOString().split('T')[0]) continue;

      events.push({ date, type, note: '' });
    }
    return events.length > 0 ? events : null;
  } catch {
    return null;
  }
}

async function fallbackAI(city: string, zipCode: string, state: string): Promise<any[]> {
  const openai = getOpenAI();
  const today = new Date().toISOString().slice(0, 10);
  const response = await openai.chat.completions.create({
    model: MODEL_SMART,
    messages: [
      {
        role: 'system',
        content: `Du erstellst einen plausiblen deutschen Müllkalender für 8 Wochen ab heute.
Regeln: Restmüll alle 2 Wochen, Biotonne wöchentlich (Sommer) / 2-wöchentlich (Winter), Gelbe Tonne alle 2 Wochen, Altpapier alle 4 Wochen. Nur werktägliche Termine (Mo-Fr).
Antworte NUR mit JSON: {"entries": [{"date":"YYYY-MM-DD","type":"Restmüll","note":"KI-Schätzung"}]}
Gültige types: Restmüll, Biotonne, Gelbe Tonne, Altpapier, Sperrmüll, Glas`,
      },
      {
        role: 'user',
        content: `${city}, PLZ ${zipCode}, ${state}. Heute: ${today}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });
  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
  return (parsed.entries || []).map((e: any) => ({ ...e, note: 'KI-Schätzung – bitte prüfen' }));
}

export async function POST(req: NextRequest) {
  try {
    const { city, zipCode, state, icalUrl } = await req.json();
    if (!city && !zipCode) {
      return NextResponse.json({ error: 'Stadt oder PLZ fehlt' }, { status: 400 });
    }

    // 1. iCal URL (manually provided)
    if (icalUrl?.trim()) {
      const icalEntries = await tryICalFeed(icalUrl.trim());
      if (icalEntries) {
        return NextResponse.json({ entries: icalEntries, source: 'ical', sourceLabel: 'iCal-Kalender' });
      }
    }

    // 2. AWIDO auto-discovery
    const awidoResult = await tryAWIDO(city || '', zipCode || '');
    if (awidoResult) {
      return NextResponse.json({
        entries: awidoResult.entries,
        source: 'awido',
        sourceLabel: `AWIDO (${awidoResult.client})`,
      });
    }

    // 3. AI fallback
    const aiEntries = await fallbackAI(city || '', zipCode || '', state || '');
    return NextResponse.json({ entries: aiEntries, source: 'ai', sourceLabel: 'KI-Schätzung' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Fehler' }, { status: 500 });
  }
}
