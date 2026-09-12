const User = require('../models/User');
const WeeklyPlan = require('../models/WeeklyPlan');
const CheckIn = require('../models/CheckIn');
const DailyLog = require('../models/DailyLog');
const { notify } = require('./notify');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function todayDateStr() {
  return new Date().toISOString().slice(0, 10);
}

async function sendSafe(telegram, chatId, text, extra) {
  try {
    await telegram.sendMessage(chatId, text, extra);
  } catch (err) {
    // User may have blocked the bot, or chat no longer exists — never let
    // one bad send crash the whole reminder sweep.
    console.warn(`[reminders] failed to message ${chatId}: ${err.message}`);
  }
}

function openAppButton(label) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: label, web_app: { url: APP_URL } }]],
    },
  };
}

/**
 * `telegram` is any object with a `.sendMessage(chatId, text, extra)`
 * method — works with both a full Telegraf `Bot` instance (`bot.telegram`)
 * and a standalone `new Telegraf.Telegram(token)` used in serverless
 * one-off invocations (no polling needed just to send a message).
 */
async function runDailyReminder(telegram) {
  const date = todayDateStr();
  const users = await User.find({ onboarding_complete: true });

  for (const user of users) {
    const log = await DailyLog.findOne({ user_id: user._id, date });
    const hasLoggedToday = log && log.todos_completed.length > 0;
    if (hasLoggedToday) continue;

    const title = "You haven't logged today's todos yet";
    const message = 'Small steps, big results. Open FitMate to check them off.';

    await sendSafe(
      telegram,
      user.telegram_id,
      `Hey ${user.name}, ${title.toLowerCase()} 💪`,
      openAppButton('Open FitMate')
    );

    await notify(user._id, { type: 'reminder_daily', title, message });
  }
}

async function runWeeklyReminder(telegram) {
  const users = await User.find({ onboarding_complete: true });

  for (const user of users) {
    const plan = await WeeklyPlan.findOne({ user_id: user._id, week_number: user.current_week });
    if (!plan) continue;

    const daysSincePlanStart = Math.floor((Date.now() - new Date(plan.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePlanStart < 7) continue;

    const existingCheckIn = await CheckIn.findOne({ user_id: user._id, week_number: user.current_week });
    if (existingCheckIn) continue;

    const title = "It's Day 7 — time for your check-in";
    const message = "Log your weight, mood and a progress photo so we can fine-tune next week's plan.";

    await sendSafe(
      telegram,
      user.telegram_id,
      `📸 ${title}, ${user.name}!`,
      openAppButton('Do Check-In')
    );

    await notify(user._id, { type: 'reminder_checkin', title, message });
  }
}

module.exports = { runDailyReminder, runWeeklyReminder };
