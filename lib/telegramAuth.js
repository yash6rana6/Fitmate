const crypto = require('crypto');

/**
 * Verifies Telegram Mini App `initData` per the official algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * secret_key = HMAC_SHA256(<bot_token>, "WebAppData")
 * check_hash = hex( HMAC_SHA256(secret_key, data_check_string) )
 *
 * `data_check_string` is every key=value pair (except `hash`), sorted
 * alphabetically by key, joined with "\n".
 *
 * Returns the parsed user object on success, or null if invalid/expired.
 */
function verifyInitData(initData, botToken, { maxAgeSeconds = 86400 } = {}) {
  if (!initData || typeof initData !== 'string') return null;
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not set');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (computedHash !== hash) return null;

  // Optional freshness check (auth_date is unix seconds)
  const authDate = Number(params.get('auth_date'));
  if (authDate && maxAgeSeconds) {
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > maxAgeSeconds) return null;
  }

  let user = null;
  const rawUser = params.get('user');
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch (e) {
      return null;
    }
  }

  if (!user || !user.id) return null;

  return {
    telegram_id: String(user.id),
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    username: user.username || '',
    language_code: user.language_code || '',
  };
}

/**
 * Express/Next-API style helper: reads `x-telegram-init-data` header,
 * verifies it, and returns the Telegram user or throws a 401-flavored error.
 */
function requireTelegramUser(req) {
  const initData = req.headers['x-telegram-init-data'];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  const tgUser = verifyInitData(initData, botToken);
  if (!tgUser) {
    const err = new Error('Invalid or expired Telegram initData');
    err.statusCode = 401;
    throw err;
  }
  return tgUser;
}

module.exports = { verifyInitData, requireTelegramUser };
