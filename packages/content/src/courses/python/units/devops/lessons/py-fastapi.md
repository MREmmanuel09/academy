---
id: py-fastapi
slug: py-fastapi
title: FastAPI: APIs modernas en minutos
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 90
---

# FastAPI: APIs modernas en minutos

Construir APIs HTTP con FastAPI: type hints, validacion automatica, OpenAPI docs.

## Hola mundo en FastAPI

```bash
pip install fastapi uvicorn
```

```python
# main.py
from fastapi import FastAPI

app = FastAPI(title="Server Monitor API", version="1.0.0")


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/servers/{server_id}")
def get_server(server_id: int, include_metrics: bool = False):
    server = {"id": server_id, "hostname": f"web-{server_id:02d}"}
    if include_metrics:
        server["cpu"] = 45.0
        server["memory"] = 60.0
    return server
```

```bash
uvicorn main:app --reload
# http://localhost:8000
# http://localhost:8000/docs    <- Swagger UI automatico
# http://localhost:8000/redoc   <- ReDoc alternativo
```

> **Magia**: FastAPI genera documentacion OpenAPI automaticamente desde los type hints.

## Validacion con Pydantic

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()


class Server(BaseModel):
    hostname: str = Field(..., min_length=1, max_length=50)
    ip: str
    role: str = Field(default="web", pattern="^(web|db|api)$")
    replicas: int = Field(default=1, ge=1, le=100)


@app.post("/servers", status_code=201)
def create_server(server: Server):
    # server ya esta validado por Pydantic
    return {"id": 1, **server.model_dump()}


@app.get("/servers/{server_id}")
def get_server(server_id: int):
    if server_id < 1:
        raise HTTPException(status_code=404, detail="Server not found")
    return {"id": server_id, "hostname": f"web-{server_id:02d}"}
```

> **DevOps tip**: usa FastAPI para construir internal tools (admin panels, status pages, control planes).

## Async, middleware, deployment

**Async endpoints** (no bloquea el event loop):
```python
@app.get("/health")
async def health():
    async with httpx.AsyncClient() as client:
        r = await client.get("https://api.github.com", timeout=5)
    return {"github_status": r.status_code}
```

**CORS** (para frontend):
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://admin.example.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Deployment**:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
# O con gunicorn para produccion
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Dockerfile**:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Puntos clave

- FastAPI: type hints como fuente de verdad. Documentacion OpenAPI automatica.
- Pydantic valida input automaticamente. Define schemas como clases.
- async def para endpoints no bloqueantes (ideal para I/O).
- uvicorn en dev, gunicorn + uvicorn workers en prod.
