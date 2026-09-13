---
id: py-async
slug: py-async
title: Async I/O: asyncio, aiohttp, concurrencia real
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 100
---

# Async I/O: asyncio, aiohttp, concurrencia real

Programacion asincrona para paralelizar I/O: event loop, coroutines, aiohttp, gather.

## Por que async

**Sincronico** (secuencial): 100 requests a 100ms cada uno = 10 segundos.
**Asincronico** (paralelo): 100 requests en paralelo = ~200ms total.

```python
import asyncio
import httpx
import time


async def fetch(client, url):
    response = await client.get(url, timeout=10)
    return response.json()


async def main():
    urls = [f"https://api.github.com/repos/{i}" for i in range(100)]
    async with httpx.AsyncClient() as client:
        start = time.perf_counter()
        tasks = [fetch(client, url) for url in urls]
        results = await asyncio.gather(*tasks)
        elapsed = time.perf_counter() - start
        print(f"Fetched {len(results)} in {elapsed:.2f}s")


asyncio.run(main())
```

> **DevOps rule**: si tu script hace mucho I/O (HTTP, DB, archivos), async es obligatorio.

## Coroutines, tasks, event loop

**Coroutines** (funciones async):
```python
async def saludar(nombre: str) -> str:
    await asyncio.sleep(1)   # simula I/O
    return f"Hola {nombre}"

# Llamar coroutine
result = await saludar("DevOps")
```

**Tasks** (scheduling concurrente):
```python
async def main():
    # Secuencial: 3 segundos
    r1 = await saludar("a")
    r2 = await saludar("b")
    r3 = await saludar("c")

    # Paralelo: 1 segundo
    t1 = asyncio.create_task(saludar("a"))
    t2 = asyncio.create_task(saludar("b"))
    t3 = asyncio.create_task(saludar("c"))
    results = await asyncio.gather(t1, t2, t3)
```

**Timeouts y cancellation**:
```python
try:
    result = await asyncio.wait_for(slow_op(), timeout=5.0)
except asyncio.TimeoutError:
    print("Op took too long")
```

## Patrones async utiles

**Producer/consumer con Queue**:
```python
async def producer(queue):
    for i in range(10):
        await queue.put(i)
        await asyncio.sleep(0.1)

async def consumer(queue, name):
    while True:
        item = await queue.get()
        if item is None:
            break
        print(f"{name} processed {item}")
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=5)
    producers = [asyncio.create_task(producer(queue)) for _ in range(2)]
    consumers = [asyncio.create_task(consumer(queue, f"c{i}")) for i in range(3)]
    await asyncio.gather(*producers)
    await queue.join()
    for _ in consumers:
        await queue.put(None)
```

**Semaphore** (limitar concurrencia):
```python
sem = asyncio.Semaphore(10)   # max 10 requests simultaneas

async def fetch_limited(client, url):
    async with sem:
        return await client.get(url)
```

> **Caso real DevOps**: health check de 1000 servicios cada 30s, paralelizado con asyncio.gather + Semaphore(50).

## Puntos clave

- async/await para I/O concurrente. No para CPU-bound (usa multiprocessing).
- asyncio.gather() corre multiples coroutines en paralelo.
- asyncio.Semaphore limita concurrencia (rate limiting natural).
- asyncio.Queue para producer/consumer patterns.
