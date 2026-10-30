import {artifacts} from './lib';
export async function prepareImage(file:File):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('请选择 JPG、PNG 或 WebP 图片。');
 if(file.size>5*1024*1024)throw new Error('图片超过5MB，请压缩后重新上传。');
 const bitmap=await createImageBitmap(file).catch(()=>{throw new Error('无法读取这张图片，请选择有效的图片文件。');});
 if(bitmap.width<32||bitmap.height<32){bitmap.close();throw new Error('图片太小，请上传至少32×32像素的图片。');}
 const factor=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*factor);canvas.height=Math.round(bitmap.height*factor);const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器无法处理图片，请更换浏览器。');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return canvas.toDataURL('image/jpeg',.88);
}
async function feature(src:string){
 const img=new Image();img.crossOrigin='anonymous';img.src=src;await img.decode();
 const c=document.createElement('canvas');c.width=16;c.height=16;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0,16,16);const data=ctx.getImageData(0,0,16,16).data;
 const values=[];for(let i=0;i<data.length;i+=4)values.push((data[i]+data[i+1]+data[i+2])/3);
 const avg=values.reduce((a,b)=>a+b,0)/256;const std=Math.sqrt(values.reduce((s,v)=>s+(v-avg)**2,0)/256)||1;
 return values.map(v=>(v-avg)/std);
}
export async function referenceMatch(image:string){
 const input=await feature(image);const results=await Promise.all(artifacts.map(async a=>{try{const f=await feature(a.image);const distance=f.reduce((s,v,i)=>s+(v-input[i])**2,0)/256;return{id:a.id,distance};}catch{return null;}}));
 const ranked=results.filter((r):r is {id:string;distance:number}=>r!==null).sort((a,b)=>a.distance-b.distance);
 if(!ranked.length)throw new Error('本地参考图尚未加载，无法匹配。请检查藏品图片或启用在线视觉模型。');
 const first=ranked[0],second=ranked[1];
 // A strict reference match: different viewpoints and unknown objects must not be forced into the catalog.
 if(first.distance>.18||(second&&second.distance-first.distance<.08))return{id:null,observation:'没有找到足够接近的馆藏参考图。可能是拍摄角度不同、画面不够清晰，或照片中的物品不在本馆中。',uncertainty:'本地匹配依据图像特征，仅适用于接近馆方参考图的图片。你可以重新上传，或按名称浏览馆藏。',mode:'reference'};
 return{id:first.id,observation:'这张图片与本馆的这件藏品参考图非常接近。',uncertainty:'参考图匹配只说明图像相似，不能用于鉴定文物真伪。',mode:'reference'};
}
