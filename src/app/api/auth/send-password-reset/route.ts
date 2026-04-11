export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { sendEmail } from '@/lib/email/mailer';

function buildResetHtml(resetUrl: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr><td style="background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 50%,#ec4899 100%);padding:40px 40px 32px;text-align:center">
          <div style="font-size:48px;margin-bottom:12px">🔐</div>
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">Family App</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Passwort zurücksetzen</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700">Passwort vergessen?</h2>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6">
            Klicke auf den Button unten, um dein Passwort zurückzusetzen. Dieser Link ist <strong>1 Stunde</strong> gültig.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px">
              <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:16px 36px;border-radius:14px;letter-spacing:0.2px">
                Passwort zurücksetzen →
              </a>
            </td></tr>
          </table>
          <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">
              🛡️ Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert.
            </p>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
            Link funktioniert nicht? Kopiere diese URL in deinen Browser:<br>
            <span style="color:#8b5cf6;word-break:break-all">${resetUrl}</span>
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

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    // Generate Firebase reset link via Admin SDK
    const resetLink = await adminAuth.generatePasswordResetLink(email);

    try {
      const method = await sendEmail({
        to: email,
        subject: '🔐 Passwort zurücksetzen – Family App',
        html: buildResetHtml(resetLink),
      });

      if (method !== 'none') {
        console.log(`[send-password-reset] Sent via ${method}`);
        return NextResponse.json({ method });
      }
    } catch (emailErr: any) {
      console.error('[send-password-reset] Email sending failed:', emailErr.message);
    }

    console.warn('[send-password-reset] No email provider configured – using Firebase fallback');
    return NextResponse.json({ method: 'firebase-fallback' });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      return NextResponse.json({ method: 'ok' }); // Don't leak whether email exists
    }
    console.error('[send-password-reset] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
