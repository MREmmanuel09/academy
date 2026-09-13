---
id: py-files
slug: py-files
title: File I/O: open, with, modos
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# File I/O: open, with, modos

Leer y escribir archivos: open(), context manager with, encoding, modos (r/w/a/b).

## Leer archivos

```python
# Forma CORRECTA: con context manager
with open("/var/log/app.log", "r", encoding="utf-8") as f:
    content = f.read()          # todo el archivo (cuidado con archivos grandes)
    lines = f.readlines()       # lista de lineas (con \\n)
    for line in f:              # iterador (mas eficiente)
        process(line)
```

> **Regla de oro DevOps**: SIEMPRE usa `with`. Si el script crashea entre `open()` y `close()`, el archivo queda abierto (file descriptor leak).

## Escribir archivos

```python
# Escribir (sobreescribe!)
with open("output.txt", "w", encoding="utf-8") as f:
    f.write("Hello\\n")
    f.writelines(["line1\\n", "line2\\n"])

# Anadir (append)
with open("output.txt", "a") as f:
    f.write("appended line\\n")

# Modos comunes:
# "r" lectura (default)
# "w" escritura (sobreescribe, crea si no existe)
# "a" append (anade al final)
# "x" crear (falla si existe)
# "b" binario: "rb", "wb"
# "+" actualizar: "r+", "w+"
```

## Casos practicos DevOps

**Parsear log y reportar errores**:
```python
errors = 0
with open("/var/log/nginx/access.log") as f:
    for line in f:
        if " 5\\d\\d " in line:   # 5xx status
            errors += 1
print(f"5xx errors: {errors}")
```

**Escribir JSON pretty**:
```python
import json
data = {"servers": ["web-01", "web-02"], "replicas": 3}
with open("config.json", "w") as f:
    json.dump(data, f, indent=2)
```

**Verificar existencia**:
```python
import os
if os.path.exists("/etc/app/config.yaml"):
    with open("/etc/app/config.yaml") as f:
        config = f.read()
```

> **Tip**: en Python 3.10+ usa `encoding="utf-8"` SIEMPRE. Sin esto, Windows puede leer el archivo en CP1252 y romper caracteres.

## Puntos clave

- Usa "with open() as f:" SIEMPRE — garantiza el cierre del archivo.
- Especifica encoding="utf-8" para evitar problemas multiplataforma.
- Modo "w" sobreescribe, "a" append, "b" binario. Lee la doc si dudas.
- Iterar el archivo (for line in f) es mas eficiente que .readlines().
