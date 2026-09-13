---
id: py-dicts
slug: py-dicts
title: Diccionarios y sets
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# Diccionarios y sets

Hash maps clave-valor (dict) y conjuntos unicos (set) — esenciales para datos estructurados.

## Diccionarios (clave-valor)

```python
# Crear
server = {
    "hostname": "web-01",
    "ip": "10.0.0.5",
    "port": 80,
    "tags": ["prod", "us-east"],
}

# Acceso
server["hostname"]            # "web-01"
server.get("region", "us-east-1")  # default si no existe
server.get("missing")          # None (no error)

# Modificar
server["status"] = "healthy"
server.update({"cpu": 45, "memory": 60})

# Eliminar
del server["port"]
server.pop("ip", None)        # con default para evitar KeyError
```

## Iterar y metodos utiles

```python
server = {"hostname": "web-01", "status": "healthy", "cpu": 45}

# Iterar
for key in server:                # keys (default)
for key in server.keys():
for value in server.values():
for key, value in server.items():  # el mas comun

# Membership (en keys, no values)
"hostname" in server              # True
"web-01" in server                # False
"web-01" in server.values()       # True

# Merge (Python 3.9+)
defaults = {"region": "us-east-1", "tier": "web"}
merged = defaults | server
```

**Dict comprehension**:
```python
servers = [{"name": "web-01", "cpu": 45}, {"name": "web-02", "cpu": 90}]
by_name = {s["name"]: s for s in servers}
# {"web-01": {...}, "web-02": {...}}
```

## Sets (conjuntos unicos)

**Set** = coleccion **sin duplicados** y sin orden. Util para deduplicar y membership tests.

```python
# Crear
ports = {80, 443, 22, 80, 80}
ports                       # {80, 443, 22} (duplicados eliminados)
empty = set()               # no {} (eso es dict vacio)

# Operaciones de conjuntos
allowed = {80, 443, 8080}
used = {22, 80, 443}
allowed & used              # interseccion: {80, 443}
allowed | used              # union
allowed - used              # diferencia: {8080}
allowed ^ used              # diferencia simetrica

# Membership O(1) (vs O(n) en lista)
80 in ports                 # True (instantaneo)
```

**Caso real DevOps**: eliminar IPs duplicadas de un log:
```python
ips = set()
with open("access.log") as f:
    for line in f:
        ip = line.split()[0]
        ips.add(ip)
print(f"Unique visitors: {len(ips)}")
```

## Puntos clave

- dict: clave-valor, O(1) lookup, estructura #2 mas usada despues de listas.
- .get(key, default) evita KeyError — usalo siempre que la key sea opcional.
- set: deduplicar y membership tests rapidos. Ideal para listas de IPs/hosts unicos.
- Iterar con .items() para obtener key y value simultaneamente.
