---
id: py-subprocess
slug: py-subprocess
title: Subprocess: ejecutar comandos del sistema
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 65
---

# Subprocess: ejecutar comandos del sistema

Lanzar procesos externos, capturar output, timeouts, pipes, async.

## subprocess.run basico

```python
import subprocess

# Basico
result = subprocess.run(["ls", "-la", "/tmp"], capture_output=True, text=True)
print(result.stdout)
print(result.returncode)      # 0 = exito

# raise si exit code != 0
result = subprocess.run(["ls", "/nonexistent"], capture_output=True, text=True, check=True)
# subprocess.CalledProcessError

# Timeout
try:
    subprocess.run(["sleep", "10"], timeout=5, check=True)
except subprocess.TimeoutExpired:
    print("Process took too long")
```

> **Regla de oro**: SIEMPRE pasa `timeout`. Sin el, tu script puede colgar para siempre.

## shell=True, pipes, input

**shell=True** (permite features de shell, pero PELIGROSO):
```python
# ❌ MAL: vulnerable a command injection
subprocess.run(f"ls {user_input}", shell=True)

# ✅ BIEN: lista de argumentos (no shell)
subprocess.run(["ls", user_input])
```

**Pipes** (encadenar comandos):
```python
# Forma moderna
p1 = subprocess.run(["ps", "aux"], capture_output=True, text=True)
p2 = subprocess.run(["grep", "python"], input=p1.stdout, capture_output=True, text=True)
print(p2.stdout)
```

**Pasar input**:
```python
subprocess.run(["python3", "script.py"], input="hello\\n", text=True)
```

## Popen avanzado

Para control fino, usa `Popen`:

```python
import subprocess

# Stream output en tiempo real
process = subprocess.Popen(
    ["docker", "build", "-t", "myapp", "."],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,    # merge stderr en stdout
    text=True,
    bufsize=1,
)

for line in process.stdout:
    print(line, end="")

process.wait()
if process.returncode != 0:
    raise RuntimeError("Build failed")
```

**Async** (no bloquea):
```python
# asyncio.create_subprocess_exec
import asyncio

async def run():
    proc = await asyncio.create_subprocess_exec(
        "sleep", "2",
        stdout=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    return proc.returncode
```

> **Tip**: si solo necesitas ejecutar un comando y leer el resultado, usa `subprocess.run`. Si necesitas streaming o async, usa `Popen` o asyncio.

## Puntos clave

- subprocess.run con lista de args (NO shell=True con user input).
- SIEMPRE timeout. check=True para raise automatico en error.
- capture_output=True + text=True para capturar stdout/stderr como str.
- Popen para streaming en tiempo real, asyncio para paralelismo.
