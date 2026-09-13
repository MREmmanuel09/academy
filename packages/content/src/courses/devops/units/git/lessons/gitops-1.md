---
id: gitops-1
slug: gitops-1
title: GitOps: Git como fuente de verdad
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 85
---

# GitOps: Git como fuente de verdad

ArgoCD, Flux, declarar el estado deseado en Git, reconciliación automática.

## ¿Qué es GitOps?

**GitOps** = usar un repositorio Git como **única fuente de verdad** para la configuración de infraestructura y aplicaciones. Los cambios se hacen via PR, no comandos manuales.

### Principios

1. **Declarativo**: describes el estado deseado (YAML, Terraform, Helm)
2. **Versionado en Git**: todo en un repo
3. **Pull requests**: cambio de infra = PR con code review
4. **Reconciliación continua**: agentes comparan Git vs realidad, corrijen diferencias

### Herramientas

- **ArgoCD**: el más popular, UI web, sync automático
- **Flux**: GitOps Toolkit, más modular
- **Fleet**: para clusters grandes

### Beneficios

- **Audit trail**: quién cambió qué, cuándo
- **Rollback fácil**: git revert
- **Code review** obligatorio
- **Drift detection**: si alguien cambió algo a mano, ArgoCD lo corrige
- **Disaster recovery**: clonar el repo y reconstruir todo

## ArgoCD en acción

### Instalación

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mi-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/mi-org/k8s-manifests
    targetRevision: main
    path: overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: mi-app
  syncPolicy:
    automated:
      prune: true      # borrar recursos que no están en Git
      selfHeal: true   # reconciliar drift
    syncOptions:
    - CreateNamespace=true
```

### Flujo

1. Developer hace PR al repo de manifests
2. Reviewer aprueba
3. Merge a main
4. ArgoCD detecta el cambio, sincroniza con el cluster
5. Si hay drift (alguien cambió algo a mano), ArgoCD corrige

### Sync wave

Para apps con dependencias, ArgoCD respeta un orden:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

Wave 0 primero, luego 1, 2, etc. Útil para: DB primero, app después.

## Puntos clave

- GitOps: Git como única fuente de verdad para infra y apps.
- ArgoCD/Flux sincronizan el estado del cluster con el repo.
- Beneficios: audit trail, rollback fácil, code review, drift detection.
- Sync waves permiten orden de despliegue para apps con dependencias.

:::quiz
[
  {
    "question": "Cual es la idea central de GitOps?",
    "options": ["No usar Git", "El repo es la fuente de verdad: agentes (ArgoCD/Flux) sincronizan el cluster con el", "Deploy manual", "Sin code review"],
    "correctIndex": 1,
    "explanation": "Declarativo + versionado: el cluster converge al estado del repo, con audit trail gratis."
  },
  {
    "question": "Que ganas con GitOps frente a kubectl manual?",
    "options": ["Velocidad de escritura", "Rollback facil, drift detection y review de cambios", "Menos YAML", "Nada"],
    "correctIndex": 1,
    "explanation": "Todo cambio pasa por PR (review + historial) y el agente detecta deriva y revierte."
  },
  {
    "question": "Para que sirven las sync waves?",
    "options": ["Para musica", "Ordenar el despliegue cuando hay dependencias (DB antes que app)", "Para backups", "Para logs"],
    "correctIndex": 1,
    "explanation": "Fases numeradas: primero lo base (namespaces, CRDs, DB), luego las apps."
  }
]
:::
