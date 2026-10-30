import{useEffect,useMemo,useRef,useState}from'react';
import{LibraryBig,Route as RouteIcon,Heart,Settings2,ScanLine,MapPin,X,ArrowRight,Sparkles,Navigation,Download,Info,CheckCircle2,ArrowUpRight,BookOpen,Pause,Play,LocateFixed,Volume2}from'lucide-react';
import MuseumMap from'./components/MuseumMap';
import GuideChat from'./components/GuideChat';
import ArtifactDetail from'./components/ArtifactDetail';
import CollectionPanel from'./components/CollectionPanel';
import Recognition from'./components/Recognition';
import Modal from'./components/Modal';
import{ArtifactImage}from'./components/ArtSymbol';
import{artifacts,halls,art,hall,camera,cameras,api,loadVisit,welcome,exportVisit}from'./lib';
import{routeTo,planTour}from'../data/navigation.mjs';
import{areaAt}from'../data/floorplan.mjs';
import{answerLocally}from'../data/local-guide.mjs';
import useRouteWalk from'./useRouteWalk';
import type{Artifact,VisitState,GuideResponse,Message,Route,Tour}from'./types';
type Panel='collection'|'route'|'saved'|'recognize'|'settings'|'about'|null;
export default function App(){
 const[state,setState]=useState<VisitState>(loadVisit);
 const[panel,setPanel]=useState<Panel>(null),[returnPanel,setReturnPanel]=useState<Panel>(null);
 const[selected,setSelected]=useState<Artifact|null>(null),[preview,setPreview]=useState<Artifact|null>(null),[focusId,setFocusId]=useState<string|null>(null),[revealId,setRevealId]=useState<string|null>(null);
 const[route,setRoute]=useState<Route|null>(null),[activeHall,setActiveHall]=useState('all'),[expanded,setExpanded]=useState(false),[chatOpen,setChatOpen]=useState(false);
 const[busy,setBusy]=useState(false),[mode,setMode]=useState('knowledge'),[vision,setVision]=useState(false),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[toast,setToast]=useState('');
 const stateRef=useRef(state),busyRef=useRef(false),lastArtifact=useRef<string|null>(null);stateRef.current=state;
 useEffect(()=>{try{localStorage.setItem('muse.visit.v1',JSON.stringify({...state,layoutVersion:2}));}catch{/* Browser storage may be disabled; the current visit remains usable. */}},[state]);
 useEffect(()=>{api<{mode:string;vision:boolean}>('health').then(h=>{setMode(h.mode==='ai'?'configured':'knowledge');setVision(h.vision);}).catch(()=>setMode('knowledge'));},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(timer);},[toast]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setPanel('collection');setSelected(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const patch=(value:Partial<VisitState>)=>setState(s=>({...s,...value}));
 const visit=(id:string)=>setState(s=>({...s,visited:s.visited.includes(id)?s.visited:[...s.visited,id]}));
 const favorite=(id:string)=>setState(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(v=>v!==id):[...s.favorites,id]}));
 const openArtifact=(a:Artifact)=>{setReturnPanel(['collection','saved','route'].includes(panel||'')?panel:null);setPanel(null);setFocusId(a.id);setSelected(a);};
 const inspect=(a:Artifact)=>{setFocusId(a.id);setPreview(a);};
 const locate=(a:Artifact)=>{setPanel(null);setSelected(null);setFocusId(a.id);setPreview(a);setRevealId(null);requestAnimationFrame(()=>setRevealId(a.id));};
 const chooseCamera=(id:string)=>{walk.stop();const c=camera(id);patch({cameraId:id,position:{x:c.x,y:c.y}});const nearby=artifacts.filter(a=>a.cameraId===id);setFocusId(nearby[0]?.id||null);setPreview(null);if(route)setRoute(routeTo(id,route.targetId,{x:c.x,y:c.y}) as Route);};
 const navigate=(a:Artifact)=>{const s=stateRef.current,origin=currentLocation();walk.stop();patch(origin);setRoute(routeTo(origin.cameraId,a.id,origin.position) as Route);setFocusId(a.id);setSelected(null);setPanel(null);setPreview(null);setActiveHall('all');if(s.tour?.stops[s.tourIndex]!==a.id)patch({tour:null,tourIndex:0});};
 const startTour=(tour:Tour)=>{walk.stop();patch({tour,tourIndex:0});if(tour.stops[0]){const origin=currentLocation();patch(origin);setRoute(routeTo(origin.cameraId,tour.stops[0],origin.position) as Route);setFocusId(tour.stops[0]);setPanel(null);setPreview(null);setActiveHall('all');}};
 const continueTour=()=>{const s=stateRef.current,id=s.tour?.stops[s.tourIndex];if(!id)return;const origin=currentLocation();walk.stop();patch(origin);setRoute(routeTo(origin.cameraId,id,origin.position) as Route);setFocusId(id);setPanel(null);setPreview(null);setActiveHall('all');};
 const arrive=()=>{
  if(!route)return;const target=route.artifactId?art(route.artifactId):undefined,s=stateRef.current;
  patch({cameraId:route.to,position:route.destination});if(target){visit(target.id);setFocusId(target.id);setPreview(target);}
  if(s.tour&&target&&s.tour.stops[s.tourIndex]===target.id){const next=s.tourIndex+1;patch({tourIndex:next});if(next===s.tour.stops.length)setToast('这条参观路线已完成');}
  setRoute(null);
 };
 const walk=useRouteWalk(route,arrive);
 const currentLocation=()=>{
  const s=stateRef.current,position=walk.position||s.position;if(!walk.position)return{cameraId:s.cameraId,position};
  const area=areaAt(position),near=cameras.filter(c=>c.hall===area||c.hall==='lobby'&&!halls.some(h=>h.id===area)).sort((a,b)=>Math.hypot(a.x-position!.x,a.y-position!.y)-Math.hypot(b.x-position!.x,b.y-position!.y))[0];
  return{cameraId:near?.id||s.cameraId,position:{x:position!.x,y:position!.y}};
 };
 const cancelRoute=()=>{patch(currentLocation());walk.stop();setRoute(null);};
 const ask=async(text:string)=>{
  if(busyRef.current)return;busyRef.current=true;setBusy(true);setSelected(null);setPanel(null);setChatOpen(true);
  const s=stateRef.current,context={...currentLocation(),artifactId:focusId,lastArtifactId:lastArtifact.current,audience:s.audience,interest:s.interest,visited:s.visited,favorites:s.favorites};
  const user:Message={id:crypto.randomUUID(),role:'user',text,time:new Date().toISOString()};setState(v=>({...v,messages:[...v.messages,user].slice(-60)}));let result:GuideResponse;
  try{result=await api<GuideResponse>('chat',{message:text,context,history:s.messages.filter(m=>m.id!=='welcome').slice(-8).map(m=>({role:m.role,content:m.text}))});}
  catch{result={...answerLocally(text,context),notice:'当前回答来自本地馆藏资料。'} as GuideResponse;}
  setMode(result.mode);if(result.artifactId){lastArtifact.current=result.artifactId;setFocusId(result.artifactId);}
  if(result.route){walk.stop();setRoute(result.route);setPreview(null);setActiveHall('all');}if(result.tour)startTour(result.tour);
  const reply:Message={...result,id:crypto.randomUUID(),role:'assistant',time:new Date().toISOString()};setState(v=>({...v,messages:[...v.messages,reply].slice(-60)}));setBusy(false);busyRef.current=false;
 };
 const tour=useMemo(()=>planTour(state.cameraId,{minutes:state.minutes,interest:state.interest,visited:state.visited,position:state.position}) as Tour,[state.cameraId,state.position,state.minutes,state.interest,state.visited]);
 const touring=!!state.tour&&state.tourIndex<state.tour.stops.length;
 const openPanel=(value:Panel)=>{setPanel(value);setSelected(null);};
 return <div className={'museum-app '+(chatOpen?'chat-is-open':'')}>
  <header className="museum-header">
   <button className="museum-brand" aria-label="返回博物馆地图" onClick={()=>{setPanel(null);setSelected(null);setActiveHall('all');}}><svg viewBox="0 0 34 34"><rect width="34" height="34" rx="10" fill="#315b47"/><path d="M8 25V9h6l3 8 3-8h6v16M14 25V16l3 7 3-7v9" fill="none" stroke="#f5f5e9" strokeWidth="1.7" strokeLinejoin="round"/></svg><span>MuseIntelligent</span></button>
   <span className="header-floor">1F</span>
   <nav aria-label="博物馆工具"><button aria-label="馆藏" onClick={()=>{setQuery('');setFilter('all');openPanel('collection');}}><LibraryBig size={17}/><span>馆藏</span><b>{artifacts.length}</b></button><button aria-label="路线" className={touring?'has-route':''} onClick={()=>openPanel('route')}><RouteIcon size={17}/><span>路线</span>{touring&&<i/>}</button><button aria-label="识图" onClick={()=>openPanel('recognize')}><ScanLine size={18}/><span>识图</span></button><button aria-label="收藏" onClick={()=>openPanel('saved')}><Heart size={17}/><span>收藏</span></button><button className="header-settings" aria-label="导览设置" onClick={()=>openPanel('settings')}><Settings2 size={17}/></button></nav>
  </header>
  <main className="museum-space"><div className="map-stage">
   <MuseumMap cameraId={state.cameraId} position={state.position} visitor={walk.position} selectedId={focusId} revealId={revealId} activeHall={activeHall} visited={state.visited} route={route} progress={walk.progress} onCamera={chooseCamera} onArtifact={inspect} onHall={id=>{setActiveHall(id);setRevealId(null);setPreview(null);}} onExpand={()=>setExpanded(v=>!v)} expanded={expanded}/>
   <div className="position-control"><span className="position-floor">1F</span><LocateFixed size={15}/><select aria-label="选择当前位置机位" value={state.cameraId} onChange={e=>chooseCamera(e.target.value)}>{cameras.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
   {route?<div className={'navigation-card '+(walk.running?'is-walking':'')}>
    <div className="navigation-main"><span className="navigation-icon"><Navigation size={19}/></span><div><span className="navigation-eyebrow">{touring?`${state.tourIndex+1} / ${state.tour!.stops.length} 站`:'前往'}{walk.running?' · 正在引导':''}</span><strong>{route.name}</strong><small>{Math.max(0,Math.round(route.meters*(1-walk.progress)))} 米 · 约 {route.minutes} 分钟{route.turns>0?` · ${route.turns} 处转弯`:''}</small></div><button className="icon-button" aria-label="取消导航" onClick={cancelRoute}><X size={16}/></button></div>
    {route.through.length>0&&<p className="route-via">经 {route.through.slice(0,3).join(' → ')}</p>}
    <div className="walk-progress"><span style={{width:`${walk.progress*100}%`}}/></div>
    <div className="navigation-actions"><button className="text-button" onClick={arrive}>{route.meters===0?'查看藏品':'直接到达'}</button><button className="primary-button" onClick={route.meters===0?arrive:walk.toggle}>{walk.running?<Pause size={14}/>:<Play size={14} fill="currentColor"/>}{walk.running?'暂停':walk.progress>0?'继续引导':'开始引导'}</button></div>
   </div>:preview?<div className="exhibit-preview"><button className="preview-close icon-button" aria-label="关闭藏品预览" onClick={()=>setPreview(null)}><X size={15}/></button><button className="preview-image" onClick={()=>openArtifact(preview)} aria-label={`查看${preview.name}档案`}><ArtifactImage artifact={preview}/></button><div className="preview-copy"><span>{preview.number} · {hall(preview.hall)?.short}</span><button onClick={()=>openArtifact(preview)}><h2>{preview.name}</h2></button><p>{preview.era}</p><div className="preview-actions"><button className="text-button" onClick={()=>openArtifact(preview)}><BookOpen size={14}/>讲解</button><button className="text-button" onClick={()=>void ask(`请讲讲${preview.name}`)}><Sparkles size={14}/>问 Muse</button><button className="preview-navigate" onClick={()=>navigate(preview)}><Navigation size={13}/>到这里</button></div></div>{touring&&<button className="continue-tour" onClick={continueTour}>下一站 · {art(state.tour!.stops[state.tourIndex])?.name}<ArrowRight size={14}/></button>}</div>:touring?<button className="resume-tour" onClick={continueTour}><RouteIcon size={17}/>继续参观路线<ArrowRight size={14}/></button>:null}
  </div>{chatOpen&&<div className="chat-dock"><GuideChat messages={state.messages} busy={busy} cameraId={state.cameraId} mode={mode} onSend={text=>void ask(text)} onUpload={()=>openPanel('recognize')} onReset={()=>{patch({messages:[welcome]});lastArtifact.current=null;}} onArtifact={openArtifact} onRoute={m=>{if(m.tour)startTour(m.tour);else if(m.route){const origin=currentLocation();walk.stop();patch(origin);setRoute(routeTo(origin.cameraId,m.route.targetId||m.route.artifactId||m.route.to,origin.position) as Route);setPreview(null);setActiveHall('all');}setChatOpen(false);}} onClose={()=>setChatOpen(false)} error=""/></div>}</main>
  {!chatOpen&&<button className="muse-launch" onClick={()=>setChatOpen(true)}><Sparkles size={19}/><span>问 Muse</span>{busy&&<i/>}</button>}
  {selected&&<ArtifactDetail key={selected.id} artifact={selected} favorite={state.favorites.includes(selected.id)} visited={state.visited.includes(selected.id)} note={state.notes[selected.id]||''} audience={state.audience} onClose={()=>{setSelected(null);if(returnPanel)setPanel(returnPanel);setReturnPanel(null);}} onFavorite={()=>favorite(selected.id)} onVisit={()=>visit(selected.id)} onNote={text=>setState(s=>({...s,notes:{...s.notes,[selected.id]:text}}))} onNavigate={()=>navigate(selected)} onAsk={text=>void ask(text)} onArtifact={a=>{setFocusId(a.id);setSelected(a);}}/>}
  {panel==='recognize'&&<Recognition onClose={()=>setPanel(null)} onArtifact={openArtifact} vision={vision}/>}
  {panel==='collection'&&<Modal wide title="馆藏" onClose={()=>setPanel(null)}><CollectionPanel query={query} filter={filter} favorites={state.favorites} visited={state.visited} onQuery={setQuery} onFilter={setFilter} onArtifact={openArtifact} onLocate={locate} onFavorite={favorite}/></Modal>}
  {panel==='route'&&<Modal title="参观路线" onClose={()=>setPanel(null)}><div className="route-panel">
   {touring&&<button className="ongoing-tour" onClick={continueTour}><RouteIcon size={18}/><span>继续当前路线<small>已完成 {state.tourIndex}/{state.tour!.stops.length} 站</small></span><ArrowRight size={16}/></button>}
   <div className="route-preferences"><label>参观时间<select aria-label="参观时间" value={state.minutes} onChange={e=>patch({minutes:Number(e.target.value)})}>{[15,30,45,60].map(n=><option key={n} value={n}>{n} 分钟</option>)}</select></label><label>主题<select aria-label="参观主题" value={state.interest} onChange={e=>patch({interest:e.target.value})}><option value="all">全部展厅</option>{halls.map(h=><option key={h.id} value={h.id}>{h.short}</option>)}</select></label></div>
   <div className="route-summary"><span>{tour.stops.length} 件藏品</span><span>约 {tour.minutes} 分钟</span><span>{tour.meters} 米</span></div><div className="tour-stops">{tour.stops.map((id,i)=>{const a=art(id)!;return <button className="tour-stop" key={id} onClick={()=>openArtifact(a)}><span className="stop-index">{i+1}</span><ArtifactImage artifact={a}/><span><strong>{a.name}</strong><small>{hall(a.hall)?.short} · {tour.segments[i].meters} 米</small></span><ArrowUpRight size={15}/></button>;})}</div>
   {tour.completed?<div className="empty-state"><CheckCircle2 size={25}/><p>全部藏品已参观。</p></div>:<button className="primary-button route-start" onClick={()=>startTour(tour)}>开始这条路线<ArrowRight size={16}/></button>}{touring&&<button className="text-button end-tour" onClick={()=>{cancelRoute();patch({tour:null,tourIndex:0});setToast('路线已结束');}}>结束当前路线</button>}
  </div></Modal>}
  {panel==='saved'&&<Modal title="收藏与手记" onClose={()=>setPanel(null)}><div className="saved-panel"><div className="saved-toolbar"><span>{state.favorites.length} 件收藏 · {state.visited.length} 件已参观</span><button className="text-button" onClick={()=>exportVisit(state)}><Download size={14}/>导出</button></div>{artifacts.filter(a=>state.favorites.includes(a.id)||state.notes[a.id]).map(a=><button className="saved-artifact" key={a.id} onClick={()=>openArtifact(a)}><ArtifactImage artifact={a}/><div><strong>{a.name}</strong>{state.notes[a.id]?<p>{state.notes[a.id]}</p>:<small>{a.era}</small>}</div>{state.favorites.includes(a.id)&&<Heart size={15} fill="currentColor"/>}</button>)}{!state.favorites.length&&!Object.values(state.notes).some(Boolean)&&<div className="empty-state"><Heart size={26}/><p>收藏文物、写下发现，都保存在这里。</p><button className="text-button" onClick={()=>{setQuery('');setFilter('all');setPanel('collection');}}>浏览馆藏<ArrowRight size={14}/></button></div>}<small className="storage-note">记录保存在当前浏览器。</small></div></Modal>}
  {panel==='settings'&&<Modal title="导览设置" onClose={()=>setPanel(null)}><div className="settings-panel"><fieldset><legend>讲解方式</legend><div className="preference-options"><button className={state.audience==='adult'?'selected':''} onClick={()=>patch({audience:'adult'})}><BookOpen size={21}/><strong>标准讲解</strong>{state.audience==='adult'&&<CheckCircle2 size={15}/>}</button><button className={state.audience==='child'?'selected':''} onClick={()=>patch({audience:'child'})}><Sparkles size={21}/><strong>亲子讲解</strong>{state.audience==='child'&&<CheckCircle2 size={15}/>}</button></div></fieldset><div className="settings-links"><button onClick={()=>setPanel('about')}><Info size={16}/>关于馆藏与来源<ArrowUpRight size={14}/></button><span>{mode==='ai'?'DeepSeek 已连接':mode==='configured'?'DeepSeek 已配置':'本地馆藏导览'}</span></div></div></Modal>}
  {panel==='about'&&<Modal title="馆藏与来源" onClose={()=>setPanel(null)}><div className="about-body"><p>本馆为虚拟博物馆，一层、三个展厅，共{artifacts.length}件数字藏品。建筑、展位和路线由本项目设计。</p><p>原作均收藏于纽约大都会艺术博物馆。中文档案依据馆方记录编写，每件藏品均附馆藏编号和来源。图片选用馆方 Public Domain 开放图像。</p><p>本项目与馆方无隶属关系。资料核验日期为2026年10月27日。</p><a className="source-link" href="https://www.metmuseum.org/hubs/open-access" target="_blank" rel="noreferrer">The Met Open Access<ArrowUpRight size={14}/></a></div></Modal>}
  {toast&&<div className="toast" role="status"><CheckCircle2 size={16}/>{toast}</div>}
 </div>;
}
