---
id: wifi-fundamentals
slug: wifi-fundamentals
title: WiFi: estandares, frecuencias y seguridad
module: wireless
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# WiFi: estandares, frecuencias y seguridad

IEEE 802.11, 2.4 GHz vs 5 GHz vs 6 GHz, WPA3, y como configurar un AP.

## Estandares WiFi (802.11)

| Estandar | Ano | Freq | Max throughput | Nombre comun |
|----------|-----|------|----------------|--------------|
| 802.11b | 1999 | 2.4 GHz | 11 Mbps | - |
| 802.11a | 1999 | 5 GHz | 54 Mbps | - |
| 802.11g | 2003 | 2.4 GHz | 54 Mbps | - |
| 802.11n | 2009 | 2.4/5 GHz | 600 Mbps | WiFi 4 |
| 802.11ac | 2013 | 5 GHz | 6.9 Gbps | WiFi 5 |
| 802.11ax | 2020 | 2.4/5/6 GHz | 9.6 Gbps | WiFi 6/6E |
| 802.11be | 2024 | 2.4/5/6 GHz | 46 Gbps | WiFi 7 |

## Bandas de frecuencia

### 2.4 GHz

| Canal | Freq | Uso |
|-------|------|-----|
| 1 | 2.401 GHz | No se superpone con 6, 11 |
| 6 | 2.437 GHz | Canal recomendado |
| 11 | 2.467 GHz | No se superpone con 1, 6 |

**Ventajas**: mayor alcance, mejor penetracion en paredes.
**Desventajas**: solo 3 canales no solapados (1, 6, 11), mucha interferencia (microondas, Bluetooth).

### 5 GHz

Mas canales (24+), menos interferencia, mayor throughput.
**Desventajas**: menor alcance, peor penetracion en paredes.

### 6 GHz (WiFi 6E)

1200 MHz de espectro nuevo, canales de 160 MHz, sin legacy devices.

## Seguridad WiFi

| Protocolo | Ano | Encriptacion | Estado |
|-----------|-----|-------------|--------|
| WEP | 1999 | RC4 (40-bit) | **ROTO** - no usar |
| WPA | 2003 | TKIP | Deprecado |
| WPA2 | 2004 | AES-CCMP | Minimo aceptable |
| WPA3 | 2018 | SAE + AES-GCMP | **Recomendado** |

### WPA3 SAE

**SAE** (Simultaneous Authentication of Equals) reemplaza el PSK de WPA2. Protege contra ataques de diccionario offline.

```bash
# Verificar seguridad de tu WiFi (Linux)
iwconfig wlan0
nmcli device wifi list
```

## Configuracion de AP

### Archivo de configuracion tipico (OpenWrt/UCI)

```
config wifi-device 'radio0'
    option type 'mac80211'
    option channel '6'
    option htmode 'HT40+'
    option cell_density '1'

config wifi-iface 'default_radio0'
    option device 'radio0'
    option network 'lan'
    option mode 'ap'
    option ssid 'MiRed'
    option encryption 'sae'
    option key 'MiPasswordSegura123'
```

### Consideraciones de diseno

- **Separacion de APs**: 15-25 metros en interiores
- **Canal**: usar canales 1, 6, 11 en 2.4 GHz (no solapados)
- **Potencia**: reducir en entornos densos para minimizar interferencia
- **Roaming**: 802.11r (Fast BSS Transition) para handoff rapido

```bash
# Linux como AP (hostapd)
sudo apt install hostapd
# /etc/hostapd/hostapd.conf
interface=wlan0
driver=nl80211
ssid=MiRed
hw_mode=g
channel=6
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=MiPassword123
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

## Puntos clave

- WiFi 6 (802.11ax) es el estandar actual. WiFi 7 (802.11be) esta llegando con 46 Gbps.
- 2.4 GHz tiene mejor alcance pero 3 canales no solapados. 5 GHz tiene mas canales pero menor alcance.
- WEP esta roto. WPA2 es el minimo. WPA3 SAE es lo recomendado.
- Para APs en empresa, usa canales 1, 6, 11 en 2.4 GHz y planifica separacion de 15-25 metros.

:::quiz
[
  {
    "question": "Que estandar Wi-Fi es la referencia actual?",
    "options": ["802.11n", "WiFi 6 (802.11ax)", "802.11b", "WiFi 2"],
    "correctIndex": 1,
    "explanation": "WiFi 6 (ax) es el despliegue tipico; WiFi 7 (be) esta llegando."
  },
  {
    "question": "2.4 GHz frente a 5 GHz: cual es el trueque?",
    "options": ["2.4 mas alcance y menos canales limpios; 5 mas capacidad y menos alcance", "Son identicas", "5 GHz llega mas lejos", "2.4 es mas rapida siempre"],
    "correctIndex": 0,
    "explanation": "2.4 penetra y alcanza (3 canales utiles); 5 ofrece canales y velocidad a corta distancia."
  },
  {
    "question": "Minimo de seguridad aceptable hoy?",
    "options": ["WEP", "Abierta con portal", "WPA2 (mejor WPA3)", "Ninguna con MAC filter"],
    "correctIndex": 2,
    "explanation": "WEP esta roto; MAC filter no autentica. WPA2 minimo, WPA3 SAE recomendado."
  }
]
:::
