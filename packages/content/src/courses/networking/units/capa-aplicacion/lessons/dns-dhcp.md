---
id: dns-dhcp
slug: dns-dhcp
title: DNS y DHCP: resolucion de nombres y asignacion de IP
module: capa-aplicacion
difficulty: beginner
estimatedMinutes: 5
xp: 70
---

# DNS y DHCP: resolucion de nombres y asignacion de IP

Como se resuelven nombres de dominio a IPs, y como se asignan direcciones automaticamente.

## DNS (Domain Name System)

**DNS** traduce nombres de dominio a direcciones IP. Sin DNS, tendrias que memorizar IPs para cada sitio.

### Jerarquia DNS

```
. (root)
├── .com (TLD - Top Level Domain)
│   ├── google.com
│   │   ├── www.google.com
│   │   ├── mail.google.com
│   │   └── api.google.com
│   └── academy.dev
├── .org
├── .net
├── .io
└── .ar (ccTLD - pais)
```

### Tipos de registros

| Registro | Que hace | Ejemplo |
|----------|----------|---------|
| **A** | Dominio -> IPv4 | `academy.dev -> 104.21.34.56` |
| **AAAA** | Dominio -> IPv6 | `academy.dev -> 2606:4700::...` |
| **CNAME** | Alias a otro dominio | `www.academy.dev -> academy.dev` |
| **MX** | Mail server | `academy.dev -> mail.academy.dev (prioridad 10)` |
| **TXT** | Texto arbitrary | SPF, DKIM, verificacion |
| **NS** | Nameserver del dominio | `academy.dev -> ns1.cloudflare.com` |
| **PTR** | IP -> Dominio (reverse DNS) | `104.21.34.56 -> academy.dev` |
| **SOA** | Start of Authority, metadata del zona | `serial, refresh, retry, expire` |

### Proceso de resolucion

```
Tu PC -> Resolver local (ISP o 8.8.8.8)
  -> Root server (.com TLD)
    -> TLD server (academy.dev NS)
      -> Authoritative NS (academy.dev A record)
        -> IP: 104.21.34.56
```

**Cache**: cada nivel cachea el resultado. TTL (Time To Live) define cuanto se guarda.

```bash
# Consultar DNS
dig academy.dev A           # registro A
dig academy.dev MX          # registros MX
dig +trace academy.dev      # traza completa
nslookup academy.dev        # basico

# Ver cache local
systemd-resolve --statistics
```

### DNS en DevOps

```bash
# /etc/resolv.conf
nameserver 8.8.8.8
nameserver 8.8.4.4
search devops.local

# /etc/hosts (override local)
192.168.1.100  mi-servidor.devops.local
```

**CoreDNS** y **Kube-DNS** son los DNS servers usados en Kubernetes para resolver servicios internos.

## DHCP (Dynamic Host Configuration Protocol)

**DHCP** asigna IPs automaticamente a dispositivos que se conectan a la red.

### Proceso DORA

```
PC (sin IP)                          DHCP Server
   |--- DISCOVER (broadcast) ------->|   1. Discovery: "necesito una IP"
   |<-- OFFER (IP ofrecida) ---------|   2. Offer: "te doy 192.168.1.50"
   |--- REQUEST (acepta IP) -------->|   3. Request: "acepto 192.168.1.50"
   |<-- ACK (confirmacion) ----------|   4. Ack: "confirmado, usala"
```

### Que asigna DHCP

| Parametro | Ejemplo | Descripcion |
|-----------|---------|-------------|
| **IP** | 192.168.1.50 | Direccion del dispositivo |
| **Mascara** | 255.255.255.0 | /24 |
| **Gateway** | 192.168.1.1 | Router por defecto |
| **DNS** | 8.8.8.8, 8.8.4.4 | Servidores DNS |
| **Lease time** | 24 horas | Cuanto tiempo puede usar la IP |
| **Domain** | devops.local | Dominio local |

```bash
# Linux: renovar DHCP
sudo dhclient -r eth0    # liberar
sudo dhclient eth0       # renovar

# Ver IP actual
ip addr show eth0
```

### DHCP reservas

Para servidores que siempre necesitan la misma IP, se hace una **reserva DHCP** (por MAC address) en vez de IP estatica.

## Puntos clave

- DNS traduce nombres a IPs. Jerarquia: root -> TLD -> authoritative NS. Registros A, AAAA, CNAME, MX, TXT, NS.
- DNS tiene cache (TTL). `dig` y `nslookup` son las herramientas para consultar.
- DHCP asigna IPs via DORA: Discover, Offer, Request, Ack. Incluye IP, mascara, gateway, DNS.
- En Kubernetes, CoreDNS resuelve servicios internos. En /etc/hosts puedes hacer overrides locales.

:::quiz
[
  {
    "question": "What does DNS do?",
    "options": ["Assigns IP addresses to devices", "Translates domain names to IP addresses", "Encrypts network traffic", "Manages firewall rules"],
    "correctIndex": 1,
    "explanation": "DNS (Domain Name System) translates human-readable domain names (like academy.dev) into IP addresses that computers use to communicate."
  },
  {
    "question": "What does DHCP do?",
    "options": ["Resolves domain names to IPs", "Assigns IP addresses automatically to devices on a network", "Routes packets between networks", "Encrypts DNS queries"],
    "correctIndex": 1,
    "explanation": "DHCP (Dynamic Host Configuration Protocol) automatically assigns IP addresses, subnet masks, gateways, and DNS servers to devices joining a network."
  },
  {
    "question": "What is a TLD in DNS?",
    "options": ["A type of DNS record", "The top-level domain like .com, .org, or .net", "A DNS server address", "A timeout value"],
    "correctIndex": 1,
    "explanation": "A TLD (Top-Level Domain) is the last part of a domain name, such as .com, .org, .net, or country codes like .ar and .mx."
  }
]
:::
