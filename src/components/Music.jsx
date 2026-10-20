import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, MusicNote, ArrowClockwise, X } from '@phosphor-icons/react';
import { playDeskSound } from './DeskScene';

export function MusicSticker({ onOpen }) {
  const reduced = useReducedMotion();
  return <div className="music-dock">
    <motion.button className="headphones music-trigger" type="button" aria-label="Open Debaditya’s recent music on Last.fm" aria-haspopup="dialog"
      whileHover={reduced ? undefined : { rotate: -5, y: -3 }} whileTap={{ scale: .96 }}
      onClick={() => { playDeskSound(); onOpen(); }}>
      <img src="/assets/headphones.webp" alt="" width="113" height="113" />
      <span className="music-notes" aria-hidden="true">{[1, 2, 3].map(n => <img key={n} src={`/assets/note-${n}.webp`} alt="" />)}</span>
    </motion.button>
    <span className="handwritten music-dock-caption">on repeat lately<ArrowUpRight size={15} /></span>
  </div>;
}

function Cover({ track, small = false }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [track?.image]);
  return <span className={`album-cover ${small ? 'small' : ''}`}>{track.image && !broken
    ? <img src={track.image} alt={track.album ? `${track.album} album cover` : ''} onError={() => setBroken(true)} />
    : <MusicNote size={small ? 20 : 40} aria-hidden="true" />}</span>;
}

function playedTime(value) {
  if (!value) return 'Recently played';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently played' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

export function MusicPanel({ onClose }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let controller;
    let disposed = false;
    let running = false;
    async function refresh() {
      if (document.hidden || running) return;
      running = true;
      controller = new AbortController();
      try {
        const response = await fetch('/api/music/recent', { signal: controller.signal });
        const next = await response.json();
        if (disposed) return;
        if (!response.ok || !next.available) throw new Error('Music unavailable');
        setData(next); setStatus('ready');
      } catch (error) {
        if (!disposed && error.name !== 'AbortError') setStatus('unavailable');
      } finally { running = false; }
    }
    setStatus('loading');
    refresh();
    const interval = setInterval(refresh, 60000);
    const visibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; controller?.abort(); clearInterval(interval); document.removeEventListener('visibilitychange', visibility); };
  }, [attempt]);

  return <div className="music-panel">
    <div className="dialog-heading"><div><span className="handwritten">A little background music</span><h2>On my headphones</h2></div><button className="icon-button" aria-label="Close recent music" onClick={onClose}><X size={24} /></button></div>
    <div aria-live="polite">
      {status === 'loading' ? <div className="music-placeholder"><MusicNote size={32} /><p>Finding the latest track…</p></div> : status === 'unavailable' ? <div className="music-placeholder"><MusicNote size={32} /><h3>The record’s taking a break.</h3><p>My listening history is still over on Last.fm.</p><button className="text-button" onClick={() => setAttempt(n => n + 1)}><ArrowClockwise size={16} />Try again</button></div> : !data.current ? <div className="music-placeholder"><MusicNote size={32} /><p>No recent scrobbles yet. Check back after the next listening session.</p></div> : <>
        <div className={`current-track ${data.current.nowPlaying ? 'is-playing' : ''}`}>
          <Cover track={data.current} />
          <div><span className="track-status">{data.current.nowPlaying ? <><i className="playing-indicator" />Listening now</> : 'Last played'}</span><a href={data.current.url} target="_blank" rel="noopener noreferrer"><h3>{data.current.name}</h3></a><p>{data.current.artist}</p>{data.current.album && <small>{data.current.album}</small>}{!data.current.nowPlaying && <time dateTime={data.current.playedAt || undefined}>{playedTime(data.current.playedAt)}</time>}</div>
        </div>
        {data.recent.length > 0 && <div className="recent-tracks"><h3 className="handwritten">Before this</h3>{data.recent.map((track, index) => <a href={track.url} target="_blank" rel="noopener noreferrer" className="recent-track" key={`${track.playedAt}-${index}`}><Cover track={track} small /><span><strong>{track.name}</strong><small>{track.artist}</small></span><ArrowUpRight size={16} /></a>)}</div>}
      </>}
    </div>
    <a className="music-profile text-button" href={data?.profile || 'https://www.last.fm/user/zvrz'} target="_blank" rel="noopener noreferrer">zvrz on Last.fm<ArrowUpRight size={17} /></a>
  </div>;
}
