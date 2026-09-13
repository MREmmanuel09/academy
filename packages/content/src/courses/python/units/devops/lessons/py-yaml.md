---
id: py-yaml
slug: py-yaml
title: YAML y TOML con PyYAML y tomllib
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 60
---

# YAML y TOML con PyYAML y tomllib

Parsear y generar archivos de configuracion YAML/TOML, anchors, multilineas, errores comunes.

## YAML con PyYAML

```bash
pip install pyyaml
```

```python
import yaml

# Parsear
with open("config.yaml") as f:
    config = yaml.safe_load(f)

# config es un dict de Python normal
config["servers"][0]["hostname"]   # "web-01"

# Generar
data = {
    "version": "3.11",
    "services": {
        "web": {"image": "nginx:1.25", "replicas": 3},
    },
}
print(yaml.dump(data, default_flow_style=False, sort_keys=False))
```

**Usa safe_load, NUNCA load** (riesgo de ejecucion de codigo).

## Anchors, multilineas y errores comunes

**YAML anchors** (referencias):
```yaml
defaults: &defaults
  timeout: 30
  retries: 3

services:
  web:
    <<: *defaults
    image: nginx
  api:
    <<: *defaults
    image: myapi
```

**Multilineas**:
```yaml
description: |
  Esta es una
  descripcion larga
  preserva saltos de linea

description2: >
  Esta se pliega
  en una sola linea
```

**Errores comunes DevOps**:
- Mezclar tabs y espacios (solo espacios)
- Sangria inconsistente (YAML es estricto)
- Strings con caracteres especiales sin comillas
- Booleanos: `yes/no/on/off/true/false` son validos — ¡cuidado con `NO`!

> **Tip**: cuando algo no parsea, `yaml.YAMLError` da la linea exacta. Usalo en try/except.

## TOML con tomllib (3.11+)

**TOML** = Tom's Obvious Minimal Language. Estandar para `pyproject.toml`.

```python
import tomllib   # stdlib en 3.11+

with open("config.toml", "rb") as f:
    config = tomllib.load(f)

# Para escribir, usa tomli_w o tomllib desde 3.13
```

```toml
# config.toml
[server]
host = "0.0.0.0"
port = 8080

[database]
engine = "postgres"
host = "db.internal"
port = 5432
pool_size = 10
```

> **DevOps**: TOML es mas estricto que YAML, sin problemas de indentacion. Preferido para configs de Python y Rust.

## Puntos clave

- yaml.safe_load (NUNCA load — riesgo de RCE).
- Anchors (&, *) permiten reutilizar bloques en YAML.
- Usa "|" para multilineas literales, ">" para folded.
- tomllib en stdlib 3.11+ — preferido para configs nuevas (pyproject.toml).
