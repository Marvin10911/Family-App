/**
 * Abfallplus (K4Systems) API integration
 * Used by AWB Rastatt and ~200 other German municipalities
 *
 * API flow:
 *   1. POST auswahl_bundesland_set → list of municipalities for a state
 *   2. POST auswahl_kommune_set    → list of streets + waste types for a city
 *   3. POST export_ics             → iCal data for the city
 */

const FAPI = '3e8fbf4dd972b642839dee3d5eb1c8bc';
const BASE  = 'https://www.abfallplus.de/';

// MD5 hashes used by the Abfallplus portal for German state IDs
const BUNDESLAND_IDS: Record<string, string> = {
  'Baden-Württemberg':       'c4ca4238a0b923820dcc509a6f75849b',
  'Bayern':                  'c81e728d9d4c2f636f067f89cc14862c',
  'Berlin':                  'eccbc87e4b5ce2fe28308fd9f2a7baf3',
  'Brandenburg':             'a87ff679a2f3e71d9181a67b7542122c',
  'Bremen':                  'e4da3b7fbbce2345d7772b0674a318d5',
  'Hamburg':                 '1679091c5a880faf6fb5e6087eb1b2dc',
  'Hessen':                  '8f14e45fceea167a5a36dedd4bea2543',
  'Mecklenburg-Vorpommern':  'c9f0f895fb98ab9159f51fd0297e236d',
  'Niedersachsen':           '45c48cce2e2d7fbdea1afc51c7c6ad26',
  'Nordrhein-Westfalen':     'd3d9446802a44259755d38e6d163e820',
  'Rheinland-Pfalz':         '6512bd43d9caa6e02c990b0a82652dca',
  'Saarland':                'c20ad4d76fe97759aa27a0c99bff6710',
  'Sachsen':                 'c51ce410c124a10e0db5e4b97fc2af39',
  'Sachsen-Anhalt':          'aab3238922bcc25a6f606eb525ffdc56',
  'Schleswig-Holstein':      '9bf31c7ff062936a96d3c8bd1f8f2ff3',
  'Thüringen':               'c74d97b01eae257e44aa9d5bade97baf',
};

function resolveBundeslandId(state: string): string | null {
  // Exact match
  if (BUNDESLAND_IDS[state]) return BUNDESLAND_IDS[state];
  // Fuzzy match
  const lower = state.toLowerCase();
  for (const [name, id] of Object.entries(BUNDESLAND_IDS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase().split('-')[0].toLowerCase())) {
      return id;
    }
  }
  return null;
}

/** Parse <option value="ID">Name</option> from HTML */
function parseOptions(html: string): { id: string; name: string }[] {
  const results: { id: string; name: string }[] = [];
  const re = /<option[^>]+value="([^"]+)"[^>]*>([^<]+)<\/option>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = m[1].trim();
    const name = m[2].trim();
    if (id && name && id !== '0' && id !== '-1') results.push({ id, name });
  }
  return results;
}

/** Parse ICS text into waste entries */
function parseICS(ics: string, today: string): { date: string; type: string; note: string }[] {
  const WASTE_MAP: Record<string, string> = {
    restmüll: 'Restmüll', restmuell: 'Restmüll', 'grauer sack': 'Restmüll', 'graue tonne': 'Restmüll',
    biotonne: 'Biotonne', bioabfall: 'Biotonne', bio: 'Biotonne',
    'gelbe tonne': 'Gelbe Tonne', 'gelber sack': 'Gelbe Tonne', lvp: 'Gelbe Tonne', leichtverpackung: 'Gelbe Tonne',
    altpapier: 'Altpapier', papier: 'Altpapier', 'blaue tonne': 'Altpapier',
    glas: 'Glas', altglas: 'Glas',
    sperrmüll: 'Sperrmüll', sperrabfall: 'Sperrmüll',
  };

  const entries: { date: string; type: string; note: string }[] = [];
  const blocks = ics.split('BEGIN:VEVENT');

  for (const block of blocks.slice(1)) {
    const dtMatch = block.match(/DTSTART(?:;[^:]*)?:(\d{4})(\d{2})(\d{2})/);
    const summaryMatch = block.match(/SUMMARY:(.+)/);
    if (!dtMatch || !summaryMatch) continue;

    const date = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}`;
    if (date < today) continue;

    const raw = summaryMatch[1].trim().replace(/\r/g, '');
    const lower = raw.toLowerCase();

    let type = '';
    for (const [key, val] of Object.entries(WASTE_MAP)) {
      if (lower.includes(key)) { type = val; break; }
    }
    if (!type) continue;

    entries.push({ date, type, note: '' });
  }

  return entries;
}

/** Full Abfallplus API lookup */
export async function fetchAbfallplus(
  city: string,
  state: string
): Promise<{ entries: { date: string; type: string; note: string }[]; municipality: string } | null> {
  const bundeslandId = resolveBundeslandId(state);
  if (!bundeslandId) return null;

  const today = new Date().toISOString().split('T')[0];
  const cookies: string[] = [];

  const post = async (waction: string, body: Record<string, string>): Promise<string> => {
    const url = `${BASE}?fapi=${FAPI}&waction=${waction}`;
    const formBody = new URLSearchParams({ f_wkey: '', ...body }).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'text/html,text/calendar,*/*',
        ...(cookies.length ? { Cookie: cookies.join('; ') } : {}),
      },
      body: formBody,
      signal: AbortSignal.timeout(8000),
    });
    // Capture session cookies
    const rawCookies = res.headers.get('set-cookie');
    if (rawCookies) cookies.push(rawCookies.split(';')[0]);
    return res.text();
  };

  try {
    // Step 1: Get municipality list for the Bundesland
    const html1 = await post('auswahl_bundesland_set', { f_id_bundesland: bundeslandId });
    const municipalities = parseOptions(html1);
    if (!municipalities.length) return null;

    // Find closest city match
    const cityLower = city.toLowerCase().trim();
    let match =
      municipalities.find((m) => m.name.toLowerCase() === cityLower) ||
      municipalities.find((m) => m.name.toLowerCase().includes(cityLower)) ||
      municipalities.find((m) => cityLower.includes(m.name.toLowerCase().split(' ')[0])) ||
      (cityLower.length >= 4
        ? municipalities.find((m) => m.name.toLowerCase().includes(cityLower.slice(0, 4)))
        : null);

    if (!match) return null;

    // Step 2: Select municipality to establish session
    const html2 = await post('auswahl_kommune_set', { f_id_kommune: match.id });

    // Collect all waste type IDs from the page
    const wasteTypes = parseOptions(html2);
    const wtParams: Record<string, string> = { f_id_kommune: match.id };
    wasteTypes.forEach((wt, i) => { wtParams[`f_id_abfalltyp_${i}`] = wt.id; });
    wtParams['f_abfallarten_index_max'] = String(wasteTypes.length);

    // Step 3: Export ICS
    const icsData = await post('export_ics', wtParams);

    if (!icsData.includes('BEGIN:VCALENDAR')) return null;

    const entries = parseICS(icsData, today);
    if (!entries.length) return null;

    return { entries, municipality: match.name };
  } catch {
    return null;
  }
}
