import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Trophy, Medal, Code } from '@phosphor-icons/react';
import { codingProfiles, milestones } from '../data/achievements';
import './Achievements.css';

const external = { target: '_blank', rel: 'noopener noreferrer' };

function Mark({ name, large = false }) {
  return <span className={`achievement-mark ${large ? 'achievement-mark-large' : ''}`} aria-hidden="true">
    <img src={`/assets/brands/achievement-${name}.svg`} alt="" width="28" height="28" loading="lazy" />
  </span>;
}

export default function Achievements() {
  const reduced = useReducedMotion();
  return <div id="achievements" className="achievements-section" role="region" aria-labelledby="achievements-heading">
    <div className="achievements-heading">
      <h3 id="achievements-heading" className="handwritten">Beyond the pull requests</h3>
      <p>Contests, coding profiles, and a few milestones along the way.</p>
    </div>
    <div className="milestones-board">
      <motion.div className="contest-paper" initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .4 }}>
        <span className="tape" aria-hidden="true" />
        <h4 className="milestone-paper-title handwritten"><Trophy size={22} /> Contests & selections</h4>
        <div className="goldman-result">
          <div className="milestone-event"><Mark name="goldmansachs" large /><div><h5>Goldman Sachs India Hackathon</h5><span className="milestone-year">2026</span></div></div>
          <div className="placement-pair">
            <div><span className="placement-label">Quant track</span><p><strong>42</strong><span>All-India rank<br />of ~14,000 participants</span></p></div>
            <div><span className="placement-label">Computer Science track</span><p><strong>144</strong><span>All-India rank<br />of 15,953 participants</span></p></div>
          </div>
        </div>
        <ul className="milestone-list">{milestones.map(item => <li key={item.name}>
          <Mark name={item.icon} />
          <div><div className="milestone-event-line"><h5>{item.name}</h5><span className="milestone-year">{item.year}</span></div><p className="milestone-result">{item.result}</p><p className="milestone-description">{item.description}</p>{item.url && <a className="milestone-project-link" href={item.url} {...external}>{item.linkLabel}<ArrowUpRight size={13} /></a>}</div>
        </li>)}</ul>
      </motion.div>
      <div className="coding-column">
        <motion.div className="coding-paper" initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .4, delay: reduced ? 0 : .08 }}>
          <h4 className="milestone-paper-title handwritten"><Code size={22} /> Coding profiles</h4>
          <div className="coding-profile-list">{codingProfiles.map(profile => <a key={profile.name} className="coding-profile" href={profile.url} {...external}>
            <div className="coding-profile-heading"><Mark name={profile.icon} /><div><h5>{profile.name}</h5><span className="coding-handle">@{profile.handle}</span></div><ArrowUpRight size={17} /></div>
            <p className="coding-distinction">{profile.distinction}</p><p className="coding-profile-detail">{profile.detail}</p>
          </a>)}</div>
        </motion.div>
        <div className="scholarship-note"><Medal size={29} weight="duotone" /><div><h4>Founder’s Scholarship</h4><p>SRM Institute of Science and Technology</p><span>2023</span></div></div>
      </div>
    </div>
  </div>;
}
