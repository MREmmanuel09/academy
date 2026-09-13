---
id: py-exceptions
slug: py-exceptions
title: Excepciones: try/except/finally, custom
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# Excepciones: try/except/finally, custom

Manejo de errores, jerarquia de excepciones, raise, custom exceptions para scripts robustos.

## try/except basico

```python
try:
    with open("/var/log/missing.log") as f:
        data = f.read()
except FileNotFoundError:
    print("Log file not found")
except PermissionError:
    print("No permission to read")
except Exception as e:
    print(f"Unexpected: {e}")
    raise   # re-lanza (util para logging y propagar)
```

> **Regla DevOps**: en scripts, **siempre** captura excepciones especificas. Nunca `except:` (captura TODO, incluido KeyboardInterrupt).

## else, finally, raise

```python
try:
    response = requests.get(url, timeout=5)
    response.raise_for_status()    # raise si 4xx/5xx
except requests.RequestException as e:
    alert(f"API check failed: {e}")
else:
    # se ejecuta si NO hubo excepcion
    print(f"OK: {response.status_code}")
finally:
    # SIEMPRE se ejecuta (cleanup)
    close_connection()
```

**Raise** (lanzar):
```python
def set_replicas(count: int) -> None:
    if count < 1:
        raise ValueError(f"replicas must be >= 1, got {count}")
    ...
```

## Custom exceptions

```python
class ConfigError(Exception):
    """Error en la configuracion del servicio."""
    pass

class HealthCheckFailed(Exception):
    """Health check fallo despues de N intentos."""
    def __init__(self, host: str, attempts: int):
        self.host = host
        self.attempts = attempts
        super().__init__(f"Health check failed for {host} after {attempts} attempts")

# Uso
def check_health(host: str) -> None:
    for i in range(3):
        if ping(host):
            return
    raise HealthCheckFailed(host, attempts=3)
```

**Jerarquia comun**:
- `Exception` (todas las no-sistema)
- `ValueError`: valor invalido
- `TypeError`: tipo incorrecto
- `KeyError`: key no existe en dict
- `FileNotFoundError`, `PermissionError`: I/O
- `ConnectionError`, `TimeoutError`: red

> **Caso real**: en CLIs DevOps, custom exceptions + logging estructurado = troubleshooting rapido cuando el script falla en produccion.

## Puntos clave

- try/except/else/finally: estructura completa de manejo de errores.
- Captura excepciones ESPECIFICAS (FileNotFoundError), nunca "Exception" generico.
- finally se ejecuta SIEMPRE — util para cleanup (cerrar conexiones, archivos).
- Custom exceptions documentan mejor la logica que strings de error.
