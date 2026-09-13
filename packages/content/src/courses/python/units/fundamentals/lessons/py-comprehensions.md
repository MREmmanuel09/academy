---
id: py-comprehensions
slug: py-comprehensions
title: Comprehensions: list, dict, set
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# Comprehensions: list, dict, set

Sintaxis compacta para crear colecciones: mas rapidas y legibles que loops.

## List comprehensions

**Sintaxis**: `[expresion for item in iterable if condicion]`

```python
# Cuadrados
squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# Filtrar
servers = ["web-01", "web-02", "db-01", "db-02"]
web = [s for s in servers if s.startswith("web")]
# ["web-01", "web-02"]

# Transformar
ports = [80, 443, 8080]
str_ports = [f":{p}" for p in ports]
# [":80", ":443", ":8080"]

# Equivalente con loop (mas verboso, mas lento)
squares_loop = []
for x in range(10):
    squares_loop.append(x**2)
```

> **Performance**: comprehensions son ~30% mas rapidas que loops con append.

## Dict y set comprehensions

**Dict comprehension**:
```python
servers = [
    {"name": "web-01", "cpu": 45},
    {"name": "web-02", "cpu": 90},
]
by_name = {s["name"]: s for s in servers}
# {"web-01": {...}, "web-02": {...}}

# Invertir un dict
original = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in original.items()}
# {1: "a", 2: "b", 3: "c"}
```

**Set comprehension**:
```python
ips = ["10.0.0.1", "10.0.0.2", "10.0.0.1", "10.0.0.3"]
unique_ips = {ip for ip in ips}
# {"10.0.0.1", "10.0.0.2", "10.0.0.3"}
```

**Generator expression** (lazy, ahorra memoria):
```python
# Parentesis en vez de corchetes
total = sum(x**2 for x in range(1_000_000))  # no crea la lista
```

## Nested comprehensions y limites

```python
# Matriz 3x3
matrix = [[i*3+j for j in range(3)] for i in range(3)]
# [[0,1,2], [3,4,5], [6,7,8]]

# Aplanar
flat = [n for row in matrix for n in row]
# [0,1,2,3,4,5,6,7,8]
```

> **Regla**: si la comprehension ocupa mas de 2 lineas o tiene mas de 2 `for`, **usa un loop normal**. La legibilidad importa mas que la brevedad.

## Puntos clave

- Comprehensions son mas rapidas y legibles que loops con append.
- Tipos: list [], dict {}, set {}. Generators () para datos grandes.
- No abuses: si pasa de 2 for o 2 condiciones, vuelve a un loop tradicional.
- Generators (parentesis) no materializan la lista — ideales para datasets grandes.
