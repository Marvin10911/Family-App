'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getFamilyMembers, removeFamilyMember, deleteFamily } from '@/lib/family/family-service';
import { UserProfile } from '@/types';
import { Users, Crown, Copy, Check, Trophy, UserMinus, LogOut, AlertTriangle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function FamilyPage() {
  const { profile, family, refreshFamily } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!family) return;
    getFamilyMembers(family.members).then((m) =>
      setMembers(m as UserProfile[])
    );
  }, [family]);

  const sorted = [...members].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const isOwner = profile?.id === family?.ownerId;

  async function copyCode() {
    if (!family) return;
    await navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function leaveFamily() {
    if (!profile?.familyId || !profile?.id) return;
    setLoading(true);
    try {
      await removeFamilyMember(profile.familyId, profile.id);
      await refreshFamily();
      router.replace('/onboarding');
    } finally {
      setLoading(false);
      setConfirmLeave(false);
    }
  }

  async function removeMember(userId: string) {
    if (!family?.id) return;
    setLoading(true);
    try {
      await removeFamilyMember(family.id, userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      await refreshFamily();
    } finally {
      setLoading(false);
      setConfirmRemove(null);
    }
  }

  async function handleDeleteFamily() {
    if (!family?.id) return;
    setLoading(true);
    try {
      await deleteFamily(family.id, family.members);
      await refreshFamily();
      router.replace('/onboarding');
    } finally {
      setLoading(false);
      setConfirmDelete(false);
    }
  }

  if (!family) return null;

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{family.name}</h1>
            <p className="text-sm text-ink-500">
              {family.members.length} Mitglied{family.members.length !== 1 && 'er'}
            </p>
          </div>
        </div>
      </header>

      {/* Invite Code */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-5 text-white relative overflow-hidden widget-bg-decor"
        style={{
          background:
            'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="text-xs opacity-90 uppercase tracking-wider mb-1">
            Einladungscode
          </div>
          <div className="flex items-center justify-between">
            <div className="text-4xl font-bold font-mono tracking-widest">
              {family.inviteCode}
            </div>
            <button
              onClick={copyCode}
              className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <div className="text-xs opacity-80 mt-2">
            Teile diesen Code mit Familienmitgliedern
          </div>
        </div>
      </motion.div>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
            Rangliste
          </h3>
        </div>
        <div className="space-y-2">
          {sorted.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card flex items-center gap-3 !p-3"
            >
              <div className="w-8 text-center font-bold text-ink-500">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
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
                  {m.role === 'owner' && (
                    <Crown className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <div className="text-xs text-ink-500 capitalize">{m.role}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-amber-500">{m.points ?? 0}</div>
                <div className="text-[10px] text-ink-500 uppercase">Punkte</div>
              </div>
              {/* Owner can remove non-owner members */}
              {isOwner && m.id !== profile?.id && (
                <button
                  onClick={() => setConfirmRemove(m.id)}
                  className="p-1.5 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Leave family (non-owners only) */}
      {!isOwner && (
        <button
          onClick={() => setConfirmLeave(true)}
          className="w-full py-3 rounded-2xl border border-red-200 dark:border-red-900 text-red-500 font-semibold flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
        >
          <LogOut className="w-4 h-4" /> Familie verlassen
        </button>
      )}

      {/* Delete family (owner only) */}
      {isOwner && (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full py-3 rounded-2xl border border-red-200 dark:border-red-900 text-red-500 font-semibold flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
        >
          <Trash2 className="w-4 h-4" /> Familie löschen
        </button>
      )}

      {/* Confirm: Leave */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmLeave(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-ink-900 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <div className="font-bold text-lg">Familie verlassen?</div>
                  <div className="text-sm text-ink-500">Dies kann nicht rückgängig gemacht werden.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 py-3 rounded-2xl bg-ink-100 dark:bg-ink-800 font-semibold text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={leaveFamily}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {loading ? 'Moment…' : 'Verlassen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm: Remove member */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmRemove(null)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-ink-900 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                  <UserMinus className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <div className="font-bold text-lg">Mitglied entfernen?</div>
                  <div className="text-sm text-ink-500">
                    {members.find((m) => m.id === confirmRemove)?.displayName} wird aus der Familie entfernt.
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="flex-1 py-3 rounded-2xl bg-ink-100 dark:bg-ink-800 font-semibold text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => removeMember(confirmRemove)}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {loading ? 'Moment…' : 'Entfernen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm: Delete family */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-ink-900 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <div className="font-bold text-lg">Familie löschen?</div>
                  <div className="text-sm text-ink-500">
                    Alle Daten werden unwiderruflich gelöscht.
                  </div>
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl px-4 py-3 text-xs text-red-600 dark:text-red-400 space-y-1">
                <div className="font-semibold">Folgendes wird gelöscht:</div>
                <div>Einkaufsliste · Aufgaben · Essensplan · Kalender · Müllplan · Rezepte</div>
                <div>Alle {family.members.length} Mitglieder werden aus der Familie entfernt.</div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-3 rounded-2xl bg-ink-100 dark:bg-ink-800 font-semibold text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeleteFamily}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {loading ? 'Löschen…' : 'Endgültig löschen'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
