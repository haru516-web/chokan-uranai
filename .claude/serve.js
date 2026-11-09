const http=require('http'),fs=require('fs'),path=require('path');
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.webp':'image/webp','.js':'text/javascript','.css':'text/css','.md':'text/plain; charset=utf-8'};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);
fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end('not found');return;}r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});r.end(d);});}).listen(8765,()=>console.log('listening 8765'));
