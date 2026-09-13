---
id: routing-estatico
slug: routing-estatico
title: Routing estatico y distancia administrativa
module: switching-routing
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Rutas estaticas, default route, distancia administrativa y next-hop vs interfaz de salida.
---

# Routing estatico y distancia administrativa

Un router reenvia por su **tabla de rutas**: la mejor coincidencia (longest prefix match) gana. Las rutas pueden aprenderse a mano (**estaticas**) o con protocolos (**dinamicas**).

## Ruta estatica basica

```
ip route 192.168.20.0 255.255.255.0 10.0.0.2
         \_ destino _/  \_ mascara _/  \_ next-hop _/
```

- **Next-hop**: IP del siguiente router (recomendado en Ethernet: evita ARP por cada destino).
- **Interfaz de salida** (`ip route ... GigabitEthernet0/0`): util en punto a punto; en Ethernet genera ARP excesivo.

## Default route

La "ruta de ultimo recurso" hacia Internet o el upstream:

```
ip route 0.0.0.0 0.0.0.0 203.0.113.1
```

0.0.0.0/0 coincide con todo lo que no tenga ruta mas especifica.

## Distancia administrativa (AD)

Cuando dos fuentes ofrecen la misma red, gana la **AD mas baja** (confianza):

| Fuente | AD |
|--------|-----|
| Conectada directamente | 0 |
| Estatica | 1 |
| OSPF | 110 |
| RIP | 120 |
| iBGP | 200 |

La AD decide QUIEN entra en la tabla; la **metrica** decide entre rutas de la MISMA fuente.

## Ruta flotante (backup con AD)

Una estatica con AD alta solo entra si la ruta dinamica cae:

```
ip route 10.0.0.0 255.0.0.0 192.168.99.2 130
```

AD 130 > OSPF 110: duerme mientras OSPF viva. Respaldo barato sin protocolos extra.

## Verificar

```
show ip route          # C=conectada, S=estatica, O=OSPF
show ip route 10.1.1.1 # mejor coincidencia para ese destino
ping / traceroute      # conectividad y camino
```

## Cuando usar estaticas

- Bordes stub (una sola salida: default route).
- Enlaces de respaldo (rutas flotantes).
- Redes pequenas estables.

En redes que cambian, los protocolos dinamicos escalan; las estaticas no avisan si algo cae al otro lado (usa IP SLA + track si necesitas deteccion).

## Puntos clave

- Longest prefix match gana; a igualdad de prefijo, menor AD.
- Next-hop en Ethernet; interfaz de salida en punto a punto.
- 0.0.0.0/0 es la salida por defecto.
- AD 130+ crea rutas flotantes de respaldo.

:::quiz
[
  {
    "question": "Dos rutas a 10.0.0.0/24: una estatica y una OSPF. Cual entra en la tabla?",
    "options": ["La OSPF, por metrica", "La estatica, AD 1 frente a 110", "Ambas con balanceo", "Ninguna, hay conflicto"],
    "correctIndex": 1,
    "explanation": "A igual prefijo decide la AD: estatica (1) vence a OSPF (110)."
  },
  {
    "question": "Para que sirve una ruta estatica con AD 130?",
    "options": ["Para ir mas rapido", "Como respaldo flotante que solo entra si cae la dinamica", "Para IPv6", "Para balancear carga"],
    "correctIndex": 1,
    "explanation": "Duerme mientras exista mejor fuente (OSPF 110); despierta al caer esta. Respaldo sin protocolo extra."
  },
  {
    "question": "Que significa 0.0.0.0/0 en la tabla?",
    "options": ["Red inexistente", "Ruta por defecto: ultimo recurso", "Loopback", "Broadcast"],
    "correctIndex": 1,
    "explanation": "Coincide con todo destino sin ruta mas especifica: la salida hacia Internet o el upstream."
  }
]
:::
