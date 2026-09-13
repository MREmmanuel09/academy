---
id: mesh-1
slug: mesh-1
title: Service Mesh: Istio y Linkerd
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 90
---

# Service Mesh: Istio y Linkerd

Sidecars, mTLS, traffic management, observabilidad para microservicios.

## ¿Qué es Service Mesh?

Un **Service Mesh** abstrae la comunicación service-to-service en una capa de infraestructura. Cada servicio tiene un **sidecar proxy** (Envoy) que intercepta todo el tráfico.

### ¿Por qué?

En una arquitectura de microservicios, cada servicio necesita:
- mTLS (cifrado + auth)
- Retries, timeouts, circuit breakers
- Métricas, logs, traces
- Traffic shaping (canary, A/B)
- Authorization policies

Implementar esto en cada servicio es repetitivo. **Service mesh lo saca de la app**.

### Componentes

- **Data plane**: sidecars (Envoy) en cada pod
- **Control plane**: gestión de config (Istiod para Istio)
- **Ingress gateway**: entrada al mesh
- **Egress gateway**: salida del mesh

### Istio vs Linkerd

| Istio | Linkerd |
|-------|---------|
| Más features | Más simple, ligero |
| Más complejo de operar | Mejor para empezar |
| Envoy (CNCF) | Linkerd2-proxy (Rust) |
| WebAssembly extensions | Sin WASM |

## Istio traffic management

### Canary con VirtualService

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - destination:
        host: reviews
        subset: v2
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 75
    - destination:
        host: reviews
        subset: v2
      weight: 25
```

### DestinationRule

Define subsets (versiones) del servicio:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

### mTLS automático

Istio pone mTLS entre todos los servicios del mesh por default. Verificar:

```bash
istioctl authn tls-check helloworld.default.svc.cluster.local
```

## Puntos clave

- Service mesh abstrae service-to-service: sidecars interceptan tráfico.
- Istio = full-featured, Linkerd = ligero. Ambos usan sidecars.
- VirtualService + DestinationRule permiten canary, A/B, traffic shaping.
- mTLS automático entre servicios del mesh.

:::quiz
[
  {
    "question": "Que patron usan Istio y Linkerd para interceptar trafico?",
    "options": ["DaemonSet", "Sidecar junto a cada workload", "Replica del cluster", "VPN"],
    "correctIndex": 1,
    "explanation": "Un proxy sidecar por pod intercepta y gestiona todo el trafico del servicio."
  },
  {
    "question": "Con que recursos Istio hace un canary?",
    "options": ["Pod + Service", "VirtualService + DestinationRule", "Ingress solo", "ConfigMap"],
    "correctIndex": 1,
    "explanation": "VirtualService reparte porcentajes y DestinationRule define los subsets de version."
  },
  {
    "question": "Istio frente a Linkerd: cuando eliges cada uno?",
    "options": ["Son identicos", "Istio full-featured con mas control; Linkerd ligero y simple", "Linkerd solo para VMs", "Istio solo para AWS"],
    "correctIndex": 1,
    "explanation": "Istio ofrece traffic shaping avanzado; Linkerd prioriza simplicidad y bajo overhead."
  }
]
:::
