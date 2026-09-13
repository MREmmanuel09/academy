---
id: py-conditionals
slug: py-conditionals
title: if/elif/else y match/case
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 45
---

# if/elif/else y match/case

Control de flujo condicional, expresiones ternarias y pattern matching (Python 3.10+).

## if/elif/else basico

```python
cpu = 85

if cpu > 90:
    print("CRITICAL")
elif cpu > 80:
    print("WARNING")
elif cpu > 50:
    print("OK")
else:
    print("IDLE")
```

> **Indentacion**: Python usa 4 espacios (no tabs) para bloques. **PEP 8**. Mezclar genera `IndentationError`.

## Operadores y truthiness

```python
# Combinaciones
if cpu > 80 and memory > 80:
    alert("both high")

if status == "down" or health_check_failed:
    page("oncall")

# Negacion
if not is_healthy:
    alert()

# Membership
if port in (80, 443, 8080):
    print("web port")
```

**Valores "falsy"** (se evaluan como False):
- `False`, `None`, `0`, `0.0`, `""`, `[]`, `()`, `{}`, `set()`

**Truco DevOps** — verificar lista vacia:
```python
failed_hosts = []
if not failed_hosts:           # mejor que if len(failed_hosts) == 0
    print("All healthy")
```

## Ternarias y match/case (3.10+)

**Expresion ternaria** (inline):
```python
status = "healthy" if cpu < 80 else "alert"
```

**match/case** — pattern matching, similar a switch:
```python
match http_status:
    case 200:
        print("OK")
    case 301 | 302:
        print("Redirect")
    case 404:
        print("Not Found")
    case 500:
        print("Server Error")
    case _:
        print("Unknown")
```

> **Tip**: en Python <3.10 usa `if/elif/else` o un dict de dispatch:
> ```python
> handler = {200: handle_ok, 404: handle_404}.get(status, handle_unknown)
> handler()
> ```

## Puntos clave

- Indentacion define bloques (4 espacios, PEP 8).
- Valores falsy: 0, "", [], {}, None, False. Usalos para checks idiomáticos.
- Expresion ternaria: X if cond else Y — para asignaciones simples.
- match/case (3.10+) es ideal para HTTP status, exit codes, dispatch por tipo.

:::code python
# Condicionales en DevOps
cpu = 85
memory = 45

if cpu > 90:
    status = "critical"
elif cpu > 70:
    status = "warning"
else:
    status = "healthy"

action = "scale up" if cpu > 80 else "no action"
print(f"Status: {status}, Action: {action}")
:::
