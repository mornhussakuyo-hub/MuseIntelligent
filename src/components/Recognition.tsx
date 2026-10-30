import {useRef,useState} from 'react';
import {ScanLine,Upload,ImagePlus,Loader2,ArrowUpRight,CheckCircle2,ShieldCheck,RefreshCw} from 'lucide-react';
import Modal from './Modal';
import {prepareImage,referenceMatch} from '../recognition';
import {api,art,artifacts} from '../lib';
import {ArtifactImage} from './ArtSymbol';
import type{Artifact}from'../types';
interface Result{id:string|null;observation:string;uncertainty:string;mode:string;available?:boolean;message?:string}
export default function Recognition({onClose,onArtifact,vision}:{onClose:()=>void;onArtifact:(a:Artifact)=>void;vision:boolean}){
 const input=useRef<HTMLInputElement>(null);const[image,setImage]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null),[dragOver,setDragOver]=useState(false);
 const load=async(file:File)=>{setError('');setResult(null);try{setImage(await prepareImage(file));setName(file.name);}catch(e){setError((e as Error).message);}};
 const recognize=async()=>{setBusy(true);setError('');try{let response:Result;if(vision){response=await api<Result>('recognize',{image});if(response.available===false)response=await referenceMatch(image);}else{response=await referenceMatch(image);}setResult(response);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const sample=async()=>{setBusy(true);setError('');try{const a=artifacts.find(a=>a.id==='william')!;const r=await fetch(a.image);if(!r.ok)throw new Error('样例图片暂不可用，请上传本地图片。');const file=new File([await r.blob()],'蓝色河马-馆方参考图.jpg',{type:'image/jpeg'});await load(file);}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const matched=result?.id?art(result.id):null;
 return <Modal title="识别文物" onClose={onClose}>
  
  <input type="file" accept="image/jpeg,image/png,image/webp" ref={input} hidden onChange={e=>{const f=e.target.files?.[0];if(f)void load(f);e.target.value='';}}/>
  <div className={'upload-zone '+(dragOver?'drag-over':'')} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)void load(f);}}>
   {image?<><img className="upload-preview" src={image} alt="待识别的文物照片"/><span className="upload-name">{name}</span><button className="replace-image" disabled={busy} onClick={()=>input.current?.click()}><RefreshCw size={14}/>更换图片</button></>:<button className="upload-empty" disabled={busy} onClick={()=>input.current?.click()}><span className="upload-icon"><ScanLine size={31}/></span><strong>上传或拖入照片</strong><span>JPG、PNG、WebP · 最大 5 MB</span></button>}
  </div>
  <div className="recognition-mode"><ShieldCheck size={14}/>{vision?'在线视觉识别 · 点击识别后，图片将发送至已配置的 DeepSeek 服务':'本地参考图匹配 · 图片仅在当前浏览器处理'}</div>
  {error&&<p className="inline-error" role="alert">{error}</p>}
  {result&&<div className="recognition-result"><div className="result-heading"><CheckCircle2 size={17}/><strong>{matched?'找到一条馆藏线索':'暂未匹配到本馆藏品'}</strong></div><p>{result.observation}</p>{matched&&<button className="recognized-artifact" onClick={()=>onArtifact(matched)}><ArtifactImage artifact={matched}/><span><strong>{matched.name}</strong><small>{matched.era}</small></span><ArrowUpRight size={18}/></button>}<small>{result.uncertainty}</small></div>}
  <div className="recognition-footer"><button className="text-button" disabled={busy} onClick={()=>void sample()}><ImagePlus size={16}/>试用馆藏样例</button><button className="primary-button" disabled={!image||busy} onClick={()=>void recognize()}>{busy?<Loader2 size={17} className="spin"/>:<ScanLine size={17}/>} {busy?'正在寻找线索…':'开始识别'}</button></div>
 </Modal>;
}
