const cron = require('node-cron');
const { runDailyReminder, runWeeklyReminder } = require('../lib/reminderLogic');

/**
 * Only used if you're running bot/index.js as a persistent process (VPS,
 * Railway, etc). If you've switched to GitHub Actions + the
 * /api/cron/* routes for reminders (see .github/workflows/reminders.yml),
 * you can skip calling this from bot/index.js entirely — the bot will
 * still handle /start, just without its own in-process scheduler.
 */
module.exports = function registerReminders(bot) {
  cron.schedule('0 19 * * *', () => {
    runDailyReminder(bot.telegram).catch((err) => console.error('[reminders] daily job error:', err));
  });

  cron.schedule('0 9 * * *', () => {
    runWeeklyReminder(bot.telegram).catch((err) => console.error('[reminders] weekly job error:', err));
  });

  console.log('[reminders] cron jobs scheduled (daily 19:00, weekly sweep 09:00)');
};
