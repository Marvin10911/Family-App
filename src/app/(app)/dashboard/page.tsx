'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { Widget } from '@/components/dashboard/widget';
import {
  useShoppingItems,
  useTasks,
  useMealPlans,
  useCalendarEvents,
  useWasteEntries,
  useRecipes,
  useBirthdays,
} from '@/hooks/use-family-data';
import { useWeather } from '@/hooks/use-weather';
import {
  ShoppingCart,
  CheckSquare,
  UtensilsCrossed,
  Cloud,
  Trash2,
  Calendar as CalendarIcon,
  Users,
  Sparkles,
  BookOpen,
  Cake,
} from 'lucide-react';
import { formatDateDE, getTimeGreeting, getTimeEmoji } from '@/lib/utils';
import { WasteWidgetContent } from '@/components/dashboard/waste-widget-content';
import { WeatherWidgetContent } from '@/components/dashboard/weather-widget-content';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile, family } = useAuth();
  const { data: shopping } = useShoppingItems();
  const { data: tasks } = useTasks();
  const { data: meals } = useMealPlans();
  const { data: events } = useCalendarEvents();
  const { data: waste } = useWasteEntries();
  const { data: recipes } = useRecipes();
  const { data: birthdays } = useBirthdays();
  const weather = useWeather();

  function getDaysUntil(day: number, month: number) {
    const today = new Date(); today.setHours(0,0,0,0);
    let next = new Date(today.getFullYear(), month - 1, day);
    if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
    return Math.round((next.getTime() - today.getTime()) / 86400000);
  }
  const upcomingBirthdays = [...birthdays]
    .sort((a, b) => getDaysUntil(a.day, a.month) - getDaysUntil(b.day, b.month))
    .slice(0, 3);

  const openShopping = shopping.filter((i) => !i.checked);
  const openTasks = tasks.filter((t) => !t.completed);
  const today = new Date().toISOString().slice(0, 10);
  const todayMeal = meals.find((m) => m.date === today);
  const upcomingWaste = waste
    .filter((w) => new Date(w.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const upcomingEvents = events
    .filter((e) => {
      const d = e.startDate instanceof Date ? e.startDate : (e.startDate as any).toDate?.() ?? new Date();
      return d >= new Date(new Date().toDateString());
    })
    .slice(0, 3);

  const firstName = profile?.displayName.split(' ')[0] ?? '';

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between pt-2">
        <div>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-ink-500 mb-1"
          >
            {formatDateDE(new Date())}
          </motion.div>
          <div className="text-3xl font-bold tracking-tight leading-tight overflow-hidden">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {getTimeGreeting()},
            </motion.div>
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {firstName}{' '}
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 12 }}
                className="inline-block"
              >
                {getTimeEmoji()}
              </motion.span>
            </motion.div>
          </div>
        </div>

        {family && (
          <motion.div
            initial={{ opacity: 0, x: 16, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href="/family"
              className="rounded-xl px-3 py-2 bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-700 text-right shadow-sm block"
            >
              <div className="text-[11px] text-ink-500">Familie</div>
              <div className="font-semibold text-sm text-violet-600 dark:text-violet-400">
                {family.name}
              </div>
            </Link>
          </motion.div>
        )}
      </header>

      {/* Widget Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Widget
          href="/shopping"
          icon={ShoppingCart}
          title="Einkaufsliste"
          gradient="linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)"
          delay={0}
        >
          <div className="space-y-1">
            <AnimatedNumber value={openShopping.length} className="text-4xl font-bold" delay={0.1} />
            <div className="text-sm opacity-90">
              {openShopping.length === 1 ? 'offener Eintrag' : 'offene Einträge'}
            </div>
            {openShopping[0] && (
              <div className="mt-2 inline-flex items-center rounded-lg bg-white/25 px-2 py-1 text-xs font-medium backdrop-blur">
                {openShopping[0].name}
              </div>
            )}
          </div>
        </Widget>

        <Widget
          href="/tasks"
          icon={CheckSquare}
          title="Aufgaben"
          gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)"
          delay={0.05}
        >
          <div className="space-y-1">
            <AnimatedNumber value={openTasks.length} className="text-4xl font-bold" delay={0.15} />
            <div className="text-sm opacity-90">
              {openTasks.length === 0
                ? 'Alles erledigt!'
                : openTasks.length === 1
                ? 'offene Aufgabe'
                : 'offene Aufgaben'}
            </div>
            {openTasks.length === 0 && (
              <div className="mt-2 text-xs italic opacity-90">Super gemacht 🎉</div>
            )}
          </div>
        </Widget>

        <Widget
          href="/meals"
          icon={UtensilsCrossed}
          title="Essensplan"
          gradient="linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #06b6d4 100%)"
          delay={0.1}
        >
          <div className="space-y-1">
            <div className="text-sm opacity-90">Heute</div>
            <div className="font-semibold text-[15px] leading-tight">
              {todayMeal?.dinner || todayMeal?.lunch || 'Noch nichts geplant'}
            </div>
            {!todayMeal && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs bg-white/25 rounded-lg px-2 py-1 backdrop-blur">
                <Sparkles className="w-3 h-3" /> AI Vorschlag holen
              </div>
            )}
          </div>
        </Widget>

        <Widget
          href="/dashboard"
          icon={Cloud}
          title="Wetter"
          gradient="linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #6366f1 100%)"
          delay={0.15}
        >
          <WeatherWidgetContent {...weather} />
        </Widget>

        <Widget
          href="/waste"
          icon={Trash2}
          title="Müllplan"
          gradient="linear-gradient(135deg, #166534 0%, #16a34a 50%, #22c55e 100%)"
          delay={0.2}
          headerRight={
            family?.settings?.wasteLocation?.zipCode && (
              <div className="text-[11px] bg-white/25 rounded-md px-1.5 py-0.5 backdrop-blur">
                {family.settings.wasteLocation.zipCode}
              </div>
            )
          }
        >
          <WasteWidgetContent entries={upcomingWaste} />
        </Widget>

        <Widget
          href="/calendar"
          icon={CalendarIcon}
          title="Kalender"
          gradient="linear-gradient(135deg, #a855f7 0%, #d946ef 50%, #ec4899 100%)"
          delay={0.25}
        >
          {upcomingEvents.length === 0 ? (
            <div className="italic text-sm opacity-90">
              Keine kommenden Termine
            </div>
          ) : (
            <div className="space-y-1">
              {upcomingEvents.slice(0, 2).map((e) => (
                <div key={e.id} className="text-[13px] font-medium truncate">
                  {e.title}
                </div>
              ))}
            </div>
          )}
        </Widget>

        <Widget
          href="/recipes"
          icon={BookOpen}
          title="Rezeptbuch"
          gradient="linear-gradient(135deg, #f43f5e 0%, #f97316 50%, #fb923c 100%)"
          delay={0.3}
        >
          <div className="space-y-1">
            <AnimatedNumber value={recipes.length} className="text-4xl font-bold" delay={0.35} />
            <div className="text-sm opacity-90">
              {recipes.length === 1 ? 'Rezept' : 'Rezepte'}
            </div>
            {recipes.filter((r) => r.favorite).length > 0 && (
              <div className="mt-2 inline-flex items-center rounded-lg bg-white/25 px-2 py-1 text-xs font-medium backdrop-blur">
                ❤️ {recipes.filter((r) => r.favorite).length} Favoriten
              </div>
            )}
            {recipes.length === 0 && (
              <div className="mt-2 inline-flex items-center rounded-lg bg-white/25 px-2 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="w-3 h-3 mr-1" /> AI hinzufügen
              </div>
            )}
          </div>
        </Widget>

        <Widget
          href="/birthdays"
          icon={Cake}
          title="Geburtstage"
          gradient="linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #8b5cf6 100%)"
          delay={0.35}
        >
          {upcomingBirthdays.length === 0 ? (
            <div className="italic text-sm opacity-90">Keine eingetragen</div>
          ) : (
            <div className="space-y-1">
              {upcomingBirthdays.map((b) => {
                const days = getDaysUntil(b.day, b.month);
                return (
                  <div key={b.id} className="flex items-center justify-between gap-1">
                    <span className="text-[13px] font-medium truncate">
                      {b.emoji ?? '🎂'} {b.name}
                    </span>
                    <span className="text-[11px] bg-white/25 rounded px-1.5 py-0.5 backdrop-blur flex-shrink-0">
                      {days === 0 ? 'Heute!' : days === 1 ? 'Morgen' : `${days}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Widget>

        <Widget
          href="/family"
          icon={Users}
          title="Familie"
          gradient="linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb7185 100%)"
          delay={0.35}
          size="wide"
        >
          <div className="flex items-center gap-3 mt-1">
            <div
              className="w-12 h-12 rounded-full border-2 border-white/40 bg-white/20 flex items-center justify-center font-bold text-sm backdrop-blur"
            >
              {profile?.displayName
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{profile?.displayName}</div>
              <div className="text-xs opacity-80">
                {family?.members.length} Mitglied{family?.members.length !== 1 && 'er'}
              </div>
            </div>
          </div>
        </Widget>
      </div>
    </div>
  );
}
