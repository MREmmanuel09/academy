---
id: py-logging
slug: py-logging
title: Logging estructurado: logging + JSON
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Logging estructurado: logging + JSON

Logging profesional con el modulo logging: niveles, handlers, formato JSON para produccion.

## Por que logging, no print

```python
# ❌ MAL: print para scripts en produccion
print("Server started")
print("ERROR: connection failed")

# ✅ BIEN: logging module
import logging
logging.info("Server started")
logging.error("Connection failed")
```

**Ventajas de logging**:
- **Niveles**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Handlers**: consola, archivo, syslog, HTTP, Slack
- **Formato configurable**: timestamp, modulo, nivel, mensaje
- **Filtrado**: por nivel, por modulo
- **Performance**: print siempre escribe, logging puede no hacerlo segun nivel

## Configuracion basica

```python
import logging

# Forma simple
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logging.debug("Debug info")       # no aparece
logging.info("Server started")    # aparece
logging.warning("High CPU")       # aparece
logging.error("DB connection failed")
logging.critical("Service down")
```

**Logger por modulo** (recomendado):
```python
# miapp/api.py
import logging
logger = logging.getLogger(__name__)

def get_user(user_id: int):
    logger.info("Fetching user %s", user_id)
    user = db.query(user_id)
    if not user:
        logger.warning("User %s not found", user_id)
    return user
```

## Logging estructurado JSON (produccion)

En produccion los logs se ingieren a sistemas como **Loki, Elasticsearch, Datadog**. Necesitan JSON.

```bash
pip install python-json-logger
```

```python
import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    "%(asctime)s %(name)s %(levelname)s %(message)s",
    rename_fields={"asctime": "timestamp", "levelname": "level"},
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

logger.info("user_login", extra={"user_id": 42, "ip": "10.0.0.5"})
```

**Output**:
```json
{"timestamp": "2024-01-15T10:30:00", "name": "root", "level": "INFO", "message": "user_login", "user_id": 42, "ip": "10.0.0.5"}
```

> **Tip DevOps**: en Kubernetes + Loki, JSON logging es obligatorio. Tambien pasa a Fluent Bit/Filebeat para parseo.

## Puntos clave

- Usa logging (nunca print en produccion). Niveles: DEBUG/INFO/WARNING/ERROR/CRITICAL.
- logger = logging.getLogger(__name__) en cada modulo.
- JSON logging para ingestion en Loki/Elasticsearch/Datadog.
- extra={} agrega contexto estructurado (user_id, request_id, etc).
