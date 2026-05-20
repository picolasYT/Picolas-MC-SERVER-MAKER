const fs = require('fs');
const path = require('path');
const https = require('https');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      if ([301,302,303,307,308].includes(res.statusCode)) {
        file.close(); fs.unlink(dest, () => {});
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} descargando ${url}`));
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { file.close(); fs.unlink(dest, () => {}); reject(err); });
  });
}

async function getPaperDownload(version) {
  const projectUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}`;
  const data = await new Promise((resolve, reject) => {
    https.get(projectUrl, res => {
      let body=''; res.on('data', d => body += d); res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
  const build = data.builds[data.builds.length - 1];
  const buildUrl = `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}`;
  const buildData = await new Promise((resolve, reject) => {
    https.get(buildUrl, res => {
      let body=''; res.on('data', d => body += d); res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
  const fileName = buildData.downloads.application.name;
  return `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${build}/downloads/${fileName}`;
}

async function downloadServerJar(type, version, dest) {
  if (type === 'paper') {
    const url = await getPaperDownload(version);
    await download(url, dest);
    return { ok: true, url };
  }
  throw new Error('Descarga automática disponible por ahora solo para Paper. Para Vanilla/Bedrock subí server.jar manualmente.');
}

module.exports = { download, downloadServerJar };
