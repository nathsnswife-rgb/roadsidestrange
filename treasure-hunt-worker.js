/**
 * Roadside Strange treasure hunt answer checker.
 * Secrets: ANSWER_LETTERS (16 uppercase letters in clue order), IP_HASH_SECRET.
 * Durable Object binding: HUNT_LIMITER -> HuntLimiter.
 * Public vars: ALLOWED_ORIGIN, OPEN_AT. Do not publish the answer key.
 */
const responseHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
function reply(body, status = 200, origin = '') {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...responseHeaders,
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    },
  });
}
async function anonymize(ip, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
function validEntries(entries) {
  if (!Array.isArray(entries) || entries.length < 1 || entries.length > 16) return false;
  const seen = new Set();
  for (const e of entries) {
    if (!e || !Number.isInteger(e.clue) || e.clue < 1 || e.clue > 16 ||
        typeof e.letter !== 'string' || !/^[A-Z]$/.test(e.letter) ||
        seen.has(e.clue)) return false;
    seen.add(e.clue);
  }
  return true;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGIN || 'https://roadsidestrange.com')
      .split(',').map(s => s.trim());
    const cors = origin && allowed.includes(origin) ? origin : '';
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: cors ? 204 : 403,
        headers: cors ? {
          'Access-Control-Allow-Origin': cors,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Vary': 'Origin',
          'Access-Control-Max-Age': '600',
        } : {},
      });
    }
    if (origin && !cors) return reply({ error: 'Origin not allowed' }, 403);
    if (new URL(request.url).pathname !== '/check' || request.method !== 'POST')
      return reply({ error: 'Not found' }, 404, cors);
    if (!env.HUNT_LIMITER || !/^[A-Z]{16}$/.test(env.ANSWER_LETTERS || '') ||
        !env.IP_HASH_SECRET)
      return reply({ error: 'Checker is not configured yet' }, 503, cors);
    const start = Date.parse(env.OPEN_AT || '2026-11-15T00:00:00-07:00');
    if (!Number.isFinite(start)) return reply({ error: 'Invalid launch configuration' }, 503, cors);
    if (Date.now() < start) return reply({ error: 'The treasure hunt checker has not opened yet' }, 403, cors);
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return reply({ error: 'Attempt identity unavailable' }, 403, cors);
    if (Number(request.headers.get('Content-Length') || 0) > 2048)
      return reply({ error: 'Request too large' }, 413, cors);
    let data;
    try { data = await request.json(); }
    catch { return reply({ error: 'Invalid JSON' }, 400, cors); }
    if (!validEntries(data?.entries)) return reply({ error: 'Invalid clue or letter' }, 400, cors);

    // A single Durable Object per hashed network address serializes attempt
    // updates and uses a storage transaction to prevent concurrent double-spend.
    const identity = await anonymize(ip, env.IP_HASH_SECRET);
    const objectId = env.HUNT_LIMITER.idFromName('hunt-v1:' + identity);
    const stub = env.HUNT_LIMITER.get(objectId);
    const internal = await stub.checkLetters(data.entries, env.ANSWER_LETTERS);
    return reply(internal, 200, cors);
  },
};

export class HuntLimiter {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async checkLetters(entries, answerLetters) {
    if (!validEntries(entries) || !/^[A-Z]{16}$/.test(answerLetters || ''))
      throw new Error('Invalid checker inputs');

    const today = new Date().toISOString().slice(0, 10); // UTC day
    const results = await this.ctx.storage.transaction(async tx => {
      const out = [];
      for (const e of entries) {
        // Persist successes across dates so a solved clue never costs another attempt.
        const solvedKey = 'solved:' + e.clue;
        const attemptKey = 'day:' + today + ':' + e.clue;
        const solved = await tx.get(solvedKey);
        const used = Number(await tx.get(attemptKey) || 0);

        if (solved === true) {
          out.push({ clue: e.clue, status: 'correct', remaining: Math.max(0, 3 - used) });
        } else if (used >= 3) {
          out.push({ clue: e.clue, status: 'limit', remaining: 0 });
        } else {
          const correct = e.letter === answerLetters[e.clue - 1];
          await tx.put(attemptKey, used + 1);
          if (correct) await tx.put(solvedKey, true);
          out.push({ clue: e.clue, status: correct ? 'correct' : 'wrong', remaining: 2 - used });
        }
      }
      return out;
    });
    return { results, reset: '00:00 UTC' };
  }
}
