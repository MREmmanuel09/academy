---
id: py-requests
slug: py-requests
title: HTTP con requests: APIs REST y autenticacion
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# HTTP con requests: APIs REST y autenticacion

Consumir APIs externas: GET/POST/PUT/DELETE, headers, autenticacion basica y bearer tokens.

## Por que requests

**requests** es la libreria de facto para HTTP en Python. Simple, potente, usada por todas las herramientas DevOps.

```bash
pip install requests
```

**Alternativas modernas**:
- `httpx`: async nativo, HTTP/2 (lo vemos en async)
- `urllib3`: bajo nivel, base de requests
- `aiohttp`: async puro

> **DevOps tip**: `requests` es sincronica. Para miles de llamadas paralelas, usa `httpx` o `aiohttp`.

## GET, POST, PUT, DELETE

```python
import requests

# GET
r = requests.get("https://api.github.com/repos/python/cpython")
r.status_code              # 200
r.json()                   # dict
r.headers["Content-Type"]  # "application/json; ..."
r.text                     # str (body como texto)
r.raise_for_status()       # raise si 4xx/5xx

# GET con query params
r = requests.get(
    "https://api.github.com/search/repos",
    params={"q": "python", "sort": "stars"},
    timeout=10,
)

# POST con JSON
r = requests.post(
    "https://api.example.com/servers",
    json={"hostname": "web-03", "role": "web"},
    timeout=10,
)

# PUT (update)
r = requests.put(f"https://api.example.com/servers/{id}", json=payload)

# DELETE
r = requests.delete(f"https://api.example.com/servers/{id}")
```

> **Regla de oro**: SIEMPRE pasa `timeout`. Sin el, un servidor colgado puede colgar tu script para siempre.

## Autenticacion, headers, sesiones y reintentos

**Autenticacion**:
```python
# Basic auth
r = requests.get(url, auth=("user", "pass"))

# Bearer token
r = requests.get(
    url,
    headers={"Authorization": f"Bearer {token}"},
    timeout=10,
)

# API key en header
r = requests.get(url, headers={"X-API-Key": api_key})
```

**Sesiones** (reutiliza conexion, mantiene cookies):
```python
with requests.Session() as s:
    s.headers["Authorization"] = f"Bearer {token}"
    r1 = s.get(url1)  # usa la misma conexion TCP
    r2 = s.get(url2)  # mas rapido
```

**Reintentos con urllib3** (built-in):
```python
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503, 504])
session = requests.Session()
session.mount("https://", HTTPAdapter(max_retries=retry))
```

> **Caso real DevOps**: health check de 50 servicios en paralelo = `asyncio.gather` con `httpx.AsyncClient`.

## Puntos clave

- requests: GET/POST/PUT/DELETE con .json(), .text, .status_code.
- SIEMPRE timeout= para evitar cuelgues infinitos.
- Sesiones (requests.Session) reutilizan conexiones y mantienen headers/cookies.
- Reintentos automaticos para 5xx con urllib3.Retry + HTTPAdapter.
