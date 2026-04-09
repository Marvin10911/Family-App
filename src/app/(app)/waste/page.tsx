'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useWasteEntries } from '@/hooks/use-family-data';
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { WasteType, WASTE_COLORS, WasteEntry } from '@/types';
import { Trash2, Sparkles, Plus, MapPin, X, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const WASTE_TYPES: WasteType[] = [
  'Restmüll',
  'Biotonne',
  'Gelbe Tonne',
  'Altpapier',
  'Sperrmüll',
  'Glas',
];

export default function WastePage() {
  const { profile, family } = useAuth();
  const { data: entries } = useWasteEntries();
  const [aiLoading, setAiLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<WasteType>('Restmüll');
  const [error, setError] = useState<string | null>(null);

  const location = family?.settings?.wasteLocation;

  const sortedEntries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...entries]
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  async function generateAIPlan() {
    if (!location || !profile?.familyId) return;
    setAiLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'AI-Fehler');
      }
      const { entries: aiEntries } = await res.json();

      // Clear old entries
      const old = await getDocs(
        query(
          collection(db, 'wasteEntries'),
          where('familyId', '==', profile.familyId)
        )
      );
      const batch = writeBatch(db);
      old.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      // Add new
      const batch2 = writeBatch(db);
      for (const entry of aiEntries || []) {
        const ref = doc(collection(db, 'wasteEntries'));
        batch2.set(ref, {
          familyId: profile.familyId,
          date: entry.date,
          type: entry.type,
          color: WASTE_COLORS[entry.type as WasteType] || '#6b7280',
          notified: false,
          note: entry.note || '',
        });
      }
      await batch2.commit();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function addManual() {
    if (!newDate || !profile?.familyId) return;
    await addDoc(collection(db, 'wasteEntries'), {
      familyId: profile.familyId,
      date: newDate,
      type: newType,
      color: WASTE_COLORS[newType],
      notified: false,
    });
    setNewDate('');
  }

  return (
    <div className="space-y-5">
      <header className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-600 to-green-500 flex items-center justify-center shadow-lg">
            <Trash2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Müllplan</h1>
            <p className="text-sm text-ink-500">
              {location
                ? `${location.city} · ${location.zipCode}`
                : 'Kein Standort'}
            </p>
          </div>
        </div>
      </header>

      {!location ? (
        <Link
          href="/admin"
          className="card flex items-center gap-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-900"
        >
          <AlertCircle className="w-6 h-6 text-amber-500" />
          <div>
            <div className="font-semibold">Standort konfigurieren</div>
            <div className="text-sm text-ink-500">
              Um den AI-Müllplan zu nutzen, stelle zuerst den Standort im Admin-Bereich ein.
            </div>
          </div>
        </Link>
      ) : (
        <button
          onClick={generateAIPlan}
          disabled={aiLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform shadow-widget"
        >
          {aiLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              AI erstellt Plan…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> AI-Müllplan generieren
            </>
          )}
        </button>
      )}

      {error && (
        <div className="card bg-red-50 dark:bg-red-950/30 border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Manual Add */}
      <div className="glass rounded-2xl p-3 shadow-widget">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="flex-1 bg-transparent px-2 py-2 outline-none text-sm"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as WasteType)}
            className="bg-transparent text-sm outline-none"
          >
            {WASTE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={addManual}
            disabled={!newDate}
            className="p-2.5 rounded-xl bg-ink-900 text-white dark:bg-white dark:text-ink-900 disabled:opacity-30"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      {sortedEntries.length === 0 ? (
        <div className="text-center py-12">
          <Trash2 className="w-12 h-12 text-ink-200 dark:text-ink-700 mx-auto mb-3" />
          <div className="text-ink-500">Noch keine Termine</div>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedEntries.map((entry, i) => {
            const d = new Date(entry.date);
            const daysLeft = Math.ceil(
              (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card flex items-center gap-3 !p-4"
              >
                <div
                  className="w-1.5 h-12 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <div className="flex-1">
                  <div className="font-semibold">{entry.type}</div>
                  <div className="text-sm text-ink-500">
                    {d.toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{daysLeft}</div>
                  <div className="text-[10px] text-ink-500 uppercase">
                    {daysLeft === 1 ? 'Tag' : 'Tage'}
                  </div>
                </div>
                <button
                  onClick={() => deleteDoc(doc(db, 'wasteEntries', entry.id))}
                  className="p-1.5 text-ink-500 hover:text-red-500 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
