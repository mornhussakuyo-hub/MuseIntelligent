import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {routeTo} from '../data/navigation.mjs';
const base=process.env.MUSE_TEST_URL||'http://localhost:5173';
const report=[];
async function post(path,body){const response=await fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:new URL(base).origin},body:JSON.stringify(body),signal:AbortSignal.timeout(65000)});const json=await response.json();assert.equal(response.status,200,JSON.stringify(json));return json;}
const health=await fetch(base+'/api/health').then(r=>r.json());assert.equal(health.mode,'ai');assert.equal(health.vision,true);
const first=await post('chat',{message:'我在B1机位，青铜爵在哪里？带我去。',context:{cameraId:'B1'}});assert.equal(first.mode,'ai');assert.equal(first.route.from,'B1');assert.equal(first.route.to,'A1');assert.ok(first.sources.includes('jue'));report.push({case:'DeepSeek 问答与路线工具',status:'passed',response:first});
const follow=await post('chat',{message:'它是什么材质？',context:{cameraId:'B1',lastArtifactId:first.artifactId},history:[{role:'user',content:'青铜爵在哪里？'},{role:'assistant',content:first.text}]});assert.equal(follow.mode,'ai');assert.ok(follow.sources.includes('jue'));assert.match(follow.text,/青铜/);report.push({case:'多轮对话中的指代',status:'passed',response:follow});
const tour=await post('chat',{message:'我有30分钟，想看陶瓷，安排路线。',context:{cameraId:'L0',visited:['longquan'],interest:'ceramic'}});assert.equal(tour.mode,'ai');assert.ok(tour.tour);assert.ok(!tour.tour.stops.includes('longquan'));report.push({case:'时间、兴趣与已参观记录',status:'passed',response:tour});
const origin=routeTo('L0','tea').destination;
const expanded=await post('chat',{message:'我想去看舞王湿婆像，帮我带路。',context:{cameraId:'B1',position:{x:origin.x,y:origin.y}}});assert.equal(expanded.mode,'ai');assert.equal(expanded.route.artifactId,'shiva');assert.ok(expanded.sources.includes('shiva'));assert.equal(expanded.route.nodes[0].x,origin.x);assert.equal(expanded.route.nodes[0].y,origin.y);report.push({case:'新增藏品与精确位置寻路',status:'passed',response:expanded});
for(const id of ['william','shiva']){
 const data=await readFile(new URL(`../public/artworks/${id}.jpg`,import.meta.url));
 const vision=await post('recognize',{image:'data:image/jpeg;base64,'+data.toString('base64')});assert.equal(vision.mode,'vision');assert.equal(vision.id,id);report.push({case:`DeepSeek 馆方图片识别：${id}`,status:'passed',response:vision});
}
await mkdir(new URL('../docs/validation/',import.meta.url),{recursive:true});await writeFile(new URL('../docs/validation/live-api.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),base,health,report},null,2));
for(const result of report)console.log('✓ '+result.case);
