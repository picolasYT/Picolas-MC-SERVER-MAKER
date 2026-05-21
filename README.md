# Picolas-Mc-Server Pinggy Pro

Panel local para crear servidores Minecraft y publicarlos con Pinggy.io.

## Iniciar

```bash
node server.js
```

Abrí el puerto 3000 en Codespaces o entrá a `http://localhost:3000` si estás en tu PC.

## Nuevo en esta versión

- Botón **Optimizar servidor**: edita `server.properties` para mejorar rendimiento.
- Botón **Copiar IP pública**.
- Al crear servidor puede iniciar Minecraft y crear IP pública Pinggy automáticamente.
- Sección **Modo Codespaces** con recomendaciones seguras.

## Conectarse al server

Cuando Pinggy muestre algo tipo:

```txt
xxxx.a.pinggy.link:12345
```

En Minecraft entrás con esa dirección, sin `tcp://`.

## Codespaces

No incluye anti-idle. Para evitar cortes, aumentá el timeout oficial:

```txt
GitHub → Settings → Codespaces → Default idle timeout → 240 minutes
```

Para 24/7 real, usá una PC propia, VPS o hosting.
