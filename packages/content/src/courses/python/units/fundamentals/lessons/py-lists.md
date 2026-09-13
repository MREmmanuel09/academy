---
id: py-lists
slug: py-lists
title: Listas y tuplas
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# Listas y tuplas

Secuencias ordenadas: listas mutables, tuplas inmutables, metodos principales.

## Listas (mutables)

```python
# Crear
servers = ["web-01", "web-02", "db-01"]
ports = [80, 443, 8080]
empty = []
mixed = ["web-01", 80, True]   # permitido pero no recomendado

# Acceso
servers[0]           # "web-01"
servers[-1]          # "db-01"
servers[1:3]         # ["web-02", "db-01"]

# Modificar
servers[0] = "web-00"
servers.append("cache-01")
servers.extend(["lb-01", "lb-02"])
servers.insert(1, "web-1.5")

# Eliminar
servers.remove("db-01")
popped = servers.pop()         # quita el ultimo
del servers[0]
```

## Metodos y operaciones

```python
ports = [80, 443, 8080, 22, 80, 80]

ports.count(80)      # 3
ports.index(443)     # 1
ports.sort()         # [22, 80, 80, 80, 443, 8080]
ports.reverse()      # [8080, 443, 80, 80, 80, 22]

len(ports)           # 6
sum(ports)           # 1544
min(ports), max(ports)

# Membership
80 in ports          # True
```

**Listas por comprension** (mas rapidas y pitonicas):
```python
# [expresion for item in iterable if condicion]
uptimes = [s["uptime"] for s in servers if s["status"] == "ok"]
squares = [x**2 for x in range(10)]
```

## Tuplas (inmutables)

**Tuplas** = listas pero **no se pueden modificar**. Mas rapidas y hashable.

```python
# Crear
point = (10, 20)
rgb = (255, 0, 128)
single = (42,)        # tupla de 1 elemento (la coma es necesaria)
empty = ()

# Acceso igual que listas
point[0]              # 10
x, y = point          # unpacking: x=10, y=20

# Inmutabilidad
point[0] = 5          # TypeError!
```

**Usos en DevOps**:
- Retornar multiples valores: `return (status, body)`
- Keys en dicts (listas no son hashable)
- Constantes: `HTTP_METHODS = ("GET", "POST", "PUT", "DELETE")`

> **Regla**: si la coleccion no debe cambiar, usa tupla. Si no, lista.

## Puntos clave

- Listas: mutables, ordenadas, con duplicados. La estructura #1 de Python.
- Tuplas: inmutables, hashable, mas rapidas. Para retornos multiples y constantes.
- Listas por comprension son mas rapidas y legibles que loops tradicionales.
- append/extend/insert/pop/remove son los metodos que usaras 90% del tiempo.

:::code python
# Listas y tuplas en accion
servers = ["web-01", "web-02", "api-01"]
servers.append("db-01")
dbservers = [s for s in servers if "db" in s]

coords = (10.5, 20.3)
print(f"Servers: {servers}")
print(f"DB servers: {dbservers}")
print(f"Coords: {coords}")
:::
