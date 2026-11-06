import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, FilePdf } from '@phosphor-icons/react';
import './ResumePage.css';
import './ResumeAdmin.css';
import ResumeAssignments from './ResumeAssignments.jsx';

const roles = [{ id: 'general', title: 'General Resume' }, { id: 'sde', title: 'Software Engineering' }, { id: 'ai', title: 'AI / ML Engineering' }];

function ResumeUpload({ role, onDelete, onToggle }) {
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/admin/resumes/${role.id}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error();
      setInfo(await response.json());
    }).catch(error => { if (error.name !== 'AbortError') setMessage('Could not load the current resume. Refresh to try again.'); });
    return () => controller.abort();
  }, [role.id]);

  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf')) { setMessage('Choose a PDF under 5 MB.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/admin/resumes/${role.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/pdf', ...(role.custom ? { 'X-Resume-Title': encodeURIComponent(role.title) } : {}) }, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed. Please try again.');
      setInfo(data); setFile(null); setInputKey(key => key + 1); setMessage('Updated. The new resume is live.');
    } catch (error) { setMessage(error.message || 'Upload failed. Please try again.'); }
    finally { setBusy(false); }
  }

  return <section className="resume-item admin-item">
    <FilePdf size={28} weight="duotone" aria-hidden="true"/>
    <div><h2>{role.title}</h2>
      <p>{info ? info.updatedAt ? `Updated ${new Date(info.updatedAt).toLocaleString()}` : role.id === 'general' ? 'No general resume uploaded yet' : 'Using the original uploaded resume' : 'Checking current resume…'}</p>
      <a className="admin-view" href={role.id === 'general' ? '/resume' : `/resume/${role.id}`} target="_blank" rel="noreferrer">View current resume <ArrowUpRight size={14}/></a>
      {role.custom && <div className="admin-link"><code>dhait.de/resume/{role.id}</code><span className="admin-visibility">{role.listed ? 'Public role resume · shown on selector and available to agents' : 'Unlisted · direct link works; unavailable to agents'}</span><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${location.origin}/resume/${role.id}`); setMessage('Link copied.'); } catch { setMessage('Copy the link shown above.'); } }}>Copy link</button><button type="button" onClick={() => onToggle(role)}>{role.listed ? 'Make unlisted' : 'Make public role resume'}</button><button type="button" className="admin-delete" onClick={() => onDelete(role)}>Remove</button></div>}
      <form onSubmit={upload}>
        <label htmlFor={`file-${role.id}`}>Choose a replacement PDF</label>
        <input key={inputKey} id={`file-${role.id}`} type="file" accept="application/pdf,.pdf" onChange={event => { setFile(event.target.files?.[0] || null); setMessage(''); }}/>
        <button type="submit" disabled={!file || busy}>{busy ? 'Uploading…' : 'Update resume'}</button>
      </form>
      {message && <p className="admin-message" role="status">{message}</p>}
    </div>
  </section>;
}

export default function ResumeAdmin() {
  const [items, setItems] = useState([]);
  const [visibility, setVisibility] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [file, setFile] = useState(null);
  const [listed, setListed] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  async function refresh() {
    const response = await fetch('/admin/resumes/list');
    if (!response.ok) throw new Error('Could not load company resumes.');
    setItems((await response.json()).items);
  }
  useEffect(() => {
    refresh().catch(error => setStatus(error.message));
    fetch('/admin/resumes/visibility').then(async response => { if (!response.ok) throw new Error(); setVisibility((await response.json()).visible); }).catch(() => setStatus('Could not load selector visibility. Refresh to try again.'));
  }, []);
  async function changeVisibility() {
    setBusy(true); setStatus('');
    try { const response = await fetch('/admin/resumes/visibility', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visible: !visibility }) }); if (!response.ok) throw new Error(); setVisibility((await response.json()).visible); setStatus('Selector visibility updated.'); } catch { setStatus('Could not update visibility. Try again.'); } finally { setBusy(false); }
  }
  async function create(event) {
    event.preventDefault();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60 || ['general','sde','ai','list','visibility'].includes(slug)) { setStatus('Choose a unique link using lowercase letters, numbers, and hyphens.'); return; }
    if (!file || file.size > 5 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf')) { setStatus('Choose a PDF under 5 MB.'); return; }
    setBusy(true); setStatus('');
    try { const response = await fetch(`/admin/resumes/${slug}`, { method: 'PUT', headers: { 'Content-Type': 'application/pdf', 'X-Resume-Title': encodeURIComponent(title.trim()), 'X-Resume-Listed': String(listed), 'If-None-Match': '*' }, body: file }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Upload failed.'); await refresh(); setTitle(''); setSlug(''); setFile(null); setListed(false); setFileKey(key => key + 1); setStatus('Resume created. Copy its link below.'); } catch (error) { setStatus(error.message || 'Upload failed. Try again.'); } finally { setBusy(false); }
  }
  async function remove(role) {
    if (!window.confirm(`Remove ${role.title}? Its link will stop working.`)) return;
    setBusy(true); setStatus('');
    try { const response = await fetch(`/admin/resumes/${role.id}`, { method: 'DELETE' }); if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Could not remove that resume.'); } await refresh(); setStatus('Resume removed.'); } catch (error) { setStatus(error.message || 'Could not remove that resume. Try again.'); } finally { setBusy(false); }
  }
  async function toggle(role) {
    setBusy(true); setStatus('');
    try { const response = await fetch(`/admin/resumes/${role.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listed: !role.listed }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); await refresh(); setStatus('Resume visibility updated.'); } catch (error) { setStatus(error.message || 'Could not update visibility. Try again.'); } finally { setBusy(false); }
  }
  return <main className="resume-page"><div className="resume-sheet">
    <a className="resume-back" href="/"><ArrowLeft size={17}/> Back to portfolio</a>
    <h1>Manage resumes<span>.</span></h1>
    <p className="admin-intro">Manage your public resume links. PDFs can be up to 5 MB.</p>
    <section className="admin-setting"><div><h2>Resume selector</h2><p>{visibility === null ? 'Checking visibility…' : visibility ? 'Visible at dhait.de/resumes' : 'Hidden from visitors'}. Direct resume links remain accessible.</p></div><button type="button" disabled={visibility === null || busy} onClick={changeVisibility}>{visibility ? 'Hide selector' : 'Show selector'}</button></section>
    <div className="resume-list">{roles.map(role => <ResumeUpload key={role.id} role={role}/>)}</div>
    <section className="admin-custom"><h2>More resumes</h2><p>Upload a broad role resume or a company-specific PDF. Unlisted resumes are accessible to anyone with the direct link, but agents cannot select them.</p><form onSubmit={create} className="admin-create"><label htmlFor="custom-title">Name</label><input id="custom-title" required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Data Analyst or Acme Software Engineer"/><label htmlFor="custom-slug">Link name</label><div className="slug-field"><span>dhait.de/resume/</span><input id="custom-slug" required maxLength={60} value={slug} onChange={event => setSlug(event.target.value.toLowerCase())} placeholder="acme"/></div><label htmlFor="custom-file">Resume PDF</label><input key={fileKey} id="custom-file" required type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files?.[0] || null)}/><label className="admin-check"><input type="checkbox" checked={listed} onChange={event => setListed(event.target.checked)}/> Public role resume: show on the selector and allow agents to use it</label><button type="submit" disabled={busy}>{busy ? 'Working…' : 'Create resume link'}</button></form>{status && <p className="admin-status" role="status">{status}</p>}</section>
    {items.length > 0 && <div className="resume-list">{items.map(item => <ResumeUpload key={item.slug} role={{ id: item.slug, title: item.title, listed: item.listed, custom: true }} onDelete={remove} onToggle={toggle}/>)}</div>}
    <ResumeAssignments/>
    <p className="resume-footer">Updates are public as soon as they are uploaded.</p>
  </div></main>;
}
