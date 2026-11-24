/** Central, validated access to environment variables (server only). */
const isProd = process.env.NODE_ENV === 'production';

function secret(): string {
  const s = process.env.AUTH_SECRET || '';
  if (isProd && (s.length < 32 || s.startsWith('dev-only'))) {
    throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters in production');
  }
  return s || 'dev-only-secret-change-me-please-0123456789abcdef';
}

export const env = {
  isProd,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  get authSecret() { return secret(); },
  uploadDir: process.env.UPLOAD_DIR || './.uploads',
  trustProxy: process.env.TRUST_PROXY === '1',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Eloura Chic <no-reply@eloura.example>',
  },
};
