import { artifacts, halls, getArtifact, getCamera, getHall } from './catalog.mjs';
import { routeTo, planTour, recommendations } from './navigation.mjs';
const clean=value=>String(value).toLowerCase().replace(/兔子毛|兔毛/g,'兔毫').replace(/(商|周|汉|唐|宋|元|明|清)代/g,'$1').replace(/[\s，。！？、,.!?]/g,'');
const stop=new Set(['什么','怎么','哪些','介绍','一下','看看','文物','这里','推荐','有什','为什','想看','我想','可以','里的','它的','有什么']);
const terms=value=>[...new Set((clean(value).match(/[a-z]{3,}|[\u4e00-\u9fff]{2,}/g)||[]).flatMap(part=>/^[a-z]/.test(part)?[part]:Array.from({length:part.length-1},(_,i)=>part.slice(i,i+2))).filter(t=>!stop.has(t)))];
const documents=artifacts.map(a=>({a,title:clean([a.name,a.english,...a.aliases].join(' ')),facts:clean(a.era+a.material+getHall(a.hall).short),body:clean(a.story+a.lookFor.join(' '))}));
export function searchCollection(query,limit=4){
 const q=clean(query);if(!q)return[];
 const named=artifacts.filter(a=>q.includes(clean(a.name))||q.includes(clean(a.english)));if(named.length)return named.slice(0,limit);
 const tokens=terms(query),weights=new Map(tokens.map(t=>[t,1+Math.log((artifacts.length+1)/(1+documents.filter(d=>d.title.includes(t)||d.facts.includes(t)||d.body.includes(t)).length))]));
 return documents.map(d=>{
  let score=0;
  for(const alias of d.a.aliases){const t=clean(alias);if(t.length>1&&q.includes(t))score+=Math.min(6,t.length)*6;}
  for(const token of tokens){const weight=weights.get(token);score+=weight*((d.title.includes(token)?5:0)+(d.facts.includes(token)?2:0)+(d.body.includes(token)?.6:0));}
  for(const dynasty of ['商','周','汉','唐','宋','金','明','清'])if(q.includes(dynasty)&&d.a.era.includes(dynasty))score+=3;
  return{a:d.a,score};
 }).filter(r=>r.score>1).sort((a,b)=>b.score-a.score).slice(0,limit).map(r=>r.a);
}
const broad=new Set(['商代','商','西周','东周','唐代','唐','汉代','宋代','明代','清代','清','蓝色','白瓷','青铜','陶瓷','雕塑','中国','印度','罗马','希腊','青釉','青花']);
export function answerLocally(message, context={}) {
  const camera=getCamera(context.cameraId)||getCamera('L0');
  const matched=searchCollection(message);
  const selected=getArtifact(context.artifactId);
  const lastArtifact=getArtifact(context.lastArtifactId);
  const hall=getHall(camera.hall);
  const referential=/它|这件|那件|这个|这尊|刚才|带我去|怎么走|在哪里|在哪儿|讲讲|介绍|继续/.test(message);
  const nearby=artifacts.filter(a=>a.cameraId===camera.id).sort((a,b)=>Math.hypot(a.position.x-(context.position?.x??camera.x),a.position.y-(context.position?.y??camera.y))-Math.hypot(b.position.x-(context.position?.x??camera.x),b.position.y-(context.position?.y??camera.y)))[0];
  const focus=/眼前|面前|这里|附近|现在看|这件|这个|这尊/.test(message)?(selected||nearby||lastArtifact):(lastArtifact||selected||nearby);
  const explicit=matched.find(a=>[a.name,a.english,...a.aliases.filter(t=>t.length>1&&!broad.has(t))].some(t=>clean(message).includes(clean(t))));
  const target=explicit || (referential?focus:null) || (/眼前|面前|这里|附近|现在看/.test(message)?(selected||nearby):null);
  const base={mode:'knowledge', sources:[], recommendations:[], route:null, tour:null, artifactId:target?.id || null, text:''};
  if (/厕所|洗手间|卫生间/.test(message)) return {...base,text:'这座虚拟博物馆目前开放一层、三个主题展厅，尚未设置卫生间位置。你可以在地图中选择机位，或让我规划展厅参观路线。'};
  if (/我在|我的位置|现在在哪|当前位置/.test(message)) return {...base,text:`你当前在「${camera.name}」，${hall?`属于${hall.short}`:'位于公共区域'}。${camera.description} 这里的位置由你选择的机位确定。`};
  if (/路线|规划|分钟|小时|逛|游览|参观.*推荐|带孩子|亲子/.test(message) && !(/怎么|去|在哪/.test(message)&&target)) {
    const match=message.match(/(\d+)\s*分钟/); const minutes=/半小时/.test(message)?30:/小时/.test(message)?60:match?Number(match[1]):/亲子|孩子/.test(message)?20:30;
    const interest=halls.find(h=>message.includes(h.short)||message.includes(h.id==='bronze'?'青铜':h.id==='ceramic'?'陶瓷':'雕塑'))?.id || context.interest || 'all';
    const tour=planTour(camera.id,{minutes,interest,visited:context.visited||[],position:context.position});
    return {...base,tour,sources:tour.stops,text:tour.completed?'你已经看过所有馆藏了。可以回到收藏夹，挑一件再深入了解。':`为你安排「${tour.title}」，从${camera.name}出发，串联${tour.stops.length}件藏品，预计约${tour.minutes}分钟，步行约${tour.meters}米。\n\n${tour.stops.map((id,i)=>`${i+1}. ${getArtifact(id).name} · ${getHall(getArtifact(id).hall).short}`).join('\n')}\n\n路线沿一层连廊和展厅通道行进，全程无楼梯。时间与距离均为虚拟展馆的估算。`};
  }
  const requestedHall=halls.find(h=>message.includes(h.short)||message.includes(h.id==='bronze'?'青铜':h.id==='ceramic'?'陶瓷':'雕塑'));
  if(requestedHall&&!explicit&&/在哪|去|带路|怎么走/.test(message)){const route=routeTo(camera.id,requestedHall.id,context.position);return{...base,route,text:`${requestedHall.short}有${artifacts.filter(a=>a.hall===requestedHall.id).length}件藏品。从当前位置出发约${route.meters}米，${route.through.length?'经过'+route.through.join(' → ')+'。':''}路线已标在地图上。`};}
  if (/推荐|最值得|看什么|有意思|镇馆|必看/.test(message) && !target) {
    const picks=recommendations({...context,cameraId:camera.id});
    return {...base,recommendations:picks.map(p=>p.id),sources:picks.map(p=>p.id),text:picks.length?`结合你的位置和已看过的藏品，我建议接下来看看：\n\n${picks.map(p=>`${getArtifact(p.id).name} — ${p.reason}。${getArtifact(p.id).lookFor[0]}是一个很好的观察入口。`).join('\n\n')}`:`你已经探索了全部${artifacts.length}件藏品，可以在收藏中回看。`};
  }
  if (/比较|区别|不同|对比/.test(message) && matched.length>=2) {
    const pair=matched.slice(0,2);
    return {...base,sources:pair.map(a=>a.id),text:pair.map(a=>`「${a.name}」\n${a.era}；${a.material}；${a.dimensions}。\n观察重点：${a.lookFor.join('、')}。`).join('\n\n')+'\n\n这些信息以各自的馆方藏品记录为依据。'};
  }
  if (target && /去|带路|走|位置|在哪|哪里|导航|到达/.test(message)) {
    const route=routeTo(camera.id,target.id,context.position);
    return {...base,route,sources:[target.id],text:route.meters===0?`你已在「${camera.name}」机位，${target.name}就在该机位对应的陈列区域。点击藏品可以查看档案和听讲解。`:`${target.name}在${getHall(target.hall).short}，展位${target.number}。\n\n从当前位置出发${route.through.length?'，经过'+route.through.join(' → '):''}，约${route.meters}米、${route.minutes}分钟。地图已标出路线，可以点击“开始引导”。`};
  }
  if (target) {
    const child=context.audience==='child'||/孩子|小朋友|简单|儿童/.test(message);
    const fact=/年代|什么时候|多少年|朝代/.test(message)?`馆方断代为${target.era}。`:/材质|材料|什么做/.test(message)?`馆方记录的材质为${target.material}。`:/尺寸|多大|多高/.test(message)?`馆方记录的尺寸为${target.dimensions}。`:/来源|真的|收藏|出处|编号/.test(message)?`原作收藏于${target.institution}，馆藏编号${target.accession}。本馆是虚拟陈列，并非原作所在的实体展馆。`:(child?target.childStory:target.story);
    return {...base,sources:[target.id],text:`${target.name} · ${target.era}\n\n${fact}\n\n可以留意：${target.lookFor.join('、')}。`, recommendations:recommendations({...context,cameraId:camera.id}).filter(r=>r.id!==target.id).slice(0,2).map(r=>r.id)};
  }
  if (/你好|您好|hello|嗨|开始|谢谢/.test(message)) return {...base,text:`你好，我是你的 Muse 导览助手。你现在位于${camera.name}。我可以介绍本馆${artifacts.length}件真实馆藏、规划三个展厅之间的路线，也可以根据你的收藏推荐下一站。试试问我“青铜爵有什么特别？”或“安排30分钟的参观路线”。`};
  if(requestedHall&&!explicit){const group=artifacts.filter(a=>a.hall===requestedHall.id);return{...base,sources:group.slice(0,4).map(a=>a.id),text:`${requestedHall.short}共${group.length}件藏品。${requestedHall.description}可以从${group.slice(0,4).map(a=>a.name).join('、')}开始看。`};}
  if (/展厅|有什么|多少|博物馆/.test(message)) return {...base,text:`这是一座开放一层的虚拟博物馆，共有三个展厅、${artifacts.length}件数字藏品：\n\n${halls.map(h=>`${h.short} · ${h.description}`).join('\n\n')}\n\n所有原作都收藏于纽约大都会艺术博物馆，每件藏品档案都提供馆方来源链接。`};
  return {...base,text:'在已核验的馆藏资料中，我还没有找到足以回答这个问题的信息。你可以告诉我具体藏品名称，或点击一件藏品后问“讲讲它的故事”。我也可以帮你找位置、比较藏品，或安排参观路线。'};
}
