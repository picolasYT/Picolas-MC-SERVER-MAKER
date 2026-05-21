function analyzeLogs(logs = []) {
  const text = logs.join('\n');
  const issues = [];
  const add = (level, title, detail, fix) => issues.push({ level, title, detail, fix });
  if (/requires running the server with Java 17|UnsupportedClassVersionError|java\.lang\.UnsupportedClassVersionError/i.test(text)) {
    add('error', 'Java viejo o incompatible', 'Tu versión de Minecraft necesita Java 17 o superior.', 'En Codespaces: sudo apt update && sudo apt install -y openjdk-21-jdk');
  }
  if (/You need to agree to the EULA|eula\.txt/i.test(text)) {
    add('error', 'EULA no aceptada', 'El servidor no arranca porque eula.txt no tiene eula=true.', 'Desde el panel aceptá EULA o editá eula.txt y poné eula=true.');
  }
  if (/Address already in use|BindException/i.test(text)) {
    add('error', 'Puerto ocupado', 'Otro proceso ya está usando el puerto del servidor.', 'Cambiá server-port en server.properties o cerrá el otro server.');
  }
  if (/OutOfMemoryError|Java heap space/i.test(text)) {
    add('error', 'Falta RAM', 'El servidor se quedó sin memoria.', 'Subí la RAM o bajá view-distance/simulation-distance.');
  }
  if (/can't keep up|Is the server overloaded/i.test(text)) {
    add('warning', 'Lag detectado', 'Minecraft avisó que el servidor no está siguiendo el ritmo.', 'Usá Optimizar servidor, bajá view-distance y sacá plugins pesados.');
  }
  if (/Failed to load plugin|Could not load plugin|Invalid plugin.yml/i.test(text)) {
    add('warning', 'Plugin incompatible o roto', 'Hay un plugin que no pudo cargar.', 'Actualizá plugins o eliminá el .jar problemático desde Archivos.');
  }
  if (/Done \([0-9.,]+s\)! For help/i.test(text)) {
    add('ok', 'Servidor iniciado correctamente', 'El server terminó de cargar.', 'Ya podés copiar la IP pública y entrar.');
  }
  return issues;
}
module.exports = { analyzeLogs };
