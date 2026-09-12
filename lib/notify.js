const Notification = require('../models/Notification');

/**
 * Creates a notification for a user. Safe to call from API routes (ESM
 * `import`) and from the bot process (CJS `require`) — this file itself
 * stays CommonJS so both can consume it.
 */
async function notify(userId, { type = 'info', title, message = '' }) {
  if (!userId || !title) return null;
  return Notification.create({ user_id: userId, type, title, message });
}

module.exports = { notify };
