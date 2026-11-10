import {ArrowRight,BookOpen,Check,Navigation,Pause,Play,Route as RouteIcon,X} from 'lucide-react';
import {ArtifactImage} from './ArtSymbol';
import {art} from '../lib';
import type {Route,Tour} from '../types';

interface WalkProps {route:Route|null;running:boolean;progress:number;onToggle:()=>void;onArrive:()=>void}
function WalkActions({route,running,progress,onToggle,onArrive}:WalkProps){
 if(!route)return null;
 return <div className="navigation-actions"><button className="text-button" onClick={onArrive}>直接到达</button><button className="primary-button" onClick={route.meters===0?onArrive:onToggle}>{running?<Pause size={17}/>:<Play size={17}/>}{route.meters===0?'查看藏品':running?'暂停':progress>0?'继续引导':'开始引导'}</button></div>;
}
export function SingleNavigation(props:WalkProps&{onCancel:()=>void}){
 const {route,running,progress,onCancel}=props;if(!route)return null;
 return <section className="navigation-card single-navigation" aria-label="单站导航"><div className="navigation-heading"><span className="navigation-label"><Navigation size={16}/>单站导航</span><button className="icon-button" aria-label="关闭单站导航" onClick={onCancel}><X size={18}/></button></div><h2>{route.name}</h2><p>{Math.max(0,Math.round(route.meters*(1-progress)))} 米{running?' · 正在引导':''}</p><div className="walk-progress"><span style={{width:`${progress*100}%`}}/></div><WalkActions {...props}/></section>;
}
export function TourNavigation(props:WalkProps&{tour:Tour;index:number;arrivedId?:string|null;onNext:()=>void;onEnd:()=>void;onDetails:()=>void;onList:()=>void}){
 const {tour,index,route,arrivedId,onNext,onEnd,onDetails,onList,running,progress}=props;
 const done=index>=tour.stops.length,arrived=!route&&arrivedId?art(arrivedId):null,target=route?.artifactId?art(route.artifactId):art(tour.stops[index]);
 return <section className="navigation-card tour-navigation" aria-label="多站游览" data-completed={index} data-total={tour.stops.length}>
  <div className="navigation-heading"><button className="navigation-label" onClick={onList}><RouteIcon size={16}/>{tour.title}<span>{index} / {tour.stops.length} 已到达</span></button><button className="icon-button" aria-label="结束多站游览" onClick={onEnd}><X size={18}/></button></div>
  <div className="tour-track" aria-label={`已完成 ${index} 站，共 ${tour.stops.length} 站`}>{tour.stops.map((id,i)=><span key={id} className={i<index?'complete':i===index?'current':''}/>)}</div>
  <div className="tour-current">{(arrived||target)&&<ArtifactImage artifact={(arrived||target)!}/>}<div><span className="navigation-status">{done?'游览完成':arrived?'已到达':`第 ${index+1} 站${running?' · 正在引导':''}`}</span><h2>{done?'这一程，看见了新的故事':(arrived||target)?.name}</h2><p>{done?`${tour.stops.length} 件藏品，已全部走过`:arrived?`下一站 · ${target?.name}`:route?`${Math.max(0,Math.round(route.meters*(1-progress)))} 米`:'准备出发'}</p></div></div>
  {route?<><div className="walk-progress"><span style={{width:`${progress*100}%`}}/></div><WalkActions {...props}/></>:<div className="navigation-actions">{arrived&&<button className="text-button" onClick={onDetails}><BookOpen size={16}/>看讲解</button>}<button className="primary-button" onClick={done?onEnd:onNext}>{done?<Check size={17}/>:<ArrowRight size={17}/>}{done?'完成游览':arrived?'下一站':'继续游览'}</button></div>}
 </section>;
}
