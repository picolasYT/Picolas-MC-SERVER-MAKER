const si = require('systeminformation');
async function getStats(pid) {
  const [cpu, mem, fsSize, processes] = await Promise.all([si.currentLoad(), si.mem(), si.fsSize(), si.processes()]);
  const proc = pid ? processes.list.find(p => p.pid === pid) : null;
  return {
    cpuLoad: Math.round(cpu.currentLoad),
    ramUsedMb: Math.round(mem.used / 1024 / 1024),
    ramTotalMb: Math.round(mem.total / 1024 / 1024),
    disk: fsSize.map(d => ({ fs:d.fs, usedGb:Math.round(d.used/1024/1024/1024), sizeGb:Math.round(d.size/1024/1024/1024), use:d.use })),
    process: proc ? { pid: proc.pid, cpu: proc.cpu, mem: proc.mem, name: proc.name } : null
  };
}
module.exports = { getStats };
