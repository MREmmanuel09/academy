---
id: mon-1
slug: mon-1
title: Monitoring, métricas y observabilidad
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Monitoring, métricas y observabilidad

Las 3 señales (logs, metrics, traces). Prometheus, Grafana, ELK.

## Las 3 señales

**Observabilidad** = entender qué pasa en tu sistema desde sus outputs.

### Las tres señales (three pillars)

**1. Metrics (métricas)**
- Valores numéricos agregados a lo largo del tiempo
- Cardinalidad baja (CPU, memoria, request count, latency)
- Ideales para alertas
- Ej: Prometheus, Datadog, CloudWatch

**2. Logs (registros)**
- Eventos discretos con timestamp
- Alta cardinalidad, gran volumen
- Para debugging profundo
- Ej: ELK Stack, Loki, Splunk, CloudWatch Logs

**3. Traces (trazas)**
- Camino de un request a través de servicios
- Visualiza latencia por hop
- Para microservicios
- Ej: Jaeger, Zipkin, Tempo, Datadog APM

### RED Method (para servicios)

- **R**ate: requests/segundo
- **E**rrors: tasa de errores
- **D**uration: latencia

### USE Method (para recursos)

- **U**tilization: % tiempo busy
- **S**aturation: cola / backlog
- **E**rrors: tasa de errores

## Prometheus + Grafana

**Prometheus** es la base de datos de métricas open source más usada en cloud-native.

### Arquitectura

```
[App] → /metrics endpoint
   ↓ scrape
[Prometheus] → query
   ↓
[Grafana] → dashboard
   ↓
[Alertmanager] → Slack/PagerDuty
```

### Prometheus config

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['my-app:8080']
  
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### PromQL - query language

```promql
# CPU usage promedio últimos 5min
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Request rate
rate(http_requests_total[5m])

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# p99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
```

### Grafana dashboards

- Conectar Grafana a Prometheus como data source
- Importar dashboards comunitarios ([grafana.com/dashboards](https://grafana.com/dashboards))
- Para Node.js: dashboard 11159
- Para Kubernetes: dashboard 315
- Para Nginx: dashboard 12708

### Alertas

```yaml
# alerts.yml
groups:
- name: app
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) 
      / 
      sum(rate(http_requests_total[5m])) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error rate above 5%"
      description: "Current rate: {{ $value | humanizePercentage }}"
```

## Puntos clave

- 3 pilares: metrics (agregados), logs (eventos), traces (request path).
- RED para servicios (Rate, Errors, Duration). USE para recursos (Utilization, Saturation, Errors).
- Prometheus + Grafana es el stack open source estándar. PromQL queries métricas.
- Alertas con Alertmanager van a Slack, PagerDuty, email.

:::quiz
[
  {
    "question": "RED frente a USE?",
    "options": ["Iguales", "RED = servicios (Rate, Errors, Duration); USE = recursos (Utilization, Saturation, Errors)", "RED es solo hardware", "USE es solo codigo"],
    "correctIndex": 1,
    "explanation": "RED mira desde el usuario; USE desde la maquina. Juntas cubren todo."
  },
  {
    "question": "Stack open source estandar de metricas?",
    "options": ["ELK", "Prometheus + Grafana con PromQL", "Nagios solo", "Excel"],
    "correctIndex": 1,
    "explanation": "Prometheus raspa y guarda series; Grafana visualiza; Alertmanager enruta."
  },
  {
    "question": "Donde van las alertas?",
    "options": ["A /dev/null", "A Slack, PagerDuty o email segun severidad y horario", "Siempre a todos", "Por carta"],
    "correctIndex": 1,
    "explanation": "Enrutado por severidad evita fatiga: lo critico despierta, lo menor espera."
  }
]
:::
