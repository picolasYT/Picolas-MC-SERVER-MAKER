const fs = require('fs');
const path = require('path');

const FIELDS = [
  ['motd', 'Nombre/MOTD'],
  ['max-players', 'Máximo jugadores'],
  ['server-port', 'Puerto'],
  ['online-mode', 'Cracked desactivado / Premium'],
  ['white-list', 'Whitelist'],
  ['difficulty', 'Dificultad'],
  ['gamemode', 'Modo de juego'],
  ['pvp', 'PvP'],
  ['view-distance', 'Distancia de visión'],
  ['simulation-distance', 'Distancia de simulación'],
  ['spawn-protection', 'Protección spawn'],
  ['enable-command-block', 'Command blocks']
];

function propPath(serverPath) { return path.join(serverPath, 'server.properties'); }
function parseProperties(content) {
  const data = {};
  content.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) return;
    const i = line.indexOf('=');
    data[line.slice(0, i)] = line.slice(i + 1);
  });
  return data;
}
function stringifyProperties(original, updates) {
  const seen = new Set();
  const lines = original.split(/\r?\n/).map(line => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) return line;
    const i = line.indexOf('=');
    const key = line.slice(0, i);
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`);
  }
  return lines.join('\n');
}
function getProperties(serverPath) {
  const f = propPath(serverPath);
  if (!fs.existsSync(f)) throw new Error('No existe server.properties');
  const content = fs.readFileSync(f, 'utf8');
  return { raw: content, values: parseProperties(content), fields: FIELDS.map(([key, label]) => ({ key, label })) };
}
function saveProperties(serverPath, values) {
  const f = propPath(serverPath);
  const original = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  fs.writeFileSync(f, stringifyProperties(original, values));
  return getProperties(serverPath);
}
module.exports = { getProperties, saveProperties, parseProperties };
