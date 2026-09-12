import { Telegram } from 'telegraf';
import dbConnect from '../../../lib/db';
import { runWeeklyReminder } from '../../../lib/reminderLogic';

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers['authorization'];
  if (authHeader === `Bearer ${secret}`) return true;

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
    await runWeeklyReminder(telegram);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[cron/weekly-reminder] error:', err);
    return res.status(500).json({ error: err.message });
  }
}
