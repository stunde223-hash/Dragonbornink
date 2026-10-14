const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = fs.realpathSync(__dirname);
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
const server = http.createServer((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{'Allow':'GET, HEAD'}); return res.end(); }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400); return res.end(); }
  let file = path.resolve(root,'.'+pathname);
  if (file !== root && !file.startsWith(root+path.sep)) { res.writeHead(403); return res.end(); }
  if (['/','/privacy','/privacy/','/terms','/terms/'].includes(pathname)) file=path.join(root,'index.html');
  const ext = path.extname(file).toLowerCase();
  if (!types[ext]) { res.writeHead(404); return res.end('Not found'); }
  fs.stat(file,(error,stat)=>{
    if(error || !stat.isFile()) {res.writeHead(404);return res.end('Not found');}
    const headers={'Content-Type':types[ext], 'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match || (!match[1]&&!match[2])) {res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
      if(match[1]) {start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end);}
      else {start=Math.max(0,stat.size-Number(match[2]));}
      if(start>end || start>=stat.size || !Number.isSafeInteger(start)||!Number.isSafeInteger(end)) {res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});return res.end();}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);
    if(req.method==='HEAD')return res.end();
    const stream=fs.createReadStream(file,{start,end});
    stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  });
});
let port=4173;
server.on('error',error=>{
  if(error.code==='EADDRINUSE' && port<4183){port++;server.listen(port,'127.0.0.1');}
  else {console.error('Could not start the website:',error.message);process.exitCode=1;}
});
server.listen(port,'127.0.0.1',()=>{
  const address=`http://127.0.0.1:${server.address().port}`;
  try { fs.writeFileSync(path.join(root,'LOCAL-ADDRESS.txt'),address+'\nKeep the launcher window open while viewing the site.\n'); } catch {}
  console.log(`Dragonbornink is running at ${address}\nKeep this window open while viewing the site. Press Ctrl+C to stop.`);
  if(process.platform==='win32' && !process.env.NO_OPEN_BROWSER){
    const child=spawn('cmd.exe',['/c','start','',address],{stdio:'ignore',windowsHide:true});
    child.on('error',()=>console.log('Open the address above in your browser.'));
  }
});
