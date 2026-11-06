import { agentApi, adminApi, personalizedVariant, reserveVariant, disableVariant } from './resumeLinks.js';
import { starterScores } from './starterScores.js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const accessIssuer = 'https://rough-sunset-973f.cloudflareaccess.com';
const accessKeys = createRemoteJWKSet(new URL(`${accessIssuer}/cdn-cgi/access/certs`));

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
    const resumes = {
      '/resume': 'Debaditya_Hait_Resume.pdf',
      '/resume/sde': 'Debaditya_Hait_SDE_Resume.pdf',
      '/resume/ai': 'Debaditya_Hait_AI_Engineer_Resume.pdf',
    };
    if (path.startsWith('/api/agent/v1/')) return agentApi(request, env, path.slice('/api/agent/v1'.length));
    if (path === '/admin/resumes' || path.startsWith('/admin/resumes/')) {
      const token = request.headers.get('Cf-Access-Jwt-Assertion');
      let identity;
      try {
        if (env.RESUME_ACCESS_AUD && token && token.length < 16384) ({ payload: identity } = await jwtVerify(token, accessKeys, { issuer: accessIssuer, audience: env.RESUME_ACCESS_AUD, algorithms: ['RS256'] }));
      } catch { /* Missing or invalid Access assertions fail closed. */ }
      if (typeof identity?.email !== 'string' || identity.email.toLowerCase() !== 'moistsyt@gmail.com') {
        return json({ error: 'Sign in through Cloudflare Access.' }, 403);
      }
      if (path === '/admin/resumes' || path === '/admin/resumes/') {
        if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, HEAD' });
        const url = new URL(request.url); url.pathname = '/';
        return env.ASSETS.fetch(new Request(url, request));
      }
      if (path.startsWith('/admin/resumes/manage/')) return adminApi(request, env, path.slice('/admin/resumes/manage'.length));
      if (path === '/admin/resumes/visibility') {
        if (!env.RESUMES) return json({ error: 'Resume storage is unavailable.' }, 503);
        if (request.method === 'GET') {
          const setting = await env.RESUMES.get('selector-visibility');
          return json({ visible: setting ? (await setting.text()) === 'public' : true });
        }
        if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT' });
        if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Update from this site.' }, 403);
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
        const raw = await request.text();
        if (raw.length > 100) return json({ error: 'Invalid setting.' }, 400);
        let setting; try { setting = JSON.parse(raw); } catch { return json({ error: 'Invalid setting.' }, 400); }
        if (typeof setting.visible !== 'boolean') return json({ error: 'Invalid setting.' }, 400);
        await env.RESUMES.put('selector-visibility', setting.visible ? 'public' : 'hidden');
        return json({ visible: setting.visible });
      }
      if (path === '/admin/resumes/list' && request.method === 'GET') {
        if (!env.RESUMES) return json({ error: 'Resume storage is unavailable.' }, 503);
        const items = []; let cursor;
        do {
          const page = await env.RESUMES.list({ prefix: 'custom/', cursor, include: ['customMetadata'] });
          items.push(...page.objects.map(object => ({ slug: object.key.slice(7), title: object.customMetadata?.title ? decodeURIComponent(object.customMetadata.title) : object.key.slice(7), listed: object.customMetadata?.listed === 'true', updatedAt: object.uploaded.toISOString(), size: object.size })));
          cursor = page.truncated ? page.cursor : undefined;
        } while (cursor);
        return json({ items });
      }
      const role = path.match(/^\/admin\/resumes\/(general|sde|ai|[a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1];
      if (!role) return json({ error: 'Not found.' }, 404);
      if (!env.RESUMES) return json({ error: 'Resume storage is unavailable.' }, 503);
      if (role.length > 60 || role === 'list' || role === 'visibility' || role === 'swe') return json({ error: 'Invalid resume link.' }, 400);
      const custom = !['general', 'sde', 'ai'].includes(role);
      const key = custom ? `custom/${role}` : role;
      if (request.method === 'GET') {
        const object = await env.RESUMES.head(key);
        return json({ updatedAt: object?.uploaded?.toISOString() || null, size: object?.size || null });
      }
      if (request.method !== 'PUT' && !(custom && ['PATCH', 'DELETE'].includes(request.method))) return json({ error: 'Method not allowed.' }, 405, { Allow: custom ? 'GET, PUT, PATCH, DELETE' : 'GET, PUT' });
      if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Upload from this site.' }, 403);
      if (request.method === 'DELETE') {
        try { if (!await disableVariant(env, role)) return json({ error: 'Resume is in use by personalized links or unavailable. Reassign its links first.' }, 409); await env.RESUMES.delete(key); return json({ deleted: true }); } catch { return json({ error: 'Resume storage is unavailable.' }, 503); }
      }
      if (request.method === 'PATCH') {
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'Expected JSON.' }, 415);
        const raw = await request.text(); if (raw.length > 100) return json({ error: 'Invalid setting.' }, 400);
        let data; try { data = JSON.parse(raw); } catch { return json({ error: 'Invalid setting.' }, 400); }
        if (typeof data.listed !== 'boolean') return json({ error: 'Invalid setting.' }, 400);
        const old = await env.RESUMES.get(key); if (!old) return json({ error: 'Resume not found.' }, 404);
        const updated = await env.RESUMES.put(key, await old.arrayBuffer(), { httpMetadata: old.httpMetadata, customMetadata: { ...old.customMetadata, listed: String(data.listed) }, onlyIf: { etagMatches: old.etag } });
        if (!updated) return json({ error: 'Resume changed. Refresh and try again.' }, 409);
        return json({ listed: data.listed });
      }
      let title = '';
      if (custom) {
        try { title = decodeURIComponent(request.headers.get('X-Resume-Title') || '').trim(); } catch { return json({ error: 'Invalid title.' }, 400); }
        if (!title || title.length > 80 || /[\u0000-\u001f\u007f]/.test(title)) return json({ error: 'Enter a title of up to 80 characters.' }, 400);
        if (request.headers.get('If-None-Match') === '*' && await env.RESUMES.head(key)) return json({ error: 'That link already exists. Choose another.' }, 409);
      }
      if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/pdf')) return json({ error: 'Choose a PDF file.' }, 415);
      const length = Number(request.headers.get('Content-Length'));
      if (!Number.isSafeInteger(length) || length < 5 || length > 5 * 1024 * 1024) return json({ error: 'Choose a PDF under 5 MB.' }, 413);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'Choose a PDF file.' }, 400);
      const chunks = []; let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > 5 * 1024 * 1024) { await reader.cancel(); return json({ error: 'Choose a PDF under 5 MB.' }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(total); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      if (bytes.byteLength !== length || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') return json({ error: 'This file does not appear to be a PDF.' }, 400);
      const existing = custom && request.headers.get('If-None-Match') !== '*' ? await env.RESUMES.head(key) : null;
      if (custom && request.headers.get('If-None-Match') !== '*' && !existing) return json({ error: 'Resume not found. Create it first.' }, 404);
      const listed = custom ? (request.headers.get('X-Resume-Listed') === 'true' || existing?.customMetadata?.listed === 'true') : false;
      const creating = custom && request.headers.get('If-None-Match') === '*';
      if (creating) {
        try { if (!await reserveVariant(env, role)) return json({ error: 'That link already exists. Choose another.' }, 409); }
        catch { return json({ error: 'Resume storage is unavailable.' }, 503); }
      }
      let object;
      try { object = await env.RESUMES.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' }, ...(custom ? { customMetadata: { title: encodeURIComponent(title), listed: String(listed) } } : {}), ...(creating ? { onlyIf: new Headers({ 'If-None-Match': '*' }) } : {}) }); }
      catch { return json({ error: 'Upload failed. Retry or choose another link.' }, 503); }
      if (!object) return json({ error: 'That link already exists. Choose another.' }, 409);
      return json({ updatedAt: object.uploaded.toISOString(), size: object.size });
    }
    if (path === '/resumes' || path === '/resumes/') {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
      if (!env.RESUMES) return new Response('Temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } });
      const setting = await env.RESUMES.get('selector-visibility');
      if (setting && (await setting.text()) !== 'public') return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
      const url = new URL(request.url); url.pathname = '/';
      const response = await env.ASSETS.fetch(new Request(url, request));
      const headers = new Headers(response.headers); headers.set('Cache-Control', 'no-store');
      return new Response(response.body, { status: response.status, headers });
    }
    const customSlug = path.match(/^\/resume\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1];
    if (Object.hasOwn(resumes, path) || customSlug) {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
      let role = path === '/resume' ? 'general' : path.slice(8);
      if (role.length > 60 || ['general', 'list', 'visibility', 'swe'].includes(customSlug)) return new Response('Not found', { status: 404 });
      let personalized = false;
      if (!Object.hasOwn(resumes, path)) {
        try { const assigned = await personalizedVariant(env, role); if (assigned) { role = assigned; personalized = true; } }
        catch { return new Response('Resume temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
      }
      const standard = ['general', 'sde', 'ai'].includes(role);
      const object = await env.RESUMES?.get(standard ? role : `custom/${role}`);
      const filename = personalized ? 'Debaditya_Hait_Resume.pdf' : (resumes[path] || `Debaditya_Hait_${role.replaceAll('-', '_')}_Resume.pdf`);
      const unlisted = personalized || (!standard && object?.customMetadata?.listed !== 'true');
      if (object) return new Response(request.method === 'HEAD' ? null : object.body, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Content-Length': String(object.size), 'Cache-Control': unlisted ? 'private, no-store' : 'public, max-age=0, must-revalidate', 'ETag': object.httpEtag, 'X-Content-Type-Options': 'nosniff', ...(unlisted ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) } });
      if (!standard) return new Response('Resume not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      if (role === 'general') return new Response('General resume not yet available', { status: 404, headers: { 'Cache-Control': 'no-store' } });
      const url = new URL(request.url);
      url.pathname = `/resume-files/${resumes[role === 'sde' ? '/resume/sde' : '/resume/ai']}`;
      const response = await env.ASSETS.fetch(new Request(url, request));
      if (response.status !== 304 && !response.headers.get('Content-Type')?.toLowerCase().startsWith('application/pdf')) return new Response('Resume unavailable', { status: 404 });
      const headers = new Headers(response.headers);
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
      if (personalized) { headers.set('Cache-Control', 'private, no-store'); headers.set('X-Robots-Tag', 'noindex, nofollow'); }
      headers.set('X-Content-Type-Options', 'nosniff');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    if (path.startsWith('/resume/')) return new Response('Resume not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (path === '/api/resumes' && request.method === 'GET') {
        if (!env.RESUMES) return json({ error: 'Resumes are temporarily unavailable.' }, 503);
        const setting = await env.RESUMES.get('selector-visibility');
        if (setting && (await setting.text()) !== 'public') return json({ error: 'Not found.' }, 404);
        const items = []; let cursor;
        do { const page = await env.RESUMES.list({ prefix: 'custom/', cursor, include: ['customMetadata'] }); items.push(...page.objects.filter(object => object.customMetadata?.listed === 'true').map(object => ({ slug: object.key.slice(7), title: object.customMetadata?.title ? decodeURIComponent(object.customMetadata.title) : object.key.slice(7) }))); cursor = page.truncated ? page.cursor : undefined; } while (cursor);
        return json({ items, generalAvailable: Boolean(await env.RESUMES.head('general')) });
      }
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
