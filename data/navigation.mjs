import {artifacts,getArtifact,getCamera,getHall} from './catalog.mjs';
import {floor,obstacles,placements,cameraLocations,doors,areaAt} from './floorplan.mjs';
export const METERS_PER_UNIT=floor.metersPerUnit;
const CELL=floor.grid,COLS=floor.width/CELL+1,ROWS=floor.height/CELL+1;
const cases=Object.values(placements).map(p=>({x:p.x-p.w/2,y:p.y-p.h/2,w:p.w,h:p.h}));
export const blockedAreas=[...obstacles,...cases];
export function isWalkable(x,y){return x>=23&&y>=23&&x<=floor.width-23&&y<=floor.height-23&&!blockedAreas.some(r=>x>r.x-9&&x<r.x+r.w+9&&y>r.y-9&&y<r.y+r.h+9);}
const grid=Uint8Array.from({length:COLS*ROWS},(_,i)=>isWalkable((i%COLS)*CELL,Math.floor(i/COLS)*CELL)?1:0);
const coordinates=index=>({x:index%COLS*CELL,y:Math.floor(index/COLS)*CELL});
function nearestCell(point){
 const gx=Math.round(point.x/CELL),gy=Math.round(point.y/CELL);
 for(let r=0;r<=15;r++){
  let best=-1,distance=Infinity;
  for(let y=Math.max(0,gy-r);y<=Math.min(ROWS-1,gy+r);y++)for(let x=Math.max(0,gx-r);x<=Math.min(COLS-1,gx+r);x++){
   const index=y*COLS+x;if(!grid[index])continue;
   const d=Math.hypot(x*CELL-point.x,y*CELL-point.y);if(d<distance){best=index;distance=d;}
  }
  if(best!==-1)return best;
 }
 throw new Error('该位置没有可通行的路线');
}
class Heap{
 values=[];
 push(value){let i=this.values.push(value)-1;while(i){const parent=(i-1)>>1;if(this.values[parent].priority<=value.priority)break;this.values[i]=this.values[parent];i=parent;}this.values[i]=value;}
 pop(){const first=this.values[0],last=this.values.pop();if(this.values.length){let i=0;while(i*2+1<this.values.length){let child=i*2+1;if(child+1<this.values.length&&this.values[child+1].priority<this.values[child].priority)child++;if(this.values[child].priority>=last.priority)break;this.values[i]=this.values[child];i=child;}this.values[i]=last;}return first;}
}
const cache=new Map();
function gridPath(start,goal){
 const key=start+':'+goal;if(cache.has(key))return cache.get(key);
 const cost=new Float64Array(grid.length).fill(Infinity),previous=new Int32Array(grid.length).fill(-1),closed=new Uint8Array(grid.length);
 const target=coordinates(goal),heuristic=index=>{const p=coordinates(index);return Math.abs(p.x-target.x)+Math.abs(p.y-target.y);};
 const heap=new Heap();cost[start]=0;heap.push({index:start,priority:heuristic(start)});
 while(heap.values.length){
  const{index}=heap.pop();if(closed[index])continue;if(index===goal)break;closed[index]=1;
  const x=index%COLS,y=Math.floor(index/COLS);
  const neighbors=[x<COLS-1?index+1:-1,y<ROWS-1?index+COLS:-1,x>0?index-1:-1,y>0?index-COLS:-1];
  for(const next of neighbors){if(next<0||!grid[next]||closed[next])continue;const value=cost[index]+CELL;if(value>=cost[next])continue;cost[next]=value;previous[next]=index;heap.push({index:next,priority:value+heuristic(next)+heuristic(next)*.0001});}
 }
 if(!Number.isFinite(cost[goal]))throw new Error('暂时无法到达该位置');
 const ids=[goal];while(ids[0]!==start)ids.unshift(previous[ids[0]]);
 const path=ids.map(coordinates);if(cache.size>=512)cache.delete(cache.keys().next().value);cache.set(key,path);return path;
}
export function approachPoint(artifact){
 const p=placements[artifact.id],c=getCamera(p.cameraId),dx=c.x-p.x,dy=c.y-p.y;
 const desired=Math.abs(dx)>Math.abs(dy)?{x:p.x+Math.sign(dx)*(p.w/2+30),y:p.y}:{x:p.x,y:p.y+Math.sign(dy)*(p.h/2+30)};
 return coordinates(nearestCell(desired));
}
function resolvePoint(id){const a=getArtifact(id);if(a)return approachPoint(a);const c=getCamera(id);if(c)return{x:c.x,y:c.y};throw new Error('未找到目的地');}
function simplify(path){
 const unique=path.filter((p,i)=>i===0||p.x!==path[i-1].x||p.y!==path[i-1].y);
 return unique.filter((p,i)=>i===0||i===unique.length-1||(p.x-unique[i-1].x)*(unique[i+1].y-p.y)!==(p.y-unique[i-1].y)*(unique[i+1].x-p.x));
}
export function shortestPath(fromId,toId,origin){
 const from=origin||resolvePoint(fromId),to=resolvePoint(toId);
 const raw=gridPath(nearestCell(from),nearestCell(to));const path=simplify([from,...raw,to]);
 const units=path.reduce((s,p,i)=>i?s+Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):0,0);
 return{nodes:path.map((p,i)=>({...p,id:`p${i}`,label:''})),meters:Math.round(units*METERS_PER_UNIT)};
}
function crossedDoors(path){
 const crossed=[];
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i];
  for(const d of doors){
   const crossing=d.axis==='x'?Math.min(a.y,b.y)<=d.y&&Math.max(a.y,b.y)>=d.y&&Math.max(a.x,b.x)>=d.x&&Math.min(a.x,b.x)<=d.x+d.width:Math.min(a.x,b.x)<=d.x&&Math.max(a.x,b.x)>=d.x&&Math.max(a.y,b.y)>=d.y&&Math.min(a.y,b.y)<=d.y+d.width;
   if(crossing&&!crossed.includes(d.name))crossed.push(d.name);
  }
 }
 return crossed;
}
export function routeTo(fromId,targetId,origin){
 const a=getArtifact(targetId),hall=getHall(targetId),destinationId=a?.id||hall?.camera||targetId;
 const cameraId=a?.cameraId||hall?.camera||targetId;const destinationCamera=getCamera(cameraId);if(!destinationCamera)throw new Error('未找到目的地，请选择本馆藏品或机位');
 const path=shortestPath(fromId,destinationId,origin);const through=crossedDoors(path.nodes);
 const instructions=path.nodes.slice(1).map((p,i)=>{const start=path.nodes[i],dx=p.x-start.x,dy=p.y-start.y;return{x:start.x,y:start.y,direction:Math.abs(dx)>Math.abs(dy)?(dx>0?'向东':'向西'):(dy>0?'向南':'向北'),meters:Math.round(Math.hypot(dx,dy)*METERS_PER_UNIT)};}).filter(s=>s.meters>=1);
 return{...path,from:fromId,to:cameraId,targetId:destinationId,artifactId:a?.id||null,destination:path.nodes.at(-1),name:a?.name||hall?.short||destinationCamera.name,minutes:Math.max(1,Math.ceil(path.meters/45)),turns:Math.max(0,instructions.length-1),through,instructions,steps:[getCamera(fromId)?.name||'当前位置',...through,a?`${a.number} ${a.name}`:destinationCamera.name],accessible:true};
}
/** @param {string} fromId @param {{minutes?:number,interest?:string,visited?:string[],position?:{x:number,y:number}}} options */
export function planTour(fromId='L0',{minutes=30,interest='all',visited=[],position}={}){
 const budget=Math.max(10,Math.min(90,Number(minutes)||30));
 const highlights=['jue','longquan','sphinx','ding','horse','shiva','william','bell','eros','robe-vase','mirror','three-graces'];
 const ranked=[...highlights,...artifacts.map(a=>a.id).filter(id=>!highlights.includes(id))].map(getArtifact).filter(a=>a&&!visited.includes(a.id)&&(interest==='all'||a.hall===interest));
 const pool=ranked.slice(0,Math.max(2,Math.floor((budget-2)/5)));const stops=[],segments=[];let current=fromId,point=position;
 while(pool.length){
  const choices=pool.map(a=>({a,route:routeTo(current,a.id,point)})).sort((a,b)=>a.route.meters-b.route.meters);
  const best=choices[0];pool.splice(pool.indexOf(best.a),1);stops.push(best.a.id);segments.push(best.route);current=best.route.to;point=best.route.destination;
 }
 const meters=segments.reduce((sum,s)=>sum+s.meters,0);
 return{title:interest==='all'?'全馆精选':`${getHall(interest)?.short||'主题'}精选`,budget,stops,segments,meters,minutes:Math.round(stops.length*4+meters/45),completed:!stops.length};
}
/** @param {{cameraId?:string,visited?:string[],favorites?:string[],position?:{x:number,y:number}}} context @returns {{id:string,score:number,reason:string}[]} */
export function recommendations({cameraId='L0',visited=[],favorites=[],position}={}){
 const c=getCamera(cameraId)||getCamera('L0'),p=position||c,favoriteHalls=favorites.map(getArtifact).filter(Boolean).map(a=>a.hall);
 return artifacts.filter(a=>!visited.includes(a.id)).map(a=>({id:a.id,score:(a.hall===c.hall?5:0)+(favoriteHalls.includes(a.hall)?3:0)+(['jue','longquan','sphinx','shiva'].includes(a.id)?2:0)-Math.hypot(a.position.x-p.x,a.position.y-p.y)/500,reason:a.hall===c.hall?'就在当前展厅':favoriteHalls.includes(a.hall)?'与你收藏的藏品主题相近':'本馆精选'})).sort((a,b)=>b.score-a.score).slice(0,3);
}
export function pointAlong(route,progress){
 const nodes=route.nodes;if(nodes.length<2)return{...nodes[0],angle:0};
 const lengths=nodes.slice(1).map((p,i)=>Math.hypot(p.x-nodes[i].x,p.y-nodes[i].y));let distance=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const t=lengths[i]?Math.min(1,distance/lengths[i]):0;return{x:nodes[i].x+(nodes[i+1].x-nodes[i].x)*t,y:nodes[i].y+(nodes[i+1].y-nodes[i].y)*t,angle:Math.atan2(nodes[i+1].y-nodes[i].y,nodes[i+1].x-nodes[i].x)*180/Math.PI};}distance-=lengths[i];}
}
