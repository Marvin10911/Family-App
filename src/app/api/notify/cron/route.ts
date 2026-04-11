export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase/admin';

// Vercel calls this with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  let totalSent = 0;

  const familiesSnap = await adminDb.collection('families').get();

  for (const familyDoc of familiesSnap.docs) {
    const family = familyDoc.data();
    const familyId = familyDoc.id;

    // Collect FCM tokens for this family
    const tokens: string[] = [];
    for (const uid of (family.members as string[] ?? [])) {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const token = userSnap.data()?.pushToken;
      if (token) tokens.push(token);
    }
    if (tokens.length === 0) continue;

    const notifications: { title: string; body: string; url: string }[] = [];

    // ── Müll-Erinnerungen ────────────────────────────────────────────────────
    const wasteSnap = await adminDb
      .collection('wasteEntries')
      .where('familyId', '==', familyId)
      .where('date', '==', tomorrowStr)
      .get();

    for (const w of wasteSnap.docs) {
      const data = w.data();
      notifications.push({
        title: '🗑️ Müll-Erinnerung',
        body: `Morgen wird ${data.type ?? 'Müll'} abgeholt!`,
        url: '/waste',
      });
    }

    // ── Kalender-Erinnerungen ────────────────────────────────────────────────
    const eventsSnap = await adminDb
      .collection('calendarEvents')
      .where('familyId', '==', familyId)
      .get();

    for (const evtDoc of eventsSnap.docs) {
      const evt = evtDoc.data();
      const startDate =
        typeof evt.startDate?.toDate === 'function'
          ? evt.startDate.toDate()
          : new Date(evt.startDate);
      if (startDate.toISOString().slice(0, 10) === tomorrowStr) {
        notifications.push({
          title: '📅 Termin morgen',
          body: evt.title ?? 'Termin',
          url: '/calendar',
        });
      }
    }

    // ── Send all notifications for this family ───────────────────────────────
    for (const notif of notifications) {
      try {
        const result = await adminMessaging.sendEachForMulticast({
          tokens,
          notification: { title: notif.title, body: notif.body },
          data: { url: notif.url },
          webpush: {
            notification: { icon: '/icon.svg' },
            fcmOptions: { link: notif.url },
          },
        });
        totalSent += result.successCount;
      } catch {
        // continue on error
      }
    }
  }

  return NextResponse.json({ ok: true, totalSent, date: tomorrowStr });
}
