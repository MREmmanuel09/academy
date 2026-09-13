---
id: switching-basics
slug: switching-basics
title: Switching basico: MAC tables, forwarding y spanning tree
module: switching-routing
difficulty: beginner
estimatedMinutes: 5
xp: 70
---

# Switching basico: MAC tables, forwarding y spanning tree

Como un switch decide hacia donde enviar un frame, el proceso de aprendizaje, y por que STP evita loops.

## Que hace un switch

Un **switch** opera en la capa 2 (Data Link) del modelo OSI. Su trabajo es enviar frames al puerto correcto basandose en la **direccion MAC** de destino.

### Tabla MAC (CAM table)

Cada switch mantiene una tabla que mapea MAC addresses a puertos:

```
MAC Address          Port       VLAN    Type
AA:BB:CC:11:22:33    Fa0/1      10      Dynamic
DD:EE:FF:44:55:66    Fa0/5      20      Dynamic
11:22:33:44:55:66    Gi0/1      1       Static
```

### Proceso de aprendizaje

```
1. PC-A (AA:BB:CC:11:22:33) envia frame a PC-B
2. Switch recibe en puerto Fa0/1
3. Switch busca AA:BB:CC:11:22:33 en su tabla
   - No la encuentra (unknown unicast)
4. Switch hace FLOOD: envia el frame a TODOS los puertos excepto el de origen
5. PC-B responde
6. Switch aprende que AA:BB:CC esta en Fa0/1
7. Ahora tiene la MAC en su tabla
```

### Tipos de forwarding

| Tipo | Que hace |
|------|----------|
| **Unicast conocido** | Envia solo al puerto donde esta la MAC destino |
| **Unicast desconocido** | Flood a todos los puertos excepto origen |
| **Broadcast** | Flood a todos los puertos (FF:FF:FF:FF:FF:FF) |
| **Multicast** | Flood a puertos en el grupo multicast |

## Spanning Tree Protocol (STP)

**STP** (IEEE 802.1D) previene loops en topologias con enlaces redundantes. Sin STP, un frame circularia infinitamente.

### Por que hay loops

```
Switch-A ---- Switch-B
   |              |
   +-- Switch-C --+
```

Si un frame llega a Switch-A, va a Switch-B, luego a Switch-C, luego de vuelta a Switch-A... y asi infinitamente. STP bloquea enlaces redundantes.

### Como funciona STP

1. **Elegir Root Bridge**: el switch con el Bridge ID mas bajo (prioridad + MAC)
2. **Calcular caminos mas cortos** al Root Bridge
3. **Bloquear enlaces redundantes**: los puertos que no son parte del camino mas corto se bloquean

### Estados de un puerto STP

```
Blocking -> Listening -> Learning -> Forwarding
   ^                                         |
   +------- (si se detecta problema) --------+
```

| Estado | Duracion | Que hace |
|--------|----------|----------|
| **Blocking** | 20 seg | No aprende MACs, no envia frames |
| **Listening** | 15 seg | No aprende MACs, verifica BPDU |
| **Learning** | 15 seg | Aprende MACs pero no envia |
| **Forwarding** | - | Opera normalmente |

### BPDU (Bridge Protocol Data Unit)

Los switches intercambian **BPDUs** para:
- Electir el Root Bridge
- Detectar loops
- Notificar cambios de topologia

```bash
# Ver STP en Linux (bridge)
bridge link show
brctl showstp br0
```

## Port Security

Limita que MACs pueden conectarse a un puerto:

```cisco
interface FastEthernet0/1
 switchport mode access
 switchport port-security
 switchport port-security maximum 2
 switchport port-security violation shutdown
 switchport port-security mac-address sticky
```

## Puntos clave

- Un switch aprende MACs por el puerto donde llega el frame. La tabla MAC (CAM) es la base del forwarding.
- Unicast conocido se envia solo al puerto correcto. Desconocido se floodea. Broadcast a todos.
- STP previene loops bloqueando enlaces redundantes. Electe un Root Bridge y calcula caminos optimos.
- Port security limita MACs por puerto. Violacion puede apagar el puerto (shutdown).

:::quiz
[
  {
    "question": "Como aprende un switch a donde reenviar?",
    "options": ["Por configuracion manual siempre", "Aprende MACs por el puerto de llegada (tabla CAM)", "Por DHCP", "Por DNS"],
    "correctIndex": 1,
    "explanation": "La tabla MAC/CAM mapea MAC a puerto segun el trafico visto."
  },
  {
    "question": "Que hace el switch con un unicast de destino desconocido?",
    "options": ["Lo descarta", "Lo floodea por todos los puertos como broadcast", "Lo envia al router", "Lo guarda"],
    "correctIndex": 1,
    "explanation": "Desconocido = flood (menos al puerto de entrada). Conocido = solo su puerto."
  },
  {
    "question": "Para que sirve port security?",
    "options": ["Cifrar trafico", "Limitar MACs por puerto y apagarlo ante violacion", "Acelerar STP", "Asignar VLANs por DHCP"],
    "correctIndex": 1,
    "explanation": "Mitiga suplantacion y hubs no autorizados: violation -> restrict/protect/shutdown."
  }
]
:::
