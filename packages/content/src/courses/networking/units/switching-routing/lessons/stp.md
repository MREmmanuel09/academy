---
id: stp
slug: stp
title: STP y RSTP contra bucles
module: switching-routing
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Por que los bucles matan una LAN y como STP/RSTP los bloquea eligiendo root y puertos.
---

# STP y RSTP contra bucles

La redundancia fisica crea **bucles**: dos caminos entre los mismos switches. Ethernet no tiene TTL, asi que una trama con broadcast da vueltas **para siempre** (broadcast storm) y las tablas MAC enloquecen (flapping). **STP** (802.1D) apaga logicamente los puertos sobrantes; **RSTP** (802.1w) hace lo mismo en segundos.

## Eleccion del root bridge

Todos los switches se votan: gana el **bridge ID mas bajo** (prioridad + MAC). Por defecto prioridad 32768: para forzar el root, baja la prioridad del switch central.

```
spanning-tree vlan 10 priority 4096
```

## Roles de puerto (RSTP)

| Rol | Significado |
|-----|-------------|
| Root | El mejor camino hacia el root (uno por switch no-root) |
| Designated | El mejor hacia ese segmento (reenvia) |
| Alternate | Camino de respaldo (bloqueado, listo) |
| Backup | Respaldo en el mismo segmento (bloqueado) |

## Estados de puerto

- **Discarding**: no reenvia ni aprende (bloqueado).
- **Learning**: aprende MACs pero aun no reenvia.
- **Forwarding**: opera normal.

STP clasico tarda 30-50 s (listening + learning de 15 s cada uno). RSTP propone y acuerda con el vecino: convergencia en ~1-3 s.

## PortFast y BPDU Guard (bordes)

- **PortFast**: puertos de usuario final saltan directo a forwarding (sin ellos, DHCP falla por timeout).
- **BPDU Guard**: si llega un BPDU por un puerto PortFast (alguien conecto un switch), lo apaga (err-disable). Anti-rogue.

```
spanning-tree portfast
spanning-tree bpduguard enable
```

NUNCA actives PortFast en enlaces switch-switch: puedes crear el bucle que intentas evitar.

## Diagnosticar

```
show spanning-tree vlan 10   # root, roles, costos
show spanning-tree blockedports
```

Senales de bucle activo: CPU al 100%, tormenta de broadcasts, MACs saltando de puerto.

## Puntos clave

- Sin STP, un bucle fisico = tormenta de broadcast + red muerta.
- Root = bridge ID menor; un root por VLAN (PVST).
- RSTP converge en segundos con roles alternate/backup.
- PortFast + BPDU Guard solo en bordes hacia usuarios finales.

:::quiz
[
  {
    "question": "Por que un bucle L2 es fatal si IP tiene TTL?",
    "options": ["Porque Ethernet no tiene TTL y la trama circula eternamente", "Porque los routers lo amplifican", "Porque STP lo empeora", "No es fatal"],
    "correctIndex": 0,
    "explanation": "Ethernet no limita saltos: un broadcast da vueltas infinitas (storm) y las tablas MAC oscilan."
  },
  {
    "question": "Como se elige el root bridge?",
    "options": ["El switch mas nuevo", "El bridge ID (prioridad + MAC) mas bajo", "Votacion de los PCs", "El de mas puertos"],
    "correctIndex": 1,
    "explanation": "Menor bridge ID gana. Por defecto todos tienen prioridad 32768, asi que decide la MAC menor."
  },
  {
    "question": "Que hace BPDU Guard en un puerto PortFast?",
    "options": ["Acelera el trafico", "Apaga el puerto si detecta un switch (BPDU) donde deberia haber un usuario", "Desactiva STP", "Cambia la VLAN nativa"],
    "correctIndex": 1,
    "explanation": "Protege el borde: un BPDU ahi significa un switch no autorizado; err-disable evita bucles y suplantacion de root."
  }
]
:::
