const fs = require('fs'); const path = require('path');
function resolveSafe(base, rel='') { const full = path.resolve(base, rel || ''); if(!full.startsWith(path.resolve(base))) throw new Error('Ruta no permitida'); return full; }
function list(base, rel='') { const dir=resolveSafe(base, rel); return fs.readdirSync(dir,{withFileTypes:true}).map(e=>({name:e.name,isDir:e.isDirectory(),size:e.isDirectory()?0:fs.statSync(path.join(dir,e.name)).size,path:path.join(rel,e.name).replace(/\\/g,'/')})); }
function read(base, rel) { const f=resolveSafe(base,rel); if(fs.statSync(f).isDirectory()) throw new Error('Es una carpeta'); return fs.readFileSync(f,'utf8'); }
function write(base, rel, content) { const f=resolveSafe(base,rel); fs.mkdirSync(path.dirname(f), {recursive:true}); fs.writeFileSync(f,content); }
function mkdir(base, rel) { const f=resolveSafe(base, rel); fs.mkdirSync(f, { recursive: true }); }
function remove(base, rel) { const f=resolveSafe(base, rel); fs.rmSync(f, { recursive: true, force: true }); }
function moveUploaded(base, tmpPath, destDir, filename) { const dir=resolveSafe(base, destDir || ''); fs.mkdirSync(dir, { recursive: true }); const dest=path.join(dir, filename.replace(/[\\/]/g, '-')); fs.renameSync(tmpPath, dest); return path.relative(base, dest).replace(/\\/g, '/'); }
module.exports={list,read,write,mkdir,remove,moveUploaded};
