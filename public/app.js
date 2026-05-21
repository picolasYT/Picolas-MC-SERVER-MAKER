let selectedServer = '';
let cachedServers = [];
function $(id){return document.getElementById(id)}
function toast(msg){const t=$('toast');t.textContent=msg;t.className='show';setTimeout(()=>t.className='',2600)}
function show(id){document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));$(id).classList.remove('hidden');$('pageTitle').textContent=id[0].toUpperCase()+id.slice(1);refreshAll()}
async function api(url, opts={}){const r=await fetch(url,{headers:{'Content-Type':'application/json'},...opts});const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.error||'Error');return d}
function getSelected(){return cachedServers.find(s=>s.id===selectedServer)}
function ipOf(s){return s?.tunnel?.publicAddress || ''}
function serverCard(s){const ip=ipOf(s);return `<div class="server"><div class="server-top"><div><h3>${s.name}</h3><p>${s.description||'Sin descripción'}</p></div><span class="dot ${s.running?'online':'offline'}"></span></div><div class="badges"><span class="badge">${s.type} ${s.version}</span><span class="badge">Puerto ${s.port}</span><span class="badge ${s.running?'ok':'bad'}">${s.running?'Online':'Offline'}</span></div><div class="ipbox">${ip?`🌐 <b>${ip}</b>`:'🌐 Sin IP pública todavía'}</div><div class="actions"><button onclick="startServer('${s.id}')">Iniciar</button><button onclick="stopServer('${s.id}')" class="danger">Detener</button><button onclick="startTunnelFor('${s.id}')" class="secondary">Crear IP</button><button onclick="copyIpFor('${s.id}')" class="secondary">Copiar IP</button><button onclick="optimizeServer('${s.id}')" class="secondary">Optimizar</button><button onclick="downloadJar('${s.id}')" class="secondary">Descargar jar</button></div></div>`}
async function loadServers(){const list=await api('/api/servers'); cachedServers=list; const sel=$('serverSelect'); sel.innerHTML=''; list.forEach(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=s.name+' '+(s.running?'🟢':'🔴');sel.appendChild(o)}); if(!selectedServer&&list[0]) selectedServer=list[0].id; sel.value=selectedServer; const html=list.map(serverCard).join('') || '<div class="card">No hay servidores. Creá uno primero.</div>'; $('serversList').innerHTML=html; $('serverCards').innerHTML=html; const online=list.filter(s=>s.running).length; const players=(await Promise.all(list.map(async s=>{try{const d=await api(`/api/servers/${s.id}/state`);return d.state?.players?.length||0}catch{return 0}}))).reduce((a,b)=>a+b,0); $('dashboardStats').innerHTML=`<div class="stat"><b>${online}/${list.length}</b><span>Servidores online</span></div><div class="stat"><b>${players}</b><span>Jugadores detectados</span></div><div class="stat"><b>${ipOf(getSelected())||'Sin IP'}</b><span>IP pública actual</span></div>`; return list;}
async function createServer(){try{const body={name:$('c_name').value,description:$('c_desc').value,version:$('c_version').value,type:$('c_type').value,ram:+$('c_ram').value,port:+$('c_port').value,adminUser:$('c_admin').value,maxPlayers:+$('c_max').value,cracked:$('c_cracked').checked,whitelist:$('c_whitelist').checked,eula:$('c_eula').checked,autoDownload:true,autoStart:$('c_autoStart').checked,autoTunnel:$('c_autoTunnel').checked};const d=await api('/api/servers/create',{method:'POST',body:JSON.stringify(body)});selectedServer=d.server.id;toast('Servidor creado ✅ Pinggy puede tardar unos segundos en mostrar la IP');show('servers');setTimeout(refreshAll,4000)}catch(e){alert(e.message)}}
async function downloadJar(id){try{await api(`/api/servers/${id}/download-jar`,{method:'POST'});toast('Jar descargado ✅')}catch(e){alert(e.message)}}
async function optimizeServer(id){try{const d=await api(`/api/servers/${id}/optimize`,{method:'POST'});toast(`Servidor optimizado ✅ ${d.result.changes.length} cambios`);loadFiles('')}catch(e){alert(e.message)}}
function optimizeSelected(){if(!selectedServer)return alert('Elegí server');optimizeServer(selectedServer)}
async function startServer(id){try{await api(`/api/servers/${id}/start`,{method:'POST'});selectedServer=id;toast('Servidor iniciado ✅');show('console')}catch(e){alert(e.message)}}
async function stopServer(id){try{await api(`/api/servers/${id}/stop`,{method:'POST'});toast('Servidor detenido');refreshAll()}catch(e){alert(e.message)}}
async function sendCommand(){if(!selectedServer)return alert('Elegí server');await api(`/api/servers/${selectedServer}/command`,{method:'POST',body:JSON.stringify({command:$('cmd').value})});$('cmd').value=''}
function quick(c){$('cmd').value=c;sendCommand()}
async function loadState(){if(!selectedServer)return; const d=await api(`/api/servers/${selectedServer}/state`); const st=d.state; $('logs').textContent=st?st.logs.join('\n'):'Servidor apagado'; $('playersBox').innerHTML=st&&st.players.length?st.players.map(p=>`<div class="card"><b>${p.name}</b><p>Estado: ${p.status} | IP: ${p.ip}</p><button onclick="player('${p.name}','kick')">Kick</button><button onclick="player('${p.name}','ban')">Ban</button><button onclick="player('${p.name}','op')">OP</button><button onclick="player('${p.name}','whitelist')">Whitelist</button></div>`).join(''):'<div class="card">No hay jugadores detectados.</div>'; $('tunnelBox').innerHTML=d.tunnel?`<h3>${d.tunnel.publicAddress||'Iniciando...'}</h3><p>Puerto local: ${d.tunnel.localPort}</p><button onclick="copyIp()" class="secondary">Copiar IP</button><pre>${d.tunnel.logs||''}</pre>`:'<p>Sin túnel activo.</p>'}
async function player(name,action){await api(`/api/servers/${selectedServer}/player/${encodeURIComponent(name)}/${action}`,{method:'POST'});toast('Comando enviado')}
async function loadStats(){if(!selectedServer)return; const d=await api(`/api/servers/${selectedServer}/stats`); const s=d.stats; $('statsBox').innerHTML=`<div class="stat"><b>${s.cpuLoad}%</b><span>CPU</span></div><div class="stat"><b>${s.ramUsedMb} / ${s.ramTotalMb} MB</b><span>RAM del sistema</span></div><div class="stat"><b>${s.process?`PID ${s.process.pid}`:'Sin proceso'}</b><span>Java / Minecraft</span></div>`}
async function loadPlugins(){const plugins=await api('/api/plugins');$('pluginsBox').innerHTML=plugins.map(p=>`<div class="card"><h3>${p.name} ${p.recommended?'⭐':''}</h3><p>${p.description}</p><button onclick='installPlugin(${JSON.stringify(p)})'>Instalar</button></div>`).join('')}
async function installPlugin(p){if(!selectedServer)return alert('Elegí server');try{await api(`/api/servers/${selectedServer}/plugins/install`,{method:'POST',body:JSON.stringify(p)});toast('Plugin instalado. Reiniciá el server.')}catch(e){alert(e.message)}}
async function loadFiles(path=''){if(!selectedServer)return; const d=await api(`/api/servers/${selectedServer}/files?path=${encodeURIComponent(path)}`);$('filesBox').innerHTML=d.files.map(f=>`<div class="mini"><b>${f.isDir?'📁':'📄'} ${f.name}</b><br><button onclick="${f.isDir?`loadFiles('${f.path}')`:`openFile('${f.path}')`}">${f.isDir?'Abrir':'Editar'}</button></div>`).join('')}
async function openFile(path){const d=await api(`/api/servers/${selectedServer}/file?path=${encodeURIComponent(path)}`);$('filePath').value=path;$('fileContent').value=d.content}
async function saveFile(){await api(`/api/servers/${selectedServer}/file`,{method:'POST',body:JSON.stringify({path:$('filePath').value,content:$('fileContent').value})});toast('Guardado')}
async function startTunnelFor(id){selectedServer=id;return startTunnel()}
async function startTunnel(){if(!selectedServer)return alert('Elegí server');await api(`/api/servers/${selectedServer}/tunnel/start`,{method:'POST'});toast('Pinggy iniciado, esperá la IP...');show('pinggy');setTimeout(refreshAll,4000)}
async function stopTunnel(){if(!selectedServer)return;await api(`/api/servers/${selectedServer}/tunnel/stop`,{method:'POST'});toast('Pinggy detenido');refreshAll()}
function copyIpFor(id){const s=cachedServers.find(x=>x.id===id);const ip=ipOf(s);if(!ip)return alert('Todavía no hay IP pública');navigator.clipboard.writeText(ip);toast('IP copiada 📋')}
function copyIp(){copyIpFor(selectedServer)}
async function refreshAll(){try{await loadServers(); await loadState(); await loadStats(); await loadPlugins();}catch(e){console.warn(e)}}
setInterval(()=>{loadState();loadStats();loadServers()},3000);refreshAll();

// ===== Plugin Store + Packs =====
async function searchStorePlugins(){
  const q=$('pluginSearch')?.value||'';
  try{
    $('pluginStoreBox').innerHTML='<div class="card">Buscando plugins...</div>';
    const d=await api(`/api/plugins/search?q=${encodeURIComponent(q)}&limit=18`);
    $('pluginStoreBox').innerHTML=d.items.map(p=>`<div class="card plugin-card"><div class="plugin-head">${p.iconUrl?`<img src="${p.iconUrl}" alt="">`:''}<div><h3>${p.title}</h3><p>${p.description||''}</p></div></div><div class="badges"><span class="badge">⬇ ${p.downloads.toLocaleString()}</span><span class="badge">Modrinth</span></div><div class="actions"><button onclick='installStorePlugin(${JSON.stringify(p).replace(/'/g,"&apos;")})'>Instalar</button><button onclick="window.open('${p.url}','_blank')" class="secondary">Ver</button></div></div>`).join('') || '<div class="card">No encontré plugins.</div>';
  }catch(e){alert(e.message)}
}
async function installStorePlugin(p){
  if(!selectedServer)return alert('Elegí server');
  try{toast('Instalando plugin...');await api(`/api/servers/${selectedServer}/plugins/store-install`,{method:'POST',body:JSON.stringify(p)});toast('Plugin instalado ✅ Reiniciá el server');loadInstalledPlugins();}
  catch(e){alert(e.message)}
}
async function loadPacks(){
  try{const packs=await api('/api/plugin-packs');$('packsBox').innerHTML=packs.map(pack=>`<div class="card"><h3>${pack.name}</h3><p>${pack.description}</p><p class="hint">${pack.plugins.join(' • ')}</p><button onclick="installPack('${pack.id}')">Instalar pack</button></div>`).join('')}catch(e){console.warn(e)}
}
async function installPack(packId){
  if(!selectedServer)return alert('Elegí server');
  try{toast('Instalando pack... puede tardar');const d=await api(`/api/servers/${selectedServer}/plugins/install-pack`,{method:'POST',body:JSON.stringify({packId})});const ok=d.result.filter(x=>x.ok).length;toast(`Pack instalado: ${ok}/${d.result.length} plugins ✅`);loadInstalledPlugins();}
  catch(e){alert(e.message)}
}
async function loadInstalledPlugins(){
  if(!selectedServer)return;
  try{const d=await api(`/api/servers/${selectedServer}/plugins/installed`);$('installedPluginsBox').innerHTML=d.items.map(p=>`<div class="card"><h3>${p.fileName}</h3>${p.tracked?`<p>${p.tracked.title} v${p.tracked.versionNumber}</p><button onclick="updatePlugin('${p.tracked.projectId}')" class="secondary">Actualizar</button>`:'<p class="hint">Plugin manual. No se puede actualizar automático porque no sé de dónde salió.</p>'}</div>`).join('')||'<div class="card">No hay plugins instalados.</div>'}catch(e){console.warn(e)}
}
async function updatePlugin(projectId){
  try{toast('Buscando actualización...');const d=await api(`/api/servers/${selectedServer}/plugins/update`,{method:'POST',body:JSON.stringify({projectId})});toast(d.result.some(x=>x.updated)?'Plugin actualizado ✅':'Ya estaba actualizado');loadInstalledPlugins();}
  catch(e){alert(e.message)}
}
async function updateAllPlugins(){
  if(!selectedServer)return alert('Elegí server');
  try{toast('Actualizando plugins...');const d=await api(`/api/servers/${selectedServer}/plugins/update`,{method:'POST',body:JSON.stringify({})});const count=d.result.filter(x=>x.updated).length;toast(`${count} plugins actualizados ✅`);loadInstalledPlugins();}
  catch(e){alert(e.message)}
}

// ===== Editor visual de server.properties =====
async function loadProperties(){
  if(!selectedServer)return;
  try{
    const d=await api(`/api/servers/${selectedServer}/properties`);
    $('propertiesForm').innerHTML=d.fields.map(f=>{
      const v=d.values[f.key]??'';
      if(['online-mode','white-list','pvp','enable-command-block'].includes(f.key)){
        return `<label class="card"><b>${f.label}</b><select data-prop="${f.key}"><option value="true" ${v==='true'?'selected':''}>true</option><option value="false" ${v==='false'?'selected':''}>false</option></select><small>${f.key}</small></label>`;
      }
      if(f.key==='difficulty'){
        return `<label class="card"><b>${f.label}</b><select data-prop="${f.key}">${['peaceful','easy','normal','hard'].map(x=>`<option ${v===x?'selected':''}>${x}</option>`).join('')}</select><small>${f.key}</small></label>`;
      }
      if(f.key==='gamemode'){
        return `<label class="card"><b>${f.label}</b><select data-prop="${f.key}">${['survival','creative','adventure','spectator'].map(x=>`<option ${v===x?'selected':''}>${x}</option>`).join('')}</select><small>${f.key}</small></label>`;
      }
      return `<label class="card"><b>${f.label}</b><input data-prop="${f.key}" value="${String(v).replace(/"/g,'&quot;')}"><small>${f.key}</small></label>`;
    }).join('');
  }catch(e){$('propertiesForm').innerHTML=`<div class="card">${e.message}</div>`}
}
async function saveProperties(){
  if(!selectedServer)return alert('Elegí server');
  const values={};document.querySelectorAll('[data-prop]').forEach(el=>values[el.dataset.prop]=el.value);
  try{await api(`/api/servers/${selectedServer}/properties`,{method:'POST',body:JSON.stringify({values})});toast('server.properties guardado ✅ Reiniciá el server');}
  catch(e){alert(e.message)}
}

// ===== Logs inteligentes =====
async function loadLogInsights(){
  if(!selectedServer)return;
  try{const d=await api(`/api/servers/${selectedServer}/log-insights`);$('logInsightsBox').innerHTML=d.issues.map(i=>`<div class="card insight ${i.level}"><h3>${i.level==='ok'?'✅':i.level==='warning'?'⚠️':'❌'} ${i.title}</h3><p>${i.detail}</p><pre>${i.fix}</pre></div>`).join('')||'<div class="card">Todavía no detecté problemas en los logs.</div>'}catch(e){alert(e.message)}
}

// ===== Añadir archivos =====
async function uploadFile(ev){
  ev.preventDefault();
  if(!selectedServer)return alert('Elegí server');
  const file=$('uploadFileInput').files[0]; if(!file)return alert('Elegí un archivo');
  const fd=new FormData(); fd.append('file',file); fd.append('destDir',$('uploadDest').value||'');
  try{const r=await fetch(`/api/servers/${selectedServer}/upload-file`,{method:'POST',body:fd});const d=await r.json();if(!r.ok||d.ok===false)throw new Error(d.error||'Error');toast('Archivo añadido ✅');loadFiles($('uploadDest').value||'');}
  catch(e){alert(e.message)}
}
async function createFolder(){
  if(!selectedServer)return alert('Elegí server');
  try{await api(`/api/servers/${selectedServer}/folder`,{method:'POST',body:JSON.stringify({path:$('newFolderPath').value})});toast('Carpeta creada ✅');loadFiles('');}
  catch(e){alert(e.message)}
}

const _oldRefreshAll = refreshAll;
refreshAll = async function(){
  try{await _oldRefreshAll(); await loadPacks(); await loadInstalledPlugins(); await loadProperties(); await loadLogInsights();}
  catch(e){console.warn(e)}
}
