---
id: py-loops
slug: py-loops
title: Bucles: for, while, break, continue
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# Bucles: for, while, break, continue

Iteracion, enumerate, zip, range, control de flujo en loops.

## for — la forma idiomatica

```python
servers = ["web-01", "web-02", "db-01"]

# Basico
for s in servers:
    print(f"Checking {s}")

# Con indice (enumerate)
for i, s in enumerate(servers):
    print(f"{i+1}. {s}")

# Iterar dos listas (zip)
ports = [80, 443, 5432]
for server, port in zip(servers, ports):
    print(f"{server}:{port}")
```

## range y while

```python
# range(stop)
for i in range(5):              # 0,1,2,3,4
# range(start, stop)
for i in range(1, 6):           # 1,2,3,4,5
# range(start, stop, step)
for i in range(0, 100, 10):     # 0,10,20,...,90

# while — cuando no sabes cuantas iteraciones
retries = 0
while not is_healthy() and retries < 3:
    retries += 1
    restart_service()
```

## break, continue, else

```python
# break: salir del loop
for port in range(1, 1024):
    if is_open(port):
        print(f"Open: {port}")
        break

# continue: saltar a la siguiente iteracion
for line in log_lines:
    if line.startswith("#"):
        continue
    process(line)

# else: se ejecuta si NO hubo break
for port in ports:
    if not check_port(port):
        break
else:
    print("All ports OK")
```

> **Truco**: `for...else` es **exclusivo de Python** y muy util para "si encuentro el item, hago X, si no, hago Y".

## Puntos clave

- for itera cualquier iterable. enumerate() para indices, zip() para paralelos.
- range(start, stop, step) genera secuencias numericas sin crear listas.
- while solo cuando no sabes el numero de iteraciones (retry logic, polling).
- for...else se ejecuta si no hubo break — util para busquedas.
