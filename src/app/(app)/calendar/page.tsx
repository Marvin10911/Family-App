'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useCalendarEvents } from '@/hooks/use-family-data';
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Calendar as CalendarIcon, Plus, X, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = [
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#ef4444',
];

function toDate(val: any): Date {
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const { data: events } = useCalendarEvents();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const sorted = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((e) => toDate(e.startDate).getTime() >= now - 86400000)
      .sort(
        (a, b) =>
          toDate(a.startDate).getTime() - toDate(b.startDate).getTime()
      );
  }, [events]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof sorted> = {};
    for (const e of sorted) {
      const d = toDate(e.startDate);
      const key = d.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return groups;
  }, [sorted]);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date || !profile?.familyId) return;

    const [h, m] = time.split(':').map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0);
    const end = new Date(start);
    end.setHours(h + 1);

    await addDoc(collection(db, 'calendarEvents'), {
      familyId: profile.familyId,
      title,
      startDate: Timestamp.fromDate(start),
      endDate: Timestamp.fromDate(end),
      allDay: false,
      members: [profile.id],
      color,
      location,
      createdBy: profile.id,
      createdAt: serverTimestamp(),
    });

    setTitle('');
    setDate('');
    setLocation('');
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      <header className="pt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kalender</h1>
            <p className="text-sm text-ink-500">{sorted.length} kommende Termine</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-xl bg-ink-900 text-white dark:bg-white dark:text-ink-900 flex items-center justify-center"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        </button>
      </header>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={addEvent}
            className="glass rounded-2xl p-4 shadow-widget space-y-3"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titel"
              className="input"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
                required
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input"
              />
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ort (optional)"
              className="input"
            />
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${
                    color === c ? 'ring-2 ring-offset-2 ring-ink-900 dark:ring-white' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button type="submit" className="btn-primary w-full">
              Termin hinzufügen
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <CalendarIcon className="w-12 h-12 text-ink-200 dark:text-ink-700 mx-auto mb-3" />
          <div className="text-ink-500">Keine kommenden Termine</div>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2 px-1">
                {day}
              </h3>
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const d = toDate(event.startDate);
                  return (
                    <motion.div
                      key={event.id}
                      layout
                      className="card flex items-start gap-3 !p-4"
                    >
                      <div
                        className="w-1 self-stretch rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{event.title}</div>
                        <div className="flex items-center gap-3 text-xs text-ink-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {d.toLocaleTimeString('de-DE', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDoc(doc(db, 'calendarEvents', event.id))}
                        className="p-1 text-ink-500 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
