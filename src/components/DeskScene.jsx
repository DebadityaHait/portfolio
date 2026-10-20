import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, animate } from 'motion/react';
import { ArrowCounterClockwise, SpeakerHigh, SpeakerSlash, Palette, Play, X, Check } from '@phosphor-icons/react';
import { Sketch, Doodle } from './Sketch';

let soundsOn=false;
const audioCache={};
export function playDeskSound(kind='click') {
  if(!soundsOn)return;
  const files={click:'click_003',drop:'drop_002',scratch:'scratch_001',switch:'switch_003'};
  try {
    const name=files[kind] || files.click;
    const original=audioCache[name] || (audioCache[name]=new Audio(`/assets/sounds/${name}.wav`));
    const sound=original.cloneNode(); sound.volume=kind==='scratch'?.09:.19;
    sound.play().catch(()=>{});
  }catch{}
}

export function DraggableSticker({src,label,className='',rotation=0,children,onMove,onEnd,resetKey=0}) {
  const x=useMotionValue(0), y=useMotionValue(0);
  const reduced=useReducedMotion();
  const [dragging,setDragging]=useState(false);
  const moveFrame=useRef(null);
  const tip=useRef(null);
  const button=useRef(null);
  useEffect(()=>{
    return()=>cancelAnimationFrame(moveFrame.current);
  },[]);
  useEffect(()=>{const a=animate(x,0,{duration:reduced?0:.45});const b=animate(y,0,{duration:reduced?0:.45});return()=>{a.stop();b.stop();};},[resetKey,x,y,reduced]);
  function nudge(e){
    const shifts={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
    if(shifts[e.key]){e.preventDefault();const [dx,dy]=shifts[e.key];const r=button.current.getBoundingClientRect();x.set(x.get()+Math.max(-r.left,Math.min(innerWidth-r.right,dx)));y.set(y.get()+Math.max(-r.top,Math.min(innerHeight-r.bottom,dy)));}
    if(e.key==='Home'){e.preventDefault();x.set(0);y.set(0);}
  }
  function end(){cancelAnimationFrame(moveFrame.current);moveFrame.current=null;setDragging(false);onEnd?.();}
  function move(){
    if(!onMove || moveFrame.current)return;
    moveFrame.current=requestAnimationFrame(()=>{
      moveFrame.current=null;
      const r=tip.current?.getBoundingClientRect();
      if(r)onMove({x:r.x,y:r.y});
    });
  }
  return <motion.button ref={button} type="button" className={`draggable-sticker ${className} ${dragging?'is-dragging':''}`} aria-label={`${label}. Drag to move, or use arrow keys. Home resets position.`} title={label} style={{x,y,rotate:rotation,touchAction:'none'}} drag dragMomentum={false} whileHover={reduced?undefined:{scale:1.07,rotate:rotation-3}} whileDrag={{scale:1.13,rotate:rotation+5,zIndex:45}} transition={{type:'spring',stiffness:320,damping:24}} onKeyDown={nudge} onDragStart={()=>{onEnd?.();setDragging(true);playDeskSound('click');}} onDrag={move} onPointerCancel={end} onLostPointerCapture={()=>{if(dragging)end();}} onDragEnd={()=>{end();playDeskSound('drop');}}>
    <img src={src} alt="" draggable="false"/><span ref={tip} className="blade-tip" aria-hidden="true"/>{children}<span className="sticker-tooltip">{label}</span>
  </motion.button>;
}

export function IntroLoader({replayKey=0,onReady}) {
  const [loading,setLoading]=useState(true);
  const [progress,setProgress]=useState(0);
  const reduced=useReducedMotion();
  const callback=useRef(onReady);callback.current=onReady;
  useEffect(()=>{
    let cancelled=false,finished=false;let timeout,finishTimer;
    if(reduced){setLoading(false);callback.current?.();return;}
    setLoading(true);setProgress(0);
    let completed=0;
    const sources=['/assets/avatar.jpg','/assets/headphones.webp','/assets/clip.webp','/assets/macbook.webp'];
    const tasks=sources.map(src=>new Promise(resolve=>{const img=new Image();img.onload=resolve;img.onerror=resolve;img.src=src;}));
    tasks.push(document.fonts.ready);
    const started=performance.now();
    const finish=()=>{if(cancelled||finished)return;finished=true;setProgress(1);finishTimer=setTimeout(()=>{if(cancelled)return;setLoading(false);callback.current?.();},Math.max(0,1500-(performance.now()-started)));};
    const safeFinish=()=>{clearTimeout(timeout);finish();};
    timeout=setTimeout(finish,3000);
    Promise.allSettled(tasks.map(task=>Promise.resolve(task).finally(()=>{if(!cancelled)setProgress(++completed/tasks.length);}))).then(safeFinish);
    return()=>{cancelled=true;clearTimeout(timeout);clearTimeout(finishTimer);};
  },[replayKey,reduced]);
  return <AnimatePresence>{loading&&<motion.div className="intro-curtain" initial={{opacity:1}} exit={{opacity:0,transition:{duration:.25}}}>
    <motion.div className="loader-paper" initial={{rotate:-6,y:15,opacity:0}} animate={{rotate:-2,y:0,opacity:1}} exit={{y:-70,rotate:8,scale:.9,opacity:0,transition:{duration:.45}}}>
      <span className="loader-monogram">dh.</span><span className="handwritten">Laying things out…</span><div className="loader-rule"><motion.i animate={{scaleX:progress}} transition={{duration:.25}}/></div><span className="loader-caption">a few ideas, a little organised chaos.</span>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

export function DeskScene({resetKey,ready}) {
  const canvas=useRef(null);const last=useRef(null);const scratches=useRef([]);const frame=useRef(null);const lastSound=useRef(0);
  useEffect(()=>{
    const el=canvas.current;
    function size(){last.current=null;const dpr=Math.min(devicePixelRatio,2);el.width=innerWidth*dpr;el.height=innerHeight*dpr;el.getContext('2d').setTransform(dpr,0,0,dpr,0,0);scratches.current=[];}
    const breakLine=()=>{last.current=null;};
    size();addEventListener('resize',size);addEventListener('scroll',breakLine,{passive:true});addEventListener('blur',breakLine);return()=>{removeEventListener('resize',size);removeEventListener('scroll',breakLine);removeEventListener('blur',breakLine);cancelAnimationFrame(frame.current);};
  },[]);
  useEffect(()=>{scratches.current=[];last.current=null;canvas.current?.getContext('2d')?.clearRect(0,0,innerWidth,innerHeight);},[resetKey]);
  const scratch=useCallback(point=>{
    const now=performance.now();const previous=last.current;
    // A zero-size marker on the image gives the transformed blade tip in viewport coordinates.
    const next={x:point.x,y:point.y,time:now};
    if(previous && now-previous.time<180 && Math.hypot(previous.x-next.x,previous.y-next.y)<120)scratches.current.push({a:previous,b:next,time:now});
    last.current=next;
    if(now-lastSound.current>160){playDeskSound('scratch');lastSound.current=now;}
    if(!frame.current){const draw=()=>{const ctx=canvas.current?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,innerWidth,innerHeight);const time=performance.now();scratches.current=scratches.current.filter(s=>time-s.time<3200);for(const s of scratches.current){ctx.beginPath();ctx.strokeStyle=`rgba(239,214,166,${.7*(1-(time-s.time)/3200)})`;ctx.lineWidth=1.3;ctx.lineCap='round';ctx.moveTo(s.a.x,s.a.y);ctx.lineTo(s.b.x,s.b.y);ctx.stroke();}frame.current=scratches.current.length?requestAnimationFrame(draw):null;};frame.current=requestAnimationFrame(draw);}
  },[]);
  return <>
    <div className="drafting-mat" aria-hidden="true"><div className="mat-major-grid"/><img className="mat-measurements" src="/assets/mat-guides.svg" alt=""/><div className="mat-vignette"/></div>
    <div className={`desk-margins ${ready?'assembled':''}`} aria-hidden="true">
      <Sketch kind="network" className="margin-network"/><Sketch kind="wave" className="margin-wave"/>
      <Sketch kind="cube" className="margin-cube"/><Sketch kind="gradient" className="margin-gradient"/>
      <Sketch kind="orbit" className="margin-orbit"/><Sketch kind="integral" className="margin-integral"/>
      <Doodle name="star" className="margin-star"/><Doodle name="sun" className="margin-sun"/><Doodle name="heart" className="margin-heart"/>
      <span className="margin-formula formula-top">∇ · curiosity ≠ 0</span><span className="margin-formula formula-middle">[ ideas ] → [ experiments ]</span><span className="margin-formula formula-bottom">less noise. more signal.</span>
      <span className="pencil-cross cross-one">×</span><span className="pencil-cross cross-two">+</span><span className="pencil-cross cross-three">×</span>
    </div>
    <canvas className="scratch-canvas" ref={canvas} aria-hidden="true"/>
    <div className="knife-holder"><DraggableSticker src="/assets/knife.webp" label="Drag the knife. Leave a little mark." className="knife-sticker" rotation={-8} onMove={scratch} onEnd={()=>{last.current=null;}} resetKey={resetKey}/><span className="handwritten knife-label">go on, make a mark.</span></div>
    <div className="extra-stickers" aria-hidden="true"><img className="sushi-sticker" src="/assets/sticker-sushi.webp" alt="" loading="lazy"/><img className="shoes-sticker" src="/assets/sticker-shoes.webp" alt="" loading="lazy"/></div>
  </>;
}

export function DeskTools({onReplay,onReset,palette,setPalette}) {
  const [sound,setSound]=useState(false);const [open,setOpen]=useState(false);const [reset,setReset]=useState(false);
  const timer=useRef(null);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  function toggleSound(){const next=!sound;setSound(next);soundsOn=next;if(next)playDeskSound('switch');}
  return <div className="desk-tools"><AnimatePresence>{open&&<motion.div className="palette-popover" initial={{y:8,opacity:0,rotate:-5}} animate={{y:0,opacity:1,rotate:-2}} exit={{y:8,opacity:0}}><span className="handwritten">Pick your desk.</span><div className="palette-swatches">{[['blue','Blueprint','#30445a'],['forest','Forest','#294637'],['plum','Plum','#493b4b']].map(([value,label,color])=><button key={value} aria-label={`${label} palette`} aria-pressed={palette===value} style={{background:color}} onClick={()=>{setPalette(value);playDeskSound('switch');}}>{palette===value&&<Check size={16}/>}</button>)}</div><button className="palette-close" aria-label="Close palette picker" onClick={()=>setOpen(false)}><X size={13}/></button></motion.div>}</AnimatePresence>
    <span className="tools-caption handwritten">make yourself at home</span><div className="tool-buttons"><button onClick={()=>{setOpen(!open);playDeskSound();}} aria-label="Choose desk colors" aria-expanded={open} title="Choose desk colors"><Palette size={18}/></button><button onClick={toggleSound} aria-label={sound?'Mute desk sounds':'Enable desk sounds'} aria-pressed={sound} title={sound?'Sound on':'Sound off'}>{sound?<SpeakerHigh size={18}/>:<SpeakerSlash size={18}/>}</button><button onClick={()=>{onReset();setReset(true);playDeskSound('drop');clearTimeout(timer.current);timer.current=setTimeout(()=>setReset(false),1500);}} aria-label="Reset sticker positions" title="Reset stickers">{reset?<Check size={18}/>:<ArrowCounterClockwise size={18}/>}</button><button onClick={()=>{onReplay();playDeskSound();}} aria-label="Replay entrance animation" title="Replay entrance"><Play size={17}/></button></div>
  </div>;
}
