import React, { Children, useLayoutEffect, useRef, useState } from 'react';

// The grid slots, rope anchors and clips share one coordinate system. Only
// each paper animates; its peg and attachment point remain stationary.
export default function ProjectBoard({ children }) {
  const board = useRef(null);
  const [rope, setRope] = useState({ width: 1, height: 1, paths: [] });
  useLayoutEffect(() => {
    const el = board.current;
    let frame;
    function measure() {
      const slots = [...el.querySelectorAll(':scope > .project-slot')];
      const rows = new Map();
      for (const slot of slots) {
        const key = slot.offsetTop;
        const anchors = rows.get(key) || [];
        anchors.push({ x: slot.offsetLeft + slot.clientWidth / 2, y: key - 2 });
        rows.set(key, anchors);
      }
      const width = el.clientWidth, height = el.clientHeight;
      const paths = [...rows.values()].map(anchors => {
        const points = [{ x: -70, y: anchors[0].y - 24 }, ...anchors,
          { x: width + 70, y: anchors.at(-1).y - 24 }];
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1], b = points[i];
          d += ` Q ${(a.x + b.x) / 2} ${Math.max(a.y, b.y) + 12} ${b.x} ${b.y}`;
        }
        return d;
      });
      setRope(previous => previous.width === width && previous.height === height && previous.paths.join() === paths.join()
        ? previous : { width, height, paths });
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    for (const child of el.querySelectorAll(':scope > .project-slot')) observer.observe(child);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, []);

  return <div className="project-board anchored-board" ref={board}>
    <svg className="project-lines" viewBox={`0 0 ${rope.width} ${rope.height}`} aria-hidden="true">
      {rope.paths.map((d, i) => <g key={i}>
        <path d={d} fill="none" stroke="#1d202640" strokeWidth="4" transform="translate(0 1)"/>
        <path d={d} fill="none" stroke="#c8aa85" strokeWidth="2"/>
        <path d={d} fill="none" stroke="#ecd2ac" strokeWidth=".7" strokeDasharray="2 3"/>
      </g>)}
    </svg>
    {Children.map(children, child => <div className="project-slot">
      <span className="project-peg" aria-hidden="true"><img src="/assets/clip.webp" alt="" width="52" height="96"/></span>
      {child}
    </div>)}
  </div>;
}
