import React, { useState } from 'react';
import { ArrowUpRight } from '@phosphor-icons/react';

export default function ProjectPreview({ project, onOpen }) {
  const [view, setView] = useState('website');
  const [peek, setPeek] = useState(false);
  const [productReady, setProductReady] = useState(false);
  const product = productReady && (view === 'product' || peek);

  function select(next) { setView(next); setPeek(false); }

  return <div className="project-preview" data-preview={product ? 'product' : 'website'} style={{ '--product-fit': project.productFit || 'contain' }}>
    <button className="project-image-button" onClick={() => onOpen(1)} aria-label={`Read about ${project.name}`}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setPeek(true); }} onPointerLeave={() => setPeek(false)}
      onFocus={() => setPeek(true)} onBlur={() => setPeek(false)}>
      <img className="project-website-image" src={project.image} alt={project.imageAlt} aria-hidden={product} loading="lazy" width="1600" height="1000" />
      <img className="project-product-image" src={project.productImage} alt={project.productAlt} aria-hidden={!product} loading="lazy" width="1600" height="1000" onLoad={() => setProductReady(true)} />
      <span className="image-open" aria-hidden="true"><ArrowUpRight size={22} /></span>
    </button>
    <div className="project-preview-bar">
      <div className="project-preview-switch" role="group" aria-label={`${project.name} preview`}>
        <button aria-pressed={!product} onClick={() => select('website')}>Website</button>
        <button aria-pressed={product} onClick={() => select('product')}>Product UI</button>
      </div>
      <span className="project-preview-hint">{product ? 'Click to explore' : 'Hover to peek inside'}</span>
    </div>
  </div>;
}
