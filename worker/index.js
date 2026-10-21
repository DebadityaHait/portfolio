import { starterScores } from './starterScores.js';

const json = (value, status = 200, extra = {}) => Response.json(value, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
});

function visitor(request) {
  const id = request.headers.get('Cookie')?.match(/(?:^|;\s*)dino_visitor=([a-f0-9-]{36})(?:;|$)/)?.[1];
  return id || crypto.randomUUID();
}

async function leaderboard(env) {
  const result = await env.DB.prepare(
    'SELECT nickname, best_score AS score FROM dino_scores ORDER BY best_score DESC, updated_at ASC LIMIT 10',
  ).all();
  return result.results.map((row, index) => ({ rank: index + 1, nickname: row.nickname, score: row.score }));
}

function boardKeys(request) {
  const origin = new URL(request.url).origin;
  return { fresh: new Request(`${origin}/__cache/dino-board-v1`), last: new Request(`${origin}/__cache/dino-board-last-v1`) };
}

function cacheBoard(request, scores, ctx) {
  const { fresh, last } = boardKeys(request), cache = caches.default;
  ctx.waitUntil(Promise.all([
    cache.put(fresh, json({ scores, sharingAvailable: true }, 200, { 'Cache-Control': 'public, max-age=60' })),
    cache.put(last, json({ scores }, 200, { 'Cache-Control': 'public, max-age=86400' })),
  ]).catch(() => {}));
}

async function readBoard(request, env, ctx) {
  const { fresh, last } = boardKeys(request), cache = caches.default;
  const cached = await cache.match(fresh).catch(() => null);
  if (cached) return json(await cached.json());
  try {
    const scores = await leaderboard(env);
    cacheBoard(request, scores, ctx);
    return json({ scores, sharingAvailable: true });
  } catch {
    // A recent successful board remains useful when the database is offline.
    // The initial challengers are the fallback before the first cached read.
    const previous = await cache.match(last).catch(() => null);
    const scores = previous ? (await previous.json()).scores : starterScores;
    const payload = { scores, sharingAvailable: false };
    ctx.waitUntil(cache.put(fresh, json(payload, 200, { 'Cache-Control': 'public, max-age=60' })).catch(() => {}));
    return json(payload);
  }
}

async function saveScore(request, env, ctx) {
  const origin = request.headers.get('Origin');
  if (origin !== new URL(request.url).origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') {
    return json({ error: 'Please submit from the game on this site.' }, 403);
  }
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return json({ error: 'Expected a JSON score.' }, 415);
  }
  if (Number(request.headers.get('Content-Length')) > 1024) return json({ error: 'Submission too large.' }, 413);
  if (env.SCORE_LIMITER) {
    const { success } = await env.SCORE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
    if (!success) return json({ error: 'A few too many scores. Try again in a minute.' }, 429, { 'Retry-After': '60' });
  }
  let input;
  try {
    const body = await request.text();
    if (body.length > 1024) return json({ error: 'Submission too large.' }, 413);
    input = JSON.parse(body);
  } catch { return json({ error: 'Could not read that score.' }, 400); }
  const nickname = typeof input?.nickname === 'string' ? input.nickname.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
  if (!/^[\p{L}\p{N} _.-]{1,20}$/u.test(nickname)) {
    return json({ error: 'Use 1–20 letters, numbers, spaces, dots, dashes or underscores.' }, 400);
  }
  if (!Number.isSafeInteger(input.score) || input.score < 1 || input.score > 99999) {
    return json({ error: 'That score is outside the game’s range.' }, 400);
  }
  const id = visitor(request);
  const now = Math.floor(Date.now() / 1000);
  const previous = await env.DB.prepare('SELECT updated_at FROM dino_scores WHERE visitor_id = ?').bind(id).first();
  if (previous && now - previous.updated_at < 10) return json({ error: 'Give it a few seconds before submitting again.' }, 429, { 'Retry-After': '10' });
  await env.DB.prepare(`INSERT INTO dino_scores (visitor_id, nickname, best_score, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(visitor_id) DO UPDATE SET nickname = excluded.nickname,
    best_score = MAX(dino_scores.best_score, excluded.best_score), updated_at = excluded.updated_at
    WHERE dino_scores.updated_at <= excluded.updated_at - 10`).bind(id, nickname, input.score, now).run();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  const scores = await leaderboard(env);
  cacheBoard(request, scores, ctx);
  return json({ scores, sharingAvailable: true }, 200, {
    'Set-Cookie': `dino_visitor=${id}; Path=/api/dino; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`,
  });
}

function httpsUrl(value, host) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (!host || url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
  } catch { return null; }
}

function albumImage(images) {
  if (!Array.isArray(images)) return null;
  const hosts = new Set(['lastfm.freetls.fastly.net', 'lastfm-img.freetls.fastly.net']);
  for (const size of ['extralarge', 'large', 'medium', 'small', '']) {
    for (const image of images.filter(image => image.size === size)) {
      const candidate = httpsUrl(image['#text']);
      if (candidate && hosts.has(new URL(candidate).hostname)) return candidate;
    }
  }
  return null;
}

async function recentMusic(request, env, ctx) {
  const username = env.LASTFM_USERNAME || 'zvrz';
  const profile = `https://www.last.fm/user/${encodeURIComponent(username)}`;
  if (!env.LASTFM_API_KEY) return json({ available: false, profile }, 503);
  const cache = caches.default;
  const key = new Request(new URL(`/__music_cache/v2/${encodeURIComponent(username)}`, request.url));
  const cached = await cache.match(key);
  if (cached) return cached;
  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.search = new URLSearchParams({ method: 'user.getrecenttracks', user: username, api_key: env.LASTFM_API_KEY, format: 'json', limit: '4' });
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error('Last.fm unavailable');
    const data = await response.json();
    if (data.error || !data.recenttracks) throw new Error('Last.fm returned an error');
    const raw = data.recenttracks.track || [];
    const tracks = (Array.isArray(raw) ? raw : [raw]).map(track => ({
      name: String(track.name || 'Untitled'),
      artist: String(track.artist?.['#text'] || 'Unknown artist'),
      album: String(track.album?.['#text'] || ''),
      url: httpsUrl(track.url, 'last.fm') || profile,
      image: albumImage(track.image),
      nowPlaying: track['@attr']?.nowplaying === 'true',
      playedAt: track.date?.uts ? new Date(Number(track.date.uts) * 1000).toISOString() : null,
    }));
    const result = json({ available: true, profile, current: tracks[0] || null, recent: tracks.slice(1).filter(t => !t.nowPlaying).slice(0, 3) }, 200, {
      'Cache-Control': 'public, max-age=30',
    });
    ctx.waitUntil(cache.put(key, result.clone()));
    return result;
  } catch { return json({ available: false, profile }, 502); }
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (path === '/api/visitor' && request.method === 'GET') {
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
        const city = !local && typeof request.cf?.city === 'string'
          ? request.cf.city.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 60) : '';
        return json({ city }, 200, { 'Cache-Control': 'private, no-store' });
      }
      if (path === '/api/music/recent' && request.method === 'GET') return await recentMusic(request, env, ctx);
      if (path === '/api/dino/leaderboard' && request.method === 'GET') {
        return await readBoard(request, env, ctx);
      }
      if (path === '/api/dino/scores' && request.method === 'POST') {
        if (!env.DB) return json({ error: 'Your score is saved on this device. The shared board is taking a break.' }, 503);
        return await saveScore(request, env, ctx);
      }
      if (['/api/music/recent', '/api/dino/leaderboard', '/api/dino/scores', '/api/visitor'].includes(path)) {
        return json({ error: 'Method not allowed.' }, 405, { Allow: path.endsWith('/scores') ? 'POST' : 'GET' });
      }
      return json({ error: 'Not found.' }, 404);
    } catch {
      // Do not log upstream URLs: the Last.fm API key is a query parameter.
      if (path === '/api/dino/scores') return json({ error: 'The shared board is temporarily unavailable. Your run is saved in this tab; try sharing again later.' }, 503);
      return json({ error: 'This feature is taking a break. Please try again shortly.' }, 503);
    }
  },
};
