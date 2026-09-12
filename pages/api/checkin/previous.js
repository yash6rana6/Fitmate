import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import CheckIn from '../../../models/CheckIn';
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

    // "Before" = the most recent check-in on record (i.e. the tail end of
    // the previous week). If this is week 1 and no check-in exists yet,
    // there's nothing to compare against.
    const previous = await CheckIn.findOne({ user_id: user._id }).sort({ week_number: -1 });

    return res.status(200).json({
      current_week: user.current_week,
      previous: previous
        ? { week_number: previous.week_number, photo_url: previous.photo_url, weight_kg: previous.weight_kg }
        : null,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}
