import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import WeeklyPlan from '../../../models/WeeklyPlan';
import DailyLog from '../../../models/DailyLog';
import { requireTelegramUser } from '../../../lib/telegramAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tgUser = requireTelegramUser(req);
    await dbConnect();

    const user = await User.findOne({ telegram_id: tgUser.telegram_id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const week = Number(req.query.week);
    if (!week || week < 1) {
      return res.status(400).json({ error: 'Invalid week number' });
    }

    const plan = await WeeklyPlan.findOne({ user_id: user._id, week_number: week });
    if (!plan) return res.status(404).json({ error: 'Plan not found for this week' });

    const todayDate = new Date().toISOString().slice(0, 10);
    const todayLog = await DailyLog.findOne({ user_id: user._id, date: todayDate });

    return res.status(200).json({
      plan,
      user: {
        xp: user.xp,
        streak: user.streak,
        current_week: user.current_week,
      },
      today_log: todayLog || null,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}
