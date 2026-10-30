import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { artifacts, halls, cameras, museum, getCamera, getArtifact } from '../data/catalog.mjs';
import {floor} from '../data/floorplan.mjs';
import { routeTo, planTour } from '../data/navigation.mjs';
import { answer, providerConfig, recognizeImage } from './guide.mjs';
const root=resolve(import.meta.dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.webp':'image/webp','.ico':'image/x-icon'};
export class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
export function sanitizeContext(input={}) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new HttpError(400,'导览上下文格式不正确');
  const list=value=>Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&getArtifact(id)))].slice(0,artifacts.length):[];
  return {cameraId:getCamera(input.cameraId)?.id||'L0',position:input.position&&Number.isFinite(input.position.x)&&Number.isFinite(input.position.y)&&input.position.x>=0&&input.position.x<=floor.width&&input.position.y>=0&&input.position.y<=floor.height?{x:input.position.x,y:input.position.y}:undefined,artifactId:getArtifact(input.artifactId)?.id||null,lastArtifactId:getArtifact(input.lastArtifactId)?.id||null,audience:input.audience==='child'?'child':'adult',interest:halls.some(h=>h.id===input.interest)?input.interest:'all',visited:list(input.visited),favorites:list(input.favorites)};
}
export function validateImage(image) {
  if(typeof image!=='string'||image.length>7_000_000) throw new HttpError(413,'图片过大，请上传小于5MB的图片');
  const match=image.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match)throw new HttpError(400,'只支持 JPEG、PNG 或 WebP 图片');
  const data=Buffer.from(match[2],'base64');
  const valid=match[1]==='jpeg'?data[0]===0xff&&data[1]===0xd8&&data[2]===0xff:match[1]==='png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP';
  if(!valid||data.length>5*1024*1024)throw new HttpError(400,'图片内容与文件类型不符，或图片超过5MB');
  return image;
}
async function readJson(req) {
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new HttpError(415,'请求必须使用 JSON');
  let size=0; const chunks=[];
  for await (const chunk of req) {size+=chunk.length;if(size>7_500_000)throw new HttpError(413,'请求内容过大');chunks.push(chunk);}
  try {const data=JSON.parse(Buffer.concat(chunks).toString());if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data;} catch {throw new HttpError(400,'请求不是有效的 JSON 对象');}
}
export function createApp({config=undefined,staticDir=resolve(root,'dist')}={}) {
  const limits=new Map(); let resolvedConfig;
  try {resolvedConfig=config===undefined?providerConfig():config;}catch {resolvedConfig=null;}
  return http.createServer(async(req,res)=>{
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options','DENY');
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname.startsWith('/api/')) {
        if(req.method==='POST') {
          if(req.headers.origin) {const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host)throw new HttpError(403,'仅允许本站发起请求');}
          const now=Date.now();const address=req.socket.remoteAddress||'unknown';let entry=limits.get(address);
          if(!entry||entry.until<now){entry={count:0,until:now+60_000};limits.set(address,entry);}
          if(++entry.count>40)throw new HttpError(429,'请求较频繁，请稍后再试');
          if(limits.size>1000)for(const[k,v]of limits)if(v.until<now)limits.delete(k);
        }
        if(url.pathname==='/api/health'&&req.method==='GET')return json(200,{status:'ok',mode:resolvedConfig?'ai':'knowledge',vision:!!resolvedConfig?.visionModel,version:'1.0.0',catalogSize:artifacts.length});
        if(url.pathname==='/api/catalog'&&req.method==='GET')return json(200,{museum,halls,cameras,artifacts});
        if(url.pathname==='/api/chat'&&req.method==='POST') {
          const data=await readJson(req);
          if(typeof data.message!=='string'||!data.message.trim()||data.message.length>2000)throw new HttpError(400,'请输入1—2000字的问题');
          const context=sanitizeContext(data.context);
          const history=Array.isArray(data.history)?data.history.slice(-8).filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,4000)})):[];
          return json(200,await answer(data.message.trim(),context,history,resolvedConfig));
        }
        if(url.pathname==='/api/recognize'&&req.method==='POST') {
          const data=await readJson(req);const image=validateImage(data.image);
          return json(200,await recognizeImage(image,sanitizeContext(data.context),resolvedConfig));
        }
        if(url.pathname==='/api/route'&&req.method==='POST') {
          const data=await readJson(req);const context=sanitizeContext(data.context);
          try {return json(200,data.tour?planTour(context.cameraId,{minutes:data.minutes,interest:context.interest,visited:context.visited,position:context.position}):routeTo(context.cameraId,data.target,context.position));}catch(e){throw new HttpError(400,e.message);}
        }
        return json(404,{error:'未找到此接口'});
      }
      if(!['GET','HEAD'].includes(req.method))throw new HttpError(405,'不支持此请求方法');
      let pathname;
      try{pathname=decodeURIComponent(url.pathname);}catch{throw new HttpError(400,'地址编码无效');}
      if(pathname.split('/').some(part=>part.startsWith('.')))throw new HttpError(404,'文件不存在');
      const filename=resolve(staticDir,'.'+pathname);
      if(filename!==staticDir&&!filename.startsWith(staticDir+sep))throw new HttpError(403,'无法访问该路径');
      let file=filename;
      try {if(!(await stat(file)).isFile())throw new Error();}catch {if(extname(pathname))throw new HttpError(404,'文件不存在');file=resolve(staticDir,'index.html');}
      const content=await readFile(file);
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});
      res.end(req.method==='HEAD'?undefined:content);
    }catch(e){if(!res.headersSent)json(e.status||500,{error:e.status?e.message:'服务暂时不可用，请稍后重试'});else res.end();}
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const port=Number(process.env.PORT)||8787;const host=process.env.HOST||'127.0.0.1';
  if(!existsSync(resolve(root,'dist/index.html')))console.warn('尚未生成前端，请先执行 pnpm build，或使用 pnpm dev。');
  createApp().listen(port,host,()=>console.log(`MuseIntelligent: http://${host}:${port}`));
}
