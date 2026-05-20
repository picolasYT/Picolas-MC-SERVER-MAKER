const fs = require('fs'); const path = require('path');
function resolveSafe(base, rel='') { const full = path.resolve(base, rel); if(!full.startsWith(path.resolve(base))) throw new Error('Ruta no permitida'); return full; }
function list(base, rel='') { const dir=resolveSafe(base, rel); return fs.readdirSync(dir,{withFileTypes:true}).map(e=>({name:e.name,isDir:e.isDirectory(),path:path.join(rel,e.name).replace(/\\/g,'/')})); }
function read(base, rel) { const f=resolveSafe(base,rel); if(fs.statSync(f).isDirectory()) throw new Error('Es una carpeta'); return fs.readFileSync(f,'utf8'); }
function write(base, rel, content) { const f=resolveSafe(base,rel); fs.writeFileSync(f,content); }
module.exports={list,read,write};
