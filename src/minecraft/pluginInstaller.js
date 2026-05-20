const path = require('path');
const fs = require('fs');
const { download } = require('./jarDownloader');
async function installPlugin(serverPath, plugin) {
  if (!plugin.url || !plugin.url.startsWith('http')) throw new Error('Plugin sin URL válida');
  const safe = plugin.name.replace(/[^a-zA-Z0-9-_]/g, '') || 'plugin';
  const dest = path.join(serverPath, 'plugins', `${safe}.jar`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await download(plugin.url, dest);
  return dest;
}
module.exports = { installPlugin };
