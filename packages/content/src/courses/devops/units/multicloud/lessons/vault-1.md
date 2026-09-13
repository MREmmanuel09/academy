---
id: vault-1
slug: vault-1
title: Secret management: Vault, SOPS, sealed-secrets
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 75
---

# Secret management: Vault, SOPS, sealed-secrets

HashiCorp Vault, Bitnami Sealed Secrets, secrets dinámicos, rotación.

## Por qué no basta con env vars

Almacenar secrets en **variables de entorno** o archivos de config es problemático:
- Aparecen en `docker inspect`, `ps aux`
- Se commitean por error a Git
- No hay audit trail
- No rotan automáticamente
- Se distribuyen a quien tenga acceso al cluster

### Soluciones

- **HashiCorp Vault**: el estándar, dinámico, audit, rotación
- **AWS Secrets Manager**: nativo AWS, integración con RDS/Lambda
- **Azure Key Vault**: nativo Azure
- **GCP Secret Manager**: nativo GCP
- **Bitnami Sealed Secrets** (K8s): encrypted secrets en Git
- **Mozilla SOPS**: cifra archivos YAML/JSON, integrado con Git
- **External Secrets Operator** (K8s): sync desde Vault/AWS/etc a K8s Secret

## HashiCorp Vault

### Componentes

- **Storage backend**: donde Vault persiste (consul, S3, integrado, raft)
- **Secrets engines**: donde se almacenan los secrets (KV, database, AWS, etc)
- **Auth methods**: cómo se autentican los clientes (token, AWS IAM, K8s, GitHub)
- **Audit logs**: registro de toda acción
- **Policies**: ACLs

### Uso básico

```bash
# Iniciar dev server
vault server -dev

# Escribir un secret
vault kv put secret/myapp/db password=secretpass

# Leer
vault kv get secret/myapp/db

# Generar credenciales dinámicas para Postgres
vault write database/roles/myapp \\
  db_name=postgres \\
  creation_statements="CREATE ROLE '{{name}}' WITH LOGIN PASSWORD '{{password}}'; GRANT ALL ON myapp TO {{name}};" \\
  default_ttl="1h" \\
  max_ttl="24h"

# App pide credenciales en runtime
vault read database/creds/myapp
# Devuelve username/password nuevo que expira en 1h
```

### Vault Agent

Sidecar que inyecta secrets a archivos, se renueva automáticamente.

```hcl
auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "myapp"
    }
  }
  sink "file" {
    config = {
      path = "/home/vault/.token"
    }
  }
}
```

### En Kubernetes con External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-creds
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: db-creds-secret
  data:
  - secretKey: password
    remoteRef:
      key: secret/data/myapp
      property: password
```

Resultado: un K8s Secret normal con el secret de Vault, sincronizado automáticamente.

## Puntos clave

- env vars o archivos NO son suficiente: aparecen en logs, no rotan, no hay audit.
- Vault es el estándar: dynamic secrets, rotación automática, audit, policies.
- Sealed Secrets (K8s), SOPS (archivos), External Secrets Operator para integrar.
- Dynamic database credentials son el gold standard: TTL corto, auto-rotación.

:::quiz
[
  {
    "question": "Por que no bastan las env vars para secretos?",
    "options": ["Bastan siempre", "Se filtran en logs, imagenes y dumps; sin rotacion ni auditoria", "Son lentas", "No existen en K8s"],
    "correctIndex": 1,
    "explanation": "Env vive en muchos sitios sin control. Gestor = cifrado, acceso y rotacion."
  },
  {
    "question": "Que te da Vault?",
    "options": ["Solo guardar texto", "Dynamic secrets, rotacion automatica, audit y policies", "Compilar codigo", "Monitoreo de red"],
    "correctIndex": 1,
    "explanation": "Secretos bajo demanda con TTL + quien pidio que, cuando."
  },
  {
    "question": "Que son dynamic database credentials?",
    "options": ["Passwords fijas", "Credenciales temporales auto-generadas con TTL corto: el gold standard", "Usuarios root compartidos", "Sin password"],
    "correctIndex": 1,
    "explanation": "Cada app recibe su usuario efimero: si filtra, caduca solo."
  }
]
:::
