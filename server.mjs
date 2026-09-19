import http from 'node:http';
import {readFile,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const photos=path.join(root,'kup-fotograflari');
const publicRoot=path.join(root,'public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
const inside=(base,target)=>target.startsWith(base+path.sep);
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  if(url.pathname==='/api/photos'){
   const names=(await readdir(photos)).filter(n=>/\.(png|jpe?g|webp)$/i.test(n));
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
   res.end(JSON.stringify(names.map(name=>({name,url:'/photos/'+encodeURIComponent(name)}))));return;
  }
  const isPhoto=url.pathname.startsWith('/photos/');
  const base=isPhoto?photos:publicRoot;
  const relative=isPhoto?decodeURIComponent(url.pathname.slice(8)):decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.resolve(base,'.'+path.sep+relative);
  if(!inside(base,file)){res.writeHead(403).end();return;}
  if(isPhoto&&!/\.(png|jpe?g|webp)$/i.test(file)){res.writeHead(403).end();return;}
  if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch{res.writeHead(404).end('Bulunamadı');}
}).listen(4173,'127.0.0.1',()=>console.log('Rubix hazır: http://127.0.0.1:4173'));
