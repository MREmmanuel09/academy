---
id: obs-1
slug: obs-1
title: Observabilidad: OpenTelemetry, traces, logs
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 80
---

# Observabilidad: OpenTelemetry, traces, logs

Los tres pilares, OpenTelemetry, distributed tracing, SLI/SLO monitoring.

## OpenTelemetry: el estándar

**OpenTelemetry (OTel)** es el estándar CNCF para instrumentar apps. Unifica metrics, logs y traces bajo un solo SDK.

### Componentes

- **API**: interfaces para instrumentar (métricas, spans, logs)
- **SDK**: implementación (Go, Java, Python, JS, etc)
- **Collector**: recibe, procesa, exporta telemetría
- **Instrumentation libraries**: librerías que auto-instrumentan (HTTP clients, DB drivers, frameworks)

### Antes vs después

Antes: cada app usa librería propia (Prometheus client, Jaeger client, Datadog SDK). Vendor lock-in.

Con OTel: una sola API, cambias el backend sin tocar la app.

```javascript

import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('mi-app')
const span = tracer.startSpan('process-order')
span.setAttribute('order.id', orderId)
try {
  await processOrder(orderId)
  span.setStatus({ code: SpanStatusCode.OK })
} catch (e) {
  span.recordException(e)
  span.setStatus({ code: SpanStatusCode.ERROR })
} finally {
  span.end()
}
```

## Distributed tracing

Un **trace** sigue un request a través de todos los servicios. Cada servicio genera un **span**, los spans se vinculan con **trace_id**.

### W3C Trace Context

Header HTTP estandarizado:
- `traceparent: 00-{trace_id}-{span_id}-{flags}`
- `tracestate: vendor-specific`

Cuando service A llama a B, propaga el header. B crea un span hijo.

### Backends

- **Jaeger**: CNCF, popular
- **Zipkin**: Twitter, veterano
- **Tempo** (Grafana): cheap storage
- **Datadog APM**: SaaS
- **New Relic**: SaaS

### Ejemplo visual

```
[Trace abc123]  Total: 1.2s
├─ [api-gateway]  1.2s
│  ├─ [auth-service]  50ms
│  ├─ [user-service]  200ms
│  │  ├─ [postgres query]  100ms
│  └─ [order-service]  900ms
│     ├─ [payment-service]  400ms
│     │  └─ [stripe-api]  300ms
│     └─ [inventory-service]  200ms
```

Puedes ver exactamente dónde se fue el tiempo. El payment-service + stripe-api = 700ms, 60% del tiempo total. Aquí optimizar.

## Puntos clave

- OpenTelemetry es el estándar CNCF: un SDK, múltiples backends.
- Distributed tracing sigue un request a través de servicios con trace_id.
- Trace context se propaga via header HTTP (W3C standard).
- Spans permiten ver exactamente dónde se va la latencia.

:::quiz
[
  {
    "question": "Que es distributed tracing?",
    "options": ["Seguir IPs", "Seguir un request entre servicios con un trace_id comun", "Trazar cables", "Debugging con prints"],
    "correctIndex": 1,
    "explanation": "Un ID correlaciona los spans de cada servicio en una traza completa."
  },
  {
    "question": "Como viaja el contexto entre servicios?",
    "options": ["Por DNS", "En headers HTTP (estandar W3C Trace Context)", "Por email", "No viaja"],
    "correctIndex": 1,
    "explanation": "traceparent/tracestate propagan el contexto sin tocar el codigo de negocio."
  },
  {
    "question": "Que te dice un span?",
    "options": ["Nada util", "Donde se va la latencia: operacion, duracion y atributos", "Solo errores", "El costo"],
    "correctIndex": 1,
    "explanation": "Cada span mide su tramo: el mas largo suele ser tu cuello de botella."
  }
]
:::
