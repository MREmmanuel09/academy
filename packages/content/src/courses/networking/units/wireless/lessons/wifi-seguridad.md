---
id: wifi-seguridad
slug: wifi-seguridad
title: Seguridad Wi-Fi WPA2/WPA3
module: wireless
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Cifrado, autenticacion Personal vs Enterprise y caza de rogue APs.
---

# Seguridad Wi-Fi WPA2/WPA3

El aire no tiene paredes: cualquiera escucha. La seguridad Wi-Fi combina **cifrado** (que no lean) y **autenticacion** (quien entra).

## Evolucion (y que evitar)

| Protocolo | Estado |
|-----------|--------|
| WEP | Roto en minutos. Jamas |
| WPA (TKIP) | Obsoleto |
| WPA2 (AES-CCMP) | Minimo aceptable |
| WPA3 (SAE/GCMP) | Actual: resiste diccionario offline |

## Personal vs Enterprise

| Modo | Auth | Uso |
|------|------|-----|
| Personal (PSK) | Una clave compartida | Casa, SOHO |
| Enterprise (802.1X) | Usuario+clave o certificado contra RADIUS | Empresa |

Con PSK, quien tiene la clave descifra trafico ajeno capturado. Con Enterprise (EAP-TLS idealmente), cada sesion tiene claves propias.

## WPA3 aporta

- **SAE** (Dragonfly): el handshake no entrega material para diccionario offline.
- **Forward secrecy**: robar la clave no descifra capturas viejas.
- **Easy Connect** (DPP): alta de dispositivos IoT con QR en vez de claves.
- Transicion WPA2/WPA3 para convivir con clientes viejos.

## Amenazas tipicas

- **Evil twin**: AP falso con tu SSID para capturar credenciales. Defensa: certificados (Enterprise) + no unirse a abiertas.
- **Rogue AP**: AP no autorizado pinchado a tu LAN. Defensa: WIDS + 802.1X en puertos cableados.
- **Deauth**: tramas de desautenticacion falsificadas. Defensa: 802.11w (management frame protection).

## Buenas practicas

1. WPA3 (o WPA2-AES minimo), nada abierto ni WEP.
2. SSID de invitados aislado (VLAN + ACL, sin acceso a LAN).
3. Cambia credenciales admin del AP/controlador; actualiza firmware.
4. Desactiva WPS por PIN.

## Puntos clave

- WEP/WPA muertos; WPA2-AES minimo, WPA3 objetivo.
- Personal = una clave para todos; Enterprise = identidad por usuario (RADIUS).
- Evil twin, rogue AP y deauth son los tres ataques del examen.
- Invitados siempre en red aislada.

:::quiz
[
  {
    "question": "Por que WPA3 resiste mejor el diccionario que WPA2-Personal?",
    "options": ["Usa claves mas largas", "SAE no expone material para ataque offline", "Bloquea MACs", "Cambia el SSID solo"],
    "correctIndex": 1,
    "explanation": "Con WPA2-PSK basta capturar el handshake para probar claves offline. SAE (Dragonfly) lo impide."
  },
  {
    "question": "Que te da 802.1X/Enterprise que PSK no da?",
    "options": ["Mas velocidad", "Autenticacion individual por usuario con claves de sesion propias", "Mas alcance", "Menos latencia"],
    "correctIndex": 1,
    "explanation": "Cada usuario se autentica (idealmente con certificado) y obtiene claves unicas; con PSK todos comparten secreto."
  },
  {
    "question": "Detectas un AP con tu SSID corporativo que tu no instalaste. Es...",
    "options": ["Un repetidor legitimo", "Rogue AP o evil twin: aislar e investigar", "Interferencia normal", "Un cliente nuevo"],
    "correctIndex": 1,
    "explanation": "SSID suplantado + hardware desconocido = amenaza activa. Se aisla el puerto y se localiza fisicamente."
  }
]
:::
