import nodemailer from 'nodemailer';

export async function sendResetEmail(to, url) {
  const { RESEND_API_KEY, MAIL_FROM } = process.env;
  if (RESEND_API_KEY) {
    if (!MAIL_FROM) throw new Error('MAIL_FROM is required for API email delivery');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [to],
        subject: 'Recuperacion de cuenta SecureVault',
        text: `Usa este enlace en los proximos 15 minutos: ${url}\nSi no solicitaste el cambio, ignora este mensaje.`
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Email API returned HTTP ${response.status}`);
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) throw new Error('Email delivery is not configured');
  const transport = nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT || 587), secure: SMTP_SECURE === 'true', auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 5000, socketTimeout: 8000 });
  await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to, subject: 'Recuperacion de cuenta SecureVault', text: `Usa este enlace en los proximos 15 minutos: ${url}\nSi no solicitaste el cambio, ignora este mensaje.` });
}
