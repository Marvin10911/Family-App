'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { getFamilyMembers } from '@/lib/family/family-service';
import { UserProfile } from '@/types';
import { Users, Crown, Copy, Check, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FamilyPage() {
  const { profile, family } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!family) return;
    getFamilyMembers(family.members).then((m) =>
      setMembers(m as UserProfile[])
    );
  }, [family]);

  const sorted = [...members].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));

  async function copyCode() {
    if (!family) return;
    await navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!family) return null;

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
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
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
