'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useMealPlans } from '@/hooks/use-family-data';
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { UtensilsCrossed, Sparkles, ChefHat, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default function MealsPage() {
  const { profile } = useAuth();
  const { data: mealPlans } = useMealPlans();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState('');

  const weekDates = getWeekDates();

  function getMeal(date: string) {
    return mealPlans.find((m) => m.date === date);
  }

  async function generateWeek() {
    if (!profile?.familyId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences, mode: 'week' }),
      });
      const { plan } = await res.json();

      for (let i = 0; i < DAYS.length; i++) {
        const day = plan?.[i];
        if (!day) continue;
        const date = weekDates[i];
        await setDoc(doc(db, 'mealPlans', `${profile.familyId}_${date}`), {
          familyId: profile.familyId,
          date,
          lunch: day.lunch,
          dinner: day.dinner,
          aiGenerated: true,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function updateMeal(date: string, field: 'lunch' | 'dinner', value: string) {
    if (!profile?.familyId) return;
    const existing = getMeal(date);
    await setDoc(
      doc(db, 'mealPlans', `${profile.familyId}_${date}`),
      {
        familyId: profile.familyId,
        date,
        ...existing,
        [field]: value,
        aiGenerated: false,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return (
    <div className="space-y-5">
      <header className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Essensplan</h1>
            <p className="text-sm text-ink-500">Deine Woche</p>
          </div>
        </div>
      </header>

      {/* AI Generator */}
      <div className="glass rounded-2xl p-4 shadow-widget">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-violet-500" />
          <div className="font-semibold text-sm">AI Wochenplan-Generator</div>
        </div>
        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="Vorlieben, Allergien, Budget… (optional)"
          rows={2}
          className="input mb-3 !py-2 text-sm resize-none"
        />
        <button
          onClick={generateWeek}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              AI kocht vor…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Wochenplan generieren
            </>
          )}
        </button>
      </div>

      {/* Week */}
      <div className="space-y-3">
        {DAYS.map((day, i) => {
          const date = weekDates[i];
          const meal = getMeal(date);
          const isToday = date === new Date().toISOString().slice(0, 10);
          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`card ${isToday ? 'ring-2 ring-teal-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold">{day}</div>
                  <div className="text-xs text-ink-500">
                    {new Date(date).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </div>
                </div>
                {isToday && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500 text-white font-semibold">
                    Heute
                  </span>
                )}
                {meal?.aiGenerated && (
                  <Sparkles className="w-3 h-3 text-violet-500" />
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] font-semibold text-ink-500 uppercase mb-1">
                    Mittag
                  </div>
                  <input
                    value={meal?.lunch || ''}
                    onChange={(e) => updateMeal(date, 'lunch', e.target.value)}
                    placeholder="—"
                    className="w-full bg-transparent outline-none font-medium"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-ink-500 uppercase mb-1">
                    Abend
                  </div>
                  <input
                    value={meal?.dinner || ''}
                    onChange={(e) => updateMeal(date, 'dinner', e.target.value)}
                    placeholder="—"
                    className="w-full bg-transparent outline-none font-medium"
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
