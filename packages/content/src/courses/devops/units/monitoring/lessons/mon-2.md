---
id: mon-2
slug: mon-2
title: Logging con ELK y Loki
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 65
---

# Logging con ELK y Loki

Centralizar logs. Elasticsearch, Fluentd, Kibana vs Grafana Loki.

## ELK Stack

**ELK** = Elasticsearch + Logstash/Fluentd + Kibana.

- **Elasticsearch**: motor de búsqueda y analítica
- **Logstash** o **Fluentd**: collector que parsea y envía
- **Kibana**: visualización

### Fluentd como DaemonSet en K8s

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch.logging.svc.cluster.local"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

### Structured logging (lo más importante)

En lugar de:

```
Connection failed: timeout after 5s
```

Usa JSON:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "error",
  "service": "checkout",
  "trace_id": "abc123",
  "message": "Payment gateway timeout",
  "duration_ms": 5000,
  "error": "TimeoutError",
  "user_id": "u_42"
}
```

**En Node.js** con pino:

```javascript
const logger = require('pino')()
logger.info({ orderId: 123, total: 99.99 }, 'Order created')
```

**En Python**:

```python
import structlog
logger = structlog.get_logger()
logger.info("order_created", order_id=123, total=99.99)
```

## Grafana Loki

**Loki** es como Prometheus pero para logs. Indexa solo labels (no el contenido), más barato que ELK.

```yaml
# promtail config (envía logs a Loki)
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/*.log
```

### LogQL - query language

```
{job="myapp"} |= "error" | json | duration > 1000
{namespace="prod"} |~ "OutOfMemory|Error"
sum by (level) (count_over_time({job="myapp"}[5m]))
```

### ELK vs Loki

| ELK | Loki |
|-----|------|
| Más maduro, más features | Más simple, más barato |
| Indexa contenido (caro) | Indexa solo labels (barato) |
| Excelente para búsqueda full-text | Mejor para queries agregadas |
| Stack pesado | Stack ligero, integra con Grafana |

Para empezar: **Loki + Grafana**. Para búsqueda full-text: **ELK**.

## Puntos clave

- ELK (Elasticsearch + Logstash + Kibana) es el stack clásico. Loki es más simple/barato.
- Structured logging (JSON) es crítico para querying. Incluye trace_id en cada log.
- DaemonSet de Fluentd/Promtail recolecta logs de todos los nodos.
- LogQL (Loki) o KQL (Kibana) permiten queries poderosas sobre logs.

:::quiz
[
  {
    "question": "Por que logs en JSON estructurado?",
    "options": ["Ocupan menos", "Se pueden filtrar/agregar por campos en queries", "Se ven bonitos", "No hay motivo"],
    "correctIndex": 1,
    "explanation": "Campos parseados (level, trace_id) permiten buscar y agregar sin regex heroicas."
  },
  {
    "question": "Que campo debes incluir en cada log?",
    "options": ["El clima", "trace_id para correlacionar con traces", "El hostname dos veces", "Nada"],
    "correctIndex": 1,
    "explanation": "El trace_id une logs de varios servicios en una sola historia."
  },
  {
    "question": "Como recolectas logs de todos los nodos K8s?",
    "options": ["A mano por SSH", "DaemonSet de Fluentd/Promtail en cada nodo", "No se puede", "Con ping"],
    "correctIndex": 1,
    "explanation": "Un agente por nodo envia al backend central (Loki/ELK)."
  }
]
:::
