import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { generateInviteCode, generateAvatarColor } from '@/lib/utils';
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

    // Check if user already has a family
    const userDoc = await adminDb.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }
    if (userDoc.data()?.familyId) {
      return NextResponse.json({ error: 'Du bist bereits Mitglied einer Familie' }, { status: 400 });
    }

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Familienname fehlt' }, { status: 400 });
    }

    const inviteCode = generateInviteCode();
    const familyRef = adminDb.collection('families').doc();

    // Use a batch to create family + update user atomically
    const batch = adminDb.batch();

    batch.set(familyRef, {
      name: name.trim(),
      inviteCode,
      ownerId: userId,
      members: [userId],
      settings: { theme: 'auto', language: 'de' },
      createdAt: FieldValue.serverTimestamp(),
    });

    batch.update(adminDb.doc(`users/${userId}`), {
      familyId: familyRef.id,
      role: 'owner',
      permissions: DEFAULT_PERMISSIONS.owner,
    });

    await batch.commit();

    return NextResponse.json({ familyId: familyRef.id, inviteCode });
  } catch (err: any) {
    console.error('createFamily error:', err);
    return NextResponse.json(
      { error: err.message || 'Fehler beim Erstellen der Familie' },
      { status: 500 }
    );
  }
}
