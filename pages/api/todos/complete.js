import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import DailyLog from '../../../models/DailyLog';
import { requireTelegramUser } from '../../../lib/telegramAuth';

const XP_PER_TODO = 10;

function yesterday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tgUser = requireTelegramUser(req);
    await dbConnect();

    const { week_number, day, todo, completed } = req.body || {};
    if (!week_number || !day || !todo || typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'week_number, day, todo, completed are required' });
    }

    const user = await User.findOne({ telegram_id: tgUser.telegram_id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const todayDate = new Date().toISOString().slice(0, 10);

    let log = await DailyLog.findOne({ user_id: user._id, date: todayDate });
    if (!log) {
      log = new DailyLog({
        user_id: user._id,
        week_number,
        day,
        date: todayDate,
        todos_completed: [],
        xp_earned: 0,
      });
    }

    const alreadyDone = log.todos_completed.includes(todo);
    let xpDelta = 0;

    if (completed && !alreadyDone) {
      log.todos_completed.push(todo);
      xpDelta = XP_PER_TODO;
    } else if (!completed && alreadyDone) {
      log.todos_completed = log.todos_completed.filter((t) => t !== todo);
      xpDelta = -XP_PER_TODO;
    }

    log.xp_earned = Math.max(0, log.xp_earned + xpDelta);
    await log.save();

    user.xp = Math.max(0, user.xp + xpDelta);

    // Streak logic: first todo ever logged today bumps the streak forward,
    // as long as the user was active yesterday (or this is their first day).
    if (completed && !alreadyDone && log.todos_completed.length === 1) {
      const yest = yesterday(todayDate);
      if (user.last_active_date === yest || !user.last_active_date) {
        user.streak = (user.streak || 0) + 1;
      } else if (user.last_active_date !== todayDate) {
        user.streak = 1; // streak was broken, restart
      }
      user.last_active_date = todayDate;
    }

    await user.save();

    return res.status(200).json({ log, xp: user.xp, streak: user.streak });
  } catch (err) {
    console.error('[todos/complete] error:', err);
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}
