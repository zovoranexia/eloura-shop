import 'server-only';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '@/lib/env';
import { translatorFor, isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/i18n';
import { formatUSD } from '@/lib/money';
import { getSetting } from './settings';

type Mail = { to: string; subject: string; text: string };

let transport: Transporter | null = null;
function getTransport() {
  if (!env.smtp.host) return null;
  transport ??= nodemailer.createTransport({
    host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transport;
}

/** Sends through SMTP when configured, otherwise logs (development). Never throws. */
export async function sendMail(mail: Mail) {
  try {
    const t = getTransport();
    if (!t) {
      console.log(`[mail:dev] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
      return;
    }
    await t.sendMail({ from: env.smtp.from, ...mail });
  } catch (e) {
    console.error('[mail] failed', e);
  }
}

export type OrderMailKind = 'created' | 'payment_received' | 'payment_approved' | 'payment_rejected' | 'cod_confirmed' | 'packed' | 'out_for_delivery' | 'delivered' | 'cancelled';

type OrderLike = { code: string; customerEmail: string | null; customerName: string; locale: string; totalCents: number; accessToken: string };

/** Localised transactional e-mail (4 languages). Templates live in messages/*.json under `emails.*`. */
export async function notifyOrder(order: OrderLike, kind: OrderMailKind, extra?: { note?: string | null }) {
  if (!order.customerEmail) return;
  const locale: Locale = isLocale(order.locale) ? order.locale : DEFAULT_LOCALE;
  const t = translatorFor(locale);
  const store = await getSetting('store');
  const link = `${env.appUrl}/order/${order.code}?t=${order.accessToken}`;
  const vars = { name: order.customerName, code: order.code, total: formatUSD(order.totalCents), link, store: store.name, note: extra?.note || '' };
  const body = [t(`emails.${kind}.body`, vars), extra?.note ? t('emails.noteLabel', vars) : '', '', t('emails.footer', vars)].filter((x) => x !== '').join('\n\n');
  await sendMail({ to: order.customerEmail, subject: t(`emails.${kind}.subject`, vars), text: body });
}
