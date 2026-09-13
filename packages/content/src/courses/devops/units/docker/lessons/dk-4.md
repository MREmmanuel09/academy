---
id: dk-4
slug: dk-4
title: Networking, volumes y registries
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# Networking, volumes y registries

Cómo se comunican containers, dónde persisten datos, cómo compartes imágenes.

## Networking

### Drivers de red

- **bridge** (default): red privada interna, containers pueden hablar entre sí
- **host**: el container usa la red del host directamente (sin NAT)
- **none**: sin red
- **overlay**: multi-host (Swarm)
- **macvlan**: asigna MAC propia

### Comandos

```bash
docker network ls
docker network inspect bridge
docker network create mi-red
docker network create --driver bridge --subnet 10.0.0.0/24 mi-red

docker run -d --name web --network mi-red nginx
docker run -d --name api --network mi-red my-api

# Container a container en la misma red: usar nombre como hostname
# http://api:3000 desde web
docker network connect mi-red container-existente
docker network disconnect mi-red container
docker network rm mi-red
docker network prune
```

### DNS interno

Docker tiene un DNS server que resuelve nombres de containers en redes custom. En la red `bridge` default NO hay DNS — usa `--link` (legacy) o crea red custom.

### Port mapping

- `-p 8080:80`: host:container. Acceso externo al container.
- `-p 127.0.0.1:8080:80`: solo localhost del host
- `-p 8080:80/tcp`: solo TCP (default)
- `--network host`: container escucha directamente en host (no necesita -p)

## Volumes y persistencia

Containers son **efímeros**: cuando se borran, sus datos se pierden. Los **volumes** persisten.

### Tipos de storage

- **Volumes**: gestionados por Docker en `/var/lib/docker/volumes/`. **Recomendado**.
- **Bind mounts**: mapean directorio del host. Útil en dev.
- **tmpfs**: en memoria. Para datos sensibles/temporales.

### Comandos

```bash
docker volume create mi-dato
docker volume ls
docker volume inspect mi-dato
docker volume rm mi-dato
docker volume prune

# Uso
docker run -v mi-dato:/data nginx              # volume con nombre
docker run -v /host/path:/container/path nginx # bind mount
docker run --mount source=mi-dato,target=/data nginx  # formato largo
docker run --tmpfs /tmp nginx                 # tmpfs
```

### Casos

```bash
# Persistir DB
docker run -d --name db -v pgdata:/var/lib/postgresql/data postgres:16

# Hot reload en dev
docker run -d -p 3000:3000 -v $(pwd)/src:/app/src node:20

# Backup de volume
docker run --rm -v pgdata:/source -v $(pwd):/backup alpine tar czf /backup/pgdata.tar.gz -C /source .

# Restaurar
docker run --rm -v pgdata:/target -v $(pwd):/backup alpine tar xzf /backup/pgdata.tar.gz -C /target
```

> **NUNCA** guardes datos importantes solo en el container. Usa volumes o bind mounts.

## Registries

Un **registry** almacena y distribuye imágenes Docker.

- **Docker Hub**: `docker.io`, público, default
- **GitHub Container Registry**: `ghcr.io`, integrado con GitHub
- **GitLab Container Registry**: `registry.gitlab.com`
- **AWS ECR**: `123.dkr.ecr.us-east-1.amazonaws.com`
- **Google Artifact Registry**: `gcr.io`
- **Azure Container Registry**: `xxx.azurecr.io`

### Login y push

```bash
docker login                          # Docker Hub
docker login ghcr.io                 # GitHub
docker login registry.gitlab.com

docker tag mi-app:latest usuario/mi-app:v1.0
docker push usuario/mi-app:v1.0
docker pull usuario/mi-app:v1.0
```

### Registry privado (Harbor, JFrog, AWS ECR)

Para empresas: control de acceso, escaneo de vulnerabilidades, replicación, firmado de imágenes.

```bash
# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123.dkr.ecr.us-east-1.amazonaws.com
docker tag mi-app:latest 123.dkr.ecr.us-east-1.amazonaws.com/mi-app:v1
docker push 123.dkr.ecr.us-east-1.amazonaws.com/mi-app:v1
```

### Imágenes seguras

```bash
docker scan mi-app:latest            # análisis de vulnerabilidades
docker trust sign mi-app:latest      # firmado con Notary
```

> **Tip DevOps**: nunca uses `latest` en producción. Usa tags inmutables (SHA, semver). Latest es ambiguo y rompe reproducibility.

## Puntos clave

- Networks: bridge (default), host, overlay, macvlan. Crea redes custom para DNS.
- Volumes persisten datos. Bind mounts para dev, named volumes para prod.
- Registries: Docker Hub, ECR, GCR, GHCR. Push/pull con docker.
- NUNCA uses :latest en producción. Tags inmutables para reproducibilidad.

:::quiz
[
  {
    "question": "Bind mounts frente a named volumes: cuando cada uno?",
    "options": ["Da igual", "Bind para dev (edicion en vivo), named para datos en prod", "Named solo en Windows", "Bind en prod siempre"],
    "correctIndex": 1,
    "explanation": "Bind monta tu codigo para iterar; named gestiona datos persistentes portables."
  },
  {
    "question": "Donde publicas imagenes privadas en AWS?",
    "options": ["Docker Hub publico", "ECR (Elastic Container Registry)", "S3", "En el Dockerfile"],
    "correctIndex": 1,
    "explanation": "ECR/GCR/GHCR segun tu nube; Docker Hub para publicas o con plan privado."
  },
  {
    "question": "Por que prohibir :latest en produccion?",
    "options": ["Es mas lento", "No es reproducible: el mismo tag cambia de contenido y rompe rollbacks", "Cuesta dinero", "No existe"],
    "correctIndex": 1,
    "explanation": "Tags inmutables (sha o version) garantizan que staging y prod corren lo mismo."
  }
]
:::
