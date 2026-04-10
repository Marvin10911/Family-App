'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MailCheck, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Suspense } from 'react';

const ERROR_MAP: Record<string, { icon: typeof AlertTriangle; color: string; title: string; desc: string }> = {
  invalid: {
    icon: AlertTriangle,
    color: 'from-red-400 to-rose-500',
    title: 'Ungültiger Link',
    desc: 'Dieser Bestätigungslink ist ungültig. Bitte registriere dich erneut oder fordere einen neuen Link an.',
  },
  expired: {
    icon: Clock,
    color: 'from-amber-400 to-orange-500',
    title: 'Link abgelaufen',
    desc: 'Dieser Link ist abgelaufen (gültig für 24 Stunden). Melde dich an — wir senden dir automatisch einen neuen.',
  },
  notfound: {
    icon: AlertTriangle,
    color: 'from-red-400 to-rose-500',
    title: 'Account nicht gefunden',
    desc: 'Zu diesem Link wurde kein Account gefunden.',
  },
  server: {
    icon: AlertTriangle,
    color: 'from-slate-400 to-gray-500',
    title: 'Serverfehler',
    desc: 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.',
  },
};

function VerifyEmailContent() {
  const params = useSearchParams();
  const error = params.get('error');

  if (error) {
    const info = ERROR_MAP[error] ?? ERROR_MAP.server;
    const Icon = info.icon;
    return (
      <div className="glass rounded-3xl p-8 shadow-widget text-center space-y-5 w-full max-w-md">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${info.color} flex items-center justify-center mx-auto shadow-lg`}
        >
          <Icon className="w-10 h-10 text-white" />
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold mb-2">{info.title}</h1>
          <p className="text-ink-500 dark:text-ink-300 text-sm leading-relaxed">{info.desc}</p>
        </div>
        <Link href="/login" className="btn-primary w-full py-3.5 flex items-center justify-center gap-2">
          Zur Anmeldung <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Shown briefly while the API redirect is happening
  return (
    <div className="glass rounded-3xl p-8 shadow-widget text-center space-y-5 w-full max-w-md">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mx-auto shadow-lg"
      >
        <MailCheck className="w-10 h-10 text-white" />
      </motion.div>
      <div>
        <h1 className="text-2xl font-bold mb-2">E-Mail wird bestätigt…</h1>
        <div className="flex justify-center mt-3">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center p-6">
      <Suspense fallback={null}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
