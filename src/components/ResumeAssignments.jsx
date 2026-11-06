import React, { useCallback, useEffect, useState } from 'react';

const base = '/admin/resumes/manage';
async function api(path, options = {}) {
  const result = await fetch(`${base}${path}`, options);
  const data = await result.json();
  if (!result.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
const jsonBody = (method, data) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export default function ResumeAssignments() {
  const [variants, setVariants] = useState([]), [links, setLinks] = useState([]), [tokens, setTokens] = useState([]);
  const [slug, setSlug] = useState(''), [variant, setVariant] = useState(''), [query, setQuery] = useState(''), [name, setName] = useState('');
  const [secret, setSecret] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [v, l, t] = await Promise.all([api('/variants'), api('/links'), api('/tokens')]);
    setVariants(v.variants); setLinks(l.links); setTokens(t.tokens);
    setVariant(current => v.variants.some(item => item.id === current) ? current : (v.variants[0]?.id || ''));
  }, []);
  useEffect(() => { refresh().catch(() => setStatus('Could not load links and credentials. Refresh to try again.')); }, [refresh]);
  async function action(fn, message) {
    setBusy(true); setStatus('');
    try { await fn(); await refresh(); setStatus(message); } catch (error) { setStatus(error.message || 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
  }
  function create(event) { event.preventDefault(); action(async () => { await api('/links', jsonBody('POST', { slug, variant })); setSlug(''); }, 'Link created.'); }
  function reassign(link, next) { action(() => api(`/links/${link.slug}`, jsonBody('PATCH', { variant: next, revision: link.revision })), 'Assignment updated.'); }
  function remove(link) { if (window.confirm(`Remove ${link.slug}? The public link will stop working.`)) action(() => api(`/links/${link.slug}`, { method: 'DELETE' }), 'Link removed.'); }
  function createToken(event) { event.preventDefault(); action(async () => { const result = await api('/tokens', jsonBody('POST', { name })); setSecret(result.token); setName(''); }, 'Credential created. Copy it now; it will not be shown again.'); }
  function revoke(token) { if (window.confirm(`Revoke ${token.name}? That agent will lose access.`)) action(() => api(`/tokens/${token.id}`, { method: 'DELETE' }), 'Credential revoked.'); }
  return <>
    <section className="admin-custom assignment-section" aria-labelledby="assignment-heading">
      <h2 id="assignment-heading">Personalized links</h2>
      <p>Choose an existing resume for each recipient. Anyone with a link can open it, and uploads automatically update every linked copy.</p>
      <form className="admin-create" onSubmit={create}>
        <label htmlFor="assignment-slug">Link name</label><div className="slug-field"><span>dhait.de/resume/</span><input id="assignment-slug" value={slug} onChange={event => setSlug(event.target.value.toLowerCase())} required maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="example-company"/></div>
        <label htmlFor="assignment-variant">Resume</label><select id="assignment-variant" value={variant} onChange={event => setVariant(event.target.value)} required>{variants.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <button type="submit" disabled={busy || !variant}>Create link</button>
      </form>
      <div className="assignment-toolbar"><label htmlFor="assignment-search">Find a link</label><input id="assignment-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name or resume"/><button type="button" disabled={busy} onClick={() => action(async () => {}, 'List refreshed.')}>Refresh</button></div>
      {links.length === 0 ? <p>No personalized links yet.</p> : <div className="assignment-list">{links.filter(link => `${link.slug} ${link.variant}`.toLowerCase().includes(query.toLowerCase())).map(link => <div className="assignment-row" key={link.slug}>
        <a href={link.url} target="_blank" rel="noreferrer">{link.url.replace('https://', '')}</a><label htmlFor={`assignment-${link.slug}`}>Assigned resume</label><select id={`assignment-${link.slug}`} value={link.variant} disabled={busy} onChange={event => reassign(link, event.target.value)}>{!variants.some(item => item.id === link.variant) && <option value={link.variant}>{link.variant} (unavailable)</option>}{variants.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <div className="admin-link"><button type="button" onClick={() => navigator.clipboard.writeText(link.url).then(() => setStatus('Link copied.')).catch(() => setStatus('Copy the link shown above.'))}>Copy link</button><button type="button" className="admin-delete" disabled={busy} onClick={() => remove(link)}>Remove</button></div>
      </div>)}</div>}
    </section>
    <section className="admin-custom assignment-section" aria-labelledby="agent-heading"><h2 id="agent-heading">Agent credentials</h2><p>Give each agent its own credential. It can manage assignments, but cannot upload or delete resume PDFs.</p>
      <form className="admin-create" onSubmit={createToken}><label htmlFor="agent-name">Credential name</label><input id="agent-name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Muse"/><button type="submit" disabled={busy}>Create credential</button></form>
      {secret && <div className="agent-secret"><strong>Copy this credential now. It will not be shown again.</strong><code>{secret}</code><button type="button" onClick={() => navigator.clipboard.writeText(secret).then(() => setStatus('Credential copied.')).catch(() => setStatus('Copy the credential shown above.'))}>Copy credential</button><button type="button" onClick={() => setSecret('')}>Done</button></div>}
      {tokens.length === 0 ? <p>No agent credentials yet.</p> : <div className="assignment-list">{tokens.map(token => <div className="agent-row" key={token.id}><span>{token.name}</span><button type="button" disabled={busy} onClick={() => revoke(token)}>Revoke</button></div>)}</div>}
      <p>API integration details are in the portfolio README. Treat credentials like passwords.</p>
    </section>
    {status && <p className="admin-status" role="status">{status}</p>}
  </>;
}
