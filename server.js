const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
function hasNodeModules() { return fs.existsSync(path.join(ROOT, 'node_modules', 'express')); }
function autoInstall() {
  if (hasNodeModules()) return;
  console.log('📦 Instalando dependencias automáticamente...');
  const r = spawnSync('npm', ['install'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('❌ No se pudieron instalar dependencias. Ejecutá npm install manualmente.'); process.exit(1); }
}
autoInstall();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ensureFolders = require('./src/utils/ensureFolders');
const { readJson, writeJson } = require('./src/utils/jsonStore');
const { createServer, ensureJar, startServer, stopServer, sendCommand, getState, isRunning } = require('./src/minecraft/serverManager');
const { installPlugin } = require('./src/minecraft/pluginInstaller');
const pluginStore = require('./src/minecraft/pluginStore');
const { getProperties, saveProperties } = require('./src/minecraft/propertiesEditor');
const { analyzeLogs } = require('./src/minecraft/logAnalyzer');
const { optimizeServer } = require('./src/minecraft/optimizer');
const { startPinggy, stopPinggy, getTunnel } = require('./src/tunnel/pinggyManager');
const { getStats } = require('./src/stats/systemStats');
const fileManager = require('./src/files/fileManager');

ensureFolders(ROOT);
const app = express();
const upload = multer({ dest: path.join(ROOT, 'downloads') });
app.use(cors()); app.use(express.json({limit:'10mb'})); app.use(express.static(path.join(ROOT,'public')));

const DATA = p => path.join(ROOT, 'data', p);
function servers(){ return readJson(DATA('servers.json'), []); }
function saveServers(s){ writeJson(DATA('servers.json'), s); }
function getServer(id){ const s=servers().find(x=>x.id===id); if(!s) throw new Error('Servidor no encontrado'); return s; }

app.get('/api/health', (req,res)=>res.json({ok:true, name:'Picolas-Mc-Server', tunnel:'pinggy'}));
app.get('/api/settings', (req,res)=>res.json(readJson(DATA('settings.json'), {})));
app.post('/api/settings', (req,res)=>{ writeJson(DATA('settings.json'), req.body); res.json({ok:true}); });
app.get('/api/plugins', (req,res)=>res.json(readJson(DATA('plugins.json'), [])));
app.get('/api/plugin-packs', (req,res)=>res.json(readJson(DATA('plugin-packs.json'), [])));
app.get('/api/plugins/search', async (req,res)=>{ try{ const items=await pluginStore.searchPlugins(req.query.q||'', req.query.limit||18); res.json({ok:true,items}); }catch(e){res.status(500).json({ok:false,error:e.message});} });

app.get('/api/servers', (req,res)=>{
  res.json(servers().map(s=>({ ...s, running:isRunning(s.id), tunnel:getTunnel(s.id) })));
});
app.post('/api/servers/create', async (req,res)=>{
  try{
    const cfg = req.body;
    if(!cfg.name) throw new Error('Falta nombre del servidor');
    const info = createServer(ROOT, cfg);
    const server = { id:info.id, name:cfg.name, description:cfg.description||'', type:cfg.type||'paper', version:cfg.version||'1.21.4', port:Number(cfg.port||25565), ram:Number(cfg.ram||2048), maxPlayers:Number(cfg.maxPlayers||20), cracked:!!cfg.cracked, whitelist:!!cfg.whitelist, adminUser:cfg.adminUser||'', path:info.path, createdAt:new Date().toISOString() };
    const list = servers(); list.push(server); saveServers(list);
    if(cfg.autoDownload !== false && server.type === 'paper') await ensureJar(ROOT, server);
    let started = null;
    let tunnel = null;
    if (cfg.autoStart) {
      try { started = startServer(ROOT, server); } catch (e) { started = { error: e.message }; }
    }
    if (cfg.autoTunnel) {
      try { tunnel = startPinggy(server.id, server.port); } catch (e) { tunnel = { error: e.message }; }
    }
    res.json({ok:true, server, started, tunnel});
  }catch(e){ res.status(400).json({ok:false,error:e.message}); }
});
app.post('/api/servers/:id/download-jar', async (req,res)=>{ try{ const result=await ensureJar(ROOT,getServer(req.params.id)); res.json({ok:true,result}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/optimize', (req,res)=>{ try{ const s=getServer(req.params.id); const result=optimizeServer(path.join(ROOT,s.path)); res.json({ok:true,result}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/start', (req,res)=>{ try{ const s=getServer(req.params.id); const result=startServer(ROOT,s); res.json({ok:true,result}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/stop', (req,res)=>{ try{ stopServer(req.params.id); res.json({ok:true}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/command', (req,res)=>{ try{ sendCommand(req.params.id, req.body.command); res.json({ok:true}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.get('/api/servers/:id/state', (req,res)=>{ const state=getState(req.params.id); res.json({ok:true, state, tunnel:getTunnel(req.params.id)}); });
app.get('/api/servers/:id/stats', async (req,res)=>{ try{ const state=getState(req.params.id); res.json({ok:true, stats:await getStats(state?.pid)}); }catch(e){res.status(500).json({ok:false,error:e.message});} });

app.post('/api/servers/:id/tunnel/start', (req,res)=>{ try{ const s=getServer(req.params.id); const msg=startPinggy(s.id, s.port); res.json({ok:true,message:msg}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/tunnel/stop', (req,res)=>{ stopPinggy(req.params.id); res.json({ok:true}); });

app.post('/api/servers/:id/player/:name/:action', (req,res)=>{
  try{
    const {id,name,action}=req.params;
    const commands = { kick:`kick ${name}`, ban:`ban ${name}`, banip:`ban-ip ${name}`, op:`op ${name}`, deop:`deop ${name}`, whitelist:`whitelist add ${name}`, unwhitelist:`whitelist remove ${name}` };
    if(!commands[action]) throw new Error('Acción inválida');
    sendCommand(id, commands[action]); res.json({ok:true, command:commands[action]});
  }catch(e){res.status(400).json({ok:false,error:e.message});}
});

app.post('/api/servers/:id/plugins/install', async (req,res)=>{ try{ const s=getServer(req.params.id); const dest=await installPlugin(path.join(ROOT,s.path), req.body); res.json({ok:true,dest}); }catch(e){res.status(400).json({ok:false,error:e.message});} });

app.get('/api/servers/:id/plugins/installed', async (req,res)=>{ try{ const s=getServer(req.params.id); const items=await pluginStore.listInstalledPlugins(ROOT,s); res.json({ok:true,items}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/plugins/store-install', async (req,res)=>{ try{ const s=getServer(req.params.id); const result=await pluginStore.installStorePlugin(ROOT,s,req.body); res.json({ok:true,result}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/plugins/update', async (req,res)=>{ try{ const s=getServer(req.params.id); const result=await pluginStore.updatePlugin(ROOT,s,req.body.projectId||null); res.json({ok:true,result}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/plugins/install-pack', async (req,res)=>{ try{ const s=getServer(req.params.id); const packs=readJson(DATA('plugin-packs.json'), []); const pack=packs.find(x=>x.id===req.body.packId); if(!pack) throw new Error('Pack no encontrado'); const result=await pluginStore.installPack(ROOT,s,pack); res.json({ok:true,result}); }catch(e){res.status(400).json({ok:false,error:e.message});} });

app.get('/api/servers/:id/properties', (req,res)=>{ try{ const s=getServer(req.params.id); res.json({ok:true,...getProperties(path.join(ROOT,s.path))}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/properties', (req,res)=>{ try{ const s=getServer(req.params.id); const result=saveProperties(path.join(ROOT,s.path), req.body.values||{}); res.json({ok:true,...result}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.get('/api/servers/:id/log-insights', (req,res)=>{ try{ const st=getState(req.params.id); res.json({ok:true,issues:analyzeLogs(st?.logs||[])}); }catch(e){res.status(400).json({ok:false,error:e.message});} });


app.get('/api/servers/:id/files', (req,res)=>{ try{ const s=getServer(req.params.id); res.json({ok:true, files:fileManager.list(path.join(ROOT,s.path), req.query.path||'')}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.get('/api/servers/:id/file', (req,res)=>{ try{ const s=getServer(req.params.id); res.json({ok:true, content:fileManager.read(path.join(ROOT,s.path), req.query.path)}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/file', (req,res)=>{ try{ const s=getServer(req.params.id); fileManager.write(path.join(ROOT,s.path), req.body.path, req.body.content); res.json({ok:true}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/folder', (req,res)=>{ try{ const s=getServer(req.params.id); fileManager.mkdir(path.join(ROOT,s.path), req.body.path); res.json({ok:true}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.delete('/api/servers/:id/file', (req,res)=>{ try{ const s=getServer(req.params.id); fileManager.remove(path.join(ROOT,s.path), req.body.path); res.json({ok:true}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/upload-file', upload.single('file'), (req,res)=>{ try{ const s=getServer(req.params.id); if(!req.file) throw new Error('No llegó ningún archivo'); const rel=fileManager.moveUploaded(path.join(ROOT,s.path), req.file.path, req.body.destDir||'', req.file.originalname); res.json({ok:true,path:rel}); }catch(e){res.status(400).json({ok:false,error:e.message});} });
app.post('/api/servers/:id/upload-jar', upload.single('jar'), (req,res)=>{ try{ const s=getServer(req.params.id); fs.renameSync(req.file.path, path.join(ROOT,s.path,'server.jar')); res.json({ok:true}); }catch(e){res.status(400).json({ok:false,error:e.message});} });

const settings = readJson(DATA('settings.json'), {panelPort:3000});
const PORT = Number(process.env.PORT || settings.panelPort || 3000);
app.listen(PORT, () => {
  console.log('✅ Picolas-Mc-Server iniciado');
  console.log(`🌐 Panel: http://localhost:${PORT}`);
  console.log('🚇 Pinggy se inicia desde el panel con SSH. No necesita instalar ngrok/playit.');
});
