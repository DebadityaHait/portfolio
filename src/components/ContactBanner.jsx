import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, animate } from 'motion/react';
import { Check, Copy, EnvelopeSimple, LinkedinLogo, ArrowUpRight } from '@phosphor-icons/react';
import { Doodle } from './Sketch';
import { playDeskSound } from './DeskScene';
import { spriteMask, tintSprite } from '../game/spriteTint';

class GameBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function DinoSticker() {
  const canvas = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let mask;
    const image = new Image();
    const draw = () => {
      if (disposed || !image.complete || !image.naturalWidth) return;
      const ctx = canvas.current.getContext('2d');
      mask ||= spriteMask(image, 848, 2, 44, 47);
      tintSprite(ctx, mask, getComputedStyle(canvas.current).getPropertyValue('--game-ink').trim() || '#794b35');
      setReady(true);
    };
    image.onload = draw;
    image.src = '/assets/dino/sprite-1x.png';
    const observer = new MutationObserver(draw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { disposed = true; image.onload = null; observer.disconnect(); };
  }, []);
  return <><canvas ref={canvas} width="44" height="47" hidden={!ready} aria-hidden="true"/>{!ready && <img src="/assets/dino.webp" alt="" width="157" height="160"/>}</>;
}

export default function ContactBanner({ email, linkedin, copied, onCopy }) {
  const [phase, setPhase] = useState('contact');
  const [Game, setGame] = useState(null);
  const [failed, setFailed] = useState(false);
  const [pin, setPin] = useState(null);
  const paper = useRef(null), rest = useRef(null), play = useRef(null);
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const previousPhase = useRef(phase);
  const sticker = useRef(null);
  const controller = useRef(null);
  const operation = useRef(0);
  const animations = useRef([]);
  const reduced = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0), scale = useMotionValue(1), rotate = useMotionValue(8);
  const active = ['entering', 'game'].includes(phase);

  useLayoutEffect(() => {
    if (phase === 'contact' && previousPhase.current !== 'contact') sticker.current?.focus({ preventScroll: true });
    previousPhase.current = phase;
  }, [phase]);

  useEffect(() => () => {
    operation.current++;
    animations.current.forEach(animation => animation.stop());
  }, []);

  function resetSticker() { x.set(0); y.set(0); scale.set(1); rotate.set(8); setPin(null); }
  // Animate height directly: layout scaling stretched the paper and changed
  // the sticker's coordinate system halfway through its journey.
  useLayoutEffect(() => {
    const el = paper.current;
    if (phase === 'contact') { el.style.height = ''; return; }
    const measure = () => {
      const css = getComputedStyle(el);
      const height = Math.max(rest.current.offsetHeight, active ? play.current?.offsetHeight || 0 : 0);
      el.style.height = `${height + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom)}px`;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(rest.current);
    if (play.current) observer.observe(play.current);
    return () => observer.disconnect();
  }, [phase, active, Game]);

  function stickerTarget(target) {
    const start = sticker.current.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(paper.current).transform).inverse();
    const delta = new DOMPoint(target.x + target.width / 2 - start.x - start.width / 2,
      target.y + target.height / 2 - start.y - start.height / 2).matrixTransform(matrix);
    return { x: x.get() + delta.x, y: y.get() + delta.y, scale: target.logicalWidth / sticker.current.offsetWidth };
  }
  useLayoutEffect(() => {
    if (phase !== 'entering') return;
    const target = stickerTarget(controller.current.tip());
    const duration = reduced ? 0 : .6;
    const transition = { duration, ease: [.22, .8, .3, 1] };
    animations.current = [animate(x, target.x, transition), animate(y, target.y, transition),
      animate(scale, target.scale, transition), animate(rotate, 0, transition)];
    const id = operation.current;
    Promise.all(animations.current).then(() => requestAnimationFrame(() => {
      if (operation.current === id && phaseRef.current === 'entering') setPhase('game');
    }));
  }, [phase, reduced]);
  const fail = useCallback(() => {
    if (phaseRef.current === 'leaving') return;
    operation.current++;
    animations.current.forEach(animation => animation.stop());
    controller.current = null;
    setGame(null); setPhase('contact'); setFailed(true);
    resetSticker();
    requestAnimationFrame(() => sticker.current?.focus({ preventScroll: true }));
  }, [x, y, scale, rotate]);

  async function open() {
    if (phase !== 'contact') return;
    const id = ++operation.current;
    setFailed(false); setPhase('loading'); playDeskSound();
    try {
      const module = await import('./DinoGame');
      if (operation.current === id) setGame(() => module.default);
    } catch { if (operation.current === id) fail(); }
  }

  const prepared = useCallback(api => {
    if (phaseRef.current !== 'loading') { api.suspend(); return; }
    controller.current = api;
    // Pin the mobile sticker's original top position before the paper grows.
    setPin({ left: sticker.current.offsetLeft, top: sticker.current.offsetTop, right: 'auto', bottom: 'auto' });
    setPhase('entering');
  }, []);

  const close = useCallback(() => {
    if (phaseRef.current === 'leaving') return;
    const id = ++operation.current;
    controller.current?.suspend();
    animations.current.forEach(animation => animation.stop());
    if (phaseRef.current === 'game') {
      const target = stickerTarget(controller.current.tip());
      x.set(target.x); y.set(target.y); scale.set(target.scale); rotate.set(0);
    }
    setPhase('leaving');
    const transition = { duration: reduced ? 0 : .4, ease: [.22, .8, .3, 1] };
    animations.current = [animate(x, 0, transition), animate(y, 0, transition), animate(scale, 1, transition), animate(rotate, 8, transition)];
    Promise.all(animations.current).then(() => requestAnimationFrame(() => {
      if (operation.current !== id) return;
      setGame(null); setPhase('contact'); setPin(null); controller.current = null;
    }));
  }, [reduced, x, y, scale, rotate]);

  return <section id="contact" className="contact-section">
    <div ref={paper} className="contact-paper" data-game-phase={phase}>
      <img className="paperclip" src="/assets/clip.webp" alt="" aria-hidden="true"/>
      <Doodle name="heart" className="contact-heart"/>
      <div ref={rest} className="contact-rest" aria-hidden={active || undefined} inert={active || undefined}>
        <div className="contact-copy"><span className="handwritten">Good things usually start with a conversation.</span><h2>Let’s build something<br/>worth caring about.</h2><p>A project, an interesting problem, or an open source rabbit hole.<br className="desktop-break"/> My inbox is open.</p>
          <div className="contact-actions"><a className="solid-button" href={`mailto:${email}`}>Say hello <EnvelopeSimple size={19}/></a><a className="contact-linkedin" href={linkedin} target="_blank" rel="noopener noreferrer"><LinkedinLogo size={19}/>LinkedIn<ArrowUpRight size={15}/></a><button className="copy-email" onClick={onCopy}>{copied ? <Check size={17}/> : <Copy size={17}/>}<span aria-live="polite">{copied ? 'Email copied!' : 'Copy email address'}</span></button></div>
        </div>
        {(phase === 'loading' || failed) && <p className="game-load-note" role="status">{failed ? 'The dinosaur couldn’t load.' : 'Preparing the dinosaur…'} <button onClick={phase === 'loading' ? close : open}>{phase === 'loading' ? 'Cancel' : 'Try again'}</button></p>}
      </div>
      <motion.button ref={sticker} className="dino game-trigger" aria-label={phase === 'loading' ? 'Loading dinosaur game' : 'Play the dinosaur game in this banner'} disabled={phase !== 'contact'} aria-hidden={active || undefined} tabIndex={phase === 'contact' ? 0 : -1} style={{ ...pin, x, y, scale, rotate, visibility: phase === 'game' ? 'hidden' : 'visible' }} onClick={open}><DinoSticker/></motion.button>
      <span className="dino-caption handwritten" aria-hidden="true">got a minute?<br/>click to play.</span>
      {Game && <div ref={play} className="contact-play" aria-hidden={phase !== 'game' || undefined} inert={phase !== 'game' || undefined}><GameBoundary onFailure={fail}><Game phase={phase} onPrepared={prepared} onFailure={fail} onBack={close}/></GameBoundary></div>}
    </div>
  </section>;
}
