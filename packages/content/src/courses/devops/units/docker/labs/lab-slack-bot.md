---
id: lab-slack-bot
title: Slack Alerting Bot con FastAPI + webhooks Prometheus
module: devops
difficulty: dificil
estimatedMinutes: 5
xp: 200
---

# Slack Alerting Bot con FastAPI + webhooks Prometheus

**Objetivo**: Construir un sistema completo: un bot de Slack que recibe webhooks de Alertmanager (Prometheus), formatea las alertas con contexto enriquecido, las postea en canales segun severity, y expone un endpoint /health para monitoring. Incluye tests con pytest.
