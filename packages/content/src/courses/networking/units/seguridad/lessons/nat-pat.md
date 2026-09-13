---
id: nat-pat
slug: nat-pat
title: NAT estatico, dinamico y PAT
module: seguridad
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Como una red privada entera sale con una sola IP publica.
---

# NAT estatico, dinamico y PAT

IPv4 publicas no alcanzan: **NAT** traduce direcciones privadas a publicas al cruzar el borde. Sin NAT no habria Internet domestica.

## Inside vs outside

- **Inside local**: la privada real (192.168.1.10).
- **Inside global**: como se ve desde fuera (203.0.113.5).
- **Outside**: el destino en Internet.

## Los tres tipos

| Tipo | Mapeo | Uso |
|------|-------|-----|
| Estatico | 1:1 fijo (siempre la misma) | Servidor publicado (web, correo) |
| Dinamico | 1:1 del pool, temporal | Legado, poco usado |
| PAT (overload) | N:1 con puertos distintos | Salida a Internet de toda la LAN |

**PAT** es el de casa y oficina: cientos de dispositivos, una IP publica. El router distingue sesiones por **puerto origen traducido**.

```
192.168.1.10:52344 --\
192.168.1.11:61001 ---> [203.0.113.5:1024, :1025] --> Internet
```

## Configuracion tipica (PAT)

```
access-list 1 permit 192.168.1.0 0.0.0.255
ip nat inside source list 1 interface GigabitEthernet0/1 overload
interface GigabitEthernet0/0
 ip nat inside
interface GigabitEthernet0/1
 ip nat outside
```

Estatico para publicar un servidor:

```
ip nat inside source static 192.168.1.80 203.0.113.80
```

## Verificar y diagnosticar

```
show ip nat translations   # la tabla viva (agotamiento de puertos se ve aqui)
show ip nat statistics
clear ip nat translation * # con cuidado: corta sesiones
```

| Sintoma | Causa |
|---------|-------|
| Unos navegan, otros no | Pool agotado (dinamico) o ACL del NAT incompleta |
| Servidor inaccesible desde fuera | Falta el estatico o firewall delante |
| Todo cae a ratos | Doble NAT (router del ISP + el tuyo) o timeout cortos |

## NAT y seguridad: matiz de examen

NAT **oculta** la topologia interna pero **no es un firewall**: el trafico saliente crea pinholes de retorno. Complementa con ACL/firewall, no lo sustituyas.

## IPv6 y NAT

IPv6 devuelve direcciones de sobra: no necesitas NAT para escasez. Existe NAT66 pero es raro; lo normal es firewall stateful sin traducir.

## Puntos clave

- Estatico 1:1 para publicar; PAT N:1 para salir.
- Inside/outside bien marcados o nada traduce.
- La tabla de translations es tu primera pantalla de diagnostico.
- NAT oculta, no protege: suma firewall.

:::quiz
[
  {
    "question": "Toda tu LAN sale con una sola IP publica. Que usas?",
    "options": ["NAT estatico", "PAT (overload)", "NAT dinamico sin overload", "BGP"],
    "correctIndex": 1,
    "explanation": "PAT multiplexa N privadas en 1 publica distinguiendo por puerto. Estatico es 1:1 para servidores."
  },
  {
    "question": "Para publicar tu web interna 192.168.1.80 en la 203.0.113.80, que configuras?",
    "options": ["PAT con overload", "NAT estatico 1:1 entre ambas", "Ruta por defecto", "DHCP"],
    "correctIndex": 1,
    "explanation": "Servidor publicado = mapeo fijo 1:1 (estatico), no traduccion temporal."
  },
  {
    "question": "Afirmacion de examen: NAT equivale a firewall. Es...",
    "options": ["Verdadera", "Falsa: oculta direcciones pero hay que filtrar aparte", "Verdadera solo con PAT", "Verdadera en IPv6"],
    "correctIndex": 1,
    "explanation": "NAT traduce; el retorno de sesiones sale. Sin ACL/firewall, el filtrado real no existe."
  }
]
:::
