---
id: linux-adv-1
slug: linux-adv-1
title: Linux Avanzado: systemd, performance y tuning
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 110
---

# Linux Avanzado: systemd, performance y tuning

systemd, journalctl, cgroups, namespaces, performance tuning con sysctl, strace, perf.

## systemd: el init moderno

**systemd** es el sistema de init y gestor de servicios en la mayoria de distribuciones Linux modernas (creado por Lennart Poettering y Kay Sievers, 2010). Reemplazo a SysV init.

### Conceptos clave

- **Unit**: archivo de configuracion de un servicio (.service, .socket, .timer, .mount)
- **Target**: agrupacion de units (multi-user.target = runlevel 3 en SysV)
- **Cgroup**: grupo de control para limitar recursos (CPU, RAM, IO) por proceso
- **Namespace**: aislamiento del sistema (PID, network, mount, user)

### Comandos esenciales

```bash
systemctl status nginx                    # estado del servicio
systemctl start/stop/restart nginx        # control
systemctl enable nginx                    # iniciar en boot
systemctl list-units --type=service       # listar servicios
systemctl daemon-reload                   # recargar configs
journalctl -u nginx -f                    # logs en vivo del servicio
journalctl -u nginx --since "1 hour ago"  # logs por tiempo
journalctl -p err -b                      # errores del ultimo boot
```

### Crear tu propio servicio

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=Mi aplicacion
After=network.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/etc/myapp/env

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now myapp
```

## cgroups: limites de recursos

Los **cgroups** (control groups) permiten limitar CPU, RAM, IO, red por proceso o grupo de procesos. systemd los usa para cada service.

```ini
[Service]
# Limitar a 50% de CPU (1 = 100% de 1 core)
CPUQuota=50%

# Limitar a 512MB de RAM
MemoryMax=512M

# Limitar IO a 10MB/s
IOWeight=100

# Limitar tasks (procesos/threads)
TasksMax=100
```

### Namespaces: aislamiento

Docker usa **namespaces** para aislar contenedores:
- **PID namespace**: cada contenedor ve sus propios PIDs
- **Network namespace**: interfaces de red aisladas
- **Mount namespace**: su propio filesystem
- **User namespace**: UIDs aislados
- **UTS namespace**: hostname propio
- **IPC namespace**: comunicacion entre procesos aislada

```bash
# Ver namespaces de un proceso
ls -la /proc/1/ns/

# Crear un namespace nuevo
unshare --pid --fork bash
# Ahora el nuevo shell tiene su propio PID namespace
ps aux  # solo vera PIDs del nuevo namespace
```

> **Dato historico**: Los cgroups fueron creados por Google en 2006 (con la merge de Paul Menage en kernel 2.6.24, 2008). Los namespaces vienen de la herencia de Plan 9 y fueron a\u00f1adidos al kernel Linux progresivamente desde 2.4.19 (2002) hasta 3.8 (2013).

## Performance tuning con sysctl y herramientas

### sysctl: tunear el kernel en vivo

```bash
# Ver todos los parametros
sysctl -a | head -20

# Cambiar en vivo
sudo sysctl -w net.core.somaxconn=1024

# Hacer permanente en /etc/sysctl.d/99-custom.conf
echo "net.core.somaxconn=1024" | sudo tee /etc/sysctl.d/99-custom.conf
sudo sysctl -p /etc/sysctl.d/99-custom.conf
```

### Parametros criticos para servidores

```bash
# Red
net.core.somaxconn=1024           # max conexiones en cola
net.ipv4.tcp_max_syn_backlog=1024  # SYN backlog
net.core.netdev_max_backlog=5000

# File descriptors
fs.file-max=100000               # maximo de FDs globales
fs.nr_open=1048576               # maximo por proceso

# Memoria virtual
vm.swappiness=10                  # preferir RAM sobre swap (0-100)
vm.dirty_ratio=15                 # % RAM antes de escribir a disco
```

### strace: ver que esta haciendo un proceso

```bash
# Ver las llamadas al sistema de un proceso
strace -p 1234                     # attach a proceso existente
strace -e open,read,write ls       # filtrar syscalls especificas
strace -c ls                      # resumen estadistico
strace -f -e trace=network nginx   # -f sigue forks, -e filtra
```

### perf: profiling de CPU

```bash
# Top en vivo (como top, pero para CPU events)
perf top

# Grabar 10 segundos
perf record -F 99 -a -g -- sleep 10
perf report

# Ver hotspots de un proceso
perf top -p $(pidof nginx)
```

### Otras herramientas utiles

- **iotop**: ver IO por proceso (como top para IO)
- **nicstat**: estadisticas de red por interfaz
- **pidstat** (sysstat): CPU/RAM/IO por proceso
- **lsof**: listar archivos abiertos por proceso
- **tcpdump**: capturar trafico de red
- **htop**: top mejorado con tree view

> **Consejo SRE**: Antes de optimizar, **mide**. El 90% de las "optimizaciones" son especulacion. Usa perf, strace, y metricas antes de cambiar parametros del kernel.

## Networking en Linux

### Comandos de red esenciales

```bash
ip addr show                       # ver interfaces (reemplaza ifconfig)
ip route show                      # ver tabla de routing
ip link set eth0 up/down            # up/down interface
ip addr add 192.168.1.10/24 dev eth0

# SS (reemplaza netstat)
ss -tuln                            # puertos escuchando
ss -tulnp                           # con proceso
ss -s                               # estadisticas

# Ver conexiones activas
ss -tan state established

# Diagnostico
traceroute 8.8.8.8
mtr -n 8.8.8.8                      # traceroute continuo
tcpdump -i any port 80 -n          # capturar trafico puerto 80
```

### iptables / nftables (firewall)

```bash
# iptables (legacy, sigue funcionando)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -j DROP            # bloquear todo lo demas
iptables -L -n                      # listar reglas

# nftables (moderno, sucesor de iptables)
nft add table inet filter
nft add chain inet filter input { type filter hook input priority 0 \; }
nft add rule inet filter input tcp dport 22 accept
nft add rule inet filter input drop
```

### Bonding y VLANs

```bash
# Crear interface bond (para HA)
modprobe bonding
ip link add bond0 type bond mode 802.3ad
ip link set eth0 master bond0
ip link set eth1 master bond0

# Crear VLAN
ip link add link eth0 name eth0.100 type vlan id 100
ip addr add 10.0.100.1/24 dev eth0.100
```

## Puntos clave

- systemd es el init moderno de Linux (Lennart Poettering, 2010), reemplaza a SysV.
- cgroups limitan recursos (CPU, RAM, IO); namespaces aislan vistas del sistema (PID, network, etc).
- sysctl permite tunear el kernel en vivo; somaxconn y swappiness son criticos para servidores.
- strace y perf son las herramientas de oro para diagnosticar problemas de performance.

:::quiz
[
  {
    "question": "cgroups frente a namespaces?",
    "options": ["Iguales", "cgroups limitan recursos (CPU/RAM/IO); namespaces aislan vistas (PID, red...)", "namespaces limitan CPU", "cgroups aislan red"],
    "correctIndex": 1,
    "explanation": "La base de los containers: limites + aislamiento componen el sandbox."
  },
  {
    "question": "Para que sirve sysctl?",
    "options": ["Instalar paquetes", "Tunear el kernel en vivo (somaxconn, swappiness...)", "Editar usuarios", "Compilar"],
    "correctIndex": 1,
    "explanation": "Parametros en /proc/sys: red, memoria y limites sin reiniciar."
  },
  {
    "question": "Proceso lento misterioso: con que miras syscalls y hotspots?",
    "options": ["ls y cat", "strace (syscalls) y perf (profiling)", "reboot", "chmod"],
    "correctIndex": 1,
    "explanation": "strace revela E/S y bloqueos; perf muestra donde quema CPU."
  }
]
:::
