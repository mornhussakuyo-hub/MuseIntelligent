import {app,BrowserWindow} from 'electron';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createApp} from '../server/index.mjs';

async function verify(){
const output=resolve(import.meta.dirname,'../var/ui-validation');
app.setPath('userData',resolve(output,'profile'));
await app.whenReady();
await mkdir(output,{recursive:true});
const server=process.env.MUSE_TEST_URL?null:createApp({config:null});
if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));
const window=new BrowserWindow({width:1440,height:960,show:true,autoHideMenuBar:true,webPreferences:{partition:'ui-validation',backgroundThrottling:false}});
const base=process.env.MUSE_TEST_URL||`http://127.0.0.1:${server.address().port}`;
const evaluate=source=>window.webContents.executeJavaScript(source,true);
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(source,label,timeout=5000)=>{
 const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(source))return;await delay(60);}throw new Error('Timed out: '+label);
};
const click=async selector=>{
 const found=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return false;e.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true;})()`);
 assert.ok(found,'Missing control: '+selector);await delay(120);
};
const button=async(label,scope='document')=>{
 const found=await evaluate(`(()=>{const e=[...${scope}.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!e)return false;e.click();return true;})()`);
 assert.ok(found,'Missing button: '+label);await delay(120);
};
const saved=()=>evaluate(`JSON.parse(localStorage.getItem('muse.visit.v1'))`);
const snapshot=async name=>{for(let attempt=0;attempt<3;attempt++){await delay(300);try{await writeFile(resolve(output,name+'.png'),(await window.webContents.capturePage()).toPNG());return;}catch(error){if(attempt===2)throw error;}}};
const audits=[];
async function audit(name){
 const result=await evaluate(`(()=>{
  const root=document.documentElement,card=document.querySelector('.navigation-card'),rect=card?.getBoundingClientRect();
  const fonts=[...document.querySelectorAll('button,input,textarea,p,h2,h3,strong,small,select')].filter(e=>e.getClientRects().length&&e.textContent.trim()&&getComputedStyle(e).visibility!=='hidden').filter(e=>parseFloat(getComputedStyle(e).fontSize)<12).map(e=>e.textContent.trim().slice(0,40));
  const rgb=value=>{const values=value.match(/[\\d.]+/g).slice(0,3).map(v=>Number(v)/255);return values.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)};
  const style=getComputedStyle(root),pairs=[['--ink','--paper'],['--muted','--paper'],['--muted','--soft']];
  const contrast=pairs.map(([a,b])=>{const x=rgb(style.getPropertyValue(a).trim().replace(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i,(_,r,g,b)=>'rgb('+[r,g,b].map(x=>parseInt(x,16)).join(',')+')'));const y=rgb(style.getPropertyValue(b).trim().replace(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i,(_,r,g,b)=>'rgb('+[r,g,b].map(x=>parseInt(x,16)).join(',')+')'));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)});
  return {width:innerWidth,overflow:root.scrollWidth>root.clientWidth,cardFits:!rect||(rect.left>=0&&rect.right<=innerWidth),fonts,contrast};
 })()`);
 assert.equal(result.overflow,false,name+' overflows');assert.equal(result.cardFits,true,name+' card overflows');assert.deepEqual(result.fonts,[],name+' small text');assert.ok(result.contrast.every(v=>v>=4.5),name+' contrast');
 audits.push({name,...result});console.log('✓ '+name);
}
try{
 await window.loadURL(base);await until(`!!document.querySelector('.museum-header')`,'first render');
 await audit('desktop map');await snapshot('01-map');
 await click('[aria-label="查看青铜爵"]');await until(`!!document.querySelector('[role=dialog]')`,'one-click exhibit');
 await audit('artifact reading');await snapshot('02-artifact');
 await button('单站导航',`document.querySelector('.detail-footer')`);
 await until(`!!document.querySelector('.single-navigation')`,'single route');assert.equal(await evaluate(`!!document.querySelector('.tour-navigation')`),false);
 await button('直接到达');await until(`!!document.querySelector('.detail-footer')`,'single arrival');
 await click('[aria-label="关闭弹窗"]');
 await button('多站游览',`document.querySelector('.museum-header')`);await button('开始游览');
 await until(`!!document.querySelector('.tour-navigation')`,'tour start');
 let state=await saved();const stops=state.tour.stops.slice();assert.ok(stops.length>=3);
 await button('直接到达');await until(`document.querySelector('.tour-navigation')?.dataset.completed==='1'`,'first arrival');
 await audit('first stop with next action');await snapshot('03-next-stop');
 await button('看讲解');await until(`!!document.querySelector('.detail-footer')`,'tour reading');await button('下一站',`document.querySelector('.detail-footer')`);
 await until(`!!document.querySelector('.tour-navigation .walk-progress')`,'next from detail');
 await until(`[...document.querySelectorAll('.tour-navigation button')].some(e=>e.textContent.trim()==='暂停')`,'next station starts walking automatically');await delay(600);await button('暂停');
 const paused=await evaluate(`document.querySelector('.walk-progress>span').style.width`);await delay(300);
 assert.equal(await evaluate(`document.querySelector('.walk-progress>span').style.width`),paused);
 await button('继续引导');await until(`document.querySelector('.tour-navigation')?.dataset.completed==='2'`,'animated second arrival',20000);
 await window.reload();await until(`document.querySelector('.tour-navigation')?.dataset.completed==='2'`,'restored tour');
 await button('下一站');
 for(let i=2;i<stops.length;i++){
  await button('直接到达');await until(`document.querySelector('.tour-navigation')?.dataset.completed==='${i+1}'`,'stop '+(i+1));
  if(i<stops.length-1)await button('下一站');
 }
 state=await saved();assert.deepEqual(state.tour.stops,stops);assert.equal(state.tourIndex,stops.length);
 await audit('completed multi-stop tour');await snapshot('04-completed');await button('完成游览');
 await click('.muse-launch');await until(`!!document.querySelector('.starter-prompts')`,'chat welcome');await button('生成全馆推荐路线');
 await until(`!!document.querySelector('.tour-navigation')&&!document.querySelector('.chat-dock')`,'generated tour opens map',process.env.MUSE_TEST_URL?60000:10000);
 await button('直接到达');await until(`document.querySelector('.tour-navigation')?.dataset.completed==='1'`,'generated first stop');
 state=await saved();const generatedStops=state.tour.stops.slice();
 await button('单站导航',`document.querySelector('.museum-header')`);await click('[aria-label="导航到青铜爵"]');await button('直接到达');
 await until(`!!document.querySelector('.detail-footer')`,'detour arrival');assert.equal((await saved()).tourIndex,1);assert.deepEqual((await saved()).tour.stops,generatedStops);
 await click('[aria-label="关闭弹窗"]');await button('多站游览',`document.querySelector('.museum-header')`);await button('继续当前游览');await button('直接到达');
 assert.equal((await saved()).tourIndex,2);console.log('✓ generated tour and independent single-stop detour');
 for(const [width,height] of [[1024,768],[768,1024],[375,812],[812,375]]){
  window.setContentSize(width,height);await delay(450);await audit('layout '+width+'x'+height);await snapshot('layout-'+width+'x'+height);
 }
 window.setContentSize(375,812);await delay(300);await button('多站游览',`document.querySelector('.museum-header')`);await audit('mobile route planner');await snapshot('05-mobile-plan');
 await writeFile(resolve(output,'report.json'),JSON.stringify({checkedAt:new Date().toISOString(),stops,generatedStops,audits},null,2));
 console.log('UI validation passed. Screenshots and report: '+output);
}catch(error){console.error(await evaluate(`JSON.stringify({index:JSON.parse(localStorage.getItem('muse.visit.v1'))?.tourIndex,buttons:[...document.querySelectorAll('.navigation-card button')].map(e=>e.textContent.trim())})`));try{await snapshot('failure');}catch{}console.error(error);process.exitCode=1;}
finally{window.destroy();server?.close();app.exit(process.exitCode||0);}
}
void verify().catch(error=>{console.error(error);app.exit(1);});
