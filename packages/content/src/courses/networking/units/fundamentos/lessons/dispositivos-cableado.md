---
id: dispositivos-cableado
slug: dispositivos-cableado
title: Dispositivos de red y cableado
module: fundamentos
difficulty: beginner
estimatedMinutes: 15
xp: 70
summary: Hub, switch, router, firewall y AP, mas cable UTP, fibra y normas T568A/B.
---

# Dispositivos de red y cableado

Cada dispositivo opera en una capa y toma decisiones distintas. Confundirlos es la causa numero uno de disenos rotos.

## Dispositivos por capa

| Dispositivo | Capa | Que decide | Dominio que separa |
|-------------|------|------------|-------------------|
| Hub | 1 | Nada: repite todo | Ninguno |
| Switch | 2 | Reenvia por MAC | Colisiones (cada puerto es un dominio) |
| Router | 3 | Rutea por IP | Broadcast (cada interfaz es una red) |
| Firewall | 3-7 | Permite/deniega por reglas | Zonas de seguridad |
| Access Point | 1-2 | Puentea radio a Ethernet | Ninguno (extiende L2) |

Regla de oro: **los switches separan colisiones, los routers separan broadcasts**.

## Switch vs router en una frase

- El switch pregunta: "a que MAC entrego esta trama dentro de mi red?".
- El router pregunta: "a que RED envio este paquete para acercarlo a su destino?".

## Cableado UTP

Par trenzado con conectores RJ45. Categorias:

| Categoria | Velocidad | Uso tipico |
|-----------|-----------|------------|
| Cat5e | 1 Gbps / 100 m | Oficinas antiguas |
| Cat6 | 10 Gbps / 55 m | Estándar actual |
| Cat6a | 10 Gbps / 100 m | Data centers |

Normas de pines: **T568A** y **T568B**. Lo importante es usar la MISMA norma en ambos extremos (cable directo). El cable cruzado (A en un extremo, B en el otro) hoy es innecesario: casi todo usa **Auto-MDIX**.

## Fibra optica

| Tipo | Distancia | Conectores tipicos |
|------|-----------|-------------------|
| Multimodo (OM3/OM4) | hasta 550 m | LC, SC |
| Monomodo (OS2) | 10 km o mas | LC, SC |

Luz en vez de electricidad: inmune a interferencias, ideal para uplinks y campus.

## Topologias fisicas vs logicas

- **Estrella**: todo al switch central (la norma hoy).
- **Malla**: redundancia total o parcial (WAN, data centers).
- La topologia logica (VLANs, subredes) puede diferir de la fisica.

## Puntos clave

- Hub repite (L1), switch conmuta por MAC (L2), router rutea por IP (L3).
- Switches separan dominios de colision; routers separan dominios de broadcast.
- Cat6/Cat6a para cobre; fibra para distancia y uplinks.
- Un solo estandar de pines en ambos extremos; Auto-MDIX elimina el cable cruzado.

:::quiz
[
  {
    "question": "Que dispositivo separa dominios de broadcast?",
    "options": ["Hub", "Switch", "Router", "Access Point"],
    "correctIndex": 2,
    "explanation": "Cada interfaz de router es una red distinta: el broadcast no la cruza. El switch reenvia broadcasts a todos sus puertos."
  },
  {
    "question": "En que capa opera un switch para reenviar tramas?",
    "options": ["Capa 1, por puerto", "Capa 2, por direccion MAC", "Capa 3, por direccion IP", "Capa 4, por puerto TCP"],
    "correctIndex": 1,
    "explanation": "El switch aprende MACs por puerto y conmuta tramas en capa 2."
  },
  {
    "question": "Cuando necesitas cable cruzado hoy?",
    "options": ["Siempre entre switch y PC", "Casi nunca, por Auto-MDIX", "Solo con fibra", "Solo en PoE"],
    "correctIndex": 1,
    "explanation": "Auto-MDIX negocia los pares automaticamente; el cable cruzado es legado."
  }
]
:::
