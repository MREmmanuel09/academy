---
id: py-oop
slug: py-oop
title: OOP basico: clases, self, metodos
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# OOP basico: clases, self, metodos

Programacion orientada a objetos aplicada: modelar servidores, deployments, configs.

## Clases y __init__

```python
class Server:
    """Representa un servidor en el inventario."""

    def __init__(self, hostname: str, ip: str, role: str = "web"):
        self.hostname = hostname
        self.ip = ip
        self.role = role
        self.tags: list[str] = []

    def __repr__(self) -> str:
        return f"Server({self.hostname}, {self.ip}, role={self.role})"

    def add_tag(self, tag: str) -> None:
        if tag not in self.tags:
            self.tags.append(tag)

# Uso
s = Server("web-01", "10.0.0.5", role="web")
s.add_tag("prod")
print(s)  # Server(web-01, 10.0.0.5, role=web)
```

> **Convención**: `self` es el primer parametro de cada metodo de instancia. Es **obligatorio** pero lo llena Python automaticamente.

## Metodos de clase, estaticos y propiedades

```python
class Server:
    DEFAULT_PORT = 22

    def __init__(self, hostname: str):
        self.hostname = hostname

    def ssh(self) -> str:                           # metodo de instancia
        return f"ssh user@{self.hostname}"

    @classmethod
    def from_dict(cls, data: dict) -> "Server":    # constructor alternativo
        return cls(data["hostname"])

    @staticmethod
    def validate_ip(ip: str) -> bool:              # util, no usa self/cls
        parts = ip.split(".")
        return len(parts) == 4 and all(0 <= int(p) <= 255 for p in parts)

    @property
    def fqdn(self) -> str:                          # getter
        return f"{self.hostname}.internal"
```

**Patron comun DevOps**: factory method para crear objetos desde distintos formatos (JSON, YAML, API).

## Herencia (solo cuando aporta)

```python
class WebServer(Server):
    def __init__(self, hostname: str, port: int = 80):
        super().__init__(hostname, role="web")
        self.port = port

    def health_url(self) -> str:
        return f"http://{self.hostname}:{self.port}/health"

class Database(Server):
    def __init__(self, hostname: str, engine: str = "postgres"):
        super().__init__(hostname, role="db")
        self.engine = engine
```

> **Regla**: **composicion > herencia**. En DevOps casi nunca necesitas jerarquias profundas. Prefiere tener un `Server` con un atributo `service` que una jerarquia `WebServer -> ApiServer -> GraphQLServer`.

## Puntos clave

- Clase = plantilla, instancia = objeto. __init__ inicializa atributos.
- @classmethod para constructores alternativos, @staticmethod para utilidades, @property para getters.
- Composicion > herencia: prefiere "tiene un" sobre "es un".
- self es obligatorio como primer parametro, aunque Python lo llena automaticamente.
