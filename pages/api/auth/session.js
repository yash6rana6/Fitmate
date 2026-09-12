import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import { requireTelegramUser } from '../../../lib/telegramAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tgUser = requireTelegramUser(req);
    await dbConnect();

    let user = await User.findOne({ telegram_id: tgUser.telegram_id });

    if (!user) {
      user = await User.create({
        telegram_id: tgUser.telegram_id,
        name: tgUser.first_name || tgUser.username || 'Friend',
        onboarding_complete: false,
        current_week: 0,
        xp: 0,
        streak: 0,
      });
    }

    return res.status(200).json({ user });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}
