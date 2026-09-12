import { Telegram } from 'telegraf';
import dbConnect from '../../../lib/db';
import { runDailyReminder } from '../../../lib/reminderLogic';

/**
 * Triggered on a schedule — either Vercel's native Cron Jobs (see
 * vercel.json) or an external caller like GitHub Actions/cron-job.org.
 * Protected by CRON_SECRET so randoms on the internet can't spam users.
 */
function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Vercel's native Cron Jobs send `Authorization: Bearer <CRON_SECRET>`
  // automatically once you set CRON_SECRET as a project env var.
  const authHeader = req.headers['authorization'];
  if (authHeader === `Bearer ${secret}`) return true;

  // Fallback for manual triggers / GitHub Actions curl calls.
  const custom = req.headers['x-cron-secret'] || req.query.secret;
  return custom === secret;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await dbConnect();
    const telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN);
    await runDailyReminder(telegram);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[cron/daily-reminder] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
