---
id: routing-fundamentals
slug: routing-fundamentals
title: Enrutamiento basico: tablas de enrutamiento y protocolos
module: capa-red
difficulty: intermediate
estimatedMinutes: 7
xp: 80
---

# Enrutamiento basico: tablas de enrutamiento y protocolos

Como los paquetes llegan de un punto a otro, estatico vs dinamico, y los protocolos mas usados.

## Que es el enrutamiento

**Enrutamiento** = decidir por donde enviar un paquete cuando no esta en la misma subred. El dispositivo que hace esto es el **router**.

```
PC-A (192.168.1.10) --> Router-A --> Router-B --> PC-B (10.0.2.20)
                         |              |
                   tabla enrutamiento  tabla enrutamiento
```

## Tabla de enrutamiento

Cada router tiene una tabla que lista hacia donde enviar trafico:

```
$ ip route
default via 192.168.1.1 dev eth0
10.0.1.0/24 via 10.0.0.2 dev eth1
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.1
```

### Tipos de entradas

| Tipo | Ejemplo | Significado |
|------|---------|-------------|
| **Directamente conectada** | `192.168.1.0/24 dev eth0` | La red esta en un interfaz del router |
| **Estatica** | `10.0.2.0/24 via 192.168.1.254` | Ruta configurada manualmente |
| **Dinamica** | Aprendida via OSPF/BGP | Ruta aprendida automaticamente |
| **Default** | `default via 192.168.1.1` | Cuando no hay ruta especifica |

### Metrica y prefijo mas largo

Los routers prefieren la ruta con el **prefijo mas largo** (mas especifica):

```
Ruta A: 10.0.0.0/8  via 192.168.1.1   (menos especifica)
Ruta B: 10.0.1.0/24 via 192.168.1.2   (mas especifica)  <-- SE USA ESTA
```

Si hay empate en prefijo, se usa la **metrica** (costo administrativo).

## Rutas estaticas

Configuracion manual. Funciona bien en redes pequenas o estables.

```bash
# Linux: agregar ruta estatica
sudo ip route add 10.0.2.0/24 via 192.168.1.254

# Linux: ruta por interfaz especifica
sudo ip route add 10.0.3.0/24 via 192.168.1.254 dev eth1

# Cisco IOS
ip route 10.0.2.0 255.255.255.0 192.168.1.254

# Ruta por defecto (gateway)
sudo ip route add default via 192.168.1.1
```

**Ventajas**: rapida, consume pocos recursos, predictable.
**Desventajas**: no se adapta a cambios, hay que administrar manualmente.

## Protocolos dinamicos

### Clasificacion

| Protocolo | Tipo | Algoritmo | Puerto | Uso |
|-----------|------|-----------|--------|-----|
| **RIP** | IGP | Distance Vector | UDP 520 | Redes pequenas (obsoleto) |
| **OSPF** | IGP | Link-State | IP 89 | Empresas, campus |
| **EIGRP** | IGP | Hybrid (Cisco) | UDP 521 | Solo Cisco (proprietario) |
| **BGP** | EGP | Path Vector | TCP 179 | Internet, entre AS |

### OSPF (Open Shortest Path First)

El protocolo IGP mas usado en empresas. Usa el algoritmo de **Dijkstra** (SPF - Shortest Path First).

**Conceptos clave:**
- **Area**: divide la red en areas para escalabilidad. Area 0 es la backbone.
- **LSA** (Link-State Advertisement): cada router anuncia sus conexiones.
- **DR/BDR** (Designated Router / Backup): en redes multi-access, reduce la cantidad de LSAs.
- **Costo**: basado en bandwidth. `Costo = BW referencia / BW enlace`.

```bash
# Linux: verificar OSPF
sudo apt install frr    # FRRouting (reemplaza Quagga)
sudo vtysh
show ip ospf neighbor
show ip ospf database
show ip route ospf
```

### BGP (Border Gateway Protocol)

El protocolo que conecta Internet. Cada organizacion es un **AS** (Autonomous System) con un numero unico.

**Tipos:**
- **eBGP**: entre AS distintos (entre ISP y cliente)
- **iBGP**: dentro del mismo AS

**Path attributes** que usa BGP para decidir:
1. LOCAL_PREF (preferencia local)
2. AS_PATH (longitud del camino)
3. MED (Multi-Exit Discriminator)
4. Weight (Cisco specific)

```bash
# Verificar BGP
show ip bgp
show ip bgp summary
```

## Administrative Distance

Cuando hay multiples protocolos, el router usa la **AD** para elegir:

| Protocolo | AD |
|-----------|-----|
| Conectada directamente | 0 |
| Estatica | 1 |
| eBGP | 20 |
| OSPF | 110 |
| RIP | 120 |
| iBGP | 200 |

**Menor AD = mayor preferencia**.

## Puntos clave

- El enrutamiento decide por donde enviar paquetes entre redes distintas. La tabla de enrutamiento es la guia del router.
- Rutas estaticas son simples pero no escalan. OSPF es el IGP dinamico mas usado en empresas.
- BGP conecta Internet. Cada AS es una organizacion. eBGP entre AS, iBGP dentro.
- Prefijo mas largo gana sobre metrica. AD desempata entre protocolos distintos.

:::quiz
[
  {
    "question": "Que es una tabla de enrutamiento?",
    "options": ["La lista de PCs de la LAN", "La guia del router: a que red se llega por que siguiente salto", "La tabla MAC del switch", "El log de DHCP"],
    "correctIndex": 1,
    "explanation": "Cada entrada mapea un prefijo destino a interfaz o next-hop."
  },
  {
    "question": "Cuando prefieres rutas estaticas sobre OSPF?",
    "options": ["En redes grandes cambiantes", "En bordes stub simples con una salida", "Siempre", "Nunca"],
    "correctIndex": 1,
    "explanation": "Las estaticas son simples y predecibles; no escalan ni convergen solas en redes dinamicas."
  },
  {
    "question": "Que protocolo conecta sistemas autonomos en Internet?",
    "options": ["OSPF", "RIP", "BGP (eBGP entre AS)", "STP"],
    "correctIndex": 2,
    "explanation": "BGP es el EGP de Internet: eBGP entre AS (organizaciones), iBGP dentro."
  }
]
:::
