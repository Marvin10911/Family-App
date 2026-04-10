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
import { Trash2, Sparkles, Plus, X, AlertCircle, Wifi, Bot, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

const WASTE_TYPES: WasteType[] = ['Restmüll', 'Biotonne', 'Gelbe Tonne', 'Altpapier', 'Sperrmüll', 'Glas'];

const SOURCE_BADGES: Record<string, { label: string; color: string; icon: any }> = {
  awido: { label: 'Echte Daten', color: 'text-green-600 bg-green-50 dark:bg-green-950/30', icon: Wifi },
  ical:  { label: 'iCal-Kalender', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30', icon: Calendar },
  ai:    { label: 'KI-Schätzung', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30', icon: Bot },
};

export default function WastePage() {
  const { profile, family } = useAuth();
  const { data: entries } = useWasteEntries();
  const [loading, setLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<WasteType>('Restmüll');
  const [error, setError] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<{ source: string; label: string } | null>(null);

  const location = family?.settings?.wasteLocation;
  const icalUrl = (family?.settings as any)?.wasteIcalUrl;

  const sortedEntries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...entries]
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  async function fetchPlan() {
    if (!location || !profile?.familyId) return;
    setLoading(true);
    setError(null);
    setSourceInfo(null);
    try {
      const res = await fetch('/api/waste-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: location.city,
          zipCode: location.zipCode,
          state: location.state,
          icalUrl: icalUrl || '',
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Fehler');
      }
      const { entries: newEntries, source, sourceLabel } = await res.json();

      // Clear old entries
      const old = await getDocs(
        query(collection(db, 'wasteEntries'), where('familyId', '==', profile.familyId))
      );
      const batch = writeBatch(db);
      old.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      // Add new entries
      const batch2 = writeBatch(db);
      for (const entry of newEntries || []) {
        const ref = doc(collection(db, 'wasteEntries'));
        batch2.set(ref, {
          familyId: profile.familyId,
          date: entry.date,
          type: entry.type,
          color: WASTE_COLORS[entry.type as WasteType] || '#6b7280',
          notified: false,
          note: entry.note || '',
          createdAt: serverTimestamp(),
        });
      }
      await batch2.commit();
      setSourceInfo({ source, label: sourceLabel });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
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
      createdAt: serverTimestamp(),
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
              {location ? `${location.city} · ${location.zipCode}` : 'Kein Standort'}
            </p>
          </div>
        </div>
      </header>

      {!location ? (
        <Link
          href="/admin"
          className="card flex items-center gap-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-900"
        >
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <div>
            <div className="font-semibold">Standort konfigurieren</div>
            <div className="text-sm text-ink-500">
              Standort im Admin-Bereich einstellen.
            </div>
          </div>
        </Link>
      ) : (
        <button
          onClick={fetchPlan}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.02] transition-transform shadow-widget"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Suche Termine…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Müllplan laden
            </>
          )}
        </button>
      )}

      {/* Source badge */}
      {sourceInfo && (() => {
        const badge = SOURCE_BADGES[sourceInfo.source] || SOURCE_BADGES.ai;
        const Icon = badge.icon;
        return (
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl ${badge.color}`}>
            <Icon className="w-3.5 h-3.5" />
            {badge.label}: {sourceInfo.label}
            {sourceInfo.source === 'ai' && (
              <span className="opacity-70 ml-1">— Termine manuell prüfen</span>
            )}
          </div>
        );
      })()}

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
            {WASTE_TYPES.map((t) => <option key={t}>{t}</option>)}
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
          <div className="text-xs text-ink-400 mt-1">„Müllplan laden" startet die automatische Suche</div>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedEntries.map((entry, i) => {
            const d = new Date(entry.date);
            const daysLeft = Math.ceil((d.getTime() - Date.now()) / 864e5);
            const isToday = daysLeft === 0;
            const isSoon = daysLeft <= 2;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`card flex items-center gap-3 !p-4 ${isSoon ? 'ring-1 ring-amber-400' : ''}`}
              >
                <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {entry.type}
                    {(entry as any).note && (
                      <span className="text-[10px] text-amber-500 font-normal">{(entry as any).note}</span>
                    )}
                  </div>
                  <div className="text-sm text-ink-500">
                    {d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-2xl font-bold ${isToday ? 'text-red-500' : isSoon ? 'text-amber-500' : ''}`}>
                    {isToday ? '!' : daysLeft}
                  </div>
                  <div className="text-[10px] text-ink-500 uppercase">
                    {isToday ? 'Heute' : daysLeft === 1 ? 'Tag' : 'Tage'}
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
