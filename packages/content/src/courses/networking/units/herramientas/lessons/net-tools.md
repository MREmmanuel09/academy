---
id: net-tools
slug: net-tools
title: Herramientas de red: ping, traceroute, nmap y mas
module: herramientas
difficulty: beginner
estimatedMinutes: 5
xp: 75
---

# Herramientas de red: ping, traceroute, nmap y mas

Las herramientas esenciales para diagnosticar, monitorear y auditar redes.

## Ping (ICMP Echo)

**Ping** verifica conectividad y mide latencia usando **ICMP Echo Request/Reply**.

```bash
# Basico
ping google.com

# Numero de paquetes
ping -c 4 google.com

# Tamanio especifico
ping -s 1472 -M do google.com    # MTU discovery

# Intervalo
ping -i 0.2 google.com    # 200ms entre paquetes

# Flood ping (solo root, peligroso)
sudo ping -f google.com
```

### Interpretar resultado

```
PING google.com (142.250.80.46): 56 data bytes
64 bytes from 142.250.80.46: icmp_seq=0 ttl=116 time=12.3 ms
64 bytes from 142.250.80.46: icmp_seq=1 ttl=116 time=11.8 ms
--- google.com ping statistics ---
2 packets transmitted, 2 received, 0% packet loss
round-trip min/avg/max/stddev = 11.8/12.1/12.3/0.2 ms
```

**Metricas importantes:**
- **time**: latencia de ida y vuelta (menor es mejor)
- **ttl**: time to live (cuantos saltos quedan)
- **packet loss**: perdida de paquetes (0% es ideal)
- **jitter**: variacion en la latencia

## Traceroute / Tracert

**Traceroute** muestra el camino que toma un paquete hasta el destino, revelando cada router (hop) por el que pasa.

```bash
# Linux (usa UDP por defecto)
traceroute google.com

# Con ICMP (como Windows tracert)
sudo traceroute -I google.com

# Sin resolver DNS (mas rapido)
traceroute -n google.com

# Limite de saltos
traceroute -m 15 google.com

# Windows
tracert google.com
```

### Salida tipica

```
 1  192.168.1.1 (192.168.1.1)  1.234 ms  1.123 ms  1.067 ms   # Tu router
 2  10.0.0.1 (10.0.0.1)  5.432 ms  5.321 ms  5.234 ms         # ISP gateway
 3  72.14.236.204 (72.14.236.204)  8.765 ms  8.654 ms  8.543 ms  # Backbone
 4  * * *                                                           # Timeout (no responde)
 5  142.250.80.46 (142.250.80.46)  12.345 ms  12.234 ms  12.123 ms  # Destino
```

**Significado de asteriscos (\*)**: el router no responde ICMP (puede ser firewall, o politica de no responder).

## Nmap (Network Mapper)

**Nmap** es la herramienta de scanning mas poderosa del mundo.

### Escaneos basicos

```bash
# Ping scan (descubrir hosts)
nmap -sn 192.168.1.0/24

# Scan rapido de puertos comunes
nmap 192.168.1.1

# Scan todos los puertos (1-65535)
nmap -p- 192.168.1.1

# Scan con version detection
nmap -sV 192.168.1.1

# Scan completo (SYN + version + scripts)
nmap -sC -sV -O 192.168.1.1
```

### Tipos de escaneo

| Flag | Tipo | Descripcion |
|------|------|-------------|
| `-sS` | SYN scan | Rapido, stealth (no completa handshake) |
| `-sT` | TCP connect | Completo, pero detectable |
| `-sU` | UDP scan | Lento pero importante |
| `-sV` | Version detection | Detecta version de servicio |
| `-O` | OS detection | Detecta sistema operativo |
| `-A` | Agresivo | Version + OS + scripts |

```bash
# Escaneo stealth de red completa
sudo nmap -sS -T4 192.168.1.0/24

# Verificar vulnerabilidades
nmap --script vuln 192.168.1.1

# Scan HTTP
nmap -sV -p 80,443,8080 192.168.1.0/24
```

## Otras herramientas esenciales

### Netcat (nc)

La "navaja suiza" de redes:

```bash
# Servidor escuchando
nc -l -p 8080

# Cliente conectando
nc 192.168.1.10 8080

# Port scan
nc -zv 192.168.1.1 22-80

# Transferir archivos
# receptor:
nc -l -p 8080 > archivo.txt
# emisor:
nc 192.168.1.10 8080 < archivo.txt
```

### iperf3 (benchmark de red)

```bash
# Servidor
iperf3 -s

# Cliente (TCP)
iperf3 -c 192.168.1.10

# Cliente (UDP, 100 Mbps)
iperf3 -c 192.168.1.10 -u -b 100M
```

### dig (DNS)

```bash
dig google.com A
dig google.com MX
dig +trace google.com
dig @8.8.8.8 google.com    # consultar servidor especifico
```

### ss/netstat (conexiones)

```bash
ss -tlnp    # TCP listening con proceso
ss -ulnp    # UDP listening
ss -s       # estadisticas
```

## Puntos clave

- Ping mide latencia y perdida via ICMP. `ping -c 4` para limitar paquetes.
- Traceroute muestra cada hop. Asteriscos = router no responde ICMP.
- Nmap es el scanner definitivo. `-sS` es stealth, `-sV` detecta versiones, `-p-` todos los puertos.
- Netcat es la navaja suiza: servers, clients, port scan, file transfer. iperf3 mide throughput real.

:::quiz
[
  {
    "question": "Que mide ping realmente?",
    "options": ["Ancho de banda", "Latencia y perdida via ICMP Echo", "Puertos abiertos", "Rutas BGP"],
    "correctIndex": 1,
    "explanation": "Ping envia ICMP Echo y mide ida/vuelta + perdidas. Para throughput usa iperf3."
  },
  {
    "question": "Que significa una fila de asteriscos en traceroute?",
    "options": ["Exito total", "Un hop que no responde ICMP (filtrado o silencioso)", "Fin de la ruta siempre", "Error de DNS"],
    "correctIndex": 1,
    "explanation": "Asteriscos = sin respuesta a ese TTL: router que no contesta, no necesariamente caida."
  },
  {
    "question": "Para que sirven -sS y -sV en nmap?",
    "options": ["Velocidad y verbose", "-sS escaneo stealth SYN, -sV detecta versiones de servicio", "Solo IPv6", "Nada, estan obsoletos"],
    "correctIndex": 1,
    "explanation": "SYN stealth no completa el handshake (discreto); -sV identifica servicio y version para buscar CVEs."
  }
]
:::
