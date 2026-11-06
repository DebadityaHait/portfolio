import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, FilePdf } from '@phosphor-icons/react';
import './ResumePage.css';
import './ResumeAdmin.css';

const roles = [{ id: 'sde', title: 'Software Engineering' }, { id: 'ai', title: 'AI / ML Engineering' }];

function ResumeUpload({ role }) {
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
      const response = await fetch(`/admin/resumes/${role.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed. Please try again.');
      setInfo(data); setFile(null); setInputKey(key => key + 1); setMessage('Updated. The new resume is live.');
    } catch (error) { setMessage(error.message || 'Upload failed. Please try again.'); }
    finally { setBusy(false); }
  }

  return <section className="resume-item admin-item">
    <FilePdf size={28} weight="duotone" aria-hidden="true"/>
    <div><h2>{role.title}</h2>
      <p>{info ? info.updatedAt ? `Updated ${new Date(info.updatedAt).toLocaleString()}` : 'Using the original uploaded resume' : 'Checking current resume…'}</p>
      <a className="admin-view" href={`/resume/${role.id}`} target="_blank" rel="noreferrer">View current resume <ArrowUpRight size={14}/></a>
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
  return <main className="resume-page"><div className="resume-sheet">
    <a className="resume-back" href="/resume"><ArrowLeft size={17}/> Back to resumes</a>
    <h1>Manage resumes<span>.</span></h1>
    <p className="admin-intro">Upload a PDF to update its public link. Maximum file size: 5 MB.</p>
    <div className="resume-list">{roles.map(role => <ResumeUpload key={role.id} role={role}/>)}</div>
    <p className="resume-footer">Updates are public as soon as they are uploaded.</p>
  </div></main>;
}
