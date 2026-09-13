---
id: vlan-concepts
slug: vlan-concepts
title: VLANs: segmentacion logica de redes
module: switching-routing
difficulty: intermediate
estimatedMinutes: 5
xp: 65
---

# VLANs: segmentacion logica de redes

Como separar dominios de broadcast sin switches fisicos, trunking, y por que es fundamental en redes empresariales.

## Que es una VLAN

Una **VLAN** (Virtual Local Area Network) es una red logica creada dentro de un switch fisico. Los dispositivos en la misma VLAN se comunican como si estuvieran en el mismo segmento de red, sin importar su ubicacion fisica.

```
Switch Fisico
┌─────────────────────────────────────┐
│  Puerto 1-4:  VLAN 10 (Desarrollo) │
│  Puerto 5-8:  VLAN 20 (Produccion) │
│  Puerto 9-12: VLAN 30 (Admin)      │
│  Puerto 13:   VLAN 99 (Native)     │
└─────────────────────────────────────┘
```

### Por que usar VLANs

| Sin VLAN | Con VLAN |
|----------|----------|
| Todos los dispositivos en un dominio de broadcast | Cada VLAN es su propio dominio |
| Dominio de broadcast enorme (lento, inseguro) | Broadcast contenido por VLAN |
| No hay segmentacion de seguridad | Cada VLAN puede tener su propia firewall rules |
| Un solo segmento de red | Multiples subredes en un solo switch |

## Trunking (802.1Q)

Cuando necesitas que varias VLANs viajen entre switches, usas **trunking**.

### Trunk vs Access

| Tipo | Funcion | Uso |
|------|---------|-----|
| **Access** | Pertenecer a UNA VLAN | Conectar PCs, impresoras, servidores |
| **Trunk** | Transportar MULTIPLES VLANs | Entre switches, switch-router, switch-firewall |

### Tagging 802.1Q

El estandar **IEEE 802.1Q** agrega un tag de 4 bytes al frame Ethernet:

```
[Dest MAC][Src MAC][802.1Q Tag][Type][Payload][FCS]
                     |
                     +-- VLAN ID (12 bits) = 4094 VLANs max
```

**VLAN 1** es la VLAN nativa por defecto (en casi todos los switches).

### Configuracion en Cisco

```cisco
! Crear VLANs
vlan 10
 name Desarrollo
vlan 20
 name Produccion
vlan 30
 name Admin

! Puerto access (conecta a PC)
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10

! Puerto trunk (conecta a otro switch)
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 switchport trunk native vlan 99
```

### Configuracion en Linux (bridge + VLAN)

```bash
# Crear bridge con VLANs
sudo ip link add br0 type bridge
sudo ip link add link br0 name br0.10 type vlan id 10
sudo ip link add link br0 name br0.20 type vlan id 20
sudo ip addr add 10.0.10.1/24 dev br0.10
sudo ip addr add 10.0.20.1/24 dev br0.20
sudo ip link set br0 up
```

## Inter-VLAN routing

Las VLANs son dominios aislados. Para que se comuniquen necesitas un **router** o **Layer 3 switch**.

### Opcion 1: Router-on-a-Stick

Un router fisico conectado al switch via trunk. El router crea sub-interfaces por VLAN:

```cisco
interface GigabitEthernet0/0
 no shutdown

interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 10.0.10.1 255.255.255.0

interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 10.0.20.1 255.255.255.0
```

### Opcion 2: Layer 3 Switch (mejor)

Un switch con capacidad de routing. Mas rapido que un router-on-a-stick:

```cisco
ip routing

interface Vlan10
 ip address 10.0.10.1 255.255.255.0

interface Vlan20
 ip address 10.0.20.1 255.255.255.0
```

## Puntos clave

- Una VLAN es un dominio de broadcast logico. Separa tráfico sin switches fisicos adicionales.
- 802.1Q es el estandar de trunking. Agrega un tag de 4 bytes con el VLAN ID (max 4094).
- Access ports pertenecen a una VLAN. Trunk ports transportan multiples VLANs.
- Inter-VLAN routing necesita un router (router-on-a-stick) o un Layer 3 switch.

:::quiz
[
  {
    "question": "Que es una VLAN?",
    "options": ["Un switch fisico nuevo", "Un dominio de broadcast logico sobre la misma infraestructura", "Un tipo de cable", "Un protocolo de routing"],
    "correctIndex": 1,
    "explanation": "Segmenta sin hardware extra; cada VLAN es una red logica separada."
  },
  {
    "question": "Que agrega 802.1Q a la trama?",
    "options": ["Cifrado", "Un tag de 4 bytes con el VLAN ID (max 4094)", "Compresion", "Nada, es solo software"],
    "correctIndex": 1,
    "explanation": "El tag identifica la VLAN en los trunks; access ports no etiquetan."
  },
  {
    "question": "Como se hablan dos VLANs?",
    "options": ["Directamente, son la misma red", "Via router (router-on-a-stick) o switch L3", "Con cable cruzado", "No pueden nunca"],
    "correctIndex": 1,
    "explanation": "Distintos broadcast domains requieren L3 entre ellos."
  }
]
:::
