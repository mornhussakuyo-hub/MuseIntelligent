import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {artifacts,halls,cameras,getArtifact} from '../data/catalog.mjs';
import {shortestPath,routeTo,planTour,recommendations,isWalkable,pointAlong} from '../data/navigation.mjs';
import {answerLocally,searchCollection} from '../data/local-guide.mjs';
import {answer,recognizeImage,providerConfig} from '../server/guide.mjs';
import {createApp,sanitizeContext,validateImage} from '../server/index.mjs';

test('36 documented objects, three rooms, local images match their provenance manifest',async()=>{
 assert.equal(artifacts.length,36);assert.equal(new Set(artifacts.map(a=>a.objectId)).size,36);
 const manifest=JSON.parse(await readFile(new URL('../data/image-manifest.json',import.meta.url)));
 const official=Object.values(JSON.parse(await readFile(new URL('../data/met-records.json',import.meta.url))));
 for(const h of halls)assert.equal(artifacts.filter(a=>a.hall===h.id).length,12);
 for(const a of artifacts){const record=official.find(r=>r.objectID===a.objectId);assert.ok(record,a.id);assert.equal(record.accessionNumber,a.accession);assert.equal(record.isPublicDomain,true);assert.match(a.source,/^https:\/\/www.metmuseum.org\/art\/collection\/search\/\d+$/);assert.ok(a.accession);assert.ok(cameras.some(c=>c.id===a.cameraId));assert.ok(a.story&&a.childStory);const image=await readFile(new URL(`../public${a.image}`,import.meta.url));assert.equal(createHash('sha256').update(image).digest('hex'),manifest.find(m=>m.id===a.id).localSha256);}
});
test('all camera-to-exhibit routes stay clear of walls, furniture and cases',()=>{
 for(const from of cameras){assert.ok(isWalkable(from.x,from.y),from.id);for(const a of artifacts){
  const path=routeTo(from.id,a.id);assert.equal(path.nodes[0].x,from.x);assert.equal(path.to,a.cameraId);
  for(let i=1;i<path.nodes.length;i++){const p=path.nodes[i-1],q=path.nodes[i],steps=Math.ceil(Math.hypot(q.x-p.x,q.y-p.y)/3);for(let j=0;j<=steps;j++)assert.ok(isWalkable(p.x+(q.x-p.x)*j/steps,p.y+(q.y-p.y)*j/steps),`${from.id} → ${a.id}: collision`);}
 }}
 assert.equal(shortestPath('A1','A1').meters,0);assert.throws(()=>shortestPath('missing','A1'));
});
test('route choices use inter-gallery doors and go around partitions',()=>{
 const direct=routeTo('A1','longquan');assert.ok(direct.through.includes('青铜—陶瓷连通门'));assert.ok(direct.meters<50);
 const long=routeTo('L0','jue');assert.ok(long.turns>=3);assert.ok(long.through.includes('青铜厅南区通道'));assert.ok(long.through.includes('青铜厅北区通道'));
 assert.notDeepEqual(routeTo('L0','jue').destination,routeTo('L0','you').destination);
 const start=pointAlong(long,0),end=pointAlong(long,1);assert.equal(start.x,long.nodes[0].x);assert.equal(end.x,long.destination.x);assert.equal(end.y,long.destination.y);
});
test('routes resolve artifacts and halls; tours exclude visited items and connect each stop',()=>{
 assert.equal(routeTo('L0','jue').to,'A1');assert.equal(routeTo('B1','sculpture').to,'C3');assert.throws(()=>routeTo('L0','forbidden'));
 const tour=planTour('B1',{minutes:30,interest:'ceramic',visited:['longquan']});assert.equal(tour.stops.length,5);assert.ok(!tour.stops.includes('longquan'));assert.equal(getArtifact(tour.stops[0]).hall,'ceramic');assert.equal(tour.segments[0].from,'B1');for(let i=1;i<tour.segments.length;i++)assert.equal(tour.segments[i].from,tour.segments[i-1].to);
 assert.equal(planTour('L0',{visited:artifacts.map(a=>a.id)}).completed,true);
 const picks=recommendations({cameraId:'B1',visited:['longquan'],favorites:['tea']});assert.equal(getArtifact(picks[0].id).hall,'ceramic');assert.ok(!picks.some(p=>p.id==='longquan'));
});
test('local guide retrieves sources, uses dialogue context, distinguishes comparisons and admits missing evidence',()=>{
 assert.equal(searchCollection('兔毫茶碗')[0].id,'tea');assert.equal(answerLocally('它在哪里？',{cameraId:'L0',lastArtifactId:'jue'}).route.to,'A1');assert.equal(answerLocally('介绍眼前的文物',{cameraId:'B1',artifactId:'longquan'}).artifactId,'longquan');assert.equal(searchCollection('青铜乐器')[0].id,'bell');assert.equal(searchCollection('有龙的铜镜')[0].id,'mirror');assert.ok(answerLocally('请比较青铜爵和龙泉窑青瓷瓶').sources.length===2);assert.match(answerLocally('这里有洗手间吗').text,/尚未设置/);assert.equal(answerLocally('量子引力如何统一？').sources.length,0);assert.equal(answerLocally('安排30分钟路线',{cameraId:'C2'}).tour.segments[0].from,'C2');
});
test('invalid contexts, unsupported image content and unsafe provider endpoints are rejected',()=>{
 assert.deepEqual(sanitizeContext({cameraId:'bogus',visited:['jue','jue','bogus'],audience:'wrong'}).visited,['jue']);assert.equal(sanitizeContext({cameraId:'bogus'}).cameraId,'L0');assert.throws(()=>sanitizeContext([]));assert.throws(()=>validateImage('https://example.com/x.jpg'));assert.throws(()=>validateImage('data:image/png;base64,ZmFrZQ=='));assert.throws(()=>providerConfig({AI_API_KEY:'test',AI_BASE_URL:'http://unsafe.example/v1',AI_MODEL:'test'}));assert.equal(providerConfig({}),null);
});
test('agent executes tools, attaches only validated records, and falls back on provider failure',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:calls===1?{role:'assistant',tool_calls:[{id:'tool1',type:'function',function:{name:'get_artifact',arguments:'{"id":"jue"}'}},{id:'tool2',type:'function',function:{name:'plan_route',arguments:'{"target":"jue"}'}}]}:{role:'assistant',content:'青铜爵位于青铜礼器厅。'}}]});};
 try{const result=await answer('请带我参观爵',{cameraId:'L0'},[],{url:'https://provider.test',key:'test',model:'test'});assert.equal(result.mode,'ai');assert.ok(result.sources.includes('jue'));assert.equal(result.route.to,'A1');assert.equal(calls,2);globalThis.fetch=async()=>{throw new Error('offline');};const fallback=await answer('青铜爵的材质是什么',{cameraId:'L0'},[],{url:'https://provider.test',key:'test',model:'test'});assert.equal(fallback.mode,'knowledge');assert.ok(fallback.notice);assert.deepEqual(fallback.sources,['jue']);}finally{globalThis.fetch=original;}
});
test('HTTP API serves catalog, validates requests, and rejects cross-origin posts and unknown routes',async()=>{
 const app=createApp({config:null});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.address().port}`;
 const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try{assert.equal((await fetch(base+'/api/health').then(r=>r.json())).catalogSize,36);assert.equal((await fetch(base+'/api/catalog').then(r=>r.json())).artifacts.length,36);assert.equal((await post('/api/chat',{message:''})).status,400);assert.equal((await post('/api/chat',{message:'hello'},{Origin:'https://untrusted.example'})).status,403);const chat=await post('/api/chat',{message:'青铜爵在哪里',context:{cameraId:'B1'}}).then(r=>r.json());assert.equal(chat.route.from,'B1');assert.equal(chat.route.to,'A1');assert.equal((await post('/api/recognize',{image:'data:image/png;base64,ZmFrZQ=='})).status,400);assert.equal((await post('/api/route',{target:'bogus'})).status,400);assert.equal((await fetch(base+'/api/missing')).status,404);assert.equal((await fetch(base+'/.env')).status,404);}finally{await new Promise(r=>app.close(r));}
});
