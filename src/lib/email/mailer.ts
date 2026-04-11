/**
 * Unified email sender. Tries providers in order:
 *   1. Brevo HTTP API  (BREVO_API_KEY)              – free, no domain needed
 *   2. Resend HTTP API (RESEND_API_KEY)              – requires verified domain
 *   3. Gmail SMTP      (EMAIL_USER + EMAIL_APP_PASSWORD) – may be blocked by Vercel
 * Returns which provider was used, or 'none' if none are configured.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<'brevo' | 'resend' | 'gmail' | 'none'> {
  const { to, subject, html } = options;

  // ── 1. Brevo (HTTP — works reliably on Vercel) ───────────────────────────
  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: process.env.BREVO_FROM_EMAIL ?? process.env.EMAIL_USER ?? 'noreply@example.com',
          name: 'Family App',
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo ${res.status}: ${body}`);
    }

    return 'brevo';
  }

  // ── 2. Resend (HTTP — requires verified domain) ──────────────────────────
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

  // ── 3. Gmail SMTP (may be blocked on Vercel/serverless) ─────────────────
  if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
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

  return 'none';
}
