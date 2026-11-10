import {useEffect,useMemo,useRef,useState} from 'react';
import {LibraryBig,Route as RouteIcon,Heart,Settings2,ScanLine,ArrowRight,Sparkles,Navigation,Download,Info,CheckCircle2,ArrowUpRight,BookOpen,LocateFixed,Search} from 'lucide-react';
import MuseumMap from './components/MuseumMap';
import GuideChat from './components/GuideChat';
import ArtifactDetail from './components/ArtifactDetail';
import CollectionPanel from './components/CollectionPanel';
import Recognition from './components/Recognition';
import Modal from './components/Modal';
import {ArtifactImage} from './components/ArtSymbol';
import {SingleNavigation,TourNavigation} from './components/NavigationCards';
import {artifacts,halls,art,hall,camera,cameras,api,loadVisit,welcome,exportVisit} from './lib';
import {routeTo,planTour} from '../data/navigation.mjs';
import {areaAt} from '../data/floorplan.mjs';
import {answerLocally} from '../data/local-guide.mjs';
import {completeArrival} from '../data/tour-session.mjs';
import useRouteWalk from './useRouteWalk';
import type {Artifact,VisitState,GuideResponse,Message,Route,Tour} from './types';

type Panel='collection'|'route'|'saved'|'recognize'|'settings'|'about'|null;
type NavigationMode='single'|'tour'|null;
export default function App(){
 const [state,setState]=useState<VisitState>(loadVisit);
 const [panel,setPanel]=useState<Panel>(null),[returnPanel,setReturnPanel]=useState<Panel>(null);
 const [selected,setSelected]=useState<Artifact|null>(null),[focusId,setFocusId]=useState<string|null>(null),[revealId,setRevealId]=useState<string|null>(null);
 const [route,setRoute]=useState<Route|null>(null),[navigationMode,setNavigationMode]=useState<NavigationMode>(state.tour?'tour':null);
 const [routeTab,setRouteTab]=useState<'single'|'tour'>('tour'),[destinationQuery,setDestinationQuery]=useState('');
 const [activeHall,setActiveHall]=useState('all'),[chatOpen,setChatOpen]=useState(false);
 const [busy,setBusy]=useState(false),[mode,setMode]=useState('knowledge'),[vision,setVision]=useState(false),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[toast,setToast]=useState('');
 const stateRef=useRef(state),busyRef=useRef(false),lastArtifact=useRef<string|null>(null);stateRef.current=state;
 useEffect(()=>{try{localStorage.setItem('muse.visit.v1',JSON.stringify({...state,layoutVersion:2}));}catch{}},[state]);
 useEffect(()=>{api<{mode:string;vision:boolean}>('health').then(h=>{setMode(h.mode==='ai'?'configured':'knowledge');setVision(h.vision);}).catch(()=>setMode('knowledge'));},[]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(timer);},[toast]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setPanel('collection');setSelected(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const patch=(value:Partial<VisitState>)=>setState(s=>({...s,...value}));
 const visit=(id:string)=>setState(s=>({...s,visited:s.visited.includes(id)?s.visited:[...s.visited,id]}));
 const favorite=(id:string)=>setState(s=>({...s,favorites:s.favorites.includes(id)?s.favorites.filter(v=>v!==id):[...s.favorites,id]}));
 const openArtifact=(a:Artifact)=>{setReturnPanel(panel==='collection'||panel==='saved'?panel:null);setPanel(null);setFocusId(a.id);setSelected(a);};
 const locate=(a:Artifact)=>{setPanel(null);setSelected(null);setFocusId(a.id);setRevealId(null);requestAnimationFrame(()=>setRevealId(a.id));};
 const arrive=()=>{
  if(!route)return;
  const target=route.artifactId?art(route.artifactId):undefined;
  walk.stop();setState(s=>completeArrival(s,route,navigationMode));setRoute(null);
  if(target){setFocusId(target.id);if(navigationMode==='single')setSelected(target);}
  else setToast('已到达');
 };
 const walk=useRouteWalk(route,arrive,navigationMode==='tour');
 const currentLocation=()=>{
  const s=stateRef.current,position=walk.position||s.position;if(!walk.position)return{cameraId:s.cameraId,position};
  const area=areaAt(position),near=cameras.filter(c=>c.hall===area||c.hall==='lobby'&&!halls.some(h=>h.id===area)).sort((a,b)=>Math.hypot(a.x-position!.x,a.y-position!.y)-Math.hypot(b.x-position!.x,b.y-position!.y))[0];
  return{cameraId:near?.id||s.cameraId,position:{x:position!.x,y:position!.y}};
 };
 const showRoute=(nextRoute:Route,kind:NavigationMode)=>{walk.stop();setNavigationMode(kind);setRoute(nextRoute);setFocusId(nextRoute.artifactId);setSelected(null);setReturnPanel(null);setPanel(null);setChatOpen(false);setActiveHall('all');};
 const navigateTo=(id:string)=>{const origin=currentLocation();patch(origin);showRoute(routeTo(origin.cameraId,id,origin.position) as Route,'single');};
 const navigate=(a:Artifact)=>navigateTo(a.id);
 const startTour=(nextTour:Tour)=>{
  if(!nextTour.stops.length){setToast('这条路线已全部参观');return;}
  const origin=currentLocation();patch({...origin,tour:nextTour,tourIndex:0,tourArrivedId:null});
  showRoute(routeTo(origin.cameraId,nextTour.stops[0],origin.position) as Route,'tour');
 };
 const continueTour=()=>{
  const s=stateRef.current,id=s.tour?.stops[s.tourIndex];if(!id)return;
  const origin=currentLocation();patch({...origin,tourArrivedId:null});
  showRoute(routeTo(origin.cameraId,id,origin.position) as Route,'tour');
 };
 const endTour=()=>{patch({...currentLocation(),tour:null,tourIndex:0,tourArrivedId:null});walk.stop();setRoute(null);setNavigationMode(null);setSelected(null);setPanel(null);};
 const cancelSingle=()=>{patch(currentLocation());walk.stop();setRoute(null);setNavigationMode(null);};
 const resumeTour=()=>{if(route&&navigationMode==='tour'){setPanel(null);setChatOpen(false);return;}if(stateRef.current.tourIndex<(stateRef.current.tour?.stops.length||0)){continueTour();return;}patch(currentLocation());walk.stop();setNavigationMode('tour');setRoute(null);setPanel(null);setChatOpen(false);};
 const chooseCamera=(id:string)=>{const c=camera(id);walk.stop();patch({cameraId:id,position:{x:c.x,y:c.y}});if(route)setRoute(routeTo(id,route.targetId,{x:c.x,y:c.y}) as Route);};
 const ask=async(text:string)=>{
  if(busyRef.current)return;busyRef.current=true;setBusy(true);setSelected(null);setReturnPanel(null);setPanel(null);setChatOpen(true);
  const s=stateRef.current,context={...currentLocation(),artifactId:focusId,lastArtifactId:lastArtifact.current,audience:s.audience,interest:s.interest,visited:s.visited,favorites:s.favorites};
  const user:Message={id:crypto.randomUUID(),role:'user',text,time:new Date().toISOString()};setState(v=>({...v,messages:[...v.messages,user].slice(-60)}));
  try{
   let result:GuideResponse;
   try{result=await api<GuideResponse>('chat',{message:text,context,history:s.messages.filter(m=>m.id!=='welcome').slice(-8).map(m=>({role:m.role,content:m.text}))});}
   catch{result={...answerLocally(text,context),notice:'当前使用本地馆藏资料。'} as GuideResponse;}
   setMode(result.mode);if(result.artifactId){lastArtifact.current=result.artifactId;setFocusId(result.artifactId);}
   const reply:Message={...result,id:crypto.randomUUID(),role:'assistant',time:new Date().toISOString()};setState(v=>({...v,messages:[...v.messages,reply].slice(-60)}));
   if(result.tour?.stops.length)startTour(result.tour);
   else if(result.route){const origin=currentLocation();patch(origin);showRoute(routeTo(origin.cameraId,result.route.targetId||result.route.artifactId||result.route.to,origin.position) as Route,'single');}
  }finally{setBusy(false);busyRef.current=false;}
 };
 const tour=useMemo(()=>planTour(state.cameraId,{minutes:state.minutes,interest:state.interest,visited:state.visited,position:state.position}) as Tour,[state.cameraId,state.position,state.minutes,state.interest,state.visited]);
 const touring=!!state.tour&&state.tourIndex<state.tour.stops.length;
 const showTour=navigationMode==='tour'&&!!state.tour;
 const currentArrival=state.tourArrivedId||(!route&&state.tour&&state.tourIndex>0?state.tour.stops[state.tourIndex-1]:null);
 const arrivedDetail=showTour&&!route&&selected?.id===currentArrival;
 const openPanel=(value:Panel)=>{setPanel(value);setSelected(null);setReturnPanel(null);};
 const openRoutePanel=(tab:'single'|'tour')=>{setRouteTab(tab);setDestinationQuery('');openPanel('route');};
 const walkProps={route,running:walk.running,progress:walk.progress,onToggle:walk.toggle,onArrive:arrive};
 return <div className={'museum-app '+(chatOpen?'chat-is-open':'')}>
  <header className="museum-header">
   <button className="museum-brand" aria-label="返回博物馆地图" onClick={()=>{setPanel(null);setSelected(null);setActiveHall('all');}}><img src="/favicon.svg" alt=""/><span>Muse<span className="brand-caption">博物馆导览</span></span></button>
   <nav aria-label="博物馆导览"><button onClick={()=>{setQuery('');setFilter('all');openPanel('collection');}}><LibraryBig size={18}/><span>馆藏</span></button><button onClick={()=>openRoutePanel('single')}><Navigation size={18}/><span>单站导航</span></button><button className={touring?'has-route':''} onClick={()=>openRoutePanel('tour')}><RouteIcon size={18}/><span>多站游览</span>{touring&&<i/>}</button></nav>
   <div className="header-utilities"><button className="icon-button" title="识别文物" aria-label="识别文物" onClick={()=>openPanel('recognize')}><ScanLine size={19}/></button><button className="icon-button" title="收藏与手记" aria-label="收藏与手记" onClick={()=>openPanel('saved')}><Heart size={19}/></button><button className="icon-button" title="导览设置" aria-label="导览设置" onClick={()=>openPanel('settings')}><Settings2 size={19}/></button></div>
  </header>
  <main className="museum-space"><div className={'map-stage '+(showTour||route?'has-navigation':'')}>
   <MuseumMap cameraId={state.cameraId} position={state.position} visitor={walk.position} selectedId={focusId} revealId={revealId} activeHall={activeHall} visited={state.visited} route={route} progress={walk.progress} onArtifact={openArtifact} onHall={id=>{setActiveHall(id);setRevealId(null);}}/>
   <div className="position-control"><LocateFixed size={17}/><select aria-label="当前位置" value={state.cameraId} onChange={e=>chooseCamera(e.target.value)}>{cameras.map(c=><option key={c.id} value={c.id}>{c.name.replace('机位','')}</option>)}</select></div>
   {showTour?<TourNavigation {...walkProps} tour={state.tour!} index={state.tourIndex} arrivedId={currentArrival} onNext={continueTour} onEnd={endTour} onDetails={()=>{const a=currentArrival?art(currentArrival):null;if(a)openArtifact(a);}} onList={()=>openRoutePanel('tour')}/>:navigationMode==='single'&&route?<SingleNavigation {...walkProps} onCancel={cancelSingle}/>:null}
  </div>{chatOpen&&<div className="chat-dock"><GuideChat messages={state.messages} busy={busy} cameraId={state.cameraId} mode={mode} onSend={text=>void ask(text)} onUpload={()=>openPanel('recognize')} onReset={()=>{patch({messages:[welcome]});lastArtifact.current=null;}} onArtifact={openArtifact} onRoute={m=>{if(m.tour)startTour(m.tour);else if(m.route)navigateTo(m.route.targetId||m.route.artifactId||m.route.to);}} onClose={()=>setChatOpen(false)} error=""/></div>}</main>
  {!chatOpen&&<button className="muse-launch" onClick={()=>setChatOpen(true)}><Sparkles size={20}/><span>问 Muse</span>{busy&&<i/>}</button>}
  {selected&&<ArtifactDetail key={selected.id} artifact={selected} favorite={state.favorites.includes(selected.id)} visited={state.visited.includes(selected.id)} note={state.notes[selected.id]||''} audience={state.audience} onClose={()=>{setSelected(null);if(returnPanel)setPanel(returnPanel);setReturnPanel(null);}} onFavorite={()=>favorite(selected.id)} onVisit={()=>visit(selected.id)} onNote={text=>setState(s=>({...s,notes:{...s.notes,[selected.id]:text}}))} onNavigate={()=>navigate(selected)} onAsk={text=>void ask(text)} onArtifact={a=>{setFocusId(a.id);setSelected(a);}} onTourNext={arrivedDetail?(touring?continueTour:endTour):undefined} tourNextLabel={touring?'下一站':'完成游览'}/>}
  {panel==='recognize'&&<Recognition onClose={()=>setPanel(null)} onArtifact={openArtifact} vision={vision}/>}
  {panel==='collection'&&<Modal wide title="馆藏" onClose={()=>setPanel(null)}><CollectionPanel query={query} filter={filter} favorites={state.favorites} visited={state.visited} onQuery={setQuery} onFilter={setFilter} onArtifact={openArtifact} onLocate={locate} onFavorite={favorite}/></Modal>}
  {panel==='route'&&<Modal title={routeTab==='tour'?'多站游览':'单站导航'} onClose={()=>setPanel(null)}><div className="route-panel">
   <div className="route-mode-tabs" role="tablist" aria-label="导航方式"><button role="tab" aria-selected={routeTab==='single'} onClick={()=>setRouteTab('single')}><Navigation size={16}/>单站导航</button><button role="tab" aria-selected={routeTab==='tour'} onClick={()=>setRouteTab('tour')}><RouteIcon size={16}/>多站游览</button></div>
   {routeTab==='single'?<><div className="search-box"><Search size={18}/><input aria-label="搜索导航目的地" placeholder="想去哪件藏品？" value={destinationQuery} onChange={e=>setDestinationQuery(e.target.value)}/></div><div className="destination-list">{artifacts.filter(a=>[a.name,a.era,a.material,...a.aliases].join(' ').includes(destinationQuery.trim())).map(a=><button className="destination-row" key={a.id} onClick={()=>navigate(a)} aria-label={`导航到${a.name}`}><ArtifactImage artifact={a}/><span><strong>{a.name}</strong><small>{hall(a.hall)?.short}</small></span><ArrowRight size={18}/></button>)}</div></>:<>
    {state.tour&&<div className="ongoing-tour"><div><strong>{state.tour.title}</strong><span>{state.tourIndex} / {state.tour.stops.length} 站已到达</span></div><button className="primary-button" onClick={resumeTour}>{touring?'继续当前游览':'查看完成记录'}<ArrowRight size={16}/></button></div>}
    <div className="tour-plan-title"><h3>{tour.title}</h3><p>{tour.stops.length} 件藏品 · 约 {tour.minutes} 分钟</p></div>
    <details className="tour-options"><summary>调整时间与主题</summary><div className="route-preferences"><label>时间<select aria-label="参观时间" value={state.minutes} onChange={e=>patch({minutes:Number(e.target.value)})}>{[15,30,45,60].map(n=><option key={n} value={n}>{n} 分钟</option>)}</select></label><label>主题<select aria-label="参观主题" value={state.interest} onChange={e=>patch({interest:e.target.value})}><option value="all">全馆精选</option>{halls.map(h=><option key={h.id} value={h.id}>{h.short}</option>)}</select></label></div></details>
    <div className="tour-stops">{tour.stops.map((id,i)=>{const a=art(id)!;return <div className="tour-stop" key={id}><span className="stop-index">{String(i+1).padStart(2,'0')}</span><ArtifactImage artifact={a}/><span><strong>{a.name}</strong><small>{hall(a.hall)?.short}</small></span></div>;})}</div>
    {tour.completed?<div className="empty-state"><CheckCircle2 size={28}/><p>全馆已参观完成</p></div>:<button className="primary-button route-start" onClick={()=>startTour(tour)}>开始游览<ArrowRight size={18}/></button>}
   </>}
  </div></Modal>}
  {panel==='saved'&&<Modal title="收藏与手记" onClose={()=>setPanel(null)}><div className="saved-panel"><div className="saved-toolbar"><span>{state.favorites.length} 件收藏</span><button className="text-button" onClick={()=>exportVisit(state)}><Download size={16}/>导出</button></div>{artifacts.filter(a=>state.favorites.includes(a.id)||state.notes[a.id]).map(a=><button className="saved-artifact" key={a.id} onClick={()=>openArtifact(a)}><ArtifactImage artifact={a}/><div><strong>{a.name}</strong>{state.notes[a.id]?<p>{state.notes[a.id]}</p>:<small>{a.era}</small>}</div>{state.favorites.includes(a.id)&&<Heart size={16} fill="currentColor"/>}</button>)}{!state.favorites.length&&!Object.values(state.notes).some(Boolean)&&<div className="empty-state"><Heart size={28}/><p>留下一件让你心动的藏品</p><button className="text-button" onClick={()=>{setQuery('');setFilter('all');setPanel('collection');}}>浏览馆藏<ArrowRight size={16}/></button></div>}</div></Modal>}
  {panel==='settings'&&<Modal title="导览设置" onClose={()=>setPanel(null)}><div className="settings-panel"><fieldset><legend>讲解方式</legend><div className="preference-options"><button className={state.audience==='adult'?'selected':''} onClick={()=>patch({audience:'adult'})}><BookOpen size={21}/><strong>标准讲解</strong></button><button className={state.audience==='child'?'selected':''} onClick={()=>patch({audience:'child'})}><Sparkles size={21}/><strong>亲子讲解</strong></button></div></fieldset><div className="settings-links"><button onClick={()=>setPanel('about')}><Info size={17}/>馆藏与来源<ArrowUpRight size={15}/></button><span>{mode==='ai'?'在线导览已连接':mode==='configured'?'在线导览已配置':'本地馆藏导览'}</span></div></div></Modal>}
  {panel==='about'&&<Modal title="馆藏与来源" onClose={()=>setPanel(null)}><div className="about-body"><p>三个展厅，36 件数字藏品。原作均藏于纽约大都会艺术博物馆，图像来自馆方开放资源。</p><p>每件藏品的档案均附原始记录。展馆建筑与路线为虚拟设计。</p><a className="source-link" href="https://www.metmuseum.org/hubs/open-access" target="_blank" rel="noreferrer">The Met Open Access<ArrowUpRight size={16}/></a></div></Modal>}
  {toast&&<div className="toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}
 </div>;
}
