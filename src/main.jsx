import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowRight, ArrowDown, GithubLogo, LinkedinLogo, EnvelopeSimple, Sun, Moon, GitMerge, GitPullRequest, Code, ArrowSquareOut, X, MagnifyingGlass, Check, Copy, ArrowUp, GraduationCap, Flask, Trophy } from '@phosphor-icons/react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/indie-flower/400.css';
import contributions from './data/contributions.json';
import calendar from './data/calendar.json';
import brands from './data/brands.json';
import { projects, moreProjects, contributionEdits } from './data/projects';
import { DeskScene, DeskTools, DraggableSticker, IntroLoader, playDeskSound } from './components/DeskScene';
import { Doodle } from './components/Sketch';
import { MusicPanel, MusicSticker } from './components/Music';
import ContactBanner from './components/ContactBanner';
import ProjectBoard from './components/ProjectBoard';
import ProjectPreview from './components/ProjectPreview';
import Achievements from './components/Achievements';
import VisitorMascot from './components/VisitorMascot';
import './style.css';
import './desk.css';
import './widgets.css';
import './components/ProjectPreview.css';
import './components/VisitorMascot.css';


const email = 'debaditya2005hait@gmail.com';
const github = 'https://github.com/DebadityaHait';
const linkedin = 'https://www.linkedin.com/in/debadityahait/';
const external = { target: '_blank', rel: 'noopener noreferrer' };
const shortNames = {'aws-powertools/powertools-lambda-python':'AWS Powertools','apache/datafusion-comet':'DataFusion Comet','apache/datafusion-ballista':'DataFusion Ballista','CERN/TIGRE':'CERN TIGRE','twentyhq/twenty':'Twenty','nvm-sh/nvm':'nvm','docling-project/docling':'Docling','PostHog/posthog':'PostHog','NousResearch/hermes-agent':'Hermes Agent','deepset-ai/haystack-core-integrations':'Haystack'};
const labels = {merged:'Merged',landed:'Landed via commit',open:'Open',closed:'Closed / predecessor'};

function Clip({className=''}) { return <img className={`paperclip ${className}`} src="/assets/clip.webp" alt="" aria-hidden="true" />; }
function SectionTitle({id,children,note}) { const reduced=useReducedMotion();return <motion.div className="section-heading" initial={{opacity:reduced?1:0,y:reduced?0:15}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.8}} transition={{duration:reduced?0:.55}}><h2 id={id}>{children}</h2>{note && <p>{note}</p>}</motion.div>; }
function Status({status}) { const Icon = status==='open' ? GitPullRequest : status==='closed' ? X : GitMerge; return <span className={`status status-${status}`}><Icon size={13} weight="bold" />{labels[status]}</span>; }
function Brand({item,size=26}) {
  const brand = brands.repos[item.repo];
  return <span className={`brand-icon ${item.repo==='astral-sh/ruff'?'brand-ruff':''}`} style={{'--brand':brand?.color || '#48644d',width:size+15,height:size+15}}>{brand ? <img src={brand.src} alt="" width={size} height={size} loading="lazy"/> : <Code size={size} />}</span>;
}

function InstitutionLogo({name}) {
  const brand=brands.institutions[name];
  return <span className={`institution-logo institution-${name}`} style={{'--brand':brand.color}}><img src={brand.src} alt={`${brand.name} logo`} width="52" height="52" loading="lazy"/></span>;
}

function Calendar() {
  const days = calendar.days.slice(-371);
  const first = new Date(days[0].date+'T12:00:00Z');
  const pad = first.getUTCDay();
  const cells = [...Array(pad).fill(null),...days];
  const totalColumns = Math.ceil(cells.length/7);
  const months = [];
  let lastMonth = '';
  for (let col=0;col<totalColumns;col++) {
    const day = cells.slice(col*7,col*7+7).find(Boolean);
    const month = day ? new Date(day.date+'T12:00:00Z').toLocaleString('en',{month:'short',timeZone:'UTC'}) : '';
    if (month !== lastMonth) { months.push({month,col}); lastMonth=month; }
  }
  const end=days.at(-1).date;
  return <div className="calendar-paper">
    <div className="calendar-title"><span><GithubLogo size={18} weight="bold" /><strong>{calendar.total.toLocaleString()}</strong> contributions in the last year</span><a href={github} {...external}>the little things add up <ArrowUpRight size={14}/></a></div>
    <div className="calendar-scroll"><div className="calendar-inner" style={{'--columns':totalColumns}}>
      <div className="calendar-months">{months.map(({month,col})=><span key={`${month}-${col}`} style={{gridColumn:col+1}}>{month}</span>)}</div>
      <div className="calendar-grid" role="img" aria-label={`${calendar.total} GitHub contributions from ${days[0].date} to ${end}`}>{cells.map((d,i)=><span key={d?.date || i} style={{'--week':Math.floor(i/7)}} className={`calendar-cell level-${d?.level || 0} ${!d?'blank':''}`} title={d ? `${d.date}: ${d.count} contributions` : undefined}/>)}</div>
    </div></div>
    <div className="calendar-footer"><span>GitHub snapshot, {new Date(calendar.fetchedAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}</span><span className="legend">Less {[0,1,2,3,4].map(n=><i key={n} className={`level-${n}`}/>)} More</span></div>
  </div>;
}

function ContributionCard({item,index}) {
  const reduced=useReducedMotion();
  const edit=contributionEdits[item.id] || {};
  const name=edit.short || shortNames[item.repo] || item.name;
  const number=item.url.split('/').at(-1);
  return <motion.a className={`contribution-card paper-tone-${index%3}`} style={{'--rotation':`${[-1.1,.7,-.6,1.1][index%4]}deg`,'--delay':`${index*55}ms`}} initial={{opacity:0,y:reduced?0:30,rotate:reduced?0:[-3,2,-2,3][index%4]}} whileInView={{opacity:1,y:0,rotate:[-1.1,.7,-.6,1.1][index%4]}} viewport={{once:true,amount:.15}} whileHover={reduced?undefined:{y:-5,rotate:0}} transition={{type:'spring',stiffness:140,damping:19,delay:index%2*.07}} href={item.url} {...external} onClick={()=>playDeskSound()}>
    <div className="contribution-top"><Brand item={item}/><span className="repo-name">{name}<small>{item.repo}</small></span><ArrowUpRight className="card-arrow" size={18}/></div>
    <h3>{edit.title || item.title.replace(/^(fix|feat|docs)(\([^)]*\))?:\s*/i,'')}</h3>
    <p>{edit.description || item.description || item.title}</p>
    <div className="contribution-bottom"><Status status={item.status}/><span className="pr-number">#{number}</span></div>
    <div className="card-tags">{(edit.tags || [item.language || 'Open source']).map(tag=><span key={tag}>{tag}</span>)}</div>
  </motion.a>;
}

function ContributionLog({onClose}) {
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const filtered=contributions.filter(c=>(filter==='all' || (filter==='merged' ? ['merged','landed'].includes(c.status) : c.status===filter)) && `${c.name} ${c.repo} ${c.title} ${c.description} ${c.language}`.toLowerCase().includes(search.toLowerCase()));
  return <><div className="dialog-heading"><div><span className="handwritten">Working in the open</span><h2>Contribution log</h2></div><button className="icon-button" aria-label="Close contribution log" onClick={onClose}><X size={24}/></button></div>
    <p className="dialog-intro">A record of patches, reviews, and the details along the way. Statuses are from the supplied October 2026 contribution report.</p>
    <label className="search-field"><MagnifyingGlass size={19}/><input autoFocus type="search" placeholder="Search a repository, language, or fix…" value={search} onChange={e=>setSearch(e.target.value)}/><span className="sr-only">Search contributions</span></label>
    <div className="log-tabs" role="group" aria-label="Filter contributions">{[['all','All'],['merged','Merged / landed'],['open','Open'],['closed','Closed / predecessor']].map(([value,label])=><button key={value} aria-pressed={filter===value} className={filter===value?'selected':''} onClick={()=>setFilter(value)}>{label}</button>)}</div>
    <p className="result-count" aria-live="polite">{filtered.length} {filtered.length===1?'contribution':'contributions'}</p>
    <div className="log-list">{filtered.length ? filtered.map(c=><a key={c.id} href={c.url} {...external} className="log-entry"><Brand item={c} size={20}/><div><strong>{contributionEdits[c.id]?.short || shortNames[c.repo] || c.repo}</strong><p>{c.title}</p><Status status={c.status}/>{c.status==='landed' || c.status==='closed' ? <small className="source-status">{c.sourceStatus.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')}</small>:null}</div><ArrowUpRight size={18}/></a>) : <div className="empty-state"><MagnifyingGlass size={30}/><h3>No matching contributions</h3><p>Try another repository or clear your search.</p><button onClick={()=>{setSearch('');setFilter('all');}}>Clear filters</button></div>}</div>
  </>;
}

function ProjectGallery({images,initialIndex=0}) {
  const [selected,setSelected]=useState(initialIndex);
  const reduced=useReducedMotion();
  const image=images[selected];
  return <div className="project-gallery">
    <motion.img key={image.image} className="project-gallery-image" src={image.image} alt={image.alt} width="1600" height="1000" initial={reduced?false:{opacity:.5}} animate={{opacity:1}} transition={{duration:.2}}/>
    <div className="project-gallery-controls" role="group" aria-label="Project screenshots">{images.map((item,index)=><button key={item.image} aria-pressed={selected===index} onClick={()=>setSelected(index)}>{item.label}</button>)}</div>
    <p className="detail-caption" aria-live="polite">{image.caption}</p>
  </div>;
}

function ProjectDetail({project,onClose,initialIndex=0}) {
  return <><div className="dialog-heading"><div><span className="handwritten">{project.category}</span><h2>{project.name}</h2></div><button className="icon-button" aria-label="Close project details" onClick={onClose}><X size={24}/></button></div>
    {project.gallery?<ProjectGallery images={project.gallery} initialIndex={initialIndex}/>:<><img className={`detail-image detail-${project.id}`} src={project.image} alt={`${project.name} ${project.imageNote.toLowerCase()}`}/><div className="detail-caption">{project.imageNote}</div></>}
    <p className="detail-lead">{project.details}</p>
    <h3 className="detail-heading">Under the hood</h3>
    <ul className="engineering-list">{project.engineering.map(s=><li key={s}><Check size={18}/><span>{s}</span></li>)}</ul>
    <div className="detail-note">{project.note}</div>
    <div className="detail-links">{project.live&&<a href={project.live} {...external} className="solid-button">{project.liveLabel || 'Explore the project'} <ArrowUpRight size={17}/></a>}{project.demo&&<a href={project.demo} {...external} className="text-button">{project.demoLabel || 'Open the demo'} <ArrowUpRight size={15}/></a>}{project.repo&&<a href={project.repo} {...external} className="text-button"><GithubLogo size={19}/> Source code <ArrowUpRight size={15}/></a>}</div>
  </>;
}

function App() {
  const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
  const [active,setActive]=useState('about');
  const [ossFilter,setOssFilter]=useState('merged');
  const [modal,setModal]=useState(null);
  const [copied,setCopied]=useState(false);
  const [ready,setReady]=useState(false);
  const [replay,setReplay]=useState(0);
  const [resetKey,setResetKey]=useState(0);
  const [palette,setPalette]=useState(()=>document.documentElement.dataset.palette || 'blue');
  const reduced=useReducedMotion();
  const dialog=useRef(null);
  const copyTimer=useRef(null);

  useEffect(()=>{
    document.documentElement.dataset.theme=theme;
    try { localStorage.setItem('desk-theme',theme); } catch {}
  },[theme]);
  useEffect(()=>{
    document.documentElement.dataset.palette=palette;
    try{localStorage.setItem('desk-palette',palette);}catch{}
  },[palette]);
  useEffect(()=>{
    const observer=new IntersectionObserver(entries=>{for(const entry of entries) if(entry.isIntersecting)setActive(entry.target.id);},{rootMargin:'-15% 0px -55% 0px'});
    document.querySelectorAll('section[id]').forEach(el=>observer.observe(el));
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const el=dialog.current;
    if(modal && !el.open) {el.showModal(); document.body.classList.add('dialog-open');}
    else if(!modal && el.open) {el.close(); document.body.classList.remove('dialog-open');}
    return ()=>document.body.classList.remove('dialog-open');
  },[modal]);
  useEffect(()=>()=>clearTimeout(copyTimer.current),[]);
  async function copyEmail() {
    try { await navigator.clipboard.writeText(email); setCopied(true); clearTimeout(copyTimer.current); copyTimer.current=setTimeout(()=>setCopied(false),2500); }
    catch { window.location.href=`mailto:${email}`; }
  }
  const featuredIds=ossFilter==='merged'?['M20','M2','M6','M7','M16','M13']:['O1','O6','O8','O12','O14','O10'];
  const featured=featuredIds.map(id=>contributions.find(c=>c.id===id)).filter(Boolean);

  return <div className={`portfolio-world ${ready?'is-ready':'is-assembling'}`} data-entrance={ready?'ready':'pending'}>
    <IntroLoader replayKey={replay} onReady={()=>setReady(true)}/>
    <DeskScene resetKey={resetKey} ready={ready}/>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header"><nav aria-label="Main navigation"><a className="wordmark" href="#about" aria-label="Debaditya Hait, home">dh<span>.</span></a><div className="nav-links">{[['about','About'],['open-source','Open source'],['projects','Projects'],['background','Background']].map(([id,label])=><a key={id} href={`#${id}`} className={active===id?'active':''} aria-current={active===id?'location':undefined} onClick={()=>playDeskSound()}>{active===id&&<motion.span layoutId="nav-highlight" className="nav-highlight" transition={{type:'spring',stiffness:330,damping:30}}/>}<span>{label}</span></a>)}</div><div className="nav-actions"><button className="icon-button theme-toggle" onClick={()=>{setTheme(theme==='light'?'dark':'light');playDeskSound('switch');}} aria-label={`Switch to ${theme==='light'?'dark':'light'} theme`}>{theme==='light'?<Moon size={19}/>:<Sun size={19}/>}</button><a href="#contact" className="nav-contact">Say hello <ArrowUpRight size={16}/></a></div></nav></header>

    <main id="main">
      <section id="about" className="about-section">
        <div className="desk-label handwritten">welcome to my little corner of the internet.<Doodle name="star"/></div>
        <div className="profile-paper has-mascot">
          <Clip className="profile-clip"/>
          <div className="profile-content"><div className="profile-intro handwritten">Hey there, I’m</div><h1>Debaditya Hait<span className="name-period">.</span></h1><p className="profile-role">Software engineer. Open source contributor. Curious by default.</p><div className="profile-note"><span className="note-pin"/><p className="profile-copy">I build across <strong>systems, AI, and the web</strong>. Sometimes that means a new product. Sometimes it’s a small fix in a codebase used by millions.</p><p className="profile-copy secondary-copy">I like understanding how things work, especially when they don’t.</p><Doodle name="scribble" className="profile-note-scribble"/></div>
          <div className="social-links"><a href={github} {...external}><GithubLogo size={20} weight="bold"/>GitHub<ArrowUpRight size={13}/></a><a href="https://www.linkedin.com/in/debadityahait/" {...external}><LinkedinLogo size={20} weight="bold"/>LinkedIn<ArrowUpRight size={13}/></a><a href={`mailto:${email}`}><EnvelopeSimple size={20}/>Email<ArrowUpRight size={13}/></a></div><a className="profile-milestones" href="#achievements"><Trophy size={16}/>Contests & coding profiles<ArrowRight size={13}/></a></div>
          <div className="profile-aside mascot-aside"><VisitorMascot/><MusicSticker onOpen={()=>setModal({type:'music'})}/></div>
        </div>
        <Calendar/>
        <div className="under-profile"><span className="handwritten">a lot of this happens in the open</span><Doodle name="arrow-curved"/></div>
      </section>

      <section id="open-source" className="oss-section">
        <Doodle name="sun" className="section-sun"/><span className="section-side-note handwritten">good software is<br/>a team sport.</span>
        <SectionTitle id="oss-heading" note="Compiler checks, runtime fixes, and developer tools. Selected work from the contribution report.">Open source, close to heart<span className="hand-drawn-underline"/></SectionTitle>
        <div className="oss-overview"><div className="oss-summary"><span className="big-number">21</span><span>contributions<br/><strong>merged or landed</strong></span></div><span className="summary-divider"/><div className="oss-summary"><span className="big-number">18</span><span>pull requests<br/><strong>open in the report</strong></span></div><div className="summary-note handwritten">from Rust internals<br/>to the UI details.</div></div>
        <div className="oss-controls"><div className="paper-tabs" role="group" aria-label="Contribution category"><button className={ossFilter==='merged'?'selected':''} aria-pressed={ossFilter==='merged'} onClick={()=>{setOssFilter('merged');playDeskSound();}}><GitMerge size={16}/>Merged & landed</button><button className={ossFilter==='open'?'selected':''} aria-pressed={ossFilter==='open'} onClick={()=>{setOssFilter('open');playDeskSound();}}><GitPullRequest size={16}/>Open work</button></div><span className="controls-note">A few selected patches <Doodle name="arrow-wavy"/></span></div>
        <AnimatePresence mode="wait"><motion.div className="contributions-grid" key={ossFilter} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:reduced?0:.2}}>{featured.map((item,index)=><ContributionCard key={item.id} item={item} index={index}/>)}</motion.div></AnimatePresence>
        <div className="oss-bottom"><p>Also contributed to <strong>PyTorch</strong>, <strong>Vite</strong>, <strong>AWS Powertools</strong>, <strong>rclone</strong>, and more.</p><button className="paper-button" onClick={()=>setModal({type:'contributions'})}>Browse the contribution log <ArrowRight size={17}/></button></div>
        <p className="snapshot-note">PR statuses reflect the supplied October 2026 report. Each card links to the upstream record.</p>
      </section>

      <section id="projects" className="projects-section">
        <div className="laptop-holder"><DraggableSticker src="/assets/macbook.webp" label="One more side project won’t hurt." rotation={-12} resetKey={resetKey} className="laptop-sticker"/><Doodle name="arrow-curved"/><span className="handwritten">famous last words.</span></div>
        <SectionTitle id="projects-heading" note="Ideas that turned into code, and kept going.">Things I’ve put together</SectionTitle>
        <ProjectBoard>{projects.map((project,index)=><motion.article key={project.id} className={`project-card project-${project.id}`} style={{'--rotation':`${[-1.5,1.3,.9,-1.1][index]}deg`}} initial={{opacity:0,y:reduced?0:-20,rotate:reduced?0:[-6,5,4,-5][index]}} whileInView={{opacity:1,y:0,rotate:[-1.5,1.3,.9,-1.1][index]}} viewport={{once:true,amount:.15}} whileHover={reduced?undefined:{rotate:0}} transition={{type:'spring',stiffness:100,damping:14,delay:index%2*.12}}>
          <ProjectPreview project={project} onOpen={initialIndex=>{setModal({type:'project',project,initialIndex});playDeskSound();}}/>
          <div className="project-content"><div className="project-title-row"><h3><button onClick={()=>setModal({type:'project',project})}>{project.name}</button></h3><div className="project-icon-links">{project.repo&&<a href={project.repo} {...external} aria-label={`${project.name} source on GitHub`}><GithubLogo size={21}/></a>}{project.live&&<a href={project.live} {...external} aria-label={`Visit ${project.name}`}><ArrowSquareOut size={21}/></a>}</div></div><p className="project-category handwritten">{project.category}</p><p className="project-description">{project.description}</p><div className="project-tags">{project.tags.map(tag=><span key={tag}>{tag}</span>)}</div><div className="project-card-footer"><span>{project.imageNote}</span><button onClick={()=>setModal({type:'project',project})}>Take a closer look <ArrowUpRight size={15}/></button></div></div>
        </motion.article>)}</ProjectBoard>
        <div className="more-projects-paper"><span className="tape tape-more"/><h3 className="handwritten">There’s a little more in the drawer.</h3><div className="more-projects-list">{moreProjects.map(p=><a href={p.url} {...external} key={p.name}><div className="more-project-title"><strong>{p.name}</strong><span>{p.kind}</span><ArrowUpRight size={17}/></div><p>{p.description}</p></a>)}</div><a className="all-repos-link" href={`${github}?tab=repositories`} {...external}>All repositories <ArrowRight size={16}/></a></div>
      </section>

      <section id="background" className="background-section"><Doodle name="cube" className="background-cube"/><SectionTitle id="background-heading" note="A bit of research, a lot of learning, and a habit of building.">How I got here</SectionTitle>
        <div className="background-grid"><div className="background-paper"><span className="tape"/><h3><Flask size={22}/> Research & experience</h3><div className="experience-entry"><div className="institution-heading"><InstitutionLogo name="samsung"/><div><div className="experience-date">APR - SEP 2025</div><h4>Samsung R&D Institute India</h4><span className="experience-role">PRISM Research Intern</span></div></div><p>Worked on prompt injection and jailbreak detection with ModernBERT. Fine-tuned an encoder classifier on 75,000+ augmented prompts.</p><span className="research-tag">AI safety & LLM guardrails</span></div><div className="experience-entry"><div className="institution-heading"><InstitutionLogo name="iitm"/><div><div className="experience-date">JUN - AUG 2025</div><h4>IIT Madras</h4><span className="experience-role">AI Research & Prototyping Intern</span></div></div><p>Explored Alzheimer’s progression modeling with longitudinal MRI and physics-informed neural networks in PyTorch.</p><span className="research-tag">Scientific ML & medical imaging</span></div></div>
        <div className="background-right"><div className="education-note"><h3><GraduationCap size={22}/> Still learning</h3><div className="institution-heading"><InstitutionLogo name="srm"/><div><h4>B.Tech, Computer Science</h4><p>SRM Institute of Science and Technology</p><span>2023 - present</span></div></div><div className="institution-heading"><InstitutionLogo name="iitm"/><div><h4>B.S., Data Science & Applications</h4><p>IIT Madras <span className="online-label">(online)</span></p><span>2024 - present</span></div></div></div><div className="toolbox-note"><h3 className="handwritten">Usually somewhere between…</h3><p>Rust & Python. TypeScript & React.<br/>ML models & the systems around them.</p><div className="toolbox-icons">{[['rust','Rust'],['python','Python'],['typescript','TypeScript'],['react','React'],['pytorch','PyTorch'],['cloudflare','Cloudflare']].map(([icon,name])=><img key={icon} src={`/assets/icons/${icon}.svg`} alt={name} title={name} width="24" height="24"/>)}</div></div></div></div>
        <Achievements/>
      </section>

      <ContactBanner linkedin={linkedin} email={email} copied={copied} onCopy={copyEmail}/>
    </main>
    <footer><a className="footer-name" href="#about">Debaditya Hait<span className="handwritten">still figuring things out, still shipping.</span></a><div className="footer-links"><a href={github} {...external} aria-label="GitHub"><GithubLogo size={20}/></a><a href="https://www.linkedin.com/in/debadityahait/" {...external} aria-label="LinkedIn"><LinkedinLogo size={20}/></a><a href={`mailto:${email}`} aria-label="Email"><EnvelopeSimple size={20}/></a></div><a href="#about" className="back-top" aria-label="Back to top"><ArrowUp size={18}/></a><div className="footer-bottom"><span>© {new Date().getFullYear()} Debaditya Hait</span><span>Doodles by <a href="https://www.fffuel.co/dddoodle/" {...external}>fffuel (CC BY 4.0)</a></span></div></footer>
    <DeskTools onReplay={()=>{window.scrollTo({top:0,behavior:'instant'});setReady(false);setReplay(n=>n+1);}} onReset={()=>setResetKey(n=>n+1)} palette={palette} setPalette={setPalette}/>
    <dialog ref={dialog} className={`paper-dialog ${modal?.type==='contributions'?'log-dialog':''} ${modal?.type==='music'?'music-dialog':''}`} aria-label={modal?.type==='project'?`${modal.project.name} project details`:modal?.type==='music'?'Recent music from Last.fm':'Open source contribution log'} onCancel={()=>setModal(null)} onClose={()=>{setModal(null);document.body.classList.remove('dialog-open');}} onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}><div className="dialog-content">{modal?.type==='contributions'?<ContributionLog onClose={()=>setModal(null)}/>:modal?.type==='project'?<ProjectDetail key={modal.project.id} project={modal.project} initialIndex={modal.initialIndex || 0} onClose={()=>setModal(null)}/>:modal?.type==='music'?<MusicPanel onClose={()=>setModal(null)}/>:null}</div></dialog>
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
