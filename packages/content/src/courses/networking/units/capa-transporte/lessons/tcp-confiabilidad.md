---
id: tcp-confiabilidad
slug: tcp-confiabilidad
title: TCP a fondo y troubleshooting
module: capa-transporte
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Handshake, numeros de secuencia, ventana deslizante, congestion y como leerlo en capturas.
---

# TCP a fondo y troubleshooting

TCP entrega un **flujo ordenado y fiable** sobre una red que no lo es. Todo su diseno gira alrededor de tres ideas: confirmar, reintentar y adaptarse.

## Three-way handshake

```
Cliente                    Servidor
  | ---- SYN, seq=x ----> |
  | <-- SYN+ACK, seq=y, ack=x+1 -- |
  | ---- ACK, ack=y+1 ---> |
```

- **SYN**: quiero hablar, mi secuencia inicial es x.
- **SYN+ACK**: acepto, la mia es y, espero x+1.
- **ACK**: confirmado, espero y+1. Conexion ESTABLISHED.

Cierre: FIN/ACK por cada lado (o RST para abortar).

## Numeros de secuencia y ACK

Cada byte enviado tiene numero. El receptor confirma con ACK = "espero el byte N". Si el emisor no recibe el ACK a tiempo (**RTO**), **retransmite**. Duplicados y desordenados se reordenan por secuencia.

## Ventana deslizante (flow control)

El receptor dice cuantos bytes puede recibir (**window size**). El emisor nunca envia mas de lo anunciado: asi un servidor rapido no ahoga a un cliente lento. Ventana a cero = "para, estoy lleno" (zero-window).

## Control de congestion

TCP sondea la capacidad real de la red:

1. **Slow start**: crece exponencialmente hasta perder un paquete.
2. **Congestion avoidance**: crece linealmente (un segmento por RTT).
3. **Fast retransmit**: 3 ACK duplicados = reenvia sin esperar el timeout.

## Leerlo en Wireshark

| patron | Significado |
|--------|-------------|
| SYN sin respuesta | Puerto cerrado, firewall o host caido |
| Muchos retransmissions | Perdida o congestión |
| Zero window | Receptor saturado |
| RST tras SYN | Puerto cerrado (el host responde y rechaza) |
| FIN, FIN | Cierre normal |

## TCP vs UDP, decision rapida

Usa TCP si necesitas orden y fiabilidad (web, correo, archivos). Usa UDP si importa mas la latencia que la perdida (VoIP, juegos, DNS, streaming en vivo).

## Puntos clave

- SYN, SYN+ACK, ACK abren; FIN cierra por cada lado; RST aborta.
- ACK confirma bytes, no paquetes; el timeout dispara retransmision.
- La ventana protege al receptor; slow start protege a la red.
- En capturas: SYN solo = filtrado; retransmisiones = perdida; ventana cero = saturacion.

:::quiz
[
  {
    "question": "Que contiene el segundo paquete del handshake?",
    "options": ["Solo SYN", "SYN+ACK", "Solo ACK", "FIN+ACK"],
    "correctIndex": 1,
    "explanation": "El servidor responde SYN+ACK: propone su secuencia y confirma la del cliente."
  },
  {
    "question": "Que significa una ventana anunciada de cero?",
    "options": ["Conexion cerrada", "El receptor esta lleno: deja de enviar", "Congestion en la red", "Puerto cerrado"],
    "correctIndex": 1,
    "explanation": "Zero-window es flow control: el receptor pide pausa hasta liberar buffer."
  },
  {
    "question": "Ves SYNs repetidos sin respuesta en una captura. Lo mas probable?",
    "options": ["Congestion leve", "Puerto filtrado o host inalcanzable", "Cierre normal", "Ventana llena"],
    "correctIndex": 1,
    "explanation": "Sin ni siquiera un RST, algo filtra o el destino no existe en esa ruta."
  }
]
:::
