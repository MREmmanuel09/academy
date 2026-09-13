---
id: py-docker
slug: py-docker
title: Docker SDK: listar y gestionar containers
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# Docker SDK: listar y gestionar containers

Controlar Docker desde Python: docker SDK, eventos, logs, exec, compose.

## Docker SDK basico

```bash
pip install docker
```

```python
import docker

client = docker.from_env()    # usa DOCKER_HOST o socket unix

# Containers
for container in client.containers.list(all=True):
    print(container.id[:12], container.name, container.status)

# Detalle
c = client.containers.get("web-01")
c.attrs["Config"]["Image"]
c.status       # "running", "exited", "paused"
c.logs(tail=100, follow=False).decode()

# Acciones
c.restart()
c.stop(timeout=10)
c.start()
c.remove(force=True)
```

## Ejecutar comandos, stats, eventos

**Exec** (ejecutar comando dentro de un container):
```python
c = client.containers.get("web-01")
exec_result = c.exec_run("ps aux", user="root")
print(exec_result.output.decode())
print(exec_result.exit_code)
```

**Stats** en vivo:
```python
for stat in c.stats(stream=True):
    cpu_pct = stat["cpu_stats"]["cpu_usage"]["total_usage"]
    mem_usage = stat["memory_stats"]["usage"]
    print(f"CPU: {cpu_pct}, Mem: {mem_usage}")
```

**Eventos** (reactivos):
```python
for event in client.events(decode=True):
    if event["Type"] == "container":
        if event["Action"] == "die":
            alert(f"Container died: {event['Actor']['Attributes']['name']}")
```

## Compose y construir imagenes

**Docker Compose v2** (desde Python):
```bash
pip install docker
```

```python
from python_on_whales import compose
# Alternativa moderna y completa

compose.up(detach=True, build=True)
compose.ps()
compose.logs(service="web", tail=50, follow=True)
compose.down(volumes=True)
```

**Construir imagen**:
```python
image, build_log = client.images.build(
    path=".",
    dockerfile="Dockerfile",
    tag="myapp:1.0",
    rm=True,
)
for line in build_log:
    print(line.get("stream", ""))
```

**Push a registry**:
```python
client.login(username="user", password="pass", registry="registry.example.com")
client.images.push("myapp:1.0", tag="latest")
```

> **Caso real DevOps**: script que monitoriza eventos Docker y reinicia containers unhealthy automaticamente.

## Puntos clave

- docker.from_env() usa DOCKER_HOST. Por defecto, socket Unix local.
- containers.list(), get(), exec_run(), stats() — los metodos que mas usas.
- client.events() permite reaccionar a cambios (ideal para health monitors).
- Para compose: python_on_whales es la opcion mas completa en 2025.
