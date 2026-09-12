import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import Notification from '../../../models/Notification';
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

    const notifications = await Notification.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ user_id: user._id, read: false });

    return res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}
