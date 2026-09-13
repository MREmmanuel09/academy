---
id: py-intro
slug: py-intro
title: Introduccion a Python para DevOps
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# Introduccion a Python para DevOps

Por que Python, instalacion, REPL y tu primer script "Hello DevOps".

## Por que Python en DevOps

**Python** es el lenguaje dominante en DevOps por su **legibilidad, ecosistema y velocidad de desarrollo**.

**Casos de uso reales en DevOps**:
- **Automatizacion**: scripts que reemplazan tareas manuales
- **Infrastructure as Code**: Pulumi, AWS CDK
- **CI/CD**: scripts de build, test, deploy
- **Monitoring/Alerting**: scrapers, parsers, bots
- **Cloud SDKs**: boto3 (AWS), google-cloud (GCP), azure-sdk
- **Testing**: pytest para validar IaC, scripts, APIs
- **Data pipelines**: ETL para logs, metricas

**Alternativas**: Bash (mas limitado), Go (mas rapido pero verboso), Ruby (Rails legacy), Ansible YAML (declarativo).

> **Regla**: si tu script bash pasa de 50 lineas, escribelo en Python.

## Instalacion de Python

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv -y
python3 --version
pip3 --version
```

**macOS** (con Homebrew):
```bash
brew install python@3.11
python3 --version
```

**Windows**: descarga desde python.org o usa **winget**:
```powershell
winget install Python.Python.3.11
```

**Verificacion**:
```bash
python3 --version    # Python 3.11.x
which python3        # /usr/bin/python3
pip3 --version       # pip 23.x
```

> **Tip DevOps**: en servidores **nunca** uses `python` (puede ser Python 2 legacy). Usa siempre `python3` y `pip3`.

## El REPL y tu primer script

**REPL** (Read-Eval-Print Loop): ejecutas Python linea por linea.
```bash
python3
>>> print("Hello DevOps")
Hello DevOps
>>> 2 + 2
4
>>> exit()
```

**Tu primer script** — crea `hello_devops.py`:
```python
#!/usr/bin/env python3
"""Mi primer script de DevOps."""

import platform
import sys


def main() -> int:
    """Punto de entrada principal."""
    name = platform.node()
    py_version = sys.version_info
    print(f"Hello DevOps desde {name}")
    print(f"Python {py_version.major}.{py_version.minor}.{py_version.micro}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

**Ejecutar**:
```bash
python3 hello_devops.py
chmod +x hello_devops.py
./hello_devops.py
```

> **Convención clave**: `if __name__ == "__main__"` evita que el codigo se ejecute cuando el archivo se **importa** desde otro script. Usalo SIEMPRE.

## Puntos clave

- Python domina DevOps: scripting, IaC, SDKs, automation, monitoring.
- Usa python3 (no python). Verifica con --version.
- El REPL sirve para experimentar; los scripts para tareas reales.
- Estructura con main() y "if __name__ == __main__" como convencion profesional.
