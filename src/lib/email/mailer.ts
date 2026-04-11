import nodemailer from 'nodemailer';

/**
 * Sends an email via Gmail SMTP (EMAIL_USER + EMAIL_APP_PASSWORD)
 * or Resend (RESEND_API_KEY) — whichever is configured.
 * Returns which method was used, or 'none' if neither is configured.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<'gmail' | 'resend' | 'none'> {
  const { to, subject, html } = options;

  // ── Gmail SMTP ──────────────────────────────────────────────────────────────
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `Family App <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    return 'gmail';
  }

  // ── Resend ──────────────────────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend ${res.status}: ${body}`);
    }

    return 'resend';
  }

  return 'none';
}
