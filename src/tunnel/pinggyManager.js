const { spawn } = require('child_process');
const { parsePinggyOutput } = require('./tunnelParser');
const tunnels = new Map();
function startPinggy(serverId, localPort=25565) {
  if (tunnels.has(serverId)) return tunnels.get(serverId).publicAddress || 'Iniciando...';
  const args = ['-o','StrictHostKeyChecking=no','-o','ServerAliveInterval=30','-p','443',`-R0:localhost:${localPort}`,'tcp@a.pinggy.io'];
  const child = spawn('ssh', args, { shell:false, stdio:['ignore','pipe','pipe'] });
  const state = { child, logs: [], publicAddress: null, startedAt: Date.now(), localPort };
  tunnels.set(serverId, state);
  const onData = (d) => {
    const txt = d.toString();
    state.logs.push(txt); if (state.logs.length > 100) state.logs.shift();
    const addr = parsePinggyOutput(txt);
    if (addr) state.publicAddress = addr;
  };
  child.stdout.on('data', onData); child.stderr.on('data', onData);
  child.on('close', () => tunnels.delete(serverId));
  return 'Iniciando túnel Pinggy...';
}
function stopPinggy(serverId) { const s=tunnels.get(serverId); if(!s) return false; s.child.kill('SIGTERM'); tunnels.delete(serverId); return true; }
function getTunnel(serverId) { const s=tunnels.get(serverId); if(!s) return null; return { publicAddress:s.publicAddress, localPort:s.localPort, logs:s.logs.join('\n'), startedAt:s.startedAt }; }
module.exports = { startPinggy, stopPinggy, getTunnel };
