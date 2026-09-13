---
id: ospf
slug: ospf
title: OSPF single-area
module: switching-routing
difficulty: advanced
estimatedMinutes: 20
xp: 120
summary: Link-state en un area: vecinos, DR/BDR, costo y troubleshooting.
---

# OSPF single-area

**OSPF** es link-state: cada router conoce el mapa completo del area y calcula el mejor camino con Dijkstra. Converge rapido y escala mejor que los distance-vector (RIP).

## Conceptos minimos

- **Area**: dominio de flooding. Empezamos con **area 0** (backbone); single-area = todo en area 0.
- **Router ID**: IPv4 de 32 bits que identifica al router (loopback alta, o la mayor IP activa).
- **Vecinos (neighbors)**: routers que intercambian hellos en el segmento.
- **Adyacencia**: relacion plena (ExStart hasta Full) donde se sincroniza la LSDB.

## DR y BDR (solo en broadcast: Ethernet)

En una LAN con N routers habria N*(N-1)/2 adyacencias. Para evitarlo se elige:

- **DR** (Designated Router): centraliza el flooding.
- **BDR**: respaldo caliente.
- El resto (**DROTHER**) solo son adyacentes con DR/BDR.

Eleccion por **prioridad OSPF** (default 1; 0 = nunca DR) y desempate por router ID mayor.

## Costo y metrica

```
Costo = 100 Mbps / ancho de banda de la interfaz
```

- FastEthernet (100 Mbps) = costo 1. Gigabit = 1 (minimo 1, se ajusta con `auto-cost reference-bandwidth`).
- Se SUMA por salto: gana el camino con menor costo total.

## Configuracion base

```
router ospf 1
 router-id 1.1.1.1
 network 192.168.1.0 0.0.0.255 area 0
```

Ojo CCNA: `network` usa **wildcard mask** (inversa): /24 = 0.0.0.255.

## Verificar y diagnosticar

```
show ip ospf neighbor   # vecinos y estado (FULL es sano)
show ip ospf interface  # area, DR/BDR, costo, timers
show ip route ospf      # rutas O instaladas
```

| Sintoma | Causa tipica |
|---------|--------------|
| Stuck en INIT | ACL/multicast 224.0.0.5 bloqueado |
| Stuck en EXSTART | MTU distinto entre vecinos |
| Rutas que no aparecen | network/wildcard mal, area distinta, interfaz pasiva |
| DR inesperado | Prioridades por defecto (gana el RID mayor) |

## OSPF frente a estatico/RIP

- Estatico: simple, no converge solo.
- RIP: distance-vector, metrica en saltos (max 15), convergencia lenta. Legado.
- OSPF: convergencia rapida, costo por ancho de banda, jerarquia por areas. El estandar empresarial.

## Puntos clave

- Area 0 primero; single-area para empezar, multi-area para escalar.
- DR/BDR solo en segmentos broadcast; prioridad 0 = nunca DR.
- Wildcard = mascara invertida (/24 -> 0.0.0.255).
- FULL es el estado sano; INIT/EXSTART atascados delatan multicast, MTU o areas.

:::quiz
[
  {
    "question": "Para que sirven DR y BDR?",
    "options": ["Para cifrar el trafico", "Para reducir adyacencias en segmentos broadcast centralizando el flooding", "Para asignar IPs", "Para reemplazar al root bridge"],
    "correctIndex": 1,
    "explanation": "Sin DR/BDR cada par de routers seria adyacente (malla). DR centraliza, BDR respalda."
  },
  {
    "question": "Que wildcard corresponde a 192.168.10.0/24 en network?",
    "options": ["255.255.255.0", "0.0.0.255", "0.0.255.255", "255.255.0.0"],
    "correctIndex": 1,
    "explanation": "Wildcard invierte la mascara: /24 (255.255.255.0) -> 0.0.0.255."
  },
  {
    "question": "Vecinos atascados en EXSTART. Causa mas probable?",
    "options": ["Prioridad igual", "MTU distinto entre ambos", "Falta BDR", "Cable cruzado"],
    "correctIndex": 1,
    "explanation": "EXSTART negocia la sesion de base de datos; MTUs distintos la rompen (clásico de examen)."
  }
]
:::
