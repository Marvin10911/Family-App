export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import crypto from 'crypto';

async function sendWithResend(to: string, subject: string, html: string) {
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[send-verification] Resend error:', res.status, body);
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

function buildEmailHtml(displayName: string, verifyUrl: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#8b5cf6 0%,#ec4899 50%,#f97316 100%);padding:40px 40px 32px;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">🏠</div>
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">Family App</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Deine smarte Familien-App</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700">Hallo ${displayName}! 👋</h2>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6">
            Willkommen bei Family App! Bitte bestätige deine E-Mail-Adresse, um deinen Account zu aktivieren.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px">
              <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:14px;letter-spacing:0.2px">
                E-Mail bestätigen →
              </a>
            </td></tr>
          </table>
          <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
              🔒 Dieser Link ist <strong>24 Stunden</strong> gültig.<br>
              Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.
            </p>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
            Link funktioniert nicht? Kopiere diese URL in deinen Browser:<br>
            <span style="color:#8b5cf6;word-break:break-all">${verifyUrl}</span>
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0">
          <p style="margin:0;color:#94a3b8;font-size:12px">© Family App · Mit ❤️ für deine Familie</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function POST(req: NextRequest) {
  try {
    const { uid, email, displayName } = await req.json();
    if (!uid || !email) return NextResponse.json({ error: 'uid and email required' }, { status: 400 });

    // Generate secure token with 24h expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 24 * 60 * 60 * 1000;

    await adminDb.collection('users').doc(uid).update({
      verificationToken: token,
      verificationExpires: expires,
    });

    const verifyUrl = `${getAppUrl()}/api/auth/verify-email?uid=${uid}&token=${token}`;

    if (process.env.RESEND_API_KEY) {
      try {
        await sendWithResend(
          email,
          '✉️ Bestätige deine E-Mail – Family App',
          buildEmailHtml(displayName ?? 'dort', verifyUrl),
        );
        console.log('[send-verification] Sent via Resend to', email);
        return NextResponse.json({ method: 'resend' });
      } catch (resendErr: any) {
        console.error('[send-verification] Resend failed, falling back to Firebase:', resendErr.message);
        // Fall through to Firebase fallback
      }
    } else {
      console.warn('[send-verification] RESEND_API_KEY not set – using Firebase fallback');
    }

    // Firebase fallback
    return NextResponse.json({ method: 'firebase-fallback' });
  } catch (err: any) {
    console.error('[send-verification] Fatal error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
