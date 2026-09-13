---
id: wireshark
slug: wireshark
title: Wireshark y tcpdump
module: herramientas
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Capturar, filtrar y leer trafico como un profesional.
---

# Wireshark y tcpdump

Ninguna herramienta ensena mas red que ver los paquetes de verdad. **Wireshark** (grafico) y **tcpdump** (terminal) leen el mismo formato (pcap).

## Capturar bien

1. Captura CERCA del problema (en el cliente que falla, no tres saltos lejos).
2. En switches, usa **port mirroring/SPAN** para ver trafico ajeno.
3. Filtra AL CAPTURAR si el volumen es enorme (`port 443`), o captura todo y filtra al analizar.

## Filtros de visualizacion (los 10 que pagan el sueldo)

```
ip.addr == 10.0.0.5        # todo lo de/a esa IP
tcp.port == 443            # trafico HTTPS
dns                        # solo DNS
http.request               # peticiones HTTP
tcp.flags.syn == 1         # intentos de conexion
tcp.analysis.retransmission # retransmisiones (perdida)
arp                        # quien pregunta por quien
icmp                       # pings y errores
tls.handshake              # apretones TLS
!(arp or dns)              # quita ruido
```

`==`, `!=`, `&&`, `||`, `!` y `contains` combinan todo.

## Follow TCP Stream

Click derecho en un paquete → **Follow → TCP Stream**: reconstruye la conversacion completa (peticion HTTP + respuesta, credenciales en claro si las hay...). Imprescindible para applicaciones.

## tcpdump esencial

```
tcpdump -i eth0 -n port 80        # sin resolver nombres (-n)
tcpdump -i any host 10.0.0.5 -w out.pcap
tcpdump -r out.pcap 'tcp[tcpflags] & tcp-syn != 0'
```

`-n` evita DNS reverso (rapido y limpio). `-w` guarda para Wireshark.

## Leer latencias

- Delta entre peticion y respuesta = tiempo de servidor + red.
- Handshake lento + datos rapidos = problema de ida (ruta/firewall), no de ancho de banda.
- Retransmisiones con buen throughput = perdida esporadica, no saturacion.

## Puntos clave

- Captura cerca del sintoma; SPAN para ver lo ajeno.
- Filtra para pensar: retransmisiones, SYN solos, DNS fallido.
- Follow Stream reconstruye la historia completa.
- tcpdump -n -w y analiza en Wireshark: el flujo profesional.

:::quiz
[
  {
    "question": "Que filtro muestra solo retransmisiones TCP?",
    "options": ["tcp.port == 80", "tcp.analysis.retransmission", "dns", "arp"],
    "correctIndex": 1,
    "explanation": "Los display filters de analisis marcan retransmisiones, ventanas cero y fast retransmit listos para filtrar."
  },
  {
    "question": "Para que sirve Follow TCP Stream?",
    "options": ["Para cifrar", "Para reconstruir la conversacion completa de una conexion", "Para bloquear IPs", "Para medir Wi-Fi"],
    "correctIndex": 1,
    "explanation": "Reensambla segmentos en el flujo logico: ves la peticion y respuesta enteras."
  },
  {
    "question": "Por que -n en tcpdump?",
    "options": ["Mas paquetes", "Evita resolucion DNS: mas rapido y salida limpia", "Captura mas interfaces", "Activa promiscuo"],
    "correctIndex": 1,
    "explanation": "Sin -n cada IP dispara una consulta DNS reversa: lento y ruidoso."
  }
]
:::
