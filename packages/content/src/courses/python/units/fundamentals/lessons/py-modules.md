---
id: py-modules
slug: py-modules
title: Modulos, paquetes y __init__.py
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# Modulos, paquetes y __init__.py

Organizar codigo en modulos, paquetes, importacion, __name__, estructura profesional.

## Modulos basicos

**Modulo** = cualquier archivo `.py`.

```python
# utils.py
def parse_log(line: str) -> dict: ...
def format_size(bytes: int) -> str: ...
CONSTANT = 42
```

```python
# main.py
import utils
from utils import parse_log, format_size
from utils import CONSTANT as MAX
import utils as u
```

> **Convención**: `import modulo` o `from modulo import nombre`. Evita `from modulo import *` (contamina el namespace).

## __name__ y __init__.py

```python
# logger.py
def log(msg: str) -> None:
    print(f"[LOG] {msg}")

if __name__ == "__main__":
    # Solo se ejecuta si corres "python logger.py"
    # NO se ejecuta si haces "import logger"
    log("Direct execution")
```

**Paquete** = directorio con `__init__.py`:

```
mypackage/
├── __init__.py         # puede estar vacio o exponer API
├── config.py
├── api/
│   ├── __init__.py
│   ├── client.py
│   └── models.py
└── utils/
    ├── __init__.py
    └── helpers.py
```

```python
# Importar
from mypackage import config
from mypackage.api.client import APIClient
from mypackage.utils.helpers import format_size
```

## sys.path y estructura profesional

Python busca modulos en:
1. El directorio del script actual
2. `PYTHONPATH` (env var)
3. `sys.path` (modificable en runtime)

```python
import sys
sys.path.append("/opt/myapp/lib")
```

**Estructura recomendada para scripts DevOps**:

```
devops-tool/
├── pyproject.toml          # configuracion del proyecto
├── README.md
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── cli.py          # entry point
│       ├── config.py
│       ├── core/
│       └── utils/
└── tests/
    └── test_core.py
```

> **Tip**: nunca pongas `__init__.py` vacio en **namespace packages** (Python 3.3+). Pero si quieres "explicit is better than implicit", ponlo.

## Puntos clave

- Modulo = archivo .py. Paquete = directorio con __init__.py.
- if __name__ == "__main__" separa "ejecutable" de "importable".
- Evita "import *" — contamina el namespace.
- Estructura profesional: src/ + tests/ + pyproject.toml.
