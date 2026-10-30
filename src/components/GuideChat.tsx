import {useEffect,useRef,useState} from 'react';
import {ImagePlus,Mic,RotateCcw,Sparkles,MapPin,ArrowUpRight,BookOpen,Volume2,Square,Loader2,ArrowRight,X,Route as RouteIcon} from 'lucide-react';
import {art,camera} from '../lib';
import type {Message,Artifact} from '../types';
import useSpeech from '../useSpeech';
interface SpeechInput {lang:string;continuous:boolean;interimResults:boolean;onresult:((e:{results:{transcript:string}[][]})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start:()=>void;stop:()=>void}
interface Props {messages:Message[];busy:boolean;cameraId:string;mode:string;onSend:(text:string)=>void;onUpload:()=>void;onReset:()=>void;onArtifact:(a:Artifact)=>void;onRoute:(message:Message)=>void;onClose:()=>void;error:string}
export default function GuideChat({messages,busy,cameraId,mode,onSend,onUpload,onReset,onArtifact,onRoute,onClose,error}:Props){
 const [input,setInput]=useState(''),[listening,setListening]=useState(false),[voiceError,setVoiceError]=useState('');const bottom=useRef<HTMLDivElement>(null),recognition=useRef<SpeechInput|null>(null);const speech=useSpeech();
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'nearest'});},[messages,busy]);
 useEffect(()=>()=>recognition.current?.stop(),[]);
 const send=()=>{if(input.trim()&&!busy){onSend(input.trim());setInput('');}};
 const voice=()=>{if(listening){recognition.current?.stop();return;}const Recognition=(window as unknown as {SpeechRecognition?:new()=>SpeechInput;webkitSpeechRecognition?:new()=>SpeechInput}).SpeechRecognition||(window as unknown as {webkitSpeechRecognition?:new()=>SpeechInput}).webkitSpeechRecognition;
  if(!Recognition){setVoiceError('此浏览器暂不支持语音输入，可以直接输入文字。');return;}const r=new Recognition();r.lang='zh-CN';r.continuous=false;r.interimResults=false;r.onresult=e=>{setInput(e.results[0][0].transcript);setListening(false);};r.onerror=e=>{setListening(false);setVoiceError(e.error==='not-allowed'?'麦克风未获授权，请在浏览器设置中允许，或使用文字输入。':'暂时无法听清，请重试或使用文字输入。');};r.onend=()=>setListening(false);recognition.current=r;setVoiceError('');try{r.start();setListening(true);}catch{setVoiceError('麦克风暂不可用，请使用文字输入。');}
 };
 const prompts=['介绍眼前的文物','帮我规划参观路线'];
 return <aside className="guide-panel" aria-label="Muse 智能导览对话">
  <div className="guide-header"><div className="muse-avatar"><Sparkles size={23}/><i/></div><div><strong>Muse <span>AI 导览</span></strong></div><button className="icon-button clear-chat" aria-label="开启新对话" title="开启新对话" onClick={onReset} disabled={busy}><RotateCcw size={16}/></button><button className="icon-button close-chat" onClick={onClose} aria-label="关闭导览对话"><X size={20}/></button></div>
  <div className="guide-location"><MapPin size={12}/><span>当前位置 · {camera(cameraId).name}</span><span className={'connection-dot '+(mode==='ai'?'online':'')}/></div>
  <div className="messages" role="log" aria-label="导览消息" aria-live="polite" aria-relevant="additions text">

   {messages.map(m=><div key={m.id} className={'message '+m.role}>{m.role==='assistant'&&messages.length>1&&<span className="message-author"><Sparkles size={12}/> MUSE</span>}<div className="message-content">{m.text.split(/\n+/).filter(Boolean).map((line,i)=><p key={i}>{line.replace(/\*\*/g,'')}</p>)}</div>
    {!!m.sources?.length&&<div className="message-sources"><span><BookOpen size={11}/>依据馆藏档案</span>{m.sources.slice(0,3).map(id=>{const a=art(id);return a&&<button key={id} onClick={()=>onArtifact(a)}>{a.name}<ArrowUpRight size={10}/></button>;})}</div>}
    {m.role==='assistant'&&(m.route||m.tour)&&<button className="message-route" onClick={()=>onRoute(m)}><RouteIcon size={14}/>在地图上查看路线<ArrowRight size={13}/></button>}
    {m.notice&&<small className="message-notice">{m.notice}</small>}
    {m.role==='assistant'&&m.id!=='welcome'&&<button className="speak-message" aria-label="朗读这条讲解" title="朗读讲解" onClick={()=>speech.speak(m.text)}><Volume2 size={12}/></button>}
   </div>)}
   {messages.length===1&&<div className="starter-prompts">{prompts.map((p,i)=><button key={p} onClick={()=>onSend(p)}><span>{[<BookOpen size={14}/>,<MapPin size={14}/>][i]}{p}</span><ArrowUpRight size={13}/></button>)}</div>}
   {busy&&<div className="thinking" role="status"><span/><span/><span/><small>Muse 正在查阅馆藏资料…</small></div>}
   {error&&<p className="inline-error">{error}</p>}<div ref={bottom}/>
  </div>
  <div className="chat-compose"><div className="chat-input-box"><textarea value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} placeholder="想了解什么？问问 Muse…" aria-label="向 Muse 提问" rows={2} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}/><div className="compose-tools"><div><button className="icon-button" title="上传照片识别文物" aria-label="上传照片识别文物" onClick={onUpload}><ImagePlus size={18}/></button><button className={'icon-button '+(listening?'listening':'')} title={listening?'停止录音':'语音输入'} aria-label={listening?'停止录音':'语音输入'} onClick={voice}>{listening?<Square size={15}/>:<Mic size={17}/>}</button>{listening&&<small>正在聆听…</small>}</div><button className="send-button" aria-label="发送问题" disabled={!input.trim()||busy} onClick={send}>{busy?<Loader2 size={16} className="spin"/>:<ArrowRight size={18}/>}</button></div></div>{voiceError&&<small className="inline-error" role="alert">{voiceError}</small>}<div className="chat-footnote"><span className="tiny-dot"/>{mode==='ai'?'DeepSeek · 藏品信息附来源':mode==='configured'?'DeepSeek 已配置 · 等待对话':'本地馆藏导览 · 有据可循'}</div></div>
 </aside>;
}
