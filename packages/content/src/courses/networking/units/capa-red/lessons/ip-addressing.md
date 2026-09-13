---
id: ip-addressing
slug: ip-addressing
title: Direccion IP: IPv4, subredes y CIDR
module: capa-red
difficulty: beginner
estimatedMinutes: 5
xp: 70
---

# Direccion IP: IPv4, subredes y CIDR

Como se identifican los dispositivos en una red, como se dividen subredes, y por que CIDR reemplazo a las clases.

## Direccion IPv4

Una **direccion IPv4** es un numero de 32 bits escrito en notacion decimal con puntos: `192.168.1.1`. Cada octeto va de 0 a 255.

### Estructura logica

```
Direccion IP = Network ID + Host ID
192.168.1.10  = 192.168.1  +  .10
                 (red)        (host)
```

La **mascara de subred** define donde termina la red y donde empieza el host:

```
IP:    192.168.1.10    = 11000000.10101000.00000001.00001010
Mask:  255.255.255.0   = 11111111.11111111.11111111.00000000
                         |---- Network ----|-- Host --|
```

### Clases originales (obsoleto pero hay que saberlo)

| Clase | Primer octeto | Rango | Mascara default | Uso |
|-------|--------------|-------|-----------------|-----|
| A | 1-126 | 1.0.0.0 a 126.255.255.255 | /8 (255.0.0.0) | Redes grandes |
| B | 128-191 | 128.0.0.0 a 191.255.255.255 | /16 (255.255.0.0) | Redes medianas |
| C | 192-223 | 192.0.0.0 a 223.255.255.255 | /24 (255.255.255.0) | Redes pequenas |

> **Clase D** (224-239) es para multicast. **Clase E** (240-255) es experimental.

### Direccion IPv6

IPv6 usa **128 bits** escritos en hexadecimal: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`. Sufijo de 64 bits para hosts.

## CIDR (Classless Inter-Domain Routing)

**CIDR** reemplazo las clases en 1993. Usa notacion `/N` donde N es el numero de bits de la red.

### Calculo de hosts

```
Hosts = 2^(32 - N) - 2
```

Restamos 2 porque la primera direccion es la red y la ultima es broadcast.

| CIDR | Mascara | Hosts | Subredes posibles en una C |
|------|---------|-------|---------------------------|
| /24 | 255.255.255.0 | 254 | 1 |
| /25 | 255.255.255.128 | 126 | 2 |
| /26 | 255.255.255.192 | 62 | 4 |
| /27 | 255.255.255.224 | 30 | 8 |
| /28 | 255.255.255.240 | 14 | 16 |
| /30 | 255.255.255.252 | 2 | 64 |
| /32 | 255.255.255.255 | 1 | 256 |

### Ejemplo practico

Tienes la red `10.0.0.0/8` (16 millones de hosts). La divides en subredes /24:

```
10.0.0.0/24   -> 10.0.0.1 a 10.0.0.254   (red de oficina A)
10.0.1.0/24   -> 10.0.1.1 a 10.0.1.254   (red de oficina B)
10.0.2.0/24   -> 10.0.2.1 a 10.0.2.254   (red de servidores)
```

## Direcciones especiales

| Direccion | Significado |
|-----------|-------------|
| `127.0.0.1` | Loopback (localhost) |
| `0.0.0.0` | Todas las interfaces |
| `255.255.255.255` | Broadcast limitado |
| `169.254.x.x` | APIPA (auto-asignada sin DHCP) |
| `10.0.0.0/8` | Privada (RFC 1918) |
| `172.16.0.0/12` | Privada (RFC 1918) |
| `192.168.0.0/16` | Privada (RFC 1918) |

## Ejercicio rapido

```
IP: 172.16.5.130/26
Mascara: 255.255.255.192
Hosts por subred: 2^(32-26) - 2 = 62
Numero de subred: 172.16.5.128/26
Broadcast: 172.16.5.191
Rango util: 172.16.5.129 a 172.16.5.190
```

## Puntos clave

- IPv4 usa 32 bits (4 octetos). IPv6 usa 128 bits. Las clases (A/B/C) son obsoletas, CIDR es el estandar.
- CIDR permite divisiones flexibles: /24 = 254 hosts, /30 = 2 hosts (punto a punto).
- Direcciones privadas (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. No se rutean en Internet.
- 127.0.0.1 es loopback. 169.254.x.x es APIPA (sin DHCP).

:::quiz
[
  {
    "question": "Cuantos hosts utilizables tiene una /26?",
    "options": ["64", "62", "30", "126"],
    "correctIndex": 1,
    "explanation": "2^(32-26) = 64 menos red y broadcast = 62."
  },
  {
    "question": "Cual es privada RFC 1918?",
    "options": ["8.8.8.8", "172.16.5.4", "11.0.0.1", "200.10.10.10"],
    "correctIndex": 1,
    "explanation": "172.16.0.0/12 es privada. 8.8.8.8 es publica, 11/8 es publica."
  },
  {
    "question": "Que significa 169.254.x.x en tu interfaz?",
    "options": ["IP estatica correcta", "APIPA: no hubo DHCP y se autoasigno", "Loopback", "Multicast"],
    "correctIndex": 1,
    "explanation": "169.254/16 aparece cuando DHCP falla. Revisa servidor y enlace."
  }
]
:::
