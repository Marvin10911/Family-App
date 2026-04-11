'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import {
  regenerateInviteCode,
  updateFamilySettings,
  getFamilyMembers,
  updateUserRole,
  removeFamilyMember,
} from '@/lib/family/family-service';
import { registerFcmToken } from '@/lib/notifications/fcm';
import { UserProfile, UserRole } from '@/types';
import {
  Settings,
  Users,
  MapPin,
  RefreshCw,
  LogOut,
  Bell,
  Palette,
  Trash2,
  Key,
  Save,
  Crown,
  ShieldCheck,
  Moon,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Tab = 'users' | 'location' | 'notifications' | 'appearance' | 'account';

export default function AdminPage() {
  const router = useRouter();
  const { profile, family, signOut, refreshProfile, refreshFamily } = useAuth();
  const [tab, setTab] = useState<Tab>('users');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [state, setState] = useState('');
  const [icalUrl, setIcalUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported' | 'loading'>('unknown');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission as any);
    } else {
      setNotifStatus('unsupported');
    }
  }, []);

  async function enableNotifications() {
    if (!profile?.id) return;
    setNotifStatus('loading');
    const result = await registerFcmToken(profile.id);
    setNotifStatus(result);
  }

  useEffect(() => {
    if (family?.members) {
      getFamilyMembers(family.members).then((m) => setMembers(m as UserProfile[]));
    }
    if (family?.settings.wasteLocation) {
      setCity(family.settings.wasteLocation.city);
      setZipCode(family.settings.wasteLocation.zipCode);
      setState(family.settings.wasteLocation.state);
    }
    setIcalUrl((family?.settings as any)?.wasteIcalUrl || '');
    setTheme((family?.settings.theme as any) || 'auto');
  }, [family]);

  async function saveLocation() {
    if (!family) return;
    setSaving(true);
    await updateFamilySettings(family.id, {
      wasteLocation: { city, zipCode, state, country: 'DE' },
      wasteIcalUrl: icalUrl.trim(),
    } as any);
    await refreshFamily();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function regenCode() {
    if (!family) return;
    await regenerateInviteCode(family.id);
    await refreshFamily();
  }

  async function saveTheme(t: 'light' | 'dark' | 'auto') {
    setTheme(t);
    if (!family) return;
    await updateFamilySettings(family.id, { theme: t });
    if (t === 'dark') document.documentElement.classList.add('dark');
    else if (t === 'light') document.documentElement.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  }

  async function changeRole(userId: string, role: UserRole) {
    await updateUserRole(userId, role);
    if (family) {
      getFamilyMembers(family.members).then((m) => setMembers(m as UserProfile[]));
    }
  }

  async function handleLogout() {
    await signOut();
    router.push('/login');
  }

  const isOwner = profile?.role === 'owner' || profile?.role === 'admin';

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'users', label: 'Mitglieder', icon: Users },
    { id: 'location', label: 'Standort', icon: MapPin },
    { id: 'notifications', label: 'Benachr.', icon: Bell },
    { id: 'appearance', label: 'Design', icon: Palette },
    { id: 'account', label: 'Account', icon: UserIcon },
  ];

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 flex items-center justify-center shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Einstellungen</h1>
            <p className="text-sm text-ink-500">Admin & Konfiguration</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 -mx-5 px-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              tab === t.id
                ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                : 'bg-white dark:bg-ink-900 text-ink-500 border border-ink-100 dark:border-ink-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        {tab === 'users' && family && (
          <>
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-ink-500 uppercase tracking-wider">
                    Einladungscode
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-widest mt-1">
                    {family.inviteCode}
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={regenCode}
                    className="p-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-700"
                    title="Neu generieren"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {members.map((m) => (
              <div key={m.id} className="card flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {m.displayName
                    ?.split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-1.5">
                    {m.displayName}
                    {m.role === 'owner' && <Crown className="w-3 h-3 text-amber-500" />}
                  </div>
                  <div className="text-xs text-ink-500">{m.email}</div>
                </div>
                {isOwner && m.id !== family.ownerId && (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value as UserRole)}
                    className="text-xs bg-ink-100 dark:bg-ink-700 rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="adult">Erwachsen</option>
                    <option value="child">Kind</option>
                  </select>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'location' && (
          <div className="card space-y-3">
            <div className="text-sm text-ink-500 mb-1">
              Standort für Müllplan und lokale Funktionen
            </div>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ort (z.B. München)"
              className="input"
            />
            <input
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="PLZ (z.B. 80331)"
              className="input"
            />
            <input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Bundesland (z.B. Bayern)"
              className="input"
            />
            <div>
              <div className="text-xs text-ink-500 mb-1.5">
                iCal-URL (optional) — für 100% genaue Daten von deiner Stadtwebseite
              </div>
              <input
                value={icalUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                placeholder="https://www.deine-stadt.de/abfall.ics"
                className="input text-xs"
              />
            </div>
            <button
              onClick={saveLocation}
              disabled={saving}
              className="btn-primary w-full"
            >
              {saving ? (
                'Speichere…'
              ) : saved ? (
                <>
                  ✓ Gespeichert
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Speichern
                </>
              )}
            </button>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-3">
            <div className="card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Push-Benachrichtigungen</div>
                  <div className="text-xs text-ink-500 mt-0.5">
                    Erhalte Erinnerungen für Müll, Termine und neue Aufgaben
                  </div>
                </div>
                {notifStatus === 'granted' ? (
                  <div className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                    ✓ Aktiv
                  </div>
                ) : notifStatus === 'denied' ? (
                  <div className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold">
                    Blockiert
                  </div>
                ) : notifStatus === 'unsupported' ? (
                  <div className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-ink-100 dark:bg-ink-800 text-ink-500 text-xs font-semibold">
                    Nicht unterstützt
                  </div>
                ) : (
                  <button
                    onClick={enableNotifications}
                    disabled={notifStatus === 'loading'}
                    className="flex-shrink-0 btn-primary disabled:opacity-50"
                  >
                    {notifStatus === 'loading' ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Aktivieren'
                    )}
                  </button>
                )}
              </div>
              {notifStatus === 'denied' && (
                <p className="text-xs text-ink-500 bg-ink-50 dark:bg-ink-800 rounded-xl px-3 py-2">
                  Benachrichtigungen sind im Browser blockiert. Erlaube sie in den Browser-Einstellungen unter Datenschutz → Benachrichtigungen.
                </p>
              )}
            </div>

            {notifStatus === 'granted' && (
              <div className="card space-y-3">
                <div className="text-sm font-semibold text-ink-700 dark:text-ink-300">Was du bekommst</div>
                {[
                  { icon: '🗑️', title: 'Müll-Erinnerung', desc: 'Jeden Abend, wenn morgen Müll abgeholt wird' },
                  { icon: '📅', title: 'Kalender-Erinnerung', desc: 'Jeden Abend für Termine am nächsten Tag' },
                  { icon: '✅', title: 'Neue Aufgaben', desc: 'Wenn ein Familienmitglied eine Aufgabe erstellt' },
                ].map((item) => (
                  <div key={item.title} className="flex items-center gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-ink-500">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'appearance' && (
          <div className="card space-y-3">
            <div className="text-sm font-semibold mb-1">Theme</div>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'auto'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => saveTheme(t)}
                  className={`p-3 rounded-xl border-2 transition ${
                    theme === t
                      ? 'border-ink-900 dark:border-white'
                      : 'border-ink-100 dark:border-ink-700'
                  }`}
                >
                  {t === 'light' ? (
                    <Sun className="w-5 h-5 mx-auto mb-1" />
                  ) : t === 'dark' ? (
                    <Moon className="w-5 h-5 mx-auto mb-1" />
                  ) : (
                    <Palette className="w-5 h-5 mx-auto mb-1" />
                  )}
                  <div className="text-xs font-medium capitalize">{t}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'account' && (
          <div className="space-y-3">
            <div className="card">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: profile?.avatarColor }}
                >
                  {profile?.displayName
                    ?.split(' ')
                    .map((p) => p[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{profile?.displayName}</div>
                  <div className="text-xs text-ink-500">{profile?.email}</div>
                  <div className="text-xs text-amber-500 capitalize mt-0.5">
                    {profile?.role} · {profile?.points ?? 0} Punkte
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="card w-full flex items-center justify-center gap-2 text-red-500 font-medium"
            >
              <LogOut className="w-4 h-4" /> Abmelden
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
