---
id: chaos-1
slug: chaos-1
title: Chaos Engineering: probar que falla
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 70
---

# Chaos Engineering: probar que falla

Chaos Monkey, Litmus, Gremlin. Inyectar fallas para encontrar debilidades.

## ¿Por qué romper cosas?

**Chaos Engineering** = probar proactivamente que tu sistema falla de forma controlada, para encontrar debilidades **antes** que se conviertan en incidentes.

> "Si no pruebas tu sistema rompiéndolo, lo romperá un usuario en producción." — Chaos Engineering mantra

### Principios

1. **Build a hypothesis** about normal behavior
2. **Vary the real-world events** (pods kill, latency, network partition)
3. **Run experiments in production** (start small)
4. **Automate experiments** to run continuously
5. **Minimize blast radius** (start with 1% of traffic)

### Netflix's Simian Army

- **Chaos Monkey**: mata instancias EC2 aleatorias
- **Latency Monkey**: inyecta latencia en APIs
- **Conformity Monkey**: busca instancias fuera de compliance
- **Doctor Monkey**: detecta health issues
- **Janitor Monkey**: limpia recursos no usados
- **Security Monkey**: busca vulnerabilidades

Empezaron con Chaos Monkey en 2011. La mayoría de empresas de hyperscale tienen prácticas similares hoy.

## Herramientas modernas

### Litmus (CNCF, K8s-native)

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: nginx-chaos
spec:
  appType: stateful
  chaosServiceAccount: litmus-admin
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "30"
        - name: CHAOS_INTERVAL
          value: "10"
```

### Gremlin (SaaS)

UI web para diseñar "Game Days". Tipos de fallas:
- **Resource**: CPU, memoria, disco, I/O
- **Network**: latency, packet loss, blackhole
- **State**: shutdown, reboot, time travel
- **Process**: kill process

### ChaosBlade (Alibaba, open source)

CLI simple:
```bash
# Inyectar 2s de latencia entre redis y app
blade create k8s pod-network delay --time 2000 --interface eth0 --names redis --namespace default
```

### Cuándo NO hacer chaos

- Sin monitoring (no vas a saber si pasó)
- Sin runbooks (si el equipo no sabe responder)
- En Black Friday (bad timing)
- Antes de tener SLOs definidos (no sabes qué estás protegiendo)

## Puntos clave

- Chaos engineering: inyectar fallas controladas para encontrar debilidades.
- Empezar pequeño, minimizar blast radius, automatizar experimentos.
- Chaos Monkey (Netflix) pioneros, Litmus para K8s, Gremlin para SaaS.
- Solo hacer chaos con monitoring, runbooks y SLOs definidos.

:::quiz
[
  {
    "question": "Cual es el primer requisito antes de un experimento de chaos?",
    "options": ["Apagar el monitoring para no hacer ruido", "Monitoring, runbooks y SLOs definidos", "Avisar a todos los clientes", "Congelar deploys un mes"],
    "correctIndex": 1,
    "explanation": "Sin observabilidad y SLOs no puedes medir el blast radius ni saber si el experimento paso."
  },
  {
    "question": "Que herramienta de chaos es nativa de Kubernetes?",
    "options": ["Gremlin", "Litmus", "Chaos Monkey original", "JMeter"],
    "correctIndex": 1,
    "explanation": "Litmus corre en K8s. Chaos Monkey (Netflix) es pionero en VMs, Gremlin es SaaS."
  },
  {
    "question": "Como se empieza con chaos engineering?",
    "options": ["Apagando produccion un viernes", "Pequeno: minimiza blast radius y automatiza", "Sin hipotesis, a ver que pasa", "Solo en local"],
    "correctIndex": 1,
    "explanation": "Empieza pequeno con hipotesis clara y abort automático; escala la ambicion con la madurez."
  }
]
:::
