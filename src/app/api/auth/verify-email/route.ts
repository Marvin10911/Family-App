export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`;

  if (!uid || !token) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=invalid`);
  }

  try {
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.redirect(`${appUrl}/verify-email?error=notfound`);
    }

    const data = userSnap.data()!;

    if (data.verificationToken !== token) {
      return NextResponse.redirect(`${appUrl}/verify-email?error=invalid`);
    }

    if (Date.now() > (data.verificationExpires ?? 0)) {
      return NextResponse.redirect(`${appUrl}/verify-email?error=expired`);
    }

    // Mark as verified in Firebase Auth
    await adminAuth.updateUser(uid, { emailVerified: true });

    // Clear token
    await adminDb.collection('users').doc(uid).update({
      verificationToken: null,
      verificationExpires: null,
    });

    return NextResponse.redirect(`${appUrl}/login?verified=true`);
  } catch (err: any) {
    return NextResponse.redirect(`${appUrl}/verify-email?error=server`);
  }
}
