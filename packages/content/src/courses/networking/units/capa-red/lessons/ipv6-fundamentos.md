---
id: ipv6-fundamentos
slug: ipv6-fundamentos
title: IPv6 desde cero
module: capa-red
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Formato, compresion de ceros, tipos de direccion y SLAAC frente a DHCPv6.
---

# IPv6 desde cero

IPv4 tiene ~4.300 millones de direcciones: insuficientes desde hace anos. IPv6 usa **128 bits** (3.4 x 10^38 direcciones) y simplifica la cabecera.

## Formato

8 grupos de 4 hexadecimales separados por `:`:

```
2001:0db8:0000:0000:0000:ff00:0042:8329
```

### Reglas de compresion (importantes en examen)

1. Quita los ceros a la izquierda de cada grupo: `0db8` -> `db8`.
2. Reemplaza UN solo bloque de grupos cero con `::`.

```
2001:0db8:0000:0000:0000:ff00:0042:8329
2001:db8:0:0:0:ff00:42:8329
2001:db8::ff00:42:8329
```

Ojo: `::` solo puede usarse **una vez** (si no, la longitud seria ambigua).

## Tipos de direccion

| Tipo | Prefijo | Uso |
|------|---------|-----|
| Global Unicast | 2000::/3 | Internet publica (equivale a IPv4 publica) |
| Unique Local | fc00::/7 | Privadas (como RFC 1918) |
| Link-Local | fe80::/10 | Solo el enlace local, autoconfigurada |
| Multicast | ff00::/8 | Uno a muchos (reemplaza broadcast) |
| Loopback | ::1 | Como 127.0.0.1 |

**No hay broadcast en IPv6**: se usa multicast (ff02::1 = todos los nodos del enlace).

## Autoconfiguracion: SLAAC vs DHCPv6

- **SLAAC**: el router anuncia el prefijo (Router Advertisement) y el host genera su IP (EUI-64 o aleatoria por privacidad). Sin servidor.
- **DHCPv6**: como DHCP pero para IPv6; puede ser stateful (da direcciones) o stateless (solo DNS y opciones).
- Combinacion tipica: SLAAC para la direccion + DHCPv6 stateless para el DNS.

## Cabecera simplificada

IPv6 elimina el checksum (ya lo hacen L2 y L4), el campo IHL y la fragmentacion en routers (solo el origen fragmenta). Resultado: routers mas rapidos.

## Dual stack y tuneles

Durante la migracion conviven ambos protocolos (**dual stack**). Los tuneles (6to4, Teredo) encapsulan IPv6 dentro de IPv4 donde no hay soporte nativo.

## Puntos clave

- 128 bits en 8 grupos hex; `::` comprime UN solo bloque de ceros.
- Sin broadcast: multicast ff02::1 para todos los nodos.
- fe80::/10 es link-local (siempre presente); fc00::/7 privada; 2000::/3 global.
- SLAAC autoconfigura sin servidor; DHCPv6 aporta control y DNS.

:::quiz
[
  {
    "question": "Cuantas veces puede usarse :: en una direccion IPv6?",
    "options": ["Sin limite", "Una sola vez", "Dos veces", "Una por cada grupo cero"],
    "correctIndex": 1,
    "explanation": "Una sola vez: con dos compresiones seria imposible saber cuantos ceros hay en cada hueco."
  },
  {
    "question": "Que reemplaza al broadcast de IPv4 en IPv6?",
    "options": ["Anycast", "Multicast ff02::1", "SLAAC", "El loopback ::1"],
    "correctIndex": 1,
    "explanation": "IPv6 no tiene broadcast; el multicast de todos los nodos (ff02::1) cubre ese caso."
  },
  {
    "question": "Que prefijo identifica una direccion link-local?",
    "options": ["2000::/3", "fc00::/7", "fe80::/10", "ff00::/8"],
    "correctIndex": 2,
    "explanation": "fe80::/10 es link-local: valida solo en el enlace y autoconfigurada en cada interfaz."
  }
]
:::
