import nodemailer from 'nodemailer'

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.EMAIL_FROM)
}

let transport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter | null {
  if (!isSmtpConfigured()) return null
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    })
  }
  return transport
}

export async function sendNewMessageEmail(opts: {
  to: string
  subject: string
  text: string
}): Promise<void> {
  const t = getTransport()
  if (!t) return
  await t.sendMail({
    from: process.env.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
  })
}
