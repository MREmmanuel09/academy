---
id: py-variables
slug: py-variables
title: Variables, tipos primitivos y operadores
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# Variables, tipos primitivos y operadores

Asignacion, tipos basicos (int, float, str, bool), operadores aritmeticos y de comparacion.

## Variables y asignacion

Python es **dinamicamente tipado**: no declaras el tipo, lo infiere.

```python
# Asignacion basica
hostname = "web-01"
cpu_count = 4
cpu_usage = 73.5
is_healthy = True

# Asignacion multiple
user, host, port = "admin", "db.internal", 5432

# Constante (por convencion, MAYUSCULAS)
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30
```

> **Convención**: snake_case para variables y funciones, UPPER_SNAKE_CASE para constantes, PascalCase para clases. Esto es **PEP 8** y lo esperan los linters.

## Tipos primitivos

**Tipo | Ejemplo | Uso comun**:
- **int**: `42`, `-1`, `0xff` (hex) — puertos, counts, retries
- **float**: `3.14`, `0.1`, `1e-9` — metricas, porcentajes
- **str**: `"hola"`, `'devops'`, `f"{var}"` — nombres, paths
- **bool**: `True`, `False` — flags, condiciones
- **None**: `None` (equivale a `null`) — "ausencia de valor"

**Verificar tipo**:
```python
type(cpu_count)     # <class 'int'>
isinstance(cpu_count, int)   # True
```

**Casting**:
```python
int("42")        # 42
str(42)          # "42"
float("3.14")    # 3.14
bool(0)          # False
bool(1)          # True
```

## Operadores

**Aritmeticos**: `+`, `-`, `*`, `/` (division real), `//` (entera), `%` (modulo), `**` (potencia).

```python
10 / 3     # 3.3333...
10 // 3    # 3
10 % 3     # 1
2 ** 10    # 1024
```

**Comparacion**: `==`, `!=`, `<`, `>`, `<=`, `>=`.

**Logicos**: `and`, `or`, `not`.

```python
cpu = 85
memory = 90
if cpu > 80 and memory > 80:
    print("Critical load")
```

**Pertenencia**: `in`, `not in`.

```python
"web" in hostname       # True si hostname contiene "web"
port in [80, 443]       # False
```

> **Truco DevOps**: `divmod(10, 3)` devuelve `(3, 1)` (cociente, resto) en una sola llamada. Util para convertir bytes a KB/MB.

## Puntos clave

- Python infiere tipos dinamicamente pero respeta convenciones PEP 8.
- Tipos primitivos: int, float, str, bool, None.
- Usa // para division entera y % para modulo (util en scripts de monitoreo).
- Operadores logicos and/or/not se evalúan con cortocircuito (evalúa lo minimo).

:::quiz
[
  {
    "question": "Is Python statically or dynamically typed?",
    "options": ["Statically typed", "Dynamically typed", "Untyped", "Weakly typed only"],
    "correctIndex": 1,
    "explanation": "Python is dynamically typed — you don't declare variable types and the interpreter infers them at runtime."
  },
  {
    "question": "What does `*` do in Python unpacking (e.g., `a, *b = [1,2,3,4]`)?",
    "options": ["Multiplies values", "The rest operator — collects remaining elements", "Creates a pointer", "Declares a constant"],
    "correctIndex": 1,
    "explanation": "The `*` operator in unpacking is the rest operator. It collects remaining elements into a list (e.g., `b` would be `[2,3,4]`)."
  },
  {
    "question": "How do you declare a constant in Python by convention?",
    "options": ["Using the `const` keyword", "Using UPPER_CASE naming", "Using the `final` decorator", "Constants cannot be declared in Python"],
    "correctIndex": 1,
    "explanation": "Python doesn't have a true constant keyword. By PEP 8 convention, constants are named in UPPER_SNAKE_CASE (e.g., MAX_RETRIES = 3)."
  }
]
:::

:::code python
# Variables y tipos
hostname = "web-01"
cpu_count = 4
cpu_usage = 73.5
is_healthy = True

print(f"Host: {hostname}")
print(f"CPU cores: {cpu_count}")
print(f"Usage: {cpu_usage}%")
print(f"Healthy: {is_healthy}")
:::
