---
id: lab-docker-monitor
title: Docker Container Monitor: detecta unhealthy y reinicia
module: devops
difficulty: medio
estimatedMinutes: 5
xp: 150
---

# Docker Container Monitor: detecta unhealthy y reinicia

**Objetivo**: Crear un monitor en Python usando el Docker SDK que detecte containers con healthcheck "unhealthy" o stopped inesperadamente, los reinicie automaticamente, y emita alertas a Slack. Debe correr 24/7 como daemon.
