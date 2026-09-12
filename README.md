# FitMate — AI Fitness & Diet Coach (Telegram Mini App)

Full end-to-end implementation. No mock/seed data — everything is a real
DB write, a real Gemini call, and real Telegram `initData` verification.

## Stack
- **Frontend:** Next.js (pages router) + Tailwind, rendered inside Telegram's Mini App webview
- **Backend:** Next.js API routes
- **DB:** MongoDB Atlas via Mongoose
- **Bot:** Telegraf, run as a **separate** long-running process (`npm run bot`), with `node-cron` for reminders
- **AI:** Gemini (`gemini-2.0-flash` by default) via a hand-rolled REST client with **multi-API-key rotation** on 429/503

## 1. Setup

```bash
npm install
cp .env.example .env
# fill in .env — see below
```

### Environment variables (`.env`)

| Var | Notes |
|---|---|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS URL of your deployed Mini App (Telegram requires HTTPS) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `GEMINI_API_KEYS` | **Comma-separated** list of Gemini API keys — the client rotates across them on rate limits, so stacking multiple free-tier keys gives you a bigger effective quota |
| `GEMINI_MODEL` | Defaults to `gemini-2.0-flash` |

### Telegram bot setup
1. Create a bot with [@BotFather](https://t.me/BotFather), grab the token.
2. `/setmenubutton` (or "Configure Mini App") → point it at `NEXT_PUBLIC_APP_URL`.
3. Deploy the Next.js app somewhere with HTTPS (Vercel works well) so Telegram can load it in the in-app webview.

## 2. Run

Two separate processes:

```bash
# Next.js app (Mini App frontend + API routes)
npm run dev      # or: npm run build && npm start

# Telegraf bot (separate worker — handles /start and cron reminders)
npm run bot
```

## 3. How the pieces fit together

### Auth
Every API call from the Mini App sends the raw `Telegram.WebApp.initData`
string in the `x-telegram-init-data` header (see `lib/telegramClient.js`).
`lib/telegramAuth.js` re-derives the HMAC-SHA256 signature using your bot
token (`secret_key = HMAC_SHA256("WebAppData", bot_token)`) and rejects
anything that doesn't match or is older than 24h. There is no separate
login step — the Telegram user is trusted only after that check passes.

### Onboarding → Week 1 plan
`POST /api/onboarding` validates the required profile fields, upserts the
`User` doc, builds the **exact** Week-1 prompt from the spec
(`lib/prompts.js`), calls Gemini with `response_mime_type: application/json`,
and writes the parsed result into `WeeklyPlan` (week 1). `onboarding_complete`
and `current_week` are only flipped after the plan is safely saved.

### Daily todos → XP & streak
`POST /api/todos/complete` toggles a single todo for *today* in `DailyLog`,
awards/removes 10 XP per todo, and advances the user's streak the first
time any todo is completed on a new day (streak resets if a day was
skipped). `GET /api/plan/[week]` returns today's `DailyLog` alongside the
plan so the UI can render checked/unchecked state.

### Day-7 check-in → adaptive Week N+1 plan
`POST /api/checkin` is a `multipart/form-data` upload (`formidable`,
Next's body parser disabled for this route). Flow:
1. Read the uploaded photo **into memory only**.
2. Send it (as inline base64) + the adaptive-plan prompt to Gemini vision.
3. Compress a small 240×240 JPEG thumbnail with `sharp` for UI display.
4. Delete the temp upload from disk (`fs.unlink` in a `finally` block) —
   **the full-resolution photo is never persisted anywhere.**
5. Save `CheckIn` (with only the thumbnail), save `WeeklyPlan` for
   `week_number + 1`, bump `user.current_week`.

### Gemini key rotation (`lib/geminiClient.js`)
`GEMINI_API_KEYS` is split on commas. Each call round-robins its starting
key and, on a `429`/`503` from the API, retries the *same request* with
the next key in the list before giving up — so a single logical call
transparently survives one key's free-tier quota being exhausted.

### Telegram bot (`bot/`)
Runs as its own process (not inside the Next.js server, since Vercel-style
serverless hosting can't run a persistent long-polling bot or cron).
- `/start`, `/app` → welcome message + a `web_app` inline button that opens the Mini App
- Daily cron (19:00 server time) → messages any onboarded user with zero
  todos logged that day
- Daily sweep at 09:00 → messages users who are 7+ days into their current
  plan and haven't submitted that week's check-in yet

### UI pages (`pages/`)
- `/` — landing screen
- `/onboarding` — 5-step profile setup → generates Week 1 plan
- `/dashboard` — home: greeting, streak/XP/level, week tabs, today's checklist with animated progress ring
- `/plan` — full week browser (day tabs → workout / diet)
- `/checkin` — Day-7 check-in: before/after progress photos, mood picker, struggle tags, notes
- `/more` — real profile summary (goal, diet, weight, streak, XP)

All four post-onboarding pages share `components/BottomNav.js` (Home / Plan / center check-in shortcut / Progress / More). `components/ProgressRing.js` and `components/Avatar.js` are small shared UI pieces — no external image fetching or third-party avatars, everything is drawn from real user data.

`GET /api/checkin/previous` powers the before/after comparison on the check-in page by returning the most recent check-in's thumbnail.

## 4. Data models (`models/`)
`User`, `WeeklyPlan`, `CheckIn`, `DailyLog` — fields match the spec exactly
(see each file for the full Mongoose schema, including nested `meals`,
`workout.exercises`, `targets`, and `feedback`).

## 5. Reminders on Vercel (Cron Jobs)
The daily/weekly reminder logic runs as two ordinary API routes
(`pages/api/cron/daily-reminder.js`, `pages/api/cron/weekly-reminder.js`)
that Vercel triggers on a schedule — no always-on process needed for this
part. This is defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/daily-reminder", "schedule": "0 19 * * *" },
    { "path": "/api/cron/weekly-reminder", "schedule": "0 9 * * *" }
  ]
}
```

**Setup steps:**
1. Generate a random secret, e.g. `openssl rand -hex 32`.
2. In your Vercel project → **Settings → Environment Variables**, add
   `CRON_SECRET` with that value (Production + Preview).
3. Deploy. Vercel reads `vercel.json` automatically and registers both
   schedules — check **Settings → Cron Jobs** in the dashboard to confirm.
4. Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when
   it invokes these routes, which `isAuthorized()` in each route checks.

Notes:
- **Times are UTC** — Vercel Cron has no timezone support. `0 19 * * *`
  = 19:00 UTC, not your local time. Adjust the hour in `vercel.json` for
  your target timezone.
- **Hobby plan** allows cron jobs but caps each one to **once per day** —
  which is exactly what both of these need, so the free tier is enough.
- You can still trigger either route manually (e.g. from GitHub Actions,
  cron-job.org, or `curl`) by sending `x-cron-secret: <CRON_SECRET>` as a
  header instead of the Vercel-native `Authorization` header — both are
  accepted.

## 6. The bot process is NOT serverless-compatible
`bot/index.js` (Telegraf **long-polling** for `/start`, etc.) is a
different concern from the cron reminders above — it needs a
**persistent, always-on process** and cannot run on Vercel.

- **Next.js app + cron reminders** → Vercel, fully covered by section 6.
- **Bot process (`npm run bot`)** → deploy separately on something
  long-running: a small VPS (Railway, Render, Fly.io, a DigitalOcean/Oracle
  free-tier box) under `pm2` or systemd. It connects to the same
  `MONGODB_URI`. `bot/reminders.js` is now optional there — since
  reminders run via Vercel Cron, you can skip calling `registerReminders(bot)`
  in `bot/index.js` entirely and just keep `/start`.
- If you want the bot itself to be fully serverless too, it would need to
  switch from long-polling to **webhook mode** (an API route Telegram
  calls directly) — ask if you want that version.

## 7. Notifications
`models/Notification.js` + `lib/notify.js` back a lightweight in-app
notification system:
- `GET /api/notifications` / `POST /api/notifications/read` — list & mark read
- `components/NotificationBell.js` — bell with unread dot, dropdown list, on the dashboard header
- `components/Toast.js` — `useToast()` hook, used on the dashboard for instant "+10 XP" / streak-up feedback
- Notifications are created automatically: onboarding → "Week 1 plan ready", check-in → "Week N plan ready" with coach feedback, and both bot cron jobs write a matching in-app notification alongside the Telegram message.

## 8. Notes / things to configure before going to production
- The photo thumbnail is currently stored as a base64 data URI directly on
  the `CheckIn` document for simplicity. For real scale, swap
  `photo_url` to an actual object-storage URL (S3/Cloudinary) — the
  `sharp` thumbnail buffer in `pages/api/checkin.js` is already isolated
  behind one function call, so this is a small change.
- `bot/reminders.js` iterates all onboarded users per cron tick — fine at
  moderate scale, but for a large user base you'd want to batch/paginate
  the `User.find()` query.
- No premium tier / paywalls / usage limits are implemented, per the MVP
  constraints in the spec.
