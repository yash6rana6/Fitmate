import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import Notification from '../../../models/Notification';
import { requireTelegramUser } from '../../../lib/telegramAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tgUser = requireTelegramUser(req);
    await dbConnect();

    const user = await User.findOne({ telegram_id: tgUser.telegram_id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { id } = req.body || {};

    if (id) {
      await Notification.updateOne({ _id: id, user_id: user._id }, { $set: { read: true } });
    } else {
      // No id provided -> mark everything read (e.g. "mark all as read")
      await Notification.updateMany({ user_id: user._id, read: false }, { $set: { read: true } });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}
