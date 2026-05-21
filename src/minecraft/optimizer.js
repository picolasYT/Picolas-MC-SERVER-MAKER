const fs = require('fs');
const path = require('path');

const OPTIMIZED_PROPERTIES = {
  'view-distance': '5',
  'simulation-distance': '4',
  'max-players': '10',
  'spawn-protection': '0',
  'network-compression-threshold': '256',
  'sync-chunk-writes': 'false',
  'enable-command-block': 'false',
  'entity-broadcast-range-percentage': '70'
};

function parseProperties(text) {
  const map = new Map();
  const order = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.trim().startsWith('#') || !line.includes('=')) {
      order.push({ type: 'raw', value: line });
      continue;
    }
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
    order.push({ type: 'kv', key });
  }
  return { map, order };
}

function stringifyProperties(parsed) {
  const used = new Set();
  const lines = [];
  for (const item of parsed.order) {
    if (item.type === 'raw') {
      lines.push(item.value);
    } else if (parsed.map.has(item.key)) {
      lines.push(`${item.key}=${parsed.map.get(item.key)}`);
      used.add(item.key);
    }
  }
  for (const [key, value] of parsed.map.entries()) {
    if (!used.has(key)) lines.push(`${key}=${value}`);
  }
  return lines.join('\n') + '\n';
}

function optimizeServer(serverPath) {
  const file = path.join(serverPath, 'server.properties');
  if (!fs.existsSync(file)) throw new Error('No existe server.properties');
  const original = fs.readFileSync(file, 'utf8');
  const parsed = parseProperties(original);
  const changes = [];
  for (const [key, value] of Object.entries(OPTIMIZED_PROPERTIES)) {
    const before = parsed.map.get(key);
    if (before !== value) changes.push({ key, before: before ?? '(no existía)', after: value });
    parsed.map.set(key, value);
  }
  fs.writeFileSync(file, stringifyProperties(parsed));
  return { ok: true, changes };
}

module.exports = { optimizeServer, OPTIMIZED_PROPERTIES };
