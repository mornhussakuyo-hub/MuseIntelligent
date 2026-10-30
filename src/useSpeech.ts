import {useEffect,useState,useRef} from 'react';
export default function useSpeech(){
 const [speaking,setSpeaking]=useState(false),[error,setError]=useState(''),[rate,setRate]=useState(1);const current=useRef<SpeechSynthesisUtterance|null>(null);
 const stop=()=>{if('speechSynthesis'in window)window.speechSynthesis.cancel();current.current=null;setSpeaking(false);};
 const speak=(text:string)=>{if(!('speechSynthesis'in window)){setError('此浏览器暂不支持语音讲解，请阅读文字内容。');return;}if(speaking){stop();return;}
 window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='zh-CN';utterance.rate=rate;const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.lang==='zh-CN')||voices.find(v=>v.lang.startsWith('zh'));if(voice)utterance.voice=voice;utterance.onstart=()=>setSpeaking(true);utterance.onend=()=>{setSpeaking(false);current.current=null;};utterance.onerror=e=>{setSpeaking(false);if(!['interrupted','canceled'].includes(e.error))setError('语音暂不可用，请检查设备的语音服务。');};current.current=utterance;setError('');window.speechSynthesis.speak(utterance);};
 useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);
 return{speaking,speak,stop,rate,setRate,error};
}
