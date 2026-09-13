---
id: proj-python-monitoring
title: Build a complete monitoring system en Python
difficulty: senior
duration: 4 semanas
xp: 1000
---

# Build a complete monitoring system en Python

## Escenario

Una startup en crecimiento te contrata: tienen 50 servidores (mix de EC2, on-prem y containers) y necesitan un sistema de monitoring custom porque las soluciones SaaS (Datadog, New Relic) son demasiado caras ($2000/mes). Ya usan Prometheus para metricas pero necesitan alerting inteligente, dashboard custom, y reporteria automatica para el management. Tu mision: construir un sistema production-ready que reemplace (o complemente) la solucion actual.

## Meta

Disenar e implementar un backend Python completo que scrapea metricas custom, expone API REST con FastAPI, persiste datos historicos en SQLite/Postgres, renderiza un dashboard, y envia alertas contextuales a Slack. El sistema debe ser production-ready: testing, CI/CD, monitoring de si mismo, y documentacion.
