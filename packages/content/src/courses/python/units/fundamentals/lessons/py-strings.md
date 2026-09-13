---
id: py-strings
slug: py-strings
title: Strings, f-strings y format
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# Strings, f-strings y format

Manipulacion de cadenas: slicing, metodos, f-strings para logging, format avanzado.

## Creacion y concatenacion

```python
s1 = "Hola DevOps"
s2 = 'Single quotes OK'
s3 = """Multi-line
string con
comillas triples"""

# Concatenacion
greeting = "Hola " + "DevOps"   # "Hola DevOps"
repeat = "=" * 30              # "=============================="
```

> **Tip DevOps**: en logs, repite caracteres con `*` para crear separadores visuales legibles.

## f-strings (la forma moderna)

**f-strings** son la forma preferida desde Python 3.6. Son mas rapidas y legibles.

```python
hostname = "web-01"
cpu = 73.5

# Formato basico
msg = f"Server {hostname} at {cpu}% CPU"

# Con expresiones
msg = f"Status: {'OK' if cpu < 80 else 'ALERT'}"

# Con formato numerico
msg = f"CPU: {cpu:.2f}%"           # "CPU: 73.50%"
msg = f"Bytes: {1024**2:,}"       # "Bytes: 1,048,576"
msg = f"Hex: {255:#x}"            # "Hex: 0xff"

# Padding (util para tablas)
msg = f"{hostname:<20} {cpu:>6.2f}%"
# "web-01               73.50%"

# Debug (Python 3.8+)
msg = f"{hostname=}"  # "hostname='web-01'"
```

> **Convención DevOps**: usa f-strings para TODOS los logs. Olvidate de `%s` o `.format()`.

## Metodos utiles y slicing

**Slicing** (sintaxis: `s[start:stop:step]`):
```python
log = "2024-01-15 ERROR nginx down"
date = log[0:10]          # "2024-01-15"
level = log[11:16]        # "ERROR"
last = log[-4:]           # "down"
reverse = log[::-1]       # "nwod xignen RORRE 51-10-1202"
```

**Metodos clave**:
```python
s = "  ERROR: Disk Full  "
s.strip()              # "ERROR: Disk Full"
s.lower()              # "  error: disk full  "
s.upper()              # "  ERROR: DISK FULL  "
s.split(":")           # ["  ERROR", " Disk Full  "]
"ERROR" in s           # True
s.replace("ERROR", "CRITICAL")
s.startswith("  ")     # True
s.count("s")           # 2

# join
parts = ["2024", "01", "15"]
"-".join(parts)        # "2024-01-15"
```

> **Caso real**: `line.split()[0]` es la forma idiomatica de obtener el primer "campo" de un log.

## Puntos clave

- Usa f-strings siempre (no % o .format()). Son mas rapidas y legibles.
- Slicing s[start:stop:step] permite extraer substrings sin metodos.
- split() + join() son las herramientas #1 para parsear logs.
- strip() es obligatorio despues de leer lineas de archivos (suelen tener \
).
