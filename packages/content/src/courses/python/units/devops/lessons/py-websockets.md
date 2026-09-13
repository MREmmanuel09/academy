---
id: py-websockets
slug: py-websockets
title: WebSockets: monitoreo en tiempo real
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 85
---

# WebSockets: monitoreo en tiempo real

Comunicaciones bidireccionales full-duplex: websockets para dashboards y alertas live.

## WebSockets: conceptos

**HTTP**: request/response, cliente inicia, conexion se cierra.
**WebSocket**: conexion persistente, bidireccional, ambos pueden enviar.

**Casos DevOps**:
- Dashboards live (Grafana, Kibana)
- Notificaciones push (alertas, deploy status)
- Terminales remotas (SSH over WS)
- Logs streaming en tiempo real

**Subejemplos reales**:
- Prometheus alertmanager webhook
- Docker events stream
- Kubernetes watch API
- Slack events API

## Cliente WebSocket con websockets

```bash
pip install websockets
```

```python
import asyncio
import websockets
import json


async def monitor_alerts():
    uri = "wss://alertmanager.example.com/api/v1/alerts/stream"
    async with websockets.connect(uri, ping_interval=20) as ws:
        print("Connected to alert stream")
        async for message in ws:
            alert = json.loads(message)
            if alert["status"] == "firing":
                print(f"🚨 {alert['labels']['alertname']}: {alert['annotations']['summary']}")
                await send_to_slack(alert)


asyncio.run(monitor_alerts())
```

**Servidor WebSocket** (con FastAPI):
```python
from fastapi import FastAPI, WebSocket

app = FastAPI()


@app.websocket("/ws/metrics")
async def metrics_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            metrics = collect_metrics()     # tu funcion
            await websocket.send_json(metrics)
            await asyncio.sleep(1)
    except websockets.ConnectionClosed:
        print("Client disconnected")
```

## Reconnect logic y broadcast

**Reconnect automatico** (esencial en prod):
```python
import asyncio
import websockets


async def connect_with_retry(uri, max_retries=5):
    for attempt in range(max_retries):
        try:
            return await websockets.connect(uri, ping_interval=20)
        except (OSError, websockets.WebSocketException) as e:
            wait = 2 ** attempt
            print(f"Failed ({e}), retrying in {wait}s")
            await asyncio.sleep(wait)
    raise RuntimeError("Could not connect")


async def consumer():
    while True:
        try:
            ws = await connect_with_retry("wss://api.example.com/stream")
            async for msg in ws:
                process(msg)
        except Exception as e:
            print(f"Connection lost: {e}, reconnecting...")
            await asyncio.sleep(5)
```

**Broadcast** (un sender, muchos receivers):
```python
from fastapi import WebSocket

connections: list[WebSocket] = []


async def broadcast(message: dict):
    dead = []
    for conn in connections:
        try:
            await conn.send_json(message)
        except Exception:
            dead.append(conn)
    for d in dead:
        connections.remove(d)
```

> **Tip DevOps**: usa websockets para sistemas de monitorizacion en tiempo real donde el polling es ineficiente.

## Puntos clave

- WebSocket: conexion bidireccional persistente para tiempo real.
- websockets lib: async/await nativo, compatible con FastAPI.
- Implementa SIEMPRE reconnect logic con backoff exponencial.
- ping_interval para detectar conexiones muertas.
