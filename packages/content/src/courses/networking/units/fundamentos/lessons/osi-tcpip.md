---
id: osi-tcpip
slug: osi-tcpip
title: Modelos OSI y TCP/IP
module: fundamentos
difficulty: beginner
estimatedMinutes: 15
xp: 70
summary: Las 7 capas OSI frente a las 4 de TCP/IP, encapsulamiento y como viaja un paquete.
---

# Modelos OSI y TCP/IP

Todo lo que pasa en una red se puede explicar con un modelo de capas. El **modelo OSI** tiene 7 capas y es la referencia teorica; el **modelo TCP/IP** tiene 4 y es el que realmente se implementa en Internet.

## Las 7 capas OSI

Memoriza con la frase: **F**isica, **E**nlace, **R**ed, **T**ransporte, **S**esion, **P**resentacion, **A**plicacion.

| # | Capa | Que hace | Ejemplos |
|---|------|----------|----------|
| 7 | Aplicacion | Servicios al usuario | HTTP, DNS, SMTP |
| 6 | Presentacion | Formato, cifrado, compresion | TLS, JPEG, ASCII |
| 5 | Sesion | Dialogos y conexiones | NetBIOS, RPC |
| 4 | Transporte | Extremo a extremo fiable | TCP, UDP |
| 3 | Red | Ruteo entre redes | IP, ICMP, OSPF |
| 2 | Enlace | Tramas en el medio local | Ethernet, MAC, VLAN |
| 1 | Fisica | Bits en cable/radio | UTP, fibra, Wi-Fi |

## El modelo TCP/IP (4 capas)

| TCP/IP | Capas OSI que agrupa |
|--------|----------------------|
| Acceso a red | Fisica + Enlace |
| Internet | Red |
| Transporte | Transporte |
| Aplicacion | Sesion + Presentacion + Aplicacion |

En la practica hablamos de TCP/IP. OSI se usa para diagnosticar: "el fallo esta en capa 2 o en capa 3?".

## Encapsulamiento

Cada capa agrega su cabecera al bajar, y la quita al subir:

```
Datos de aplicacion
  + cabecera TCP/UDP   -> Segmento (capa 4)
  + cabecera IP        -> Paquete (capa 3)
  + cabecera Ethernet  -> Trama (capa 2)
  + bits al cable      -> (capa 1)
```

Vocabulario CCNA: **segmento** (L4), **paquete** (L3), **trama** (L2).

## Ejemplo: abrir una web

1. DNS resuelve el nombre (capa 7).
2. TCP abre conexion con three-way handshake (capa 4).
3. IP rutea los paquetes hasta el servidor (capa 3).
4. Ethernet entrega cada trama al siguiente salto (capa 2).

## Puntos clave

- OSI tiene 7 capas y es la referencia para diagnosticar; TCP/IP tiene 4 y es lo que se implementa.
- Cada capa habla con su par en el otro extremo (comunicacion par-a-par logica).
- Segmento = L4, paquete = L3, trama = L2. Esta distincion cae en el examen.
- Encapsular es agregar cabeceras al bajar; el receptor las quita al subir.

:::quiz
[
  {
    "question": "Que capa OSI se encarga del ruteo entre redes?",
    "options": ["Capa 2 (Enlace)", "Capa 3 (Red)", "Capa 4 (Transporte)", "Capa 7 (Aplicacion)"],
    "correctIndex": 1,
    "explanation": "La capa 3 (Red) decide la ruta con direcciones IP. La capa 2 solo entrega tramas dentro de la red local."
  },
  {
    "question": "Como se llama la unidad de datos de la capa 4?",
    "options": ["Paquete", "Trama", "Segmento", "Bit"],
    "correctIndex": 2,
    "explanation": "Segmento es L4 (TCP/UDP). Paquete es L3, trama es L2."
  },
  {
    "question": "Que capas OSI agrupa la capa de Aplicacion de TCP/IP?",
    "options": ["Solo la 7", "5, 6 y 7", "3 y 4", "1 y 2"],
    "correctIndex": 1,
    "explanation": "TCP/IP agrupa Sesion (5), Presentacion (6) y Aplicacion (7) en una sola capa de aplicacion."
  }
]
:::
