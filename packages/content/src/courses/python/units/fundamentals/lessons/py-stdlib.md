---
id: py-stdlib
slug: py-stdlib
title: Tour por la stdlib: os, sys, json, datetime, pathlib
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 70
---

# Tour por la stdlib: os, sys, json, datetime, pathlib

Modulos de la biblioteca estandar mas usados en DevOps: I/O, sistema, datos, tiempo.

## os y sys — sistema y Python runtime

```python
import os
import sys

# os: interactuar con el sistema operativo
os.getcwd()                       # directorio actual
os.listdir("/etc")                # listar directorio
os.environ["PATH"]                # variables de entorno
os.path.exists("/tmp/log.txt")    # verificar existencia
os.path.join("/var", "log", "app")  # join multiplataforma
os.makedirs("/opt/myapp", exist_ok=True)

# sys: runtime de Python
sys.argv                          # argumentos CLI: ["script.py", "arg1", "arg2"]
sys.exit(1)                       # salir con codigo
sys.version                       # version de Python
sys.platform                      # "linux", "win32", "darwin"
```

## pathlib — paths modernos (3.4+)

```python
from pathlib import Path

# Crear paths
p = Path("/var/log/app.log")
p = Path("/var") / "log" / "app.log"    # join con /

# Propiedades
p.name          # "app.log"
p.parent        # Path("/var/log")
p.suffix        # ".log"
p.stem          # "app"

# Verificaciones
p.exists()
p.is_file()
p.is_dir()

# Listar
for f in Path("/var/log").glob("*.log"):
    print(f)

# Leer/escribir
content = p.read_text()
p.write_text("new content")
```

> **Recomendacion**: usa `pathlib` en codigo nuevo. Es mas legible que `os.path` y funciona multiplataforma.

## json, datetime, subprocess

**json** (serializacion):
```python
import json

data = {"servers": ["web-01"], "replicas": 3}
s = json.dumps(data, indent=2)    # dict -> str
d = json.loads(s)                  # str -> dict
json.dump(data, open("out.json", "w"), indent=2)
```

**datetime** (fechas):
```python
from datetime import datetime, timezone, timedelta

now = datetime.now(timezone.utc)
iso = now.isoformat()                  # "2024-01-15T10:30:00+00:00"
parsed = datetime.fromisoformat("2024-01-15T10:30:00+00:00")
yesterday = now - timedelta(days=1)
```

**subprocess** (ejecutar comandos — lo vemos en detalle mas adelante):
```python
import subprocess
result = subprocess.run(["uptime"], capture_output=True, text=True, check=True)
print(result.stdout)
```

> **Tip**: `datetime.now(timezone.utc)` es la forma **correcta** de obtener el tiempo actual. Sin timezone es ambiguo.

## Puntos clave

- os/sys: interaccion con el sistema y el runtime de Python.
- pathlib es la forma moderna de manejar paths — usala en codigo nuevo.
- json: dumps/loads para serializar, dump/load para archivos.
- datetime con timezone.utc SIEMPRE — nunca datetime.now() sin timezone.
