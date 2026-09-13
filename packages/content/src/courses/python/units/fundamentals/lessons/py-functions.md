---
id: py-functions
slug: py-functions
title: Funciones, *args, **kwargs, lambdas
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# Funciones, *args, **kwargs, lambdas

Definir funciones, argumentos, valores por defecto, *args, **kwargs, lambdas.

## Definir funciones

```python
def greet(name: str) -> str:
    """Devuelve un saludo."""
    return f"Hola, {name}"

# Docstring (obligatorio en codigo profesional)
def check_disk(path: str, threshold: float = 90.0) -> bool:
    """Verifica si el disco excede el threshold.

    Args:
        path: Ruta a chequear.
        threshold: Porcentaje maximo permitido (default 90).

    Returns:
        True si el disco esta por debajo del threshold.
    """
    usage = get_disk_usage(path)
    return usage < threshold
```

> **Tip**: las anotaciones de tipo (`name: str`, `-> str`) son **opcionales** pero muy utiles en DevOps: los linters y el equipo saben que esperar.

## *args y **kwargs

```python
# *args: argumentos posicionales variables (tuple)
def connect(*hosts: str) -> None:
    for host in hosts:
        ssh(host)

connect("web-01", "web-02", "db-01")

# **kwargs: argumentos con nombre variables (dict)
def deploy(app: str, **options: Any) -> None:
    region = options.get("region", "us-east-1")
    replicas = options.get("replicas", 3)
    print(f"Deploying {app} to {region} with {replicas} replicas")

deploy("api", region="eu-west-1", replicas=5)

# Combinacion
def run(command: str, *args: str, **flags: bool) -> None:
    ...
```

## Lambdas y funciones de orden superior

**Lambda** = funcion anonima de una sola expresion. Usala con moderacion.

```python
# Sintaxis: lambda params: expresion
square = lambda x: x ** 2
square(5)        # 25

# Orden superior: funciones que reciben/retornan funciones
ports = [80, 443, 8080, 22]
web_ports = list(filter(lambda p: p in (80, 443, 8080), ports))
sorted_ports = sorted(ports, key=lambda p: -p)  # descendente

# Mejor que lambda: usa def para logica compleja
def is_web_port(port: int) -> bool:
    return port in (80, 443, 8080, 8443)
```

> **Regla PEP 8**: `def` siempre que la logica ocupe mas de 1 linea o tenga nombre claro. Lambdas solo para callbacks de una linea.

## Puntos clave

- def define funciones. Docstring obligatorio en codigo profesional.
- *args captura argumentos posicionales variables, **kwargs los nombrados.
- Type hints (: str, -> bool) mejoran la claridad y permiten type checking.
- Lambdas solo para callbacks de una linea. Para mas, usa def.

:::quiz
[
  {
    "question": "What is `*args` in a Python function?",
    "options": ["Keyword arguments as a dictionary", "Variable positional arguments captured as a tuple", "A single argument that must be passed", "A constant argument"],
    "correctIndex": 1,
    "explanation": "`*args` captures any additional positional arguments passed to a function and stores them as a tuple."
  },
  {
    "question": "What is `**kwargs` in a Python function?",
    "options": ["Variable positional arguments as a list", "Variable keyword arguments captured as a dictionary", "A required named argument", "A global variable"],
    "correctIndex": 1,
    "explanation": "`**kwargs` captures any additional keyword arguments passed to a function and stores them as a dictionary."
  },
  {
    "question": "What is a lambda in Python?",
    "options": ["A named function with a docstring", "An anonymous single-expression function", "A class method", "A loop construct"],
    "correctIndex": 1,
    "explanation": "A lambda is an anonymous (unnamed) function limited to a single expression. Use it for simple callbacks; use `def` for anything complex."
  }
]
:::

:::code python
# Funciones
def greet(name: str) -> str:
    return f"Hola, {name}"

def check_disk(path: str, threshold: float = 90.0) -> bool:
    usage = 75.0  # simulated
    return usage > threshold

print(greet("DevOps Engineer"))
print(f"Disk alert: {check_disk('/var/log', 80.0)}")
:::
