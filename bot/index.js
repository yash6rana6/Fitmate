require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const MONGODB_URI = process.env.MONGODB_URI;

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not set');
if (!APP_URL) throw new Error('NEXT_PUBLIC_APP_URL is not set');
if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');

const bot = new Telegraf(BOT_TOKEN);

bot.start(async (ctx) => {
  await ctx.reply(
    `Welcome to FitMate 💪\n\nYour AI fitness & diet coach — personalized workouts, meal plans, and weekly check-ins, right here in Telegram.`,
    Markup.inlineKeyboard([Markup.button.webApp('Open FitMate', APP_URL)])
  );
});

bot.command('app', async (ctx) => {
  await ctx.reply('Tap below to open FitMate:', Markup.inlineKeyboard([Markup.button.webApp('Open FitMate', APP_URL)]));
});

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('[bot] connected to MongoDB');

  await bot.launch();
  console.log('[bot] FitMate bot is running');

  require('./reminders')(bot);
}

main().catch((err) => {
  console.error('[bot] fatal startup error:', err);
  process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
