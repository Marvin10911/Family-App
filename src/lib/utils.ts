import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'Guten Morgen';
  if (hour < 14) return 'Hallo';
  if (hour < 18) return 'Guten Nachmittag';
  return 'Guten Abend';
}

export function getTimeEmoji(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '🌙';
  if (hour < 11) return '👋';
  if (hour < 14) return '☀️';
  if (hour < 18) return '🌤️';
  if (hour < 21) return '🌅';
  return '🌙';
}

export function formatDateDE(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateAvatarColor(seed: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatRelativeDate(date: Date): string {
  const days = daysUntil(date);
  if (days === 0) return 'Heute';
  if (days === 1) return 'Morgen';
  if (days === -1) return 'Gestern';
  if (days > 0 && days < 7) return `In ${days} Tagen`;
  return formatDateShort(date);
}

const FOOD_EMOJI_MAP: [string[], string][] = [
  // Obst
  [['apfel', 'apple', 'äpfel'], '🍎'],
  [['birne', 'birnen'], '🍐'],
  [['banane', 'bananen'], '🍌'],
  [['orange', 'orangen', 'mandarine', 'mandarinen', 'clementine'], '🍊'],
  [['zitrone', 'zitronen', 'limette'], '🍋'],
  [['erdbeere', 'erdbeeren'], '🍓'],
  [['traube', 'trauben', 'weintraube'], '🍇'],
  [['melone', 'wassermelone'], '🍉'],
  [['pfirsich', 'nektarine'], '🍑'],
  [['kirsche', 'kirschen'], '🍒'],
  [['ananas'], '🍍'],
  [['mango', 'mangos'], '🥭'],
  [['kiwi'], '🥝'],
  [['avocado'], '🥑'],
  [['kokosnuss', 'kokos'], '🥥'],
  [['pflaume', 'pflaumen'], '🍑'],
  [['heidelbeere', 'heidelbeeren', 'blaubeere', 'blaubeeren'], '🫐'],
  // Gemüse
  [['tomate', 'tomaten', 'cherrytomaten'], '🍅'],
  [['karotte', 'karotten', 'möhre', 'möhren'], '🥕'],
  [['brokkoli'], '🥦'],
  [['salat', 'eisbergsalat', 'kopfsalat', 'feldsalat', 'rucola'], '🥬'],
  [['gurke', 'gurken'], '🥒'],
  [['paprika'], '🫑'],
  [['zwiebel', 'zwiebeln', 'rote zwiebel'], '🧅'],
  [['knoblauch'], '🧄'],
  [['kartoffel', 'kartoffeln', 'süßkartoffel'], '🥔'],
  [['champignon', 'pilze', 'pilz', 'steinpilz'], '🍄'],
  [['mais', 'maiskolben'], '🌽'],
  [['aubergine'], '🍆'],
  [['zucchini'], '🥒'],
  [['spinat', 'grünkohl'], '🥬'],
  [['sellerie', 'staudensellerie'], '🥬'],
  [['lauch', 'porree'], '🧅'],
  [['blumenkohl'], '🥦'],
  [['erbsen', 'erbse'], '🫛'],
  [['bohnen', 'bohne', 'grüne bohnen'], '🫘'],
  [['ingwer'], '🫚'],
  [['chili', 'chilis', 'peperoni'], '🌶️'],
  // Milchprodukte
  [['milch', 'vollmilch', 'hafermilch', 'mandelmilch', 'sojamilch'], '🥛'],
  [['käse', 'gouda', 'edamer', 'parmesan', 'mozzarella', 'camembert', 'brie', 'feta'], '🧀'],
  [['butter'], '🧈'],
  [['joghurt', 'quark', 'skyr'], '🥛'],
  [['sahne', 'schlagsahne', 'crème fraîche', 'schmand'], '🥛'],
  [['eier', 'ei', 'hühnereier'], '🥚'],
  // Fleisch & Fisch
  [['hühnchen', 'hähnchen', 'huhn', 'pute', 'putenbrust', 'hühnerbrust'], '🍗'],
  [['rind', 'rindfleisch', 'hackfleisch', 'beef', 'steak'], '🥩'],
  [['schwein', 'schweinefleisch', 'speck', 'schinken', 'salami', 'wurst', 'bratwurst', 'würstchen'], '🥓'],
  [['lachs', 'thunfisch', 'forelle', 'kabeljau', 'fisch', 'filet'], '🐟'],
  [['garnelen', 'shrimps', 'meeresfrüchte'], '🦐'],
  // Backwaren
  [['brot', 'vollkornbrot', 'toast', 'toastbrot', 'baguette'], '🍞'],
  [['brötchen', 'semmel', 'croissant'], '🥐'],
  [['kuchen', 'torte', 'muffin'], '🎂'],
  [['mehl', 'weizenmehl', 'dinkelmehl'], '🌾'],
  [['zucker', 'puderzucker', 'brauner zucker'], '🍬'],
  // Getränke
  [['wasser', 'mineralwasser', 'sprudelwasser'], '💧'],
  [['saft', 'orangensaft', 'apfelsaft'], '🧃'],
  [['cola', 'limonade', 'fanta', 'sprite'], '🥤'],
  [['kaffee', 'espresso', 'cappuccino'], '☕'],
  [['tee', 'kräutertee', 'grüner tee'], '🍵'],
  [['wein', 'rotwein', 'weißwein', 'sekt', 'prosecco'], '🍷'],
  [['bier'], '🍺'],
  [['smoothie', 'shake'], '🥤'],
  // Snacks & Süßes
  [['schokolade', 'schoko', 'nutella', 'kakao'], '🍫'],
  [['chips', 'crisps', 'snack', 'popcorn'], '🍿'],
  [['keks', 'kekse', 'cookies'], '🍪'],
  [['gummibärchen', 'bonbons', 'süßigkeiten'], '🍬'],
  [['eis', 'eiscrème', 'speiseeis'], '🍦'],
  [['honig'], '🍯'],
  [['marmelade', 'konfitüre'], '🍓'],
  // Basics & Gewürze
  [['nudeln', 'pasta', 'spaghetti', 'penne', 'tagliatelle'], '🍝'],
  [['reis'], '🍚'],
  [['öl', 'olivenöl', 'sonnenblumenöl', 'rapsöl'], '🫙'],
  [['essig', 'balsamico'], '🫙'],
  [['salz'], '🧂'],
  [['pfeffer'], '🌶️'],
  [['mayonnaise', 'mayo', 'ketchup', 'senf', 'soße', 'sauce'], '🥫'],
  [['tomatenmark', 'tomatensauce', 'passata'], '🥫'],
  [['linsen', 'kichererbsen'], '🫘'],
  [['müsli', 'haferflocken', 'cornflakes', 'granola'], '🌾'],
  // Haushalt
  [['toilettenpapier', 'klopapier', 'taschentücher'], '🧻'],
  [['spülmittel', 'waschmittel', 'reiniger', 'putzmittel'], '🧴'],
  [['zahnpasta', 'zahnbürste'], '🪥'],
  [['shampoo', 'duschgel', 'seife'], '🧴'],
  [['müllbeutel', 'mülltüten'], '🗑️'],
  [['alufolie', 'frischhaltefolie', 'backpapier'], '📦'],
  [['batterien', 'batterie'], '🔋'],
];

export function getItemEmoji(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const [keywords, emoji] of FOOD_EMOJI_MAP) {
    if (keywords.some((k) => lower.includes(k))) return emoji;
  }
  return '';
}
