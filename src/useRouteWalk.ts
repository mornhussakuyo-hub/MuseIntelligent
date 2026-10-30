import {useEffect,useRef,useState} from 'react';
import {pointAlong} from '../data/navigation.mjs';
import type{Route}from'./types';
export default function useRouteWalk(route:Route|null,onArrive:()=>void){
 const[running,setRunning]=useState(false),[progress,setProgress]=useState(0);const value=useRef(0),arrive=useRef(onArrive);arrive.current=onArrive;
 useEffect(()=>{setRunning(false);setProgress(0);value.current=0;},[route]);
 useEffect(()=>{
  if(!running||!route)return;
  let frame=0,last=performance.now();const duration=Math.max(3500,Math.min(16000,route.meters*115));
  const step=(now:number)=>{value.current=Math.min(1,value.current+(now-last)/duration);last=now;setProgress(value.current);if(value.current===1){setRunning(false);arrive.current();}else frame=requestAnimationFrame(step);};
  frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame);
 },[running,route]);
 return{running,progress,position:route&&progress>0?pointAlong(route,progress):null,toggle:()=>setRunning(v=>!v),stop:()=>setRunning(false)};
}
