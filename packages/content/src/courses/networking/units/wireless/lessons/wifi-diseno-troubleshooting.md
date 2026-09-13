---
id: wifi-diseno-troubleshooting
slug: wifi-diseno-troubleshooting
title: Diseno Wi-Fi y troubleshooting
module: wireless
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Canales, potencia, roaming y como diagnosticar una Wi-Fi lenta.
---

# Diseno Wi-Fi y troubleshooting

Una Wi-Fi lenta casi nunca es "poca velocidad contratada": es canal, cobertura o demasiados clientes peleando por el aire (medio **compartido**).

## Canales en 2.4 GHz: 1, 6 y 11

Solo hay 3 canales que no se solapan (en Europa, 1-13 con solape parcial). Regla: usa **1, 6 u 11** y coordina con los vecinos.

```
Canal:  1     6     11
        |___| |___| |___|   sin solape
```

## 5 y 6 GHz

Mas canales limpios y anchos (40/80/160 MHz), menos alcance y peor penetracion de muros. Diseno moderno: **5 GHz como banda principal**, 2.4 para IoT/legado.

## Potencia y cobertura

- Mas potencia NO es mejor: el cliente oye al AP pero el AP no oye al cliente (asimetria) y ensucias al vecino.
- Celdas pequenas con potencia moderada + roaming 802.11r/k/v.
- Regla practica: -65 dBm o mejor en zonas de trabajo.

## Alta densidad

Muchos clientes = colisiones y reintentos. Tecnicas:

- Baja la potencia y pon mas APs (microceldas).
- Band steering hacia 5 GHz.
- Desactiva velocidades bajas (evita clientes lentos que acaparan aire).
- MU-MIMO y OFDMA (Wi-Fi 6) ayudan, no hacen magia.

## Troubleshooting: escalera

1. **Cobertura?** Mide RSSI donde falla (< -70 dBm = problema).
2. **Canal?** Analizador: solape o interferencia no-Wi-Fi (microondas, Bluetooth).
3. **Capacidad?** Muchos clientes, un airtime hog (retransmisiones).
4. **Config?** Seguridad/antigua (TKIP limita a 54 Mbps), ancho de canal excesivo en 2.4.
5. **Aguas arriba?** Si cableado va bien y Wi-Fi no, el problema es el aire.

## Site survey minimo

Predictivo (plano + software) y luego **validacion en sitio** midiendo. Documenta canales, potencias y fotos de ubicaciones.

## Puntos clave

- 2.4 GHz: solo 1, 6, 11. 5 GHz como banda de trabajo.
- Potencia moderada + celdas pequenas; -65 dBm objetivo.
- Escalera: cobertura, canal, capacidad, config, aguas arriba.
- TKIP y velocidades bajas lastran a toda la celda.

:::quiz
[
  {
    "question": "Que canales 2.4 GHz usas para no solaparte?",
    "options": ["1, 2, 3", "1, 6, 11", "3, 7, 11", "Cualquiera con auto"],
    "correctIndex": 1,
    "explanation": "Son los unicos trios sin solape en 2.4 GHz. Auto no siempre elige bien con vecinos."
  },
  {
    "question": "Por que subir la potencia al maximo suele empeorar?",
    "options": ["Gasta mas luz", "Asimetria: el cliente oye al AP pero este no lo oye, y ensucias celdas vecinas", "Calienta el AP", "Baja el cifrado"],
    "correctIndex": 1,
    "explanation": "El enlace es bidireccional: si el cliente llega flojo hay reintentos, y tu ruido es interferencia para los vecinos."
  },
  {
    "question": "Primer paso ante 'el Wi-Fi va lento en la sala B'?",
    "options": ["Cambiar el router", "Medir cobertura (RSSI) en la sala B", "Subir el ancho a 160 MHz", "Reiniciar todo"],
    "correctIndex": 1,
    "explanation": "Medir primero: sin dato de cobertura (-65 dBm objetivo) todo cambio es a ciegas."
  }
]
:::
