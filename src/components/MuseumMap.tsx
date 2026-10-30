import {useEffect,useRef,useState} from 'react';
import {Plus,Minus,Scan,Maximize2,Camera as CameraIcon,ArrowUpRight} from 'lucide-react';
import {artifacts,halls,cameras,camera} from '../lib';
import {floor,rooms,walls,courtyard,furniture,doors,sections} from '../../data/floorplan.mjs';
import {pointAlong} from '../../data/navigation.mjs';
import type{Route,Artifact,Point}from'../types';
interface Props{cameraId:string;position?:Point;visitor?:{x:number;y:number;angle:number}|null;selectedId:string|null;revealId:string|null;activeHall:string;visited:string[];route:Route|null;progress:number;onCamera:(id:string)=>void;onArtifact:(artifact:Artifact)=>void;onHall:(id:string)=>void;onExpand:()=>void;expanded:boolean}
export default function MuseumMap({cameraId,position,visitor,selectedId,revealId,activeHall,visited,route,progress,onCamera,onArtifact,onHall,onExpand,expanded}:Props){
 const host=useRef<HTMLElement>(null),svg=useRef<SVGSVGElement>(null);const[size,setSize]=useState({w:1400,h:850}),[view,setView]=useState({x:740,y:520,zoom:1}),[hovered,setHovered]=useState<string|null>(null),[dragging,setDragging]=useState(false);
 const drag=useRef<{x:number;y:number;cx:number;cy:number}|null>(null),animation=useRef(0),viewRef=useRef(view);viewRef.current=view;
 const scale=Math.min(size.w/(floor.width+150),size.h/(floor.height+170)),unit=scale*view.zoom;
 const left=view.x-size.w/unit/2,top=view.y-size.h/unit/2;
 const current=camera(cameraId),actor=visitor||{...(position||current),angle:current.angle};
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setSize({w:entry.contentRect.width,h:entry.contentRect.height}));if(host.current)observer.observe(host.current);return()=>{observer.disconnect();cancelAnimationFrame(animation.current);};},[]);
 const fly=(target:typeof view)=>{
  cancelAnimationFrame(animation.current);const from=viewRef.current,start=performance.now();
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){setView(target);return;}
  const frame=(now:number)=>{const t=Math.min(1,(now-start)/340),ease=1-(1-t)**3;setView({x:from.x+(target.x-from.x)*ease,y:from.y+(target.y-from.y)*ease,zoom:from.zoom+(target.zoom-from.zoom)*ease});if(t<1)animation.current=requestAnimationFrame(frame);};animation.current=requestAnimationFrame(frame);
 };
 useEffect(()=>{
  const room=rooms.find(r=>r.id===activeHall);if(!room){fly({x:740,y:520,zoom:1});return;}
  const fittedUnit=Math.min((size.w-64)/room.w,(size.h-210)/room.h);
  fly({x:room.x+room.w/2,y:room.y+room.h/2+15/fittedUnit,zoom:Math.min(4,fittedUnit/scale)});
 },[activeHall]);
 useEffect(()=>{
  if(!route)return;const xs=route.nodes.map(p=>p.x),ys=route.nodes.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const fit=Math.min(size.w/(maxX-minX+260),Math.max(200,size.h-170)/(maxY-minY+240))/scale;
  fly({x:(minX+maxX)/2,y:(minY+maxY)/2+50/Math.max(scale,.1),zoom:Math.max(1,Math.min(2.8,fit))});
 },[route]);
 useEffect(()=>{if(!revealId)return;const a=artifacts.find(a=>a.id===revealId);if(a)fly({x:a.position.x,y:a.position.y,zoom:size.w<640?3.1:2.2});},[revealId]);
 const zoom=(delta:number)=>fly({...viewRef.current,zoom:Math.max(.65,Math.min(4,viewRef.current.zoom+delta))});
 const keyboard=(e:React.KeyboardEvent,fn:()=>void)=>{if(['Enter',' '].includes(e.key)){e.preventDefault();fn();}};
 const hovering=artifacts.find(a=>a.id===hovered);const tooltip=hovering?{x:Math.max(14,Math.min(size.w-240,(hovering.position.x-left)*unit+22)),y:Math.max(70,Math.min(size.h-125,(hovering.position.y-top)*unit-45))}:null;
 const completed=route&&progress>0?(()=>{const point=pointAlong(route,progress);let traveled=0;const total=route.nodes.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x-route.nodes[i].x,p.y-route.nodes[i].y),0)*progress;const points=[route.nodes[0]];for(let i=1;i<route.nodes.length;i++){const d=Math.hypot(route.nodes[i].x-route.nodes[i-1].x,route.nodes[i].y-route.nodes[i-1].y);if(traveled+d>total)break;points.push(route.nodes[i]);traveled+=d;}points.push(point);return points;})():[];
 return <section ref={host} className={'museum-map '+(expanded?'map-expanded':'')} aria-label="博物馆二维平面地图">
  <svg ref={svg} viewBox={`${left} ${top} ${size.w/unit} ${size.h/unit}`} className={'floorplan '+(dragging?'dragging':'')} role="group" aria-label="一层博物馆，三个展厅、36件藏品与21个机位" onWheel={e=>{
   cancelAnimationFrame(animation.current);const box=e.currentTarget.getBoundingClientRect(),px=(e.clientX-box.left)/size.w-.5,py=(e.clientY-box.top)/size.h-.5,newZoom=Math.max(.65,Math.min(4,view.zoom*Math.exp(-e.deltaY*.0014)));
   setView({x:view.x+px*size.w*(1/(scale*view.zoom)-1/(scale*newZoom)),y:view.y+py*size.h*(1/(scale*view.zoom)-1/(scale*newZoom)),zoom:newZoom});setHovered(null);
  }} onPointerDown={e=>{if((e.target as Element).closest('[data-interactive]'))return;cancelAnimationFrame(animation.current);drag.current={x:e.clientX,y:e.clientY,cx:view.x,cy:view.y};setDragging(true);setHovered(null);e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)setView(v=>({...v,x:drag.current!.cx-(e.clientX-drag.current!.x)/unit,y:drag.current!.cy-(e.clientY-drag.current!.y)/unit}));}} onPointerUp={()=>{drag.current=null;setDragging(false);}} onPointerCancel={()=>{drag.current=null;setDragging(false);}} onPointerLeave={()=>setHovered(null)}>
   <defs>
    <filter id="plan-shadow" x="-10%" y="-10%" width="130%" height="135%"><feDropShadow dx="0" dy="12" stdDeviation="18" floodColor="#536150" floodOpacity=".14"/></filter>
    <filter id="case-shadow" x="-30%" y="-30%" width="170%" height="180%"><feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#5d6651" floodOpacity=".16"/></filter>
    <pattern id="stone-grid" width="54" height="54" patternUnits="userSpaceOnUse"><rect width="54" height="54" fill="#eeeee6"/><path d="M54 0H0V54" fill="none" stroke="#e1e2d7" strokeWidth=".8"/></pattern>
    <pattern id="oak" width="22" height="86" patternUnits="userSpaceOnUse"><rect width="22" height="86" fill="#e9dfcc"/><path d="M22 0H0V86M10 5V69M5 28V82" fill="none" stroke="#d8cbb3" strokeWidth=".65"/></pattern>
    <pattern id="ceramic-floor" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#e1e9df"/><path d="M44 0H0V44" fill="none" stroke="#cfdccf" strokeWidth=".7"/></pattern>
    <pattern id="slate-floor" width="68" height="52" patternUnits="userSpaceOnUse"><rect width="68" height="52" fill="#e1e5e8"/><path d="M68 0H0V52M34 0V52" fill="none" stroke="#d1d9dc" strokeWidth=".7"/></pattern>
    <pattern id="roof-grid" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#b9c9b0" strokeWidth=".6"/></pattern>
    <linearGradient id="pond" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b3cec3"/><stop offset="1" stopColor="#8caea1"/></linearGradient>
    <linearGradient id="glass-case" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffffff" stopOpacity=".85"/><stop offset=".5" stopColor="#d9e3d3" stopOpacity=".25"/><stop offset="1" stopColor="#ffffff" stopOpacity=".75"/></linearGradient>
   </defs>
   <g className="museum-building">
    <rect x="-10" y="-10" width="1500" height="1060" rx="4" fill="#fcfcf6" stroke="#c2cbb9" strokeWidth="1.4" filter="url(#plan-shadow)"/>
    <rect x="16" y="16" width="1448" height="1008" fill="url(#stone-grid)"/>
    {rooms.map((r,i)=><g key={r.id}><rect x={r.x} y={r.y} width={r.w} height={r.h} fill={['url(#oak)','url(#ceramic-floor)','url(#slate-floor)'][i]}/><rect x={r.x+8} y={r.y+8} width={r.w-16} height={r.h-16} fill="none" stroke={['#d6c7aa','#c7d5c3','#c4cfd5'][i]} strokeWidth=".65"/>{activeHall!=='all'&&activeHall!==r.id&&<rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#f7f8f1" opacity=".45" pointerEvents="none"/>}</g>)}
    <g className="courtyard"><rect x={courtyard.x} y={courtyard.y} width={courtyard.w} height={courtyard.h} rx="3" fill="#d1dbc2" stroke="#aebf9a" strokeWidth="2"/><rect x="620" y="530" width="250" height="200" fill="url(#roof-grid)"/><rect x="693" y="569" width="115" height="120" rx="45" fill="url(#pond)" stroke="#9ab6a8"/><path d="M710 606q35-15 76 0M708 629q37-16 78 0M712 651q30-12 70 0" fill="none" stroke="#d9e8da" strokeWidth="1" opacity=".6"/>{[[648,562,22],[842,569,24],[652,695,28],[831,698,21]].map(([x,y,r],i)=><g key={i}><circle cx={x+3} cy={y+4} r={r+2} fill="#7d906538"/><circle cx={x} cy={y} r={r} fill={i%2?'#a5b98c':'#b2c49a'} stroke="#91a97d" strokeWidth="1"/><path d={`M${x-9} ${y+7}q12-16 22-13M${x} ${y+12}v-25`} fill="none" stroke="#81966c" strokeWidth=".8" opacity=".5"/></g>)}</g>
    {/* Perimeter planters and seating make the circulation space readable. */}
    {furniture.map(f=>f.kind==='planter'?<g key={f.id}><rect x={f.x} y={f.y} width={f.w} height={f.h} rx="3" fill="#b8c7a5" stroke="#95aa7f"/><circle cx={f.x+f.w/2} cy={f.y+f.h/2} r={f.w*.37} fill="#a2b78b"/><path d={`M${f.x+f.w*.3} ${f.y+f.h*.3}l${f.w*.4} ${f.h*.4}m0-${f.h*.4}l-${f.w*.4} ${f.h*.4}`} stroke="#7e986a" strokeWidth="1"/></g>:<g key={f.id}><rect x={f.x+2} y={f.y+3} width={f.w} height={f.h} rx="4" fill="#66784e15"/><rect x={f.x} y={f.y} width={f.w} height={f.h} rx={f.kind==='desk'?7:3} fill={f.kind==='desk'?'#d7dccb':'#bca785'} stroke={f.kind==='desk'?'#b5c1a6':'#a38f70'} strokeWidth="1.1"/>{f.kind==='bench'?Array.from({length:Math.floor(f.h/9)-1},(_,i)=><line key={i} x1={f.x+4} y1={f.y+9+i*9} x2={f.x+f.w-4} y2={f.y+9+i*9} stroke="#9f8c6d" strokeWidth=".7"/>):<><rect x={f.x+20} y={f.y+14} width="24" height="15" rx="2" fill="#82967c"/><rect x={f.x+75} y={f.y+14} width="44" height="4" fill="#b4bfa3"/><rect x={f.x+75} y={f.y+23} width="31" height="3" fill="#c1cab4"/></>}</g>)}
    <g className="architectural-walls">{walls.map((w,i)=><g key={i}><rect x={w.x+2} y={w.y+3} width={w.w} height={w.h} fill="#89947f35"/><rect x={w.x} y={w.y} width={w.w} height={w.h} fill="#fdfdf7" stroke="#9daa95" strokeWidth="1.15"/></g>)}</g>
    <g className="windows">{Array.from({length:23},(_,i)=>37+i*61).map(x=><g key={x}><rect x={x} y="2" width="35" height="12" fill="#c5d7cf" stroke="#a5bbb0" strokeWidth=".8"/><line x1={x+17} y1="2" x2={x+17} y2="14" stroke="#e4f0e7"/></g>)}{Array.from({length:12},(_,i)=>45+i*78).map(y=><g key={y}><rect x="2" y={y} width="12" height="43" fill="#cad8cb" stroke="#a7b8a2" strokeWidth=".8"/><rect x="1466" y={y} width="12" height="43" fill="#c9d5d9" stroke="#a8b9b9" strokeWidth=".8"/></g>)}</g>
    <g fill="none" stroke="#9eac91" strokeWidth="1.15" opacity=".8">{doors.map((d,i)=>d.axis==='x'?<path key={i} d={`M${d.x} ${d.y}v${d.width*.7}m0 0a${d.width*.7} ${d.width*.7} 0 0 0 ${d.width*.7}-${d.width*.7}`}/>:<path key={i} d={`M${d.x} ${d.y}h${d.width*.7}m0 0a${d.width*.7} ${d.width*.7} 0 0 1-${d.width*.7} ${d.width*.7}`}/>)}</g>
    {/* Exhibit images remain crisp SVG image nodes at every zoom level. */}
    {artifacts.map(a=>{const p=a.position,{w,h}=a.caseSize,active=a.id===selectedId||a.id===hovered,seen=visited.includes(a.id);return <g data-interactive="artifact" key={a.id} role="button" tabIndex={0} aria-label={`查看${a.name}`} className={'plan-exhibit '+(active?'selected':'')} onMouseEnter={()=>!dragging&&setHovered(a.id)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(a.id)} onBlur={()=>setHovered(null)} onClick={()=>onArtifact(a)} onKeyDown={e=>keyboard(e,()=>onArtifact(a))} opacity={activeHall==='all'||activeHall===a.hall?1:.5}>
     <title>{a.number} · {a.name}</title>{active&&<rect x={p.x-w/2-7} y={p.y-h/2-7} width={w+14} height={h+14} rx="5" fill="#91ad7110" stroke="#78995c" strokeWidth="1.8"/>}
     <rect x={p.x-w/2} y={p.y-h/2} width={w} height={h} rx="2" fill="#f9faf4" stroke={active?'#799864':'#b6c2a8'} strokeWidth="1.2" filter="url(#case-shadow)"/>
     <rect x={p.x-w/2+4} y={p.y-h/2+4} width={w-8} height={h-8} fill="#ecf0e5" stroke="#d1dbc5" strokeWidth=".65"/>
     <image href={a.image} x={p.x-w/2+8} y={p.y-h/2+7} width={w-16} height={h-14} preserveAspectRatio="xMidYMid meet"/>
     <path d={`M${p.x-w/2+2} ${p.y+h/2-7}L${p.x+w/2-4} ${p.y-h/2+3}`} stroke="white" strokeWidth=".8" opacity=".5"/>
     <text x={p.x} y={p.y+h/2+14} textAnchor="middle" fill={active?'#42643c':'#687c5e'} fontSize="11" fontFamily="Arial,sans-serif" letterSpacing=".8">{a.number}</text>{seen&&<circle cx={p.x+w/2-3} cy={p.y-h/2+3} r="5.5" fill="#75945c" stroke="#fbfdf5" strokeWidth="1.5"/>}
    </g>;})}
    {rooms.map(r=>{const h=halls.find(h=>h.id===r.id)!;return <g key={r.id} data-interactive="hall" role="button" tabIndex={0} className="plan-hall-label" aria-label={`聚焦${h.short}`} onClick={()=>onHall(activeHall===r.id?'all':r.id)} onKeyDown={e=>keyboard(e,()=>onHall(activeHall===r.id?'all':r.id))}>
     <rect x={r.label.x-91} y={r.label.y-17} width="182" height="34" rx="4" fill="#fffef5d9" stroke="#ffffff80"/><text x={r.label.x} y={r.label.y+5} textAnchor="middle" fill={h.color} fontSize="16" fontWeight="500"><tspan fontFamily="Arial" fontSize="11">{h.code}　</tspan>{h.short}</text>
    </g>;})}
    {sections.map(s=><text key={s.name} x={s.x} y={s.y} textAnchor="middle" fill="#91a083" fontSize="10" letterSpacing="2" pointerEvents="none">{s.name}</text>)}
    <g className="map-space-labels" fill="#91a183" fontSize="13" letterSpacing="3"><text x="745" y="757" textAnchor="middle">中庭</text><text x="745" y="919" textAnchor="middle">入口大厅</text><text x="295" y="942" textAnchor="middle" fontSize="10" letterSpacing="1">服务台</text><text x="1250" y="1012" textAnchor="middle" fontSize="10" letterSpacing="1">休憩区</text></g>
    <g stroke="#8ea77d" fill="none" strokeWidth="1.5"><path d="M730 1084v-34m-5 6 5-6 5 6M1365 1051v33m-5-6 5 6 5-6"/></g><g fill="#93a786" fontSize="12"><text x="753" y="1076">入口</text><text x="1388" y="1076">出口</text></g>
    {route&&<g className="map-route" pointerEvents="none"><polyline points={route.nodes.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#fffff8" strokeWidth="10" strokeLinejoin="round" strokeLinecap="round"/><polyline points={route.nodes.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#b78c4e" strokeWidth="3.5" strokeDasharray="7 5" strokeLinejoin="round" strokeLinecap="round"/>{completed.length>0&&<polyline points={completed.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#4b7d58" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>}<circle cx={route.destination.x} cy={route.destination.y} r="13" fill="#fffef6" stroke="#b68b4b" strokeWidth="2.5"/><circle cx={route.destination.x} cy={route.destination.y} r="4" fill="#b68b4b"/></g>}
    {cameras.map(c=><g data-interactive="camera" key={c.id} role="button" tabIndex={0} aria-label={`选择机位 ${c.name}`} className="camera-point" onClick={()=>onCamera(c.id)} onKeyDown={e=>keyboard(e,()=>onCamera(c.id))}>
     <title>{c.name}</title><circle cx={c.x} cy={c.y} r="11" fill="#fcfdf7" stroke="#9fb38e" strokeWidth="1.5"/><CameraIcon x={c.x-5} y={c.y-5} width="10" height="10" color="#819a71" strokeWidth="1.6"/><circle cx={c.x} cy={c.y} r="22" fill="transparent"/>
    </g>)}
    <g className="visitor-marker" transform={`translate(${actor.x} ${actor.y})`} pointerEvents="none"><g transform={`rotate(${actor.angle+90})`}><path d="M0 0l-35-55q35-21 70 0Z" fill="#4e94791c"/><circle className="position-pulse" r="25" fill="#4d8d6f15"/><circle r="15" fill="#376e52" stroke="#fffef7" strokeWidth="3"/><path d="m0-7 5 12-5-3-5 3Z" fill="#fffef7"/></g></g>
   </g>
  </svg>
  <div className="plan-north"><span>N</span><svg width="17" height="29" viewBox="0 0 17 29"><path d="M8.5 0 16 27 8.5 21 1 27Z" fill="#7d9272"/><path d="M8.5 0v21L1 27Z" fill="#becab2"/></svg></div>
  <div className="plan-tools"><button aria-label="放大地图" title="放大" onClick={()=>zoom(.35)} disabled={view.zoom>=4}><Plus size={18}/></button><button aria-label="缩小地图" title="缩小" onClick={()=>zoom(-.35)} disabled={view.zoom<=.65}><Minus size={18}/></button><span/><button aria-label="查看全馆" title="查看全馆" onClick={()=>{onHall('all');fly({x:740,y:520,zoom:1});}}><Scan size={17}/></button><button aria-label={expanded?'退出全屏地图':'全屏地图'} title="全屏" onClick={onExpand}><Maximize2 size={16}/></button></div>
  <div className="gallery-switcher" aria-label="地图展厅"><button className={activeHall==='all'?'active':''} onClick={()=>onHall('all')}>全馆</button>{halls.map(h=><button key={h.id} className={activeHall===h.id?'active':''} onClick={()=>onHall(h.id)}><i style={{background:h.color}}/>{h.short.replace('礼器厅','').replace('艺术厅','').replace('世界','').replace('厅','')}</button>)}</div>
  {hovering&&tooltip&&<div className="map-art-tooltip" style={{left:tooltip.x,top:tooltip.y}}><img src={hovering.image} alt=""/><div><span>{hovering.number}</span><strong>{hovering.name}</strong><small>{hovering.era}</small></div><ArrowUpRight size={14}/></div>}
 </section>;
}
