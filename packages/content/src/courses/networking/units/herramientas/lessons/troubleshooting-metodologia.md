---
id: troubleshooting-metodologia
slug: troubleshooting-metodologia
title: Metodologia de troubleshooting
module: herramientas
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Metodos bottom-up, top-down y divide y venceras con casos guiados.
---

# Metodologia de troubleshooting

Los seniors no adivinan mas rapido: **descartan por mitades**. Un metodo convierte "no hay Internet" en 15 minutos de trabajo ordenado.

## Los tres metodos

| Metodo | Logica | Cuando |
|--------|--------|--------|
| Bottom-up | Fisico -> aplicacion | Fallo total, cableado dudoso |
| Top-down | Aplicacion -> fisico | Una app falla, la red parece ok |
| Divide y venceras | Empieza en el medio (L3/L4) | Sin pistas: la mitad mas rapida de descartar |

Regla: **un cambio, una prueba**. Cambiar tres cosas a la vez te deja sin saber que funciono (y sin poder revertir).

## Caso 1: "no tengo Internet"

1. Fisico: LED del puerto? `ip addr` tiene IP?
2. Local: ping a la puerta de enlace. Falla? Cable/VLAN/DHCP.
3. DNS: `nslookup ejemplo.com`. Falla pero la IP responde? Es DNS.
4. Salida: `ping 8.8.8.8`, luego `traceroute`. Donde muere, ahi miras.
5. App: el puerto abre? `curl -v` / Test-NetConnection.

## Caso 2: "va lento a ratos"

1. Descarta Wi-Fi vs cable (reproduce por cable).
2. `ping` sostenido: perdida o jitter? Apunta a congestión o enlace malo.
3. Captura breve: retransmisiones (red) vs servidor lento (delta alto en respuestas).
4. Hora patron? Copias de seguridad o picos conocidos.

## Caso 3: "solo falla una app"

1. Top-down: la app resuelve DNS? Autentica? En que paso exacto falla?
2. Puertos/firewall entre medias (`telnet host puerto` o equivalente).
3. Cambios recientes: deploys, certificados caducados, cuotas.

## Documentar (lo que separa al profesional)

- Sintoma exacto + hora + alcance (quien/que/cuando).
- Cada prueba y su resultado (incluye las que "no era eso").
- Causa raiz (los 5 porques) + fix + como detectarlo antes (monitor!).

## Puntos clave

- Divide y venceras por defecto; bottom-up en caidas totales.
- Un cambio, una prueba, siempre reversible.
- ping/traceroute/nslookup/curl + captura resuelven el 90%.
- Sin documentacion el incidente se repetira.

:::quiz
[
  {
    "question": "Caida total sin pistas. Que metodo?",
    "options": ["Top-down", "Bottom-up desde fisico", "Cambiar el router directamente", "Reiniciar todo a la vez"],
    "correctIndex": 1,
    "explanation": "Sin red no hay nada que probar arriba: fisico, enlace, IP, en orden."
  },
  {
    "question": "Por que 'un cambio, una prueba'?",
    "options": ["Por lentitud", "Para saber que lo arreglo y poder revertir con precision", "Lo exige TCP", "Por el firewall"],
    "correctIndex": 1,
    "explanation": "Multiples cambios simultaneos destruyen la evidencia: no sabes que funciono."
  },
  {
    "question": "Solo una app falla y la red va bien. Enfoque?",
    "options": ["Bottom-up", "Top-down desde la app hacia abajo", "Cambiar cables", "Ampliar el DHCP"],
    "correctIndex": 1,
    "explanation": "Si la base funciona, el fallo esta arriba: DNS de la app, auth, puertos, cambios recientes."
  }
]
:::
