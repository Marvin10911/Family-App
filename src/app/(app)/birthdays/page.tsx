'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useBirthdays } from '@/hooks/use-family-data';
import {
  collection, addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Birthday } from '@/types';
import { Cake, Plus, Trash2, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const EMOJIS = ['🎂', '🎁', '🥳', '👶', '🧒', '👦', '👧', '🧑', '👩', '👨', '🧓', '👴', '👵', '🐶', '🐱', '⭐'];

function getDaysUntil(day: number, month: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  if (next < today) next = new Date(thisYear + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getAge(year: number, day: number, month: number): number {
  const today = new Date();
  const thisYear = today.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);
  return thisYear - year - (hasBirthdayPassed ? 0 : 1);
}

function sortByUpcoming(birthdays: Birthday[]): Birthday[] {
  return [...birthdays].sort((a, b) => getDaysUntil(a.day, a.month) - getDaysUntil(b.day, b.month));
}

export default function BirthdaysPage() {
  const { profile } = useAuth();
  const { data: birthdays, loading } = useBirthdays();
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState<string>('');
  const [emoji, setEmoji] = useState('🎂');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const sorted = sortByUpcoming(birthdays);
  const todayBirthdays = sorted.filter((b) => getDaysUntil(b.day, b.month) === 0);

  async function addBirthday() {
    if (!name.trim() || !profile?.familyId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'birthdays'), {
        familyId: profile.familyId,
        name: name.trim(),
        day,
        month,
        ...(year ? { year: parseInt(year) } : {}),
        emoji,
        note: note.trim() || null,
        createdBy: profile.id,
        createdAt: serverTimestamp(),
      });
      setName(''); setDay(1); setMonth(new Date().getMonth() + 1);
      setYear(''); setNote(''); setEmoji('🎂');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteBirthday(id: string) {
    await deleteDoc(doc(db, 'birthdays', id));
  }

  return (
    <div className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold"
        >
          Geburtstage
        </motion.h1>
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowForm(true)}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-500 text-white flex items-center justify-center shadow-lg"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Today's birthdays banner */}
      {todayBirthdays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl p-5 text-white text-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        >
          <div className="text-4xl mb-2">{todayBirthdays[0].emoji ?? '🎂'}</div>
          <div className="font-bold text-xl">Alles Gute, {todayBirthdays[0].name}!</div>
          {todayBirthdays[0].year && (
            <div className="text-sm opacity-85 mt-1">
              Wird heute {getAge(todayBirthdays[0].year, todayBirthdays[0].day, todayBirthdays[0].month)} Jahre alt 🎉
            </div>
          )}
        </motion.div>
      )}

      {/* Full list — alle Einträge inkl. heute, mit Löschen */}
      {loading ? (
        <div className="text-center text-ink-400 py-10">Lädt…</div>
      ) : sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-3xl p-8 text-center space-y-3"
        >
          <div className="text-5xl">🎂</div>
          <div className="font-semibold text-lg">Noch keine Geburtstage</div>
          <div className="text-sm text-ink-500">Tippe auf + um den ersten hinzuzufügen</div>
        </motion.div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sorted.map((b, i) => {
              const days = getDaysUntil(b.day, b.month);
              const isToday = days === 0;
              const isThisWeek = days > 0 && days <= 7;
              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm ${
                    isToday
                      ? 'bg-gradient-to-r from-pink-50 to-violet-50 dark:from-pink-950/30 dark:to-violet-950/30 border border-pink-200 dark:border-pink-800'
                      : 'glass'
                  }`}
                >
                  <div className="text-2xl w-10 text-center flex-shrink-0">{b.emoji ?? '🎂'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{b.name}</div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {b.day}. {MONTH_NAMES[b.month - 1]}
                      {b.year && ` · ${isToday ? getAge(b.year, b.day, b.month) : getAge(b.year, b.day, b.month) + 1} Jahre`}
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2.5 py-1.5 rounded-xl flex-shrink-0 ${
                    isToday
                      ? 'bg-pink-500 text-white'
                      : isThisWeek
                      ? 'bg-pink-500 text-white'
                      : 'bg-violet-600 text-white'
                  }`}>
                    {isToday ? 'Heute 🎉' : days === 1 ? 'Morgen' : `${days}d`}
                  </div>
                  <button
                    onClick={() => deleteBirthday(b.id)}
                    className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-400 flex-shrink-0 active:scale-90 transition-transform"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6"
            onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white dark:bg-ink-900 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Geburtstag hinzufügen</h2>
                <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Emoji picker */}
              <div>
                <label className="text-xs font-medium text-ink-500 mb-2 block">Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-9 h-9 rounded-xl text-lg transition-all ${emoji === e ? 'bg-violet-100 dark:bg-violet-950 scale-110' : 'bg-ink-50 dark:bg-ink-800'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-ink-500 mb-1.5 block">Name *</label>
                <input
                  className="input"
                  placeholder="z.B. Mama, Papa, Anna…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-500 mb-1.5 block">Tag</label>
                  <select
                    className="input"
                    value={day}
                    onChange={(e) => setDay(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>{d}.</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-500 mb-1.5 block">Monat</label>
                  <select
                    className="input"
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year (optional) */}
              <div>
                <label className="text-xs font-medium text-ink-500 mb-1.5 block">
                  Geburtsjahr <span className="font-normal">(optional, für Altersanzeige)</span>
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="z.B. 1990"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                />
              </div>

              <button
                onClick={addBirthday}
                disabled={saving || !name.trim()}
                className="btn-primary w-full py-3.5"
              >
                {saving ? 'Speichern…' : '🎂 Hinzufügen'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
