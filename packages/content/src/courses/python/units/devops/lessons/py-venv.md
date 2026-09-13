---
id: py-venv
slug: py-venv
title: Entornos virtuales: venv, pip, requirements.txt
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# Entornos virtuales: venv, pip, requirements.txt

Aislamiento de dependencias, pip, freeze, requirements.txt, herramientas modernas (poetry, uv).

## Por que venv

**Problema**: dos proyectos necesitan versiones distintas de la misma libreria.

```bash
# Proyecto A: requests 2.25
# Proyecto B: requests 2.31
# Sin venv, solo puede haber una version global.
```

**Solucion**: **virtual environment** = directorio con su propio Python y pip.

```bash
# Crear
python3 -m venv .venv

# Activar (Linux/macOS)
source .venv/bin/activate

# Activar (Windows PowerShell)
.venv\\Scripts\\Activate.ps1

# Verificar
which python      # apunta a .venv/bin/python
pip list          # solo paquetes del venv
```

> **Convención**: nombra el directorio `.venv` (con punto, oculto). Añadelo a `.gitignore`.

## pip y requirements.txt

```bash
# Instalar
pip install requests
pip install requests==2.31.0
pip install "requests>=2.30"

# Desde archivo
pip install -r requirements.txt

# Guardar dependencias
pip freeze > requirements.txt
# requests==2.31.0
# urllib3==2.1.0
# ...

# Listar
pip list
pip show requests
```

**requirements.txt** es la forma clasica. Versiona este archivo en git.

**requirements-dev.txt** para dependencias de desarrollo:
```
-r requirements.txt
pytest==7.4.0
black==23.10.0
ruff==0.1.0
```

> **Tip DevOps**: en Docker copia solo requirements.txt primero, instala, luego copia el codigo. Aprovecha la cache de capas:
> ```dockerfile
> COPY requirements.txt .
> RUN pip install -r requirements.txt
> COPY . .
> ```

## Herramientas modernas

**pyproject.toml** (PEP 621) — el estandar moderno:

```toml
[project]
name = "myapp"
version = "0.1.0"
dependencies = [
    "requests>=2.31",
    "boto3>=1.28",
]

[project.optional-dependencies]
dev = ["pytest", "black", "ruff"]
```

**uv** (Rust-based, ultra rapido) — el nuevo rey:
```bash
# Instalar uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Crear venv + instalar deps
uv venv
uv pip install -r requirements.txt
uv pip compile requirements.in -o requirements.txt
```

**Alternativas**: `poetry`, `pdm`, `pipenv` (mas viejo, problematico).

> **Recomendacion 2025**: `uv` para velocidad, `poetry` para proyectos con publishing, `pip + requirements.txt` para scripts simples.

## Puntos clave

- venv aísla dependencias por proyecto. SIEMPRE usarlo, incluso para scripts.
- requirements.txt versiona dependencias. pip freeze > requirements.txt.
- En Docker, copia requirements.txt antes que el codigo para cachear capas.
- uv es el reemplazo moderno de pip — 10-100x mas rapido.
