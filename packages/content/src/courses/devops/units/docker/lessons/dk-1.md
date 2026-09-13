---
id: dk-1
slug: dk-1
title: Docker: qué es y cómo funciona
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# Docker: qué es y cómo funciona

Contenedores, imágenes, Dockerfile. La base del cloud-native moderno.

## El problema que Docker resuelve

**"En mi máquina funciona"** — el clásico problema. Tu código corre en tu laptop pero no en producción. Diferencias en OS, librerías, versiones, configs.

**Docker** empaqueta tu app + TODAS sus dependencias en un **container** portable que corre igual en cualquier lado.

### Contenedor vs Máquina Virtual

```
VM:                    Container:
┌──────┐               ┌─────────┐
│ App  │               │ App     │
├──────┤               ├─────────┤
│ Bins │               │ Bins    │
├──────┤               ├─────────┤
│Guest │               │Libs     │
│  OS  │               ├─────────┤
├──────┤               │ Docker  │
│Hyper │               │ Engine  │
├──────┤               ├─────────┤
│Host  │               │ Host OS │
│  OS  │               └─────────┘
└──────┘
```

- VM: hypervisor, guest OS completo, GBs, minutos para boot
- Container: comparte kernel, MBs, segundos para boot, casi nativo

### Conceptos clave

- **Imagen**: template read-only (tu app + deps)
- **Contenedor**: instancia corriendo de una imagen
- **Dockerfile**: receta para construir imagen
- **Registry**: repositorio de imágenes (Docker Hub, ECR, GCR)
- **Docker Compose**: múltiples contenedores juntos
- **Volume**: persistencia de datos
- **Network**: comunicación entre containers

## Comandos esenciales

### Ciclo de vida de un container

```bash
docker run nginx                          # descargar imagen (si no la tiene) y correr
docker run -d nginx                       # detached (background)
docker run -d -p 8080:80 nginx            # mapear puerto
docker run -d -p 8080:80 --name mi-web nginx
docker run -d --rm nginx                  # borrar al detener
docker run -it ubuntu bash                # interactivo + TTY
docker run -v /host/path:/container/path nginx
docker run -e MY_VAR=value nginx          # env var
docker run --env-file .env nginx          # env desde archivo
```

### Inspeccionar

```bash
docker ps                                 # corriendo
docker ps -a                              # todos
docker ps -q                              # solo IDs
docker logs mi-web                        # logs
docker logs -f mi-web                     # follow
docker inspect mi-web                     # JSON con todo
docker stats                              # CPU/mem en vivo
docker top mi-web                         # procesos dentro
docker exec -it mi-web bash                # entrar al container
docker exec mi-web ls /                   # ejecutar comando
docker cp archivo.txt mi-web:/app/
```

### Gestión

```bash
docker stop mi-web                        # SIGTERM
docker start mi-web                       # reiniciar
docker restart mi-web
docker kill mi-web                        # SIGKILL
docker rm mi-web                          # borrar container parado
docker rm -f mi-web                       # forzar
docker container prune                    # borrar todos parados
```

### Imágenes

```bash
docker images
docker pull nginx:1.25
docker rmi nginx                          # borrar imagen
docker image prune -a                     # limpiar todo
docker tag mi-app:latest mi-app:v1.0
docker save mi-app > app.tar              # exportar
docker load < app.tar                     # importar
docker history nginx                      # capas de la imagen
```

## Puntos clave

- Docker empaqueta app + deps en un container portable.
- Imagen = template, Container = instancia corriendo.
- docker run con -d (detached), -p (puerto), -v (volumen), -e (env var).
- docker ps/logs/exec/stop/rm para gestionar containers en vivo.

:::quiz
[
  {
    "question": "What does Docker package?",
    "options": ["The application code only", "The application plus all its dependencies", "The operating system only", "The hardware drivers"],
    "correctIndex": 1,
    "explanation": "Docker packages the application along with all its dependencies into a portable container that runs consistently anywhere."
  },
  {
    "question": "What is the main difference between a container and a virtual machine?",
    "options": ["Containers are slower than VMs", "Containers share the host kernel while VMs run a full guest OS", "VMs are smaller than containers", "Containers require a hypervisor"],
    "correctIndex": 1,
    "explanation": "Containers share the host OS kernel and are lightweight (MBs, seconds to boot), while VMs include a complete guest OS and require a hypervisor (GBs, minutes to boot)."
  },
  {
    "question": "What is a Dockerfile?",
    "options": ["A configuration file for Docker Compose", "A recipe for building a Docker image", "A log file of container activity", "A network configuration file"],
    "correctIndex": 1,
    "explanation": "A Dockerfile is the recipe or set of instructions used to build a Docker image, which is then instantiated as a container."
  }
]
:::
