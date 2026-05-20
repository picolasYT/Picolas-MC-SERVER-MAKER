function buildProperties(cfg) {
  return [
    `server-port=${cfg.port || 25565}`,
    `online-mode=${cfg.cracked ? 'false' : 'true'}`,
    `motd=${cfg.description || cfg.name || 'Picolas-Mc-Server'}`,
    `max-players=${cfg.maxPlayers || 20}`,
    `white-list=${cfg.whitelist ? 'true' : 'false'}`,
    `difficulty=${cfg.difficulty || 'normal'}`,
    `gamemode=${cfg.gamemode || 'survival'}`,
    'enable-command-block=false',
    'spawn-protection=0',
    'view-distance=8',
    'simulation-distance=6'
  ].join('\n') + '\n';
}
module.exports = { buildProperties };
