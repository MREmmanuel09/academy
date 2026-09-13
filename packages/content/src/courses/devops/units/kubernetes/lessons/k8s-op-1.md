---
id: k8s-op-1
slug: k8s-op-1
title: Kubernetes Operators y CRDs
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 70
---

# Kubernetes Operators y CRDs

Extender K8s con CustomResourceDefinitions, operadores que automatizan apps.

## ¿Qué es un Operator?

Un **Operator** es un patrón que combina un **CRD** (Custom Resource Definition) con un **controlador** que automatiza tareas específicas de una aplicación.

### El problema

K8s sabe manejar Pod, Deployment, Service, etc. Pero no sabe:
- Cómo hacer backup de una base Postgres
- Cómo escalar Redis con sharding
- Cómo actualizar Kafka sin downtime
- Cómo gestionar certificates con rotación

Cada app tiene "domain knowledge" que K8s no tiene.

### La solución: Operator pattern

1. **CRD**: defines un nuevo recurso (ej: `Postgres`, `RedisCluster`)
2. **Controller**: un pod que observa tus CRDs y los reconcilia
3. **Operador completo**: CRD + Controller + conocimiento del dominio (backup, scaling, upgrade)

### Ejemplo: Postgres Operator

Sin operator:
- Crear StatefulSet
- Crear Service
- Crear PVC
- Configurar replication manualmente
- Backup manual con cron
- Upgrade manual

Con operator:
```yaml
apiVersion: acid.zalan.do/v1
kind: PostgreSQL
metadata:
  name: mi-db
spec:
  teamId: myteam
  volume:
    size: 10Gi
  numberOfInstances: 3
  users:
    miuser: []
  databases:
    midb: miuser
  preparedDatabases:
    defaults:
      logicalBackup:
        schedule: "0 0 * * *"
```

¡El operator hace todo!

## Operadores populares

### Bases de datos

- **Postgres Operator** (Zalando): Postgres con HA, backups, connection pooling
- **Redis Operator**: Redis con sharding, sentinel, cluster
- **MongoDB Community Operator**: MongoDB con replica sets
- **MySQL Operator** (Oracle): MySQL con InnoDB Cluster
- **Cass Operator**: Cassandra con racks

### Mensajería y streaming

- **Strimzi**: Kafka completo (brokers, topics, users)
- **RabbitMQ Cluster Operator**
- **NATS Operator**

### Storage

- **MinIO Operator**: object storage
- **Rook-Ceph**: distributed storage
- **OpenEBS**

### Monitoring

- **Prometheus Operator**: Prometheus + Alertmanager + ThanosRuler
- **Grafana Operator**: dashboards como código

### Cert-manager

El más usado. Cert-manager automatiza TLS con Let's Encrypt y otros CAs:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: mi-cert
spec:
  secretName: mi-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - mi-app.example.com
```

### Crear tu propio operator

Frameworks:
- **Operator SDK** (Go): scaffolding con kubebuilder-style
- **Kubebuilder**: framework completo
- **Metacontroller** (JavaScript/TypeScript)
- **KOPF** (Python)

**Loop de reconciliación**:
1. Watch CRDs
2. Compare desired vs actual state
3. Make changes to converge
4. Update status
5. Repeat

## Puntos clave

- Operators automatizan apps con domain knowledge (DBs, queues, etc).
- CRD define el recurso custom, Controller lo reconcilia.
- Operadores populares: Postgres, Redis, Kafka (Strimzi), cert-manager.
- Operator SDK y Kubebuilder para crear tus propios operators en Go.

:::quiz
[
  {
    "question": "Que piezas forman un Operator?",
    "options": ["Pod + Service", "CRD (recurso custom) + Controller que lo reconcilia", "Helm + Kustomize", "Dos clusters"],
    "correctIndex": 1,
    "explanation": "Defines el recurso deseado (CRD) y un bucle que lleva el mundo real a ese estado."
  },
  {
    "question": "Nombra un caso tipico de Operator.",
    "options": ["Editar texto", "Postgres/Redis/Kafka: backups, failover y escala automatica", "Hacer ping", "Compilar Go"],
    "correctIndex": 1,
    "explanation": "Operan apps con estado: Strimzi (Kafka), Postgres/Redis operators, cert-manager."
  },
  {
    "question": "Con que frameworks creas operators en Go?",
    "options": ["React y Vue", "Operator SDK y Kubebuilder", "Jenkins", "Terraform"],
    "correctIndex": 1,
    "explanation": "Andamiaje + librerias para CRDs, controllers y webhooks en Go."
  }
]
:::
