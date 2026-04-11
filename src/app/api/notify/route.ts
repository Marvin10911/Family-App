export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const { familyId, title, body, url = '/dashboard', excludeUserId } = await req.json();

    if (!familyId || !title || !body) {
      return NextResponse.json({ error: 'familyId, title and body required' }, { status: 400 });
    }

    const familySnap = await adminDb.collection('families').doc(familyId).get();
    if (!familySnap.exists) return NextResponse.json({ sent: 0 });

    const memberIds: string[] = familySnap.data()?.members ?? [];

    const tokens: string[] = [];
    for (const uid of memberIds) {
      if (uid === excludeUserId) continue;
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const token = userSnap.data()?.pushToken;
      if (token) tokens.push(token);
    }

    if (tokens.length === 0) return NextResponse.json({ sent: 0 });

    const result = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { url },
      webpush: {
        notification: { icon: '/icon.svg', badge: '/icon.svg', vibrate: [200, 100, 200] as any },
        fcmOptions: { link: url },
      },
    });

    return NextResponse.json({ sent: result.successCount, failed: result.failureCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
