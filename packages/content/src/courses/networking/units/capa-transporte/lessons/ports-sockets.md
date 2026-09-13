---
id: ports-sockets
slug: ports-sockets
title: Puertos y sockets: como se identifican las aplicaciones
module: capa-transporte
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# Puertos y sockets: como se identifican las aplicaciones

Rango de puertos, como funciona un socket, y por que un servidor web y un servidor de correo pueden correr en la misma maquina.

## Que es un puerto

Un **puerto** es un numero de 16 bits (0-65535) que identifica un proceso o servicio en una maquina. Junto con la IP forma el **socket**:

```
Socket = IP:Puerto
192.168.1.10:443    = HTTPS en ese servidor
192.168.1.10:22     = SSH en ese servidor
10.0.0.5:3306       = MySQL en ese servidor
```

## Rangos de puertos

| Rango | Nombre | Uso |
|-------|--------|-----|
| 0-1023 | **Well-known** | Servicios estandar (HTTP, SSH, DNS). Requieren root para escuchar. |
| 1024-49151 | **Registered** | Aplicaciones registradas (MySQL=3306, PostgreSQL=5432). |
| 49152-65535 | **Ephemeral** | Puertos dinamicos asignados por el OS al crear conexiones. |

### Puertos bien conocidos esenciales

| Puerto | Protocolo | Servicio |
|--------|-----------|----------|
| 20/21 | TCP | FTP (datos/comando) |
| 22 | TCP | SSH |
| 23 | TCP | Telnet (obsoleto, inseguro) |
| 25 | TCP | SMTP |
| 53 | TCP/UDP | DNS |
| 67/68 | UDP | DHCP |
| 80 | TCP | HTTP |
| 110 | TCP | POP3 |
| 143 | TCP | IMAP |
| 443 | TCP | HTTPS |
| 993/995 | TCP | IMAPS/POP3S |

## Como funciona un socket

Un **socket** es la combinacion de IP + puerto + protocolo. Es el punto de comunicacion entre dos procesos.

```
Cliente (192.168.1.10:54321)  <--->  Servidor (10.0.0.5:443)
         IP:Puerto fuente              IP:Puerto destino
```

### Estados de un socket TCP

```
CLOSED --> LISTEN --> SYN_RCVD --> ESTABLISHED --> CLOSE_WAIT --> CLOSED
                <-- SYN_SENT    <-- FIN_WAIT     <-- LAST_ACK
```

Los estados mas importantes:
- **LISTEN**: el servidor esta esperando conexiones
- **ESTABLISHED**: la conexion esta activa, se puede enviar datos
- **TIME_WAIT**: despues de cerrar, el socket espera por si hay paquetes rezagados

## Verificando puertos en Linux

```bash
# Ver puertos en escucha
ss -tlnp              # TCP listening
ss -ulnp              # UDP listening

# Ver conexiones activas
ss -tanp              # todas las conexiones TCP

# Con netstat (obsoleto pero todavia comun)
netstat -tlnp
netstat -ulnp

# Ver que proceso usa un puerto
ss -tlnp | grep :443
lsof -i :443
```

### Ejemplo de salida

```
State    Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process
LISTEN   0       4096    0.0.0.0:443         0.0.0.0:*          users:(("nginx",pid=1234))
LISTEN   0       4096    0.0.0.0:80          0.0.0.0:*          users:(("nginx",pid=1234))
LISTEN   0       128     0.0.0.0:22          0.0.0.0:*          users:(("sshd",pid=567))
```

## Firewall y puertos

```bash
# UFW (Ubuntu)
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw deny 23/tcp
sudo ufw enable

# iptables (basico)
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j DROP

# firewalld (CentOS/RHEL)
sudo firewall-cmd --add-port=443/tcp --permanent
sudo firewall-cmd --reload
```

## Puntos clave

- Un puerto identifica un servicio. 0-1023 son well-known (requieren root). 1024-49151 registrados. 49152+ efimeros.
- Socket = IP + Puerto + Protocolo. Permite multiples servicios en la misma IP.
- `ss -tlnp` muestra puertos en escucha TCP. `ss -ulnp` para UDP.
- Los firewalls controlan el acceso por puerto. Siempre cierra los puertos que no uses.

:::quiz
[
  {
    "question": "Que es un socket?",
    "options": ["Un cable especial", "La combinacion IP + puerto + protocolo", "Un tipo de firewall", "Un puerto fisico del switch"],
    "correctIndex": 1,
    "explanation": "El socket identifica un extremo de comunicacion y permite varios servicios en la misma IP."
  },
  {
    "question": "Que rango son los puertos well-known?",
    "options": ["1024-49151", "0-1023", "49152-65535", "8000-9000"],
    "correctIndex": 1,
    "explanation": "0-1023: servicios clasicos (requieren root para escuchar). 1024-49151 registrados, 49152+ efimeros."
  },
  {
    "question": "Como ves los puertos TCP en escucha en Linux?",
    "options": ["ping -c 4", "ss -tlnp", "traceroute", "dig"],
    "correctIndex": 1,
    "explanation": "ss -tlnp lista TCP en escucha con procesos. -u para UDP."
  }
]
:::
