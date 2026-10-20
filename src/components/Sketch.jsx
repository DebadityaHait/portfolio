import React from 'react';
import rough from 'roughjs';
import { motion, useReducedMotion } from 'motion/react';

const generator = rough.generator();
const options = { seed: 17, roughness: 1.15, bowing: .8, strokeWidth: 1.2, stroke: 'currentColor' };
const line = (a,b) => generator.line(...a,...b,options);
const circle = (x,y,r) => generator.circle(x,y,r,options);
const paths = shapes => shapes.flatMap(shape => generator.toPaths(shape));

const cubePoints=[[45,56],[112,38],[153,68],[85,89],[45,123],[112,105],[153,135],[85,156]];
const cubeEdges=[[0,1],[1,2],[2,3],[3,0],[0,4],[1,5],[2,6],[3,7],[4,5],[5,6],[6,7],[7,4]];
const netLayers = [[30,[45,95,145]],[100,[30,75,120,165]],[170,[70,130]]];
const net=[];
netLayers.forEach(([x,ys],i)=>{
  if(i<2)for(const y of ys)for(const nextY of netLayers[i+1][1])net.push(line([x+8,y],[netLayers[i+1][0]-8,nextY]));
  for(const y of ys)net.push(circle(x,y,15));
});
const wave=Array.from({length:65},(_,i)=>[16+i*2.7,99-Math.sin(i/64*Math.PI*3.5)*39]);
const curve=Array.from({length:50},(_,i)=>[25+i*3.3,43+Math.pow((i-30)/28,2)*75]);
const sketches={
  cube:{shapes:cubeEdges.map(([a,b])=>line(cubePoints[a],cubePoints[b])),text:[['x',160,142],['z',108,29],['y',33,135]]},
  network:{shapes:net,text:[['y = f(Wx + b)',36,194]]},
  wave:{shapes:[line([12,100],[197,100]),line([26,163],[26,33]),generator.curve(wave,options)],text:[['sin(x)',116,39],['x',194,117],['0',14,117]]},
  gradient:{shapes:[line([20,158],[195,158]),line([23,161],[23,24]),generator.curve(curve,options),circle(51,105,7),circle(78,72,7),circle(106,53,7),circle(130,44,7),line([53,97],[70,81]),line([78,81],[69,81]),line([69,81],[70,90])],text:[['one step at a time',21,190],['L(θ)',35,27]]},
  orbit:{shapes:[generator.ellipse(102,100,167,57,options),generator.ellipse(102,100,58,151,options),generator.ellipse(102,100,131,126,options),circle(102,100,12),circle(41,80,8),circle(159,132,8)],text:[['stay curious',46,192]]},
  integral:{shapes:[line([20,155],[190,155]),line([25,160],[25,25]),generator.curve([[27,139],[55,120],[84,64],[115,45],[144,78],[175,93]],options),...Array.from({length:8},(_,i)=>line([55+i*12,153],[55+i*12,115-Math.sin(i/8*Math.PI)*62]))],text:[['∫ f(x) dx',71,190]]},
};

export function Sketch({kind='cube',className='',style,delay=0}) {
  const reduced=useReducedMotion();
  const sketch=sketches[kind] || sketches.cube;
  return <motion.svg className={`math-sketch ${className}`} style={style} viewBox="0 0 210 210" aria-hidden="true" initial="hidden" whileInView="visible" viewport={{once:true,amount:.15}}>
    {paths(sketch.shapes).map((path,i)=><motion.path key={i} d={path.d} fill={path.fill || 'none'} stroke="currentColor" strokeWidth={path.strokeWidth || 1.2} strokeLinecap="round" variants={{hidden:{pathLength:reduced?1:0,opacity:reduced?1:0},visible:{pathLength:1,opacity:1,transition:{duration:reduced?0:1.6,delay:reduced?0:delay+i*.014,ease:'easeInOut'}}}}/>)}
    {sketch.text.map(([text,x,y])=><motion.text key={text} x={x} y={y} fill="currentColor" stroke="none" fontFamily="Indie Flower, cursive" fontSize="16" variants={{hidden:{opacity:reduced?1:0},visible:{opacity:1,transition:{delay:reduced?0:delay+.8}}}}>{text}</motion.text>)}
  </motion.svg>;
}

export function Doodle({name,className='',style}) {
  return <span aria-hidden="true" className={`source-doodle ${className}`} style={{...style,maskImage:`url(/assets/doodles/${name}.svg)`,WebkitMaskImage:`url(/assets/doodles/${name}.svg)`}}/>;
}
