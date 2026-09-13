---
id: vlan-trunking
slug: vlan-trunking
title: VLANs, trunks 802.1Q y voz
module: switching-routing
difficulty: intermediate
estimatedMinutes: 20
xp: 100
summary: Segmentar con VLANs, etiquetar con 802.1Q, trunks, VLAN nativa y VLAN de voz.
---

# VLANs, trunks 802.1Q y voz

Una **VLAN** es una LAN virtual: un solo switch fisico, varias redes logicas aisladas. Sin router entre ellas, no hay comunicacion (y eso es justo lo que quieres para segmentar).

## Access vs trunk

| Puerto | Lleva | Config tipica |
|--------|-------|---------------|
| Access | UNA VLAN (sin etiqueta) | PCs, impresoras, camaras |
| Trunk | MULTIPLES VLANs (etiquetadas) | Switch-switch, switch-router |

```
PC-A (VLAN 10) --access-- [Switch] --trunk-- [Switch] --access-- PC-B (VLAN 10)
```

## 802.1Q: la etiqueta

El trunk inserta 4 bytes con el **VLAN ID** (12 bits: 1-4094). El switch destino lee la etiqueta y entrega a la VLAN correcta.

```
Trama Ethernet | Tag 802.1Q (VLAN 10) | Trama Ethernet
```

## VLAN nativa

La VLAN nativa viaja **sin etiqueta** por el trunk (por defecto, la 1). Regla de examen: **la nativa debe coincidir en ambos extremos** o hay fuga entre VLANs. Buena practica: cambiala a una VLAN sin usar (p. ej. 999) y no le asignes puertos de usuario.

## VLAN de voz

Un telefono IP + un PC comparten cable: el telefono etiqueta voz, el PC va sin etiquetar.

```
PC --untagged--> [Telefono] --tagged VLAN 20 (voz)--> Switch
```

Beneficios: QoS para la voz, direccionamiento separado, politicas distintas.

## Routing entre VLANs

Opciones, de antigua a moderna:

1. **Router-on-a-stick**: un router con subinterfaces, una por VLAN, sobre un trunk.
2. **Switch multicapa (L3)**: SVIs (`interface vlan 10`) que rutean a velocidad de switch.

```
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
```

## Comandos que debes reconocer

```
show vlan brief        # VLANs y puertos
show interfaces trunk  # trunks y VLANs permitidas
switchport mode access / trunk
switchport access vlan 10
switchport trunk native vlan 999
```

## Puntos clave

- Access = 1 VLAN sin etiqueta; trunk = N VLANs etiquetadas 802.1Q.
- La VLAN nativa va sin etiqueta y debe coincidir en ambos lados.
- Sin L3 entre ellas, las VLANs no se hablan (aislamiento por diseno).
- Router-on-a-stick para poco trafico; SVIs en switch L3 para produccion.

:::quiz
[
  {
    "question": "Que diferencia un puerto trunk de uno access?",
    "options": ["El trunk es mas rapido", "El trunk transporta multiples VLANs etiquetadas; el access una sola sin etiqueta", "El access necesita router", "No hay diferencia"],
    "correctIndex": 1,
    "explanation": "Trunk = multiples VLANs con tag 802.1Q (enlaces switch-switch). Access = una VLAN para dispositivos finales."
  },
  {
    "question": "Que pasa si la VLAN nativa no coincide en un trunk?",
    "options": ["Nada, es solo cosmetico", "Trafico de una VLAN puede saltar a otra (fuga)", "El trunk se apaga", "Solo falla IPv6"],
    "correctIndex": 1,
    "explanation": "La nativa viaja sin etiqueta: si cada lado la interpreta como VLAN distinta, hay salto entre VLANs (VLAN hopping)."
  },
  {
    "question": "Como se comunican dos VLANs distintas?",
    "options": ["Con un cable cruzado", "A traves de un dispositivo L3 (router o SVI)", "Cambiando la VLAN nativa", "No es posible nunca"],
    "correctIndex": 1,
    "explanation": "Las VLANs son dominios de broadcast separados; solo un router o switch L3 las interconecta."
  }
]
:::
