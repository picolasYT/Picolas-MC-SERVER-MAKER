const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const safeName = require('../utils/safeName');
const { buildProperties } = require('./propertiesBuilder');
const { downloadServerJar } = require('./jarDownloader');

const running = new Map();

function createServer(root, cfg) {
  const id = safeName(cfg.name);
  const serverPath = path.join(root, 'servers', id);
  if (fs.existsSync(serverPath)) throw new Error('Ese servidor ya existe');
  fs.mkdirSync(path.join(serverPath, 'plugins'), { recursive: true });
  fs.mkdirSync(path.join(serverPath, 'logs'), { recursive: true });
  fs.writeFileSync(path.join(serverPath, 'eula.txt'), cfg.eula ? 'eula=true\n' : 'eula=false\n');
  fs.writeFileSync(path.join(serverPath, 'server.properties'), buildProperties({ ...cfg, name: id }));
  fs.writeFileSync(path.join(serverPath, 'server-info.json'), JSON.stringify({ ...cfg, id, path: `servers/${id}` }, null, 2));
  fs.writeFileSync(path.join(serverPath, 'LEEME.txt'), 'Si no usaste Paper automático, poné tu server.jar acá con el nombre server.jar\n');
  return { id, path: `servers/${id}`, absolutePath: serverPath };
}

async function ensureJar(root, server) {
  const jar = path.join(root, server.path, 'server.jar');
  if (fs.existsSync(jar)) return { ok: true, existing: true };
  return await downloadServerJar(server.type, server.version, jar);
}

function startServer(root, server) {
  if (running.has(server.id)) throw new Error('El servidor ya está iniciado');
  const serverPath = path.join(root, server.path);
  const jar = path.join(serverPath, 'server.jar');
  if (!fs.existsSync(jar)) throw new Error('Falta server.jar. Descargá Paper o subí el jar manualmente.');
  const ram = Number(server.ram || 2048);
  const child = spawn('java', [`-Xmx${ram}M`, `-Xms${Math.min(512, ram)}M`, '-jar', 'server.jar', 'nogui'], {
    cwd: serverPath,
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const state = { child, logs: [], players: new Map(), startedAt: Date.now(), pid: child.pid };
  running.set(server.id, state);
  const addLog = (txt) => {
    String(txt).split(/\r?\n/).filter(Boolean).forEach(line => {
      state.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
      if (state.logs.length > 500) state.logs.shift();
      const join = line.match(/INFO\]: (.+) joined the game/);
      if (join) state.players.set(join[1], { name: join[1], status:'online', joinedAt: Date.now(), ip:'N/D' });
      const left = line.match(/INFO\]: (.+) left the game/);
      if (left && state.players.has(left[1])) state.players.delete(left[1]);
    });
  };
  child.stdout.on('data', d => addLog(d.toString()));
  child.stderr.on('data', d => addLog(d.toString()));
  child.on('close', code => { addLog(`Servidor cerrado con código ${code}`); running.delete(server.id); });
  return { pid: child.pid };
}
function stopServer(id) { const s=running.get(id); if(!s) throw new Error('No está iniciado'); s.child.stdin.write('stop\n'); return true; }
function sendCommand(id, cmd) { const s=running.get(id); if(!s) throw new Error('No está iniciado'); s.child.stdin.write(String(cmd).replace(/^\//,'')+'\n'); return true; }
function getState(id) { const s=running.get(id); if(!s) return null; return { logs:s.logs, players:[...s.players.values()], startedAt:s.startedAt, pid:s.pid }; }
function isRunning(id) { return running.has(id); }
module.exports = { createServer, ensureJar, startServer, stopServer, sendCommand, getState, isRunning };
