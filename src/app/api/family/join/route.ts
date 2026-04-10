import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { DEFAULT_PERMISSIONS } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    // Verify auth token
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const { inviteCode } = await req.json();
    if (!inviteCode?.trim()) {
      return NextResponse.json({ error: 'Einladungscode fehlt' }, { status: 400 });
    }

    // Check user doc
    const userDoc = await adminDb.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    if (userDoc.data()?.familyId) {
      return NextResponse.json({ error: 'Du bist bereits Mitglied einer Familie' }, { status: 400 });
    }

    // Find family by invite code
    const snap = await adminDb
      .collection('families')
      .where('inviteCode', '==', inviteCode.trim().toUpperCase())
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ error: 'Ungültiger Einladungscode' }, { status: 404 });
    }

    const familyDoc = snap.docs[0];
    const familyId = familyDoc.id;

    // Check not already a member
    const members: string[] = familyDoc.data().members || [];
    if (members.includes(userId)) {
      return NextResponse.json({ error: 'Du bist bereits Mitglied dieser Familie' }, { status: 400 });
    }

    // Atomically update family members + user
    const batch = adminDb.batch();

    batch.update(adminDb.doc(`families/${familyId}`), {
      members: FieldValue.arrayUnion(userId),
    });

    batch.update(adminDb.doc(`users/${userId}`), {
      familyId,
      role: 'adult',
      permissions: DEFAULT_PERMISSIONS.adult,
    });

    await batch.commit();

    return NextResponse.json({ familyId });
  } catch (err: any) {
    console.error('joinFamily error:', err);
    return NextResponse.json(
      { error: err.message || 'Fehler beim Beitreten' },
      { status: 500 }
    );
  }
}
