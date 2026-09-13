---
id: cicd-2
slug: cicd-2
title: Pipeline patterns: blue-green, canary, rolling
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 65
---

# Pipeline patterns: blue-green, canary, rolling

Estrategias de deploy sin downtime. Cómo reducir el riesgo de releases.

## Estrategias de deploy

### Recreate

Para todo. Apaga V1, levanta V2. **Downtime** = duración del deploy.

```yaml
strategy:
  type: Recreate
```

### Rolling Update (default en K8s)

Reemplaza pods gradualmente. Sin downtime pero con mezcla de V1 y V2.

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%        # cuántos pods extra durante el deploy
    maxUnavailable: 0    # cero downtime estricto
```

### Blue-Green

Dos ambientes idénticos. Switch instantáneo de tráfico.

```
[Users] → [Load Balancer] → [Blue (V1)] ← switch → [Green (V2)]
```

- **Ventaja**: rollback instantáneo, test en prod con tráfico real
- **Desventaja**: doble costo de infraestructura

### Canary

Deploy gradual: 1% → 10% → 50% → 100% del tráfico.

```
[Users] → [90% V1] + [10% V2] → métricas OK → [50/50] → [0% V1, 100% V2]
```

- **Ventaja**: riesgo mínimo, se detecta problema con poco impacto
- **Desventaja**: requiere buen monitoring

### Feature Flags

Activa features por usuario, %, sin redeploy.

Herramientas: LaunchDarkly, Unleash, Flagsmith, Flipt.

## Implementaciones en K8s

### Blue-Green con Services

```yaml
# 1. Deploy v2 (green)
kubectl apply -f deployment-v2.yaml

# 2. Esperar que esté listo
kubectl rollout status deployment/mi-app-v2

# 3. Switch el Service al nuevo selector
kubectl patch service mi-app -p '{"spec":{"selector":{"version":"v2"}}}'

# 4. Si falla, rollback
kubectl patch service mi-app -p '{"spec":{"selector":{"version":"v1"}}}'
```

### Canary con Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: mi-app
spec:
  replicas: 5
  strategy:
    canary:
      steps:
      - setWeight: 10
      - pause: { duration: 5m }
      - setWeight: 30
      - pause: { duration: 5m }
      - setWeight: 50
      - pause: { duration: 5m }
  selector:
    matchLabels:
      app: mi-app
  template:
    metadata:
      labels:
        app: mi-app
    spec:
      containers:
      - name: web
        image: mi-app:1.0
```

### Flagger (automated canary)

Flagger automatiza análisis de métricas durante canary:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: mi-app
spec:
  provider: kubernetes
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mi-app
  metrics:
  - name: request-success-rate
    thresholdRange:
      min: 99
  - name: request-duration
    thresholdRange:
      max: 500
  canaryAnalysis:
    interval: 30s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
```

Si las métricas empeoran, Flagger hace rollback automático.

## Puntos clave

- Recreate: downtime. Rolling: default K8s, sin downtime pero mezcla versiones.
- Blue-Green: switch instantáneo, doble costo. Canary: gradual, menor riesgo.
- Feature flags: activar features sin redeploy.
- Argo Rollouts y Flagger automatizan canary en K8s con análisis de métricas.

:::quiz
[
  {
    "question": "Blue-Green frente a Canary: cual es el trueque?",
    "options": ["Blue-Green es gradual", "Blue-Green: switch instantaneo con doble costo; Canary: gradual con menor riesgo", "Canary necesita doble infraestructura siempre", "Son lo mismo"],
    "correctIndex": 1,
    "explanation": "Blue-Green conmuta todo de golpe (rollback instantaneo, 2x costo). Canary expone % creciente y mide."
  },
  {
    "question": "Que permiten los feature flags?",
    "options": ["Deploy mas rapido", "Activar features sin redeploy y matarlas si fallan", "Menos tests", "Mas servidores"],
    "correctIndex": 1,
    "explanation": "Separan deploy de release: el codigo llega apagado y se enciende por configuracion."
  },
  {
    "question": "Que automatizan Argo Rollouts y Flagger?",
    "options": ["Backups", "Canary en K8s con analisis de metricas y rollback automatico", "DNS", "Certificados"],
    "correctIndex": 1,
    "explanation": "Progresan el porcentaje observando metricas (errores, latencia) y revierten solas si degradan."
  }
]
:::
