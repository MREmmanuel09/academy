---
id: py-ssh
slug: py-ssh
title: SSH remoto con paramiko
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# SSH remoto con paramiko

Ejecutar comandos y transferir archivos por SSH desde Python: paramiko y fabric.

## paramiko basico

```bash
pip install paramiko
```

```python
import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    hostname="web-01.internal",
    username="admin",
    key_filename="~/.ssh/id_rsa",       # o password="..."
    timeout=10,
)

# Ejecutar comando
stdin, stdout, stderr = client.exec_command("uptime")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
print("Exit:", stdout.channel.recv_exit_status())

client.close()
```

> **Tip**: en produccion usa `key_filename` (no password). La key deberia venir de un secrets manager.

## SFTP y transferencia de archivos

```python
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("web-01", username="admin", key_filename="~/.ssh/id_rsa")

# SFTP
sftp = client.open_sftp()
sftp.put("local/config.yaml", "/etc/app/config.yaml")
sftp.get("/var/log/app.log", "local/app.log")
sftp.chmod("/etc/app/config.yaml", 0o600)
sftp.close()

client.close()
```

**Context manager (mas limpio)**:
```python
with paramiko.SSHClient() as client:
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect("web-01", username="admin", key_filename="~/.ssh/id_rsa")
    stdin, stdout, stderr = client.exec_command("uptime")
    print(stdout.read().decode())
```

## Fabric: SSH de alto nivel

Fabric envuelve paramiko con una API mas amigable.

```bash
pip install fabric
```

```python
from fabric import Connection

c = Connection("web-01.internal", user="admin", connect_kwargs={"key_filename": "~/.ssh/id_rsa"})

# Ejecutar
result = c.run("uptime", hide=True)
print(result.stdout)

# Con sudo
c.sudo("systemctl restart nginx", warn=True)

# SFTP
c.put("local.txt", "/tmp/remote.txt")
c.get("/var/log/app.log", "local.log")

# Multi-host
from fabric import SerialGroup
for conn in SerialGroup("web-01", "web-02", user="admin"):
    conn.run("uptime")
```

> **Alternativas**: `asyncssh` (async), `ansible` (declarativo, sin codigo Python).

## Puntos clave

- paramiko: cliente SSH de bajo nivel, soporta exec y SFTP.
- SIEMPRE key_filename en lugar de password. Carga la key de un vault.
- set_missing_host_key_policy(AutoAddPolicy) acepta hosts nuevos (peligroso en prod).
- Fabric: API mas amigable sobre paramiko. Ideal para scripts multi-host.
