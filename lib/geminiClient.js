/**
 * Gemini client wrapper with multi-API-key rotation.
 *
 * GEMINI_API_KEYS is a comma-separated list of keys (useful for stacking
 * multiple free-tier quotas). On a 429 (rate limit) or 503 (overloaded)
 * response from one key, we automatically retry the same request with the
 * next key in the list before giving up.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function getKeys() {
  const raw = process.env.GEMINI_API_KEYS || '';
  const keys = raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    throw new Error(
      'GEMINI_API_KEYS is not set. Provide one or more comma-separated keys.'
    );
  }
  return keys;
}

// Rotate the starting key across calls so load is spread even when every
// call succeeds on the first try (simple round-robin pointer).
let rotationPointer = 0;

function nextRotationOrder(keys) {
  const start = rotationPointer % keys.length;
  rotationPointer = (rotationPointer + 1) % keys.length;
  const ordered = [];
  for (let i = 0; i < keys.length; i++) {
    ordered.push(keys[(start + i) % keys.length]);
  }
  return ordered;
}

function isRetryableStatus(status) {
  return status === 429 || status === 503;
}

/**
 * Low-level call: sends `contents` (Gemini "contents" array) to
 * generateContent, rotating across keys on retryable errors.
 *
 * @param {Array} contents - Gemini `contents` array (supports text + inline_data parts)
 * @param {Object} opts
 * @param {string} [opts.systemInstruction]
 * @param {boolean} [opts.jsonMode] - sets response_mime_type: application/json
 * @param {number} [opts.maxRetries] - max key attempts (defaults to number of keys)
 */
async function callGemini(contents, opts = {}) {
  const { systemInstruction, jsonMode = true, maxRetries } = opts;
  const keys = getKeys();
  const order = nextRotationOrder(keys);
  const attempts = maxRetries || keys.length;

  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    const key = order[i % order.length];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

    const body = {
      contents,
      generationConfig: jsonMode ? { response_mime_type: 'application/json' } : {},
    };
    if (systemInstruction) {
      body.systemInstruction = {
        role: 'system',
        parts: [{ text: systemInstruction }],
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const err = new Error(
          `Gemini request failed (status ${res.status}): ${errText}`
        );
        err.status = res.status;

        if (isRetryableStatus(res.status) && i < attempts - 1) {
          lastError = err;
          // try next key
          continue;
        }
        throw err;
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';

      if (!text) {
        throw new Error('Gemini returned an empty response');
      }

      return text;
    } catch (err) {
      lastError = err;
      const status = err.status;
      if (isRetryableStatus(status) && i < attempts - 1) {
        continue;
      }
      // Network-level errors: still worth trying the next key once.
      if (!status && i < attempts - 1) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Gemini call failed after exhausting all keys');
}

/**
 * Calls Gemini and parses the response as JSON. Strips markdown code
 * fences defensively in case the model ignores the JSON-only instruction.
 */
async function generateJSON(contents, opts = {}) {
  const text = await callGemini(contents, { ...opts, jsonMode: true });
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse Gemini JSON response: ${e.message}\nRaw: ${cleaned.slice(0, 500)}`);
  }
}

/** Builds a plain-text content part. */
function textPart(text) {
  return { text };
}

/** Builds an inline image content part (base64, no data-URI prefix). */
function imagePart(base64Data, mimeType = 'image/jpeg') {
  return { inline_data: { mime_type: mimeType, data: base64Data } };
}

module.exports = { callGemini, generateJSON, textPart, imagePart, GEMINI_MODEL };
