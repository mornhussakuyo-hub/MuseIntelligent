import { artifacts as rawArtifacts,halls as rawHalls,cameras as rawCameras } from '../data/catalog.mjs';
import type {Artifact,Hall,Camera,VisitState,Message} from './types';
export const artifacts=rawArtifacts as Artifact[],halls=rawHalls as Hall[],cameras=rawCameras as Camera[];
export const art=(id:string)=>artifacts.find(a=>a.id===id);
export const hall=(id:string)=>halls.find(h=>h.id===id);
export const camera=(id:string)=>cameras.find(c=>c.id===id)||cameras[0];
export const welcome:Message={id:'welcome',role:'assistant',text:'想了解哪件文物，或想去哪里？',time:''};
const initial:VisitState={visited:[],favorites:[],notes:{},cameraId:'L0',messages:[welcome],audience:'adult',interest:'all',minutes:30,tour:null,tourIndex:0};
export function loadVisit():VisitState {
 try{const value=JSON.parse(localStorage.getItem('muse.visit.v1')||'null');if(!value||typeof value!=='object')return initial;
 return {...initial,visited:Array.isArray(value.visited)?value.visited.filter((v:unknown)=>typeof v==='string'&&art(v)):[],favorites:Array.isArray(value.favorites)?value.favorites.filter((v:unknown)=>typeof v==='string'&&art(v)):[],notes:value.notes&&typeof value.notes==='object'&&!Array.isArray(value.notes)?Object.fromEntries(Object.entries(value.notes).filter(([k,v])=>art(k)&&typeof v==='string').map(([k,v])=>[k,(v as string).slice(0,2000)])):{},cameraId:cameras.some(c=>c.id===value.cameraId)?value.cameraId:'L0',position:value.layoutVersion===2&&value.position&&Number.isFinite(value.position.x)&&Number.isFinite(value.position.y)?value.position:undefined,messages:Array.isArray(value.messages)&&value.messages.length?value.messages.filter((m:Message)=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string').map((m:Message)=>m.id==='welcome'?welcome:m).slice(-60):[welcome],audience:value.audience==='child'?'child':'adult',interest:halls.some(h=>h.id===value.interest)?value.interest:'all',minutes:[15,30,45,60].includes(value.minutes)?value.minutes:30,tour:value.layoutVersion===2&&value.tour&&Array.isArray(value.tour.stops)&&value.tour.stops.every((id:unknown)=>typeof id==='string'&&art(id))?value.tour:null,tourIndex:Number.isInteger(value.tourIndex)&&value.tourIndex>=0?Math.min(value.tourIndex,value.tour?.stops?.length||0):0};
 }catch{return initial;}
}
export async function api<T>(path:string,data?:unknown):Promise<T>{
 const response=await fetch('/api/'+path,{method:data===undefined?'GET':'POST',headers:data===undefined?undefined:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(path==='recognize'?50000:45000)});
 const json=await response.json().catch(()=>({error:'服务返回了无法解析的内容'}));if(!response.ok)throw new Error(json.error||'连接暂时不可用，请重试');return json;
}
export function exportVisit(state:VisitState){
 const text=['MuseIntelligent · 我的博物馆手记',new Date().toLocaleDateString('zh-CN'),'','已探索 '+state.visited.length+' / '+artifacts.length+' 件藏品','',...artifacts.filter(a=>state.favorites.includes(a.id)||state.notes[a.id]).flatMap(a=>[a.name+' · '+a.era,state.favorites.includes(a.id)?'已收藏':'',state.notes[a.id]||'',a.source,''])].join('\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='MuseIntelligent-参观手记.txt';a.click();URL.revokeObjectURL(url);
}
