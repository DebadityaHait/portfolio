import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowClockwise, ArrowUp, ArrowDown, ArrowLeft, ArrowsOut, ArrowsIn, Trophy, Pause, Play, CaretDown } from '@phosphor-icons/react';
import { createRunner } from '../game/createRunner';

function readBest() { try { return Math.max(0, Math.min(99999, Number(localStorage.getItem('dino-best')) || 0)); } catch { return 0; } }
function readNickname() { try { return localStorage.getItem('dino-nickname') || ''; } catch { return ''; } }
function readPending() { try { const score = Number(sessionStorage.getItem('dino-pending-score')); return Number.isInteger(score) && score > 0 && score <= 99999 ? score : null; } catch { return null; } }
function storePending(score) { try { if (score) sessionStorage.setItem('dino-pending-score', String(score)); else sessionStorage.removeItem('dino-pending-score'); } catch {} }
async function loadImage(image) {
  if (image.complete) {
    if (image.naturalWidth) return;
    throw new Error('Sprite unavailable');
  }
  await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
}

function HoldControl({ kind, children, game, disabled }) {
  function pointer(event, down) {
    event.preventDefault();
    if (down) event.currentTarget.setPointerCapture(event.pointerId);
    game.current?.[kind](down);
  }
  function key(event, down) {
    if (![' ', 'Enter'].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat) game.current?.[kind](down);
  }
  return <button className="paper-button" disabled={disabled} onPointerDown={event => pointer(event, true)} onPointerUp={event => pointer(event, false)} onPointerCancel={event => pointer(event, false)} onKeyDown={event => key(event, true)} onKeyUp={event => key(event, false)}>{children}</button>;
}

export default function DinoGame({ phase, onPrepared, onFailure, onBack }) {
  const surface = useRef(null);
  const shell = useRef(null);
  const slot = useRef(null);
  const game = useRef(null);
  const mounted = useRef(true);
  const changing = useRef(false);
  const expandedRef = useRef(false);
  const animation = useRef(null);
  const callbacks = useRef({ onPrepared, onFailure, onBack });
  callbacks.current = { onPrepared, onFailure, onBack };
  const bestRef = useRef(readBest());
  const [best, setBest] = useState(bestRef.current);
  const [score, setScore] = useState(null);
  const pendingRef = useRef(readPending());
  const [pendingScore, setPendingScore] = useState(pendingRef.current);
  const [state, setState] = useState('loading');
  const [expanded, setExpanded] = useState(false);
  const [nickname, setNickname] = useState(readNickname);
  const [board, setBoard] = useState([]);
  const [boardState, setBoardState] = useState('loading');
  const [sharingAvailable, setSharingAvailable] = useState(true);
  const [submission, setSubmission] = useState('idle');
  const [message, setMessage] = useState('');
  const [boardRetry, setBoardRetry] = useState(0);
  const submitController = useRef(null);
  const reduced = useReducedMotion();
  const onScore = useCallback(value => {
    setScore(value);
    if (value > (pendingRef.current || 0)) {
      pendingRef.current = value; setPendingScore(value); storePending(value);
      setSubmission(previous => previous === 'sending' ? previous : 'idle'); setMessage('');
    }
    const next = Math.max(bestRef.current, value);
    bestRef.current = next; setBest(next);
    try { localStorage.setItem('dino-best', String(next)); } catch {}
  }, []);

  useLayoutEffect(() => {
    mounted.current = true;
    const el = shell.current;
    const previous = document.activeElement;
    el.show();
    previous?.focus({ preventScroll: true });
    return () => {
      mounted.current = false;
      animation.current?.cancel();
      el.close();
      document.body.classList.remove('game-expanded');
    };
  }, []);
  useEffect(() => {
    let disposed = false;
    const images = [...surface.current.querySelectorAll('[data-sprite]')];
    let deadline;
    Promise.race([
      Promise.all(images.map(loadImage)),
      new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Sprite timeout')), 10000); }),
    ]).then(() => {
      if (disposed) return;
      game.current = createRunner(surface.current, { onScore, onState: setState, best: bestRef.current });
      setState('ready');
      callbacks.current.onPrepared(game.current);
    }).catch(() => { if (!disposed) callbacks.current.onFailure(); }).finally(() => clearTimeout(deadline));
    return () => { disposed = true; clearTimeout(deadline); images.forEach(image => { image.onload = null; image.onerror = null; }); game.current?.destroy(); game.current = null; };
  }, [onScore]);
  useLayoutEffect(() => {
    if (phase === 'game') game.current?.activate();
    else game.current?.suspend();
  }, [phase]);
  useEffect(() => {
    const controller = new AbortController();
    setBoardState('loading');
    fetch('/api/dino/leaderboard', { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.scores)) throw new Error('Unavailable');
      setBoard(data.scores); setBoardState('ready'); setSharingAvailable(data.sharingAvailable !== false);
    }).catch(error => { if (error.name !== 'AbortError') setBoardState('unavailable'); });
    return () => controller.abort();
  }, [boardRetry]);
  useEffect(() => () => submitController.current?.abort(), []);

  async function expand() {
    if (changing.current || expandedRef.current || phase !== 'game') return;
    changing.current = true;
    game.current?.suspend();
    const el = shell.current;
    el.scrollTop = 0;
    const from = el.getBoundingClientRect();
    slot.current.style.minHeight = `${from.height}px`;
    el.close();
    el.dataset.expanded = 'true';
    expandedRef.current = true; setExpanded(true);
    el.showModal();
    document.body.classList.add('game-expanded');
    const to = el.getBoundingClientRect();
    animation.current = el.animate([
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: .7 },
      { transform: 'none', opacity: 1 },
    ], { duration: reduced ? 0 : 340, easing: 'cubic-bezier(.22,.8,.3,1)' });
    await animation.current.finished.catch(() => {});
    if (!mounted.current) return;
    changing.current = false;
    game.current?.settle();
  }
  async function collapse() {
    if (changing.current || !expandedRef.current) return false;
    changing.current = true;
    game.current?.suspend();
    const el = shell.current;
    const from = el.getBoundingClientRect();
    const to = slot.current.getBoundingClientRect();
    animation.current = el.animate([
      { transform: 'none', opacity: 1 },
      { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`, opacity: .7 },
    ], { duration: reduced ? 0 : 300, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'forwards' });
    await animation.current.finished.catch(() => {});
    if (!mounted.current) return false;
    animation.current.cancel();
    el.close();
    el.dataset.expanded = 'false';
    expandedRef.current = false; setExpanded(false);
    el.show();
    slot.current.style.minHeight = '';
    document.body.classList.remove('game-expanded');
    changing.current = false;
    requestAnimationFrame(() => { if (mounted.current) game.current?.settle(); });
    return true;
  }
  async function back() {
    if (changing.current) return;
    if (expandedRef.current && !await collapse()) return;
    callbacks.current.onBack();
  }
  async function submit(event) {
    event.preventDefault();
    if (!pendingRef.current || submission === 'sending') return;
    const sharedScore = pendingRef.current;
    setSubmission('sending'); setMessage('');
    submitController.current = new AbortController();
    try {
      const response = await fetch('/api/dino/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ nickname, score: sharedScore }), signal: submitController.current.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not share that score. Try again.');
      setBoard(data.scores); setBoardState('ready'); setSharingAvailable(true); setSubmission('idle');
      if (pendingRef.current <= sharedScore) {
        pendingRef.current = null; setPendingScore(null); storePending(null);
      }
      setMessage('Your best shared score is on the board.');
      try { localStorage.setItem('dino-nickname', nickname.trim()); } catch {}
    } catch (error) {
      if (error.name !== 'AbortError') { setSubmission('error'); setMessage(error.message); }
    }
  }
  const hint = { loading: 'Preparing the dinosaur…', ready: 'Space, ↑ or tap the track to start.', running: 'Mind the cacti.', paused: 'Paused. Space or Resume when you’re ready.', over: `Run complete: ${score ?? 0} points. Share your score below, or use Restart for another run.` }[state];
  return <div ref={slot} className="inline-game-slot">
    <dialog ref={shell} className="contact-game-dialog" aria-label="Dinosaur game and shared leaderboard" data-expanded="false" onCancel={event => { event.preventDefault(); collapse(); }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); expandedRef.current ? collapse() : back(); } }} onClick={event => { if (event.target !== event.currentTarget || !expandedRef.current) return; const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) collapse(); }}>
      <div className="dino-game">
        <div className="game-heading"><button className="game-back" onClick={back}><ArrowLeft size={17}/>Back to contact</button><span className="handwritten">A little detour</span><button className="game-expand" onClick={expanded ? collapse : expand} aria-label={expanded ? 'Return game to banner' : 'Expand game over the page'}>{expanded ? <ArrowsIn size={19}/> : <ArrowsOut size={19}/>}<span>{expanded ? 'Collapse' : 'Expand'}</span></button></div>
        <div className="game-scorebar"><span>YOUR BEST <strong>{best.toLocaleString()}</strong></span><span className="handwritten">one more run?</span></div>
        <div className="game-screen" ref={surface} tabIndex={0} role="application" aria-label="Dinosaur runner. Space or Up jumps; Down or Ctrl crouches. Tap to jump." aria-describedby="game-hint">
          <img hidden data-sprite="1x" src="/assets/dino/sprite-1x.png" alt=""/><img hidden data-sprite="2x" src="/assets/dino/sprite-2x.png" alt=""/>
        </div>
        <div className="game-under-track"><p className="game-hint" id="game-hint" aria-live="polite">{hint}</p><div className="game-controls">
          <HoldControl kind="jump" game={game} disabled={['loading', 'over'].includes(state)}><ArrowUp size={16}/>Jump <kbd>Space / ↑</kbd></HoldControl><HoldControl kind="duck" game={game} disabled={['loading', 'over'].includes(state)}><ArrowDown size={16}/>Duck <kbd>↓ / Ctrl</kbd></HoldControl>
          <button className="icon-button" aria-label={state === 'paused' ? 'Resume game' : 'Pause game'} disabled={!['paused', 'running'].includes(state)} onPointerDown={event => event.preventDefault()} onClick={() => state === 'paused' ? game.current?.resume() : game.current?.pause()}>{state === 'paused' ? <Play size={19}/> : <Pause size={19}/>}</button>
          <button className="icon-button" aria-label="Restart dinosaur game" disabled={state === 'loading'} onPointerDown={event => event.preventDefault()} onClick={() => game.current?.restart()}><ArrowClockwise size={19}/></button>
        </div></div>
        {pendingScore > 0 && <form className="score-form" onSubmit={submit}><label htmlFor="dino-nickname">Put your best unshared run on the board</label><div><input id="dino-nickname" name="nickname" value={nickname} maxLength={20} required placeholder="Your nickname" autoComplete="nickname" onChange={event => { setNickname(event.target.value); try { localStorage.setItem('dino-nickname', event.target.value); } catch {} }} aria-describedby="score-help"/><button className="solid-button" disabled={submission === 'sending'}>{submission === 'sending' ? 'Sharing…' : `Share ${pendingScore} points`}</button></div><small id="score-help">Your nickname and score will be public. Your unshared best stays safe in this tab.</small></form>}
        {message && <p className={`score-message ${submission === 'error' ? 'error' : ''}`} role="status">{message}</p>}
        <details className="leaderboard"><summary><Trophy size={18}/><span>The score to beat</span><CaretDown size={15}/></summary><div className="leaderboard-heading"><span>Shared top ten</span><button className="icon-button" aria-label="Refresh leaderboard" onClick={() => setBoardRetry(n => n + 1)} disabled={boardState === 'loading'}><ArrowClockwise size={17}/></button></div>
          {boardState === 'ready' && !sharingAvailable && <p className="board-notice" role="status">Updates are taking a break. Your unshared run stays safe in this tab.</p>}
          {boardState === 'loading' ? <p role="status">Fetching the board…</p> : boardState === 'unavailable' ? <p role="status">The shared board is taking a break. Your personal best stays on this device.</p> : board.length ? <ol>{board.map(row => <li key={row.rank}><span className="leaderboard-rank">{String(row.rank).padStart(2, '0')}</span><span>{row.nickname}</span><strong>{row.score.toLocaleString()}</strong></li>)}</ol> : <div className="leaderboard-empty"><p className="handwritten">Set the score to beat.</p><small>Share a run to join the board.</small></div>}
        </details>
        <p className="game-credit">Chromium’s runner, via <a href="https://github.com/Soheilexe/Chrome-Dino" target="_blank" rel="noopener noreferrer">Soheilexe/Chrome-Dino</a> · <a href="/licenses/t-rex-runner.txt" target="_blank" rel="noopener noreferrer">BSD 3-Clause</a></p>
      </div>
    </dialog>
  </div>;
}
