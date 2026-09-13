---
id: tcp-udp
slug: tcp-udp
title: TCP vs UDP: confiabilidad vs velocidad
module: capa-transporte
difficulty: beginner
estimatedMinutes: 5
xp: 65
---

# TCP vs UDP: confiabilidad vs velocidad

Los dos protocolos de transporte dominantes, cuando usar cada uno, y como funciona el control de flujo.

## Por que existen dos protocolos

La capa de transporte resuelve un problema: como enviar datos de una aplicacion a otra. Hay dos filosofias opuestas:

- **TCP**: "quiero que llegue todo, sin errores, en orden". Prefiere confiabilidad sobre velocidad.
- **UDP**: "quiero que llegue rapido, si se pierde algo no importa". Prefiere velocidad sobre confiabilidad.

## TCP (Transmission Control Protocol)

**TCP** es orientado a conexion. Antes de enviar datos, establece una sesion via el **three-way handshake**:

```
Cliente                    Servidor
   |---- SYN (seq=100) ------->|     1. Cliente pide conexion
   |<--- SYN-ACK (seq=300, ack=101) --|  2. Servidor acepta
   |---- ACK (ack=301) ------->|     3. Cliente confirma
   |                            |
   |<=== datos bidireccionales ==>|   4. Sesion establecida
```

### Caracteristicas TCP

| Feature | Descripcion |
|---------|-------------|
| **Ordenamiento** | Cada paquete tiene un numero de secuencia. El receptor reordena. |
| **ACK** | El receptor confirma cada segmento recibido. |
| **Retransmision** | Si no hay ACK, se reenvia el segmento (timeout o triple duplicate ACK). |
| **Control de flujo** | Ventana de recepcion: el receptor dice cuanto puede buffer. |
| **Control de congestion** | Slow start, congestion avoidance, fast retransmit. |

### Puertos TCP comunes

| Puerto | Servicio |
|--------|----------|
| 22 | SSH |
| 25 | SMTP (email) |
| 53 | DNS (tambien UDP) |
| 80 | HTTP |
| 443 | HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |

## UDP (User Datagram Protocol)

**UDP** es sin conexion. No hay handshake, no hay ACK, no hay ordenamiento.

```
Cliente                    Servidor
   |---- datos (sin handshake) -->|   1. Envio directo
   |<--- datos (sin confirmar) ---|   2. Respuesta directo
```

### Caracteristicas UDP

| Feature | Descripcion |
|---------|-------------|
| **Sin conexion** | No hay establecimiento ni cierre. |
| **Sin ACK** | El emisor no sabe si llego. |
| **Sin reordenamiento** | Los paquetes pueden llegar desordenados. |
| **Sin control de congestion** | Envia tan rapido como pueda. |
| **Header pequeno** | 8 bytes vs 20+ bytes de TCP. |

### Puertos UDP comunes

| Puerto | Servicio |
|--------|----------|
| 53 | DNS |
| 67/68 | DHCP |
| 69 | TFTP |
| 123 | NTP |
| 161 | SNMP |
| 500 | IKE (VPN) |
| 514 | Syslog |
| 1900 | UPnP |

## Comparacion directa

| Aspecto | TCP | UDP |
|---------|-----|-----|
| **Conexion** | Orientado a conexion | Sin conexion |
| **Confiabilidad** | Garantiza entrega | Best-effort |
| **Orden** | Garantiza orden | No garantiza |
| **Velocidad** | Mas lento (overhead) | Mas rapido |
| **Header** | 20-60 bytes | 8 bytes |
| **Uso** | Web, email, SSH, DB | DNS, VoIP, gaming, streaming |

## Cuando usar cada uno

**Usa TCP cuando:**
- La integridad importa mas que la velocidad (web, email, archivos)
- Necesitas orden (base de datos, transferencia de archivos)
- El receptor necesita confirmar recepcion

**Usa UDP cuando:**
- La velocidad es critica (gaming, VoIP, videoconferencia)
- Puedes tolerar perdidas (streaming en vivo)
- El protocolo superior maneja la confiabilidad (DNS, DHCP)

> **Dato tecnico**: HTTP/3 usa **QUIC** sobre UDP, no TCP. QUIC implementa su propia capa de confiabilidad sobre UDP para obtener lo mejor de ambos mundos.

## Puntos clave

- TCP es orientado a conexion, confiable, ordenado. UDP es sin conexion, rapido, best-effort.
- TCP usa three-way handshake (SYN, SYN-ACK, ACK) antes de enviar datos.
- UDP tiene header de solo 8 bytes vs 20+ de TCP. Menos overhead = mas velocidad.
- HTTP/3 usa QUIC sobre UDP. DNS usa UDP (consultas) y TCP (transferencias de zona grandes).

:::quiz
[
  {
    "question": "What are the three steps of the TCP three-way handshake?",
    "options": ["Request, Response, Acknowledge", "SYN, SYN-ACK, ACK", "Connect, Transfer, Disconnect", "Ping, Pong, Done"],
    "correctIndex": 1,
    "explanation": "The TCP three-way handshake is: 1) Client sends SYN, 2) Server replies with SYN-ACK, 3) Client confirms with ACK."
  },
  {
    "question": "How does TCP differ from UDP in terms of reliability?",
    "options": ["Both are equally reliable", "TCP guarantees delivery and order; UDP is best-effort", "UDP is more reliable than TCP", "Neither guarantees delivery"],
    "correctIndex": 1,
    "explanation": "TCP guarantees ordered, reliable delivery with acknowledgments and retransmissions. UDP is best-effort — fast but no delivery guarantee."
  },
  {
    "question": "Which of these is a good use case for UDP?",
    "options": ["Email transmission", "File transfer", "Live video streaming and online gaming", "Database replication"],
    "correctIndex": 2,
    "explanation": "UDP is ideal for real-time applications like live video, gaming, VoIP, and DNS where speed matters more than perfect reliability."
  }
]
:::
