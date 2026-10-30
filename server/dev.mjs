import {spawn} from 'node:child_process';
import {createServer} from 'vite';
const api=spawn(process.execPath,['--watch','--env-file-if-exists=.env','server/index.mjs'],{stdio:'inherit',env:{...process.env,PORT:'8787',HOST:'127.0.0.1'}});
const vite=await createServer();await vite.listen();vite.printUrls();
async function close(){api.kill('SIGTERM');await vite.close();process.exit(0);}
process.on('SIGINT',close);process.on('SIGTERM',close);
api.on('error',error=>{console.error('导览服务未能启动：'+error.message);void close();});
