import{Search,X,Heart,MapPin,Check,ArrowUpRight}from'lucide-react';
import{artifacts,halls}from'../lib';
import{ArtifactImage}from'./ArtSymbol';
import type{Artifact}from'../types';
interface Props{query:string;filter:string;favorites:string[];visited:string[];onQuery:(q:string)=>void;onFilter:(id:string)=>void;onArtifact:(a:Artifact)=>void;onLocate:(a:Artifact)=>void;onFavorite:(id:string)=>void}
export default function CollectionPanel({query,filter,favorites,visited,onQuery,onFilter,onArtifact,onLocate,onFavorite}:Props){
 const q=query.trim().toLowerCase();const visible=artifacts.filter(a=>(filter==='all'||filter===a.hall)&&(!q||[a.name,a.english,a.era,a.material,...a.aliases].join(' ').toLowerCase().includes(q)));
 return <div className="collection-panel">
  <div className="collection-toolbar"><div className="search-box"><Search size={17}/><input autoFocus placeholder="搜索名称、年代或材质" aria-label="搜索藏品" value={query} onChange={e=>onQuery(e.target.value)}/>{query&&<button aria-label="清除搜索" onClick={()=>onQuery('')}><X size={14}/></button>}</div><span className="result-count">{visible.length} 件</span></div>
  <div className="collection-tabs"><button className={filter==='all'?'active':''} onClick={()=>onFilter('all')}>全部</button>{halls.map(h=><button key={h.id} className={filter===h.id?'active':''} onClick={()=>onFilter(h.id)}><i style={{background:h.color}}/>{h.short}</button>)}</div>
  <div className="collection-grid">{visible.map(a=><article className="collection-card" key={a.id}>
   <button className="collection-art-button" onClick={()=>onArtifact(a)} aria-label={`查看${a.name}档案`}><ArtifactImage artifact={a}/><div className="collection-info"><span>{a.number}</span><h3>{a.name}</h3><p>{a.era}</p></div></button>
   <button className={'favorite-float '+(favorites.includes(a.id)?'favorited':'')} aria-label={`${favorites.includes(a.id)?'取消收藏':'收藏'}${a.name}`} onClick={()=>onFavorite(a.id)}><Heart size={15} fill={favorites.includes(a.id)?'currentColor':'none'}/></button>
   <div className="collection-card-bottom"><span>{visited.includes(a.id)?<><Check size={12}/>已参观</>:a.material.split('；')[0]}</span><button onClick={()=>onLocate(a)} aria-label={`在地图上定位${a.name}`}><MapPin size={13}/>地图定位</button></div>
  </article>)}</div>
  {!visible.length&&<div className="empty-state"><Search size={25}/><p>没有找到相关藏品。</p><button className="text-button" onClick={()=>{onQuery('');onFilter('all');}}>查看全部</button></div>}
 </div>;
}
