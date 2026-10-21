import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { Mascot } from './Mascot';

const cacheKey = 'portfolio-visitor-greeting';
const replies = [
  { title: 'Nice to meet you!', detail: 'Thanks for stopping by.' },
  { title: 'Hello again!', detail: 'Have a look around.' },
  { title: 'Still here :)', detail: 'There’s more down the page.' },
];

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 5 || hour >= 22) return 'A late-night hello.';
  return hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : 'Good evening.';
}

function readVisit() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey));
    if (cached && Date.now() - cached.at < 2 * 60 * 60 * 1000) {
      return { city: typeof cached.city === 'string' ? cached.city.trim().slice(0, 60) : '', returning: true, cached: true };
    }
  } catch {}
  return { city: '', returning: false, cached: false };
}

export default function VisitorMascot() {
  const [visit, setVisit] = useState(readVisit);
  const [loading, setLoading] = useState(!visit.cached);
  const [reply, setReply] = useState(null);
  const replyCount = useRef(0);
  const replyTimer = useRef(null);
  const reduced = useReducedMotion();
  const targetX = useMotionValue(0), targetY = useMotionValue(0);
  const x = useSpring(targetX, { stiffness: 150, damping: 22 });
  const y = useSpring(targetY, { stiffness: 150, damping: 22 });

  useEffect(() => {
    if (visit.cached) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    let mounted = true;
    async function greet() {
      let city = '';
      try {
        const response = await fetch('/api/visitor', { signal: controller.signal, cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (typeof data.city === 'string') city = data.city.trim().slice(0, 60);
        }
      } catch {}
      finally {
        clearTimeout(timeout);
        if (mounted) {
          setVisit(current => ({ ...current, city }));
          setLoading(false);
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ city, at: Date.now() })); } catch {}
        }
      }
    }
    greet();
    return () => { mounted = false; clearTimeout(timeout); controller.abort(); };
  }, [visit.cached]);

  useEffect(() => () => clearTimeout(replyTimer.current), []);

  const look = useCallback(direction => {
    const parts = direction.split('-');
    targetX.set(!reduced && parts.includes('left') ? -4 : !reduced && parts.includes('right') ? 4 : 0);
    targetY.set(!reduced && parts.includes('up') ? -2 : !reduced && parts.includes('down') ? 2 : 0);
  }, [reduced, targetX, targetY]);

  const sayHello = useCallback(dizzy => {
    clearTimeout(replyTimer.current);
    setReply(dizzy ? { title: 'Easy there!', detail: 'I’m a little dizzy.' } : replies[replyCount.current++ % replies.length]);
    replyTimer.current = setTimeout(() => setReply(null), dizzy ? 1600 : 2800);
  }, []);

  const message = reply || {
    title: visit.returning ? 'Welcome back!' : 'Hello, visitor!',
    detail: visit.city ? `Visiting from ${visit.city}?` : timeGreeting(),
  };

  return <div className="visitor-mascot">
    <motion.div className="visitor-bubble" style={reduced ? undefined : { x, y }}>
      <div className="visitor-message" role="status" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${message.title}-${message.detail}`} initial={reduced ? false : { opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 1 } : { opacity: 0, y: -3 }} transition={{ duration: reduced ? 0 : .12 }}>
            <span className="visitor-title handwritten">{message.title}</span>
            <span className="visitor-detail">{message.detail}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      {loading && <span className="visitor-typing" aria-label="Loading visitor greeting"><i/><i/><i/></span>}
    </motion.div>
    <div className="mascot-portrait">
      <Mascot directions="/mascots/deba-compact-directions.webp" reactions="/mascots/deba-compact-reactions.webp" size={230} animateOnClick={false}
        className="deba-mascot" label="Debaditya’s portrait" onInteract={sayHello} onDirectionChange={look}/>
    </div>
    <span id="mascot-hint" className="mascot-hint handwritten"><span className="mascot-hint-pointer">Move around. Say hello.</span><span className="mascot-hint-touch">Tap anywhere. Say hello.</span></span>
  </div>;
}
