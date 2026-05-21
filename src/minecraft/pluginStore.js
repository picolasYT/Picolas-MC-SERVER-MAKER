const fs = require('fs');
const path = require('path');
const https = require('https');
const { download } = require('./jarDownloader');

const USER_AGENT = 'Picolas-Mc-Server/1.0 (Minecraft server panel)';

function httpJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 180)}`));
        }
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function safeFileName(name) {
  return String(name || 'plugin.jar').replace(/[^a-zA-Z0-9._-]/g, '-');
}

function installedFile(serverPath) {
  return path.join(serverPath, 'installed-plugins.json');
}

function readInstalled(serverPath) {
  const f = installedFile(serverPath);
  if (!fs.existsSync(f)) return [];
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return []; }
}

function writeInstalled(serverPath, data) {
  fs.writeFileSync(installedFile(serverPath), JSON.stringify(data, null, 2));
}

async function searchPlugins(query = '', limit = 18) {
  const facets = encodeURIComponent(JSON.stringify([["project_type:plugin"], ["categories:paper"]]));
  const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=${Number(limit) || 18}&facets=${facets}&index=relevance`;
  const data = await httpJson(url);
  return (data.hits || []).map(p => ({
    source: 'modrinth',
    projectId: p.project_id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    downloads: p.downloads || 0,
    follows: p.follows || 0,
    iconUrl: p.icon_url,
    categories: p.categories || [],
    versions: p.versions || [],
    url: `https://modrinth.com/plugin/${p.slug}`
  }));
}

async function getProjectVersions(projectId, gameVersion) {
  const loaders = encodeURIComponent(JSON.stringify(['paper']));
  const versions = encodeURIComponent(JSON.stringify([gameVersion]));
  let url = `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?loaders=${loaders}&game_versions=${versions}`;
  let data = await httpJson(url);
  if (!Array.isArray(data) || data.length === 0) {
    url = `https://api.modrinth.com/v2/project/${encodeURIComponent(projectId)}/version?loaders=${loaders}`;
    data = await httpJson(url);
  }
  return Array.isArray(data) ? data : [];
}

function pickJarFile(version) {
  if (!version || !Array.isArray(version.files)) return null;
  return version.files.find(f => f.primary && String(f.filename).endsWith('.jar')) || version.files.find(f => String(f.filename).endsWith('.jar')) || version.files[0];
}

async function installStorePlugin(root, server, plugin) {
  const serverPath = path.join(root, server.path);
  const pluginDir = path.join(serverPath, 'plugins');
  fs.mkdirSync(pluginDir, { recursive: true });
  const projectId = plugin.projectId || plugin.project_id || plugin.id;
  if (!projectId) throw new Error('No llegó el projectId del plugin');
  const versions = await getProjectVersions(projectId, server.version);
  if (!versions.length) throw new Error('No encontré una versión Paper compatible para este plugin');
  const version = versions[0];
  const file = pickJarFile(version);
  if (!file?.url) throw new Error('El plugin no tiene archivo .jar descargable');
  const dest = path.join(pluginDir, safeFileName(file.filename || `${plugin.title || projectId}.jar`));
  await download(file.url, dest);

  const installed = readInstalled(serverPath).filter(p => p.projectId !== projectId);
  installed.push({
    source: 'modrinth',
    projectId,
    slug: plugin.slug || '',
    title: plugin.title || version.name || projectId,
    versionId: version.id,
    versionNumber: version.version_number,
    gameVersions: version.game_versions || [],
    loaders: version.loaders || [],
    fileName: path.basename(dest),
    fileUrl: file.url,
    installedAt: new Date().toISOString()
  });
  writeInstalled(serverPath, installed);
  return { fileName: path.basename(dest), version: version.version_number, installed };
}

async function listInstalledPlugins(root, server) {
  const serverPath = path.join(root, server.path);
  const pluginDir = path.join(serverPath, 'plugins');
  fs.mkdirSync(pluginDir, { recursive: true });
  const tracked = readInstalled(serverPath);
  const jars = fs.readdirSync(pluginDir).filter(f => f.toLowerCase().endsWith('.jar'));
  const trackedByFile = new Map(tracked.map(p => [p.fileName, p]));
  return jars.map(fileName => ({ fileName, tracked: trackedByFile.get(fileName) || null }));
}

async function updatePlugin(root, server, projectId = null) {
  const serverPath = path.join(root, server.path);
  const installed = readInstalled(serverPath);
  const targets = projectId ? installed.filter(p => p.projectId === projectId) : installed;
  const results = [];
  for (const item of targets) {
    const versions = await getProjectVersions(item.projectId, server.version);
    if (!versions.length) { results.push({ title: item.title, skipped: true, reason: 'Sin versiones compatibles' }); continue; }
    const latest = versions[0];
    if (latest.id === item.versionId) { results.push({ title: item.title, updated: false, current: item.versionNumber }); continue; }
    const file = pickJarFile(latest);
    if (!file?.url) { results.push({ title: item.title, skipped: true, reason: 'Sin jar' }); continue; }
    const pluginDir = path.join(serverPath, 'plugins');
    const dest = path.join(pluginDir, safeFileName(file.filename));
    await download(file.url, dest);
    if (item.fileName && item.fileName !== path.basename(dest)) {
      const old = path.join(pluginDir, item.fileName);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    item.versionId = latest.id;
    item.versionNumber = latest.version_number;
    item.fileName = path.basename(dest);
    item.fileUrl = file.url;
    item.updatedAt = new Date().toISOString();
    results.push({ title: item.title, updated: true, version: latest.version_number });
  }
  writeInstalled(serverPath, installed);
  return results;
}

async function installPack(root, server, pack) {
  const results = [];
  for (const q of pack.plugins || []) {
    try {
      const found = await searchPlugins(q, 5);
      const exact = found.find(p => p.title.toLowerCase() === q.toLowerCase() || p.slug.toLowerCase() === q.toLowerCase()) || found[0];
      if (!exact) { results.push({ name: q, ok: false, error: 'No encontrado' }); continue; }
      const installed = await installStorePlugin(root, server, exact);
      results.push({ name: q, ok: true, installed: installed.fileName });
    } catch (e) {
      results.push({ name: q, ok: false, error: e.message });
    }
  }
  return results;
}

module.exports = { searchPlugins, installStorePlugin, listInstalledPlugins, updatePlugin, installPack };
