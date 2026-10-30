import {useEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
export default function Modal({title,eyebrow,children,onClose,wide=false}:{title:string;eyebrow?:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}){
 const ref=useRef<HTMLDivElement>(null),id=useId();const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();
 const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();close.current();}if(e.key==='Tab'){
 const focusable=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')||[]).filter(el=>el.offsetParent!==null);const first=focusable[0],last=focusable.at(-1);if(!first){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',key);previous?.focus();};},[]);
 return createPortal(<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div ref={ref} className={'modal '+(wide?'modal-wide':'')} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}><div className="modal-header"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2 id={id}>{title}</h2></div><button className="icon-button" aria-label="关闭弹窗" onClick={onClose}><X size={21}/></button></div>{children}</div></div>,document.body);
}
