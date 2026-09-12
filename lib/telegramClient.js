export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
}

export function getInitData() {
  const tg = getTelegramWebApp();
  return tg ? tg.initData : '';
}

/**
 * Fetch wrapper that attaches the Telegram initData header to every
 * request so API routes can verify the caller server-side.
 */
export async function apiFetch(url, options = {}) {
  const initData = getInitData();
  const headers = {
    ...(options.headers || {}),
    'x-telegram-init-data': initData,
  };

  // Only set JSON content-type when we're not sending FormData.
  if (!(options.body instanceof FormData) && options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
