# Picolas-Mc-Server Pinggy

Panel local para crear servidores Minecraft y publicarlos con Pinggy.io usando SSH reverse tunnel.

## Iniciar

```bash
node server.js
```

El servidor instala dependencias faltantes automáticamente.

En Codespaces abrí el puerto `3000` desde la pestaña **Ports**.

## Java recomendado

Para Minecraft moderno:

```bash
sudo apt update
sudo apt install -y openjdk-21-jdk
java -version
```

## Pinggy

Pinggy no necesita instalar cliente aparte. Usa SSH:

```bash
ssh -p 443 -R0:localhost:25565 tcp@a.pinggy.io
```

El panel puede iniciar ese túnel desde el botón **Iniciar Pinggy**.

La dirección para Minecraft es algo como:

```txt
xxxx.a.pinggy.link:12345
```

Sin `tcp://`.
