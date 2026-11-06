import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, FilePdf } from '@phosphor-icons/react';
import './ResumePage.css';

const resumes = [
  { title: 'General Resume', description: 'An overview of my work and experience.', href: '/resume', filename: 'Debaditya_Hait_Resume.pdf' },
  { title: 'Software Engineering', description: 'For software engineering and systems roles.', href: '/resume/sde', filename: 'Debaditya_Hait_SDE_Resume.pdf' },
  { title: 'AI / ML Engineering', description: 'For machine learning and AI engineering roles.', href: '/resume/ai', filename: 'Debaditya_Hait_AI_Engineer_Resume.pdf' },
];

export default function ResumePage() {
  const [otherResumes, setOtherResumes] = useState([]);
  const [generalAvailable, setGeneralAvailable] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch('/api/resumes', { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(data => { if (data?.items) { setOtherResumes(data.items); setGeneralAvailable(data.generalAvailable === true); } }).catch(() => {}); return () => controller.abort(); }, []);
  return <main className="resume-page">
    <div className="resume-sheet">
      <a className="resume-back" href="/"><ArrowLeft size={17}/> Back to portfolio</a>
      <h1>Debaditya Hait<span>.</span></h1>
      <p className="resume-intro handwritten">A resume for the role you have in mind.</p>
      <div className="resume-list">
        {[...resumes.filter(item => item.href !== '/resume' || generalAvailable), ...otherResumes.map(item => ({ title: item.title, description: 'A resume tailored to this role.', href: `/resume/${item.slug}`, filename: `Debaditya_Hait_${item.slug.replaceAll('-', '_')}_Resume.pdf` }))].map(item => <section className="resume-item" key={item.href}>
          <FilePdf size={28} weight="duotone" aria-hidden="true"/>
          <div><h2>{item.title}</h2><p>{item.description}</p>
            <div className="resume-actions"><a href={item.href}>Open resume <ArrowUpRight size={15}/></a><a href={item.href} download={item.filename}>Download PDF</a></div>
          </div>
        </section>)}
      </div>
      <p className="resume-footer">Want to see more? <a href="/#projects">Explore my projects</a> or <a href="/#open-source">open source work</a>.</p>
    </div>
  </main>;
}
