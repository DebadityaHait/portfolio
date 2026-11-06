const validSlug = value => typeof value === 'string' && value.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const response = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const reserved = new Set(['general', 'sde', 'ai', 'swe', 'list', 'visibility']);
const standard = { general: 'General', sde: 'Software Engineering', ai: 'AI / ML Engineering' };
const urlFor = slug => `https://dhait.de/resume/${slug}`;
const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('Expected JSON.');
  const body = await request.text();
  if (body.length > 2048) throw new Error('Request is too large.');
  const result = JSON.parse(body);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Expected a JSON object.');
  return result;
}

// Reserve legacy R2 slugs before accepting agent requests. Concurrent callers use unique keys.
export async function syncResumeVariants(env) {
  if (!env.DB || !env.RESUMES) throw new Error('Resume storage unavailable');
  let cursor;
  do {
    const page = await env.RESUMES.list({ prefix: 'custom/', cursor, include: ['customMetadata'] });
    for (const item of page.objects) {
      const slug = item.key.slice(7);
      if (validSlug(slug) && !reserved.has(slug)) await env.DB.prepare("INSERT OR IGNORE INTO resume_names (slug, kind) VALUES (?, 'variant')").bind(slug).run();
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

export async function variants(env) {
  await syncResumeVariants(env);
  const rows = (await env.DB.prepare("SELECT slug FROM resume_names WHERE kind = 'variant' AND active = 1").all()).results;
  const result = [];
  for (const { slug } of rows) {
    if (['swe', 'list', 'visibility'].includes(slug)) continue;
    const item = await env.RESUMES.head(standard[slug] ? slug : `custom/${slug}`);
    if (!item && !['sde', 'ai'].includes(slug)) continue;
    let title = standard[slug] || slug;
    if (item?.customMetadata?.title) { try { title = decodeURIComponent(item.customMetadata.title); } catch { /* retain slug */ } }
    result.push({ id: slug, title });
  }
  return result;
}

async function lookup(env, slug) {
  const row = await env.DB.prepare('SELECT slug, variant, revision, created_at, updated_at FROM resume_links WHERE slug = ?').bind(slug).first();
  return row && { slug: row.slug, variant: row.variant, revision: row.revision, url: urlFor(row.slug), createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function personalizedVariant(env, slug) {
  if (!env.DB) throw new Error('Database unavailable');
  return (await env.DB.prepare('SELECT variant FROM resume_links WHERE slug = ?').bind(slug).first())?.variant || null;
}

async function links(request, env, suffix, isAdmin) {
  if (suffix === '/variants' && request.method === 'GET') return response({ variants: await variants(env) });
  if (suffix === '/links' && request.method === 'GET' && isAdmin) {
    const rows = (await env.DB.prepare('SELECT slug, variant, revision, created_at, updated_at FROM resume_links ORDER BY updated_at DESC, slug').all()).results;
    return response({ links: rows.map(row => ({ slug: row.slug, variant: row.variant, revision: row.revision, url: urlFor(row.slug), createdAt: row.created_at, updatedAt: row.updated_at })) });
  }
  if (suffix === '/links' && request.method === 'POST') {
    let data; try { data = await readJson(request); } catch { return response({ error: 'Expected valid JSON.' }, 400); }
    if (!validSlug(data.slug) || reserved.has(data.slug) || !validSlug(data.variant)) return response({ error: 'Invalid slug or variant.' }, 400);
    if (!(await variants(env)).some(item => item.id === data.variant)) return response({ error: 'Resume variant is unavailable.' }, 400);
    try {
      // Both writes commit together: a reserved name cannot be stranded by an interrupted request.
      await env.DB.batch([
        env.DB.prepare("INSERT INTO resume_names (slug, kind) VALUES (?, 'link')").bind(data.slug),
        env.DB.prepare("INSERT INTO resume_links (slug, variant) VALUES (?, (SELECT slug FROM resume_names WHERE slug = ? AND kind = 'variant' AND active = 1))").bind(data.slug, data.variant),
      ]);
    } catch {
      const occupied = await env.DB.prepare('SELECT slug FROM resume_names WHERE slug = ?').bind(data.slug).first();
      if (occupied) return response({ error: 'Slug already in use.', existing: await lookup(env, data.slug) }, 409);
      return response({ error: 'Resume variant changed or is unavailable.' }, 409);
    }
    return response(await lookup(env, data.slug), 201);
  }
  const match = suffix.match(/^\/links\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (!match || !validSlug(match[1])) return response({ error: 'Not found.' }, 404);
  const slug = match[1], existing = await lookup(env, slug);
  if (!existing) return response({ error: 'Link not found.' }, 404);
  if (request.method === 'GET') return response(existing);
  if (request.method === 'PATCH') {
    let data; try { data = await readJson(request); } catch { return response({ error: 'Expected valid JSON.' }, 400); }
    if (!validSlug(data.variant) || !Number.isSafeInteger(data.revision) || data.revision < 1) return response({ error: 'A valid variant and revision are required.' }, 400);
    if (!(await variants(env)).some(item => item.id === data.variant)) return response({ error: 'Resume variant is unavailable.' }, 400);
    const updated = await env.DB.prepare("UPDATE resume_links SET variant = ?, revision = revision + 1, updated_at = datetime('now') WHERE slug = ? AND revision = ? AND EXISTS (SELECT 1 FROM resume_names WHERE slug = ? AND kind = 'variant' AND active = 1)").bind(data.variant, slug, data.revision, data.variant).run();
    if (!updated.meta.changes) return response({ error: 'Link or variant changed. Refresh and retry.', existing: await lookup(env, slug) }, 409);
    return response(await lookup(env, slug));
  }
  if (request.method === 'DELETE' && isAdmin) {
    await env.DB.batch([env.DB.prepare('DELETE FROM resume_links WHERE slug = ?').bind(slug), env.DB.prepare("DELETE FROM resume_names WHERE slug = ? AND kind = 'link'").bind(slug)]);
    return response({ deleted: true });
  }
  return response({ error: 'Method not allowed.' }, 405);
}

export async function agentApi(request, env, suffix) {
  if (!env.DB || !env.RESUMES) return response({ error: 'Service unavailable.' }, 503);
  const token = request.headers.get('authorization')?.match(/^Bearer (dh_[A-Za-z0-9_-]{43})$/)?.[1];
  if (!token || !(await env.DB.prepare('SELECT id FROM resume_agent_tokens WHERE token_hash = ?').bind(await digest(token)).first())) return response({ error: 'Invalid credentials.' }, 401);
  try { return await links(request, env, suffix, false); } catch { return response({ error: 'Service unavailable.' }, 503); }
}

export async function adminApi(request, env, suffix) {
  if (!env.DB || !env.RESUMES) return response({ error: 'Service unavailable.' }, 503);
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('Origin') !== new URL(request.url).origin) return response({ error: 'Update from this site.' }, 403);
  try {
    if (suffix === '/tokens' && request.method === 'GET') return response({ tokens: (await env.DB.prepare('SELECT id, name, created_at AS createdAt FROM resume_agent_tokens ORDER BY created_at DESC').all()).results });
    if (suffix === '/tokens' && request.method === 'POST') {
      let data; try { data = await readJson(request); } catch { return response({ error: 'Expected valid JSON.' }, 400); }
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return response({ error: 'Enter a name up to 80 characters.' }, 400);
      const token = `dh_${encode(crypto.getRandomValues(new Uint8Array(32)))}`, id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO resume_agent_tokens (id, name, token_hash) VALUES (?, ?, ?)').bind(id, name, await digest(token)).run();
      return response({ id, name, token }, 201);
    }
    const match = suffix.match(/^\/tokens\/([a-f0-9-]{36})$/);
    if (match && request.method === 'DELETE') { await env.DB.prepare('DELETE FROM resume_agent_tokens WHERE id = ?').bind(match[1]).run(); return response({ deleted: true }); }
    return await links(request, env, suffix, true);
  } catch { return response({ error: 'Service unavailable.' }, 503); }
}

export async function reserveVariant(env, slug) {
  await syncResumeVariants(env);
  const result = await env.DB.prepare("INSERT OR IGNORE INTO resume_names (slug, kind) VALUES (?, 'variant')").bind(slug).run();
  if (result.meta.changes) return true;
  const existing = await env.DB.prepare("SELECT slug FROM resume_names WHERE slug = ? AND kind = 'variant' AND active = 1").bind(slug).first();
  return Boolean(existing);
}
export async function disableVariant(env, slug) {
  await syncResumeVariants(env);
  const result = await env.DB.prepare("UPDATE resume_names SET active = 0 WHERE slug = ? AND kind = 'variant' AND NOT EXISTS (SELECT 1 FROM resume_links WHERE variant = ?)").bind(slug, slug).run();
  return Boolean(result.meta.changes);
}
