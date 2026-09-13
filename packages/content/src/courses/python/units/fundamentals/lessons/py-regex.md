---
id: py-regex
slug: py-regex
title: Regex avanzado: parsing de logs
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 80
---

# Regex avanzado: parsing de logs

Patrones regex con re: grupos, lookaheads, named groups, parsing de logs nginx/apache.

## Modulo re: match, search, findall, sub

```python
import re

text = "Server web-01 CPU=85% MEM=92%"

# match: al inicio del string
m = re.match(r"Server (\\w+)", text)
m.group(1)         # "web-01"
m.groups()         # ("web-01",)

# search: en cualquier parte
m = re.search(r"CPU=(\\d+)%", text)
m.group(1)         # "85"

# findall: TODAS las coincidencias
re.findall(r"\\d+", text)     # ["01", "85", "92"]

# sub: reemplazar
re.sub(r"\\d+", "X", text)    # "Server web-X CPU=X% MEM=X%"

# split: dividir
re.split(r"\\s+", text)        # ["Server", "web-01", "CPU=85%", "MEM=92%"]
```

## Grupos, named groups, character classes

```python
log = '192.168.1.5 - - [15/Jan/2024:10:30:45 +0000] "GET /api HTTP/1.1" 200 1234'

# Named groups (mucho mas legible)
pattern = r"""
    (?P<ip>\\d+\\.\\d+\\.\\d+\\.\\d+)        # IP
    \\s+\\S+\\s+\\S+\\s+                     # ident, user
    \\[(?P<timestamp>[^\\]]+)\\]             # [timestamp]
    \\s+"(?P<method>\\w+)\\s+(?P<path>\\S+)\\s+\\S+"
    \\s+(?P<status>\\d+)\\s+(?P<size>\\d+)
"""

m = re.search(pattern, log, re.VERBOSE)
m.group("ip")          # "192.168.1.5"
m.group("method")      # "GET"
m.group("path")        # "/api"
m.group("status")      # "200"

# Character classes
\\d    # digito
\\w    # word char (a-z, A-Z, 0-9, _)
\\s    # whitespace
.      # cualquier char menos \\n
[abc]  # uno de estos
[^abc] # cualquiera excepto estos
^      # inicio
$      # fin
```

## Flags y performance

**Flags utiles**:
```python
re.IGNORECASE   # o re.I
re.MULTILINE    # o re.M, ^ y $ por linea
re.DOTALL       # o re.S, . incluye \\n
re.VERBOSE      # o re.X, permite comentarios y whitespace
```

**Compilar para reutilizar** (mas rapido):
```python
LOG_PATTERN = re.compile(
    r'(?P<ip>\\d+\\.\\d+\\.\\d+\\.\\d+).*?"(?P<method>\\w+) (?P<path>\\S+).*?(?P<status>\\d+)',
    re.IGNORECASE,
)

# Reutilizable
for line in log_file:
    m = LOG_PATTERN.search(line)
    if m and m.group("status").startswith("5"):
        alert(m.group("ip"))
```

**Cuantificadores** (cuidado con **catastrophic backtracking**):
- `*` 0 o mas (greedy)
- `+` 1 o mas
- `?` 0 o 1
- `{n,m}` entre n y m
- Anade `?` para hacerlo lazy: `.*?`

> **Caso real DevOps**: parser de access.log nginx para detectar ataques (paths raros, 4xx repetidos desde misma IP).

## Puntos clave

- re.match (inicio), re.search (cualquier parte), re.findall (todas), re.sub (reemplazar).
- Named groups (?P<name>...) son mas legibles que grupos numerados.
- re.compile() para patrones reutilizados — mejora performance ~30%.
- Usa re.VERBOSE para patrones complejos con comentarios.
