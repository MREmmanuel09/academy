---
id: vlsm
slug: vlsm
title: VLSM y diseno eficiente
module: capa-red
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Mascaras de longitud variable para no desperdiciar direcciones.
---

# VLSM y diseno eficiente

Con mascara fija (classful) todas las subredes son iguales: un enlace punto a punto (/30, 2 hosts) desperdicia 252 direcciones de una /24. **VLSM** (Variable Length Subnet Mask) usa la mascara justa para cada necesidad.

## La regla de oro

**Ordena de mayor a menor**: asigna primero la subred mas grande y sigue bajando. Si empiezas por las pequenas, fragmentas el espacio y las grandes ya no caben.

## Ejemplo: 192.168.1.0/24 con estas necesidades

- Oficina A: 100 hosts
- Oficina B: 50 hosts
- Servidores: 20 hosts
- 2 enlaces WAN punto a punto (/30)

### Paso 1: Oficina A (100 hosts)

100 + 2 = 102. Potencia de 2: 128 = 2^7. Mascara /25 (255.255.255.128).

```
Red: 192.168.1.0/25
Util: .1 a .126
Broadcast: .127
```

### Paso 2: Oficina B (50 hosts)

50 + 2 = 52. Potencia de 2: 64 = 2^6. Mascara /26. Siguiente bloque libre: .128.

```
Red: 192.168.1.128/26
Util: .129 a .190
Broadcast: .191
```

### Paso 3: Servidores (20 hosts)

20 + 2 = 22. Potencia de 2: 32 = 2^5. Mascara /27. Siguiente libre: .192.

```
Red: 192.168.1.192/27
Util: .193 a .222
Broadcast: .223
```

### Paso 4: enlaces WAN (/30)

Siguiente libre: .224. Dos /30: .224/30 y .228/30. Sobran .232 a .255 para crecer.

## Resumen del diseno

| Uso | Red | Mascara | Utiles |
|-----|-----|---------|--------|
| Oficina A | 192.168.1.0/25 | .128 | 126 |
| Oficina B | 192.168.1.128/26 | .192 | 62 |
| Servidores | 192.168.1.192/27 | .224 | 30 |
| WAN 1 | 192.168.1.224/30 | .252 | 2 |
| WAN 2 | 192.168.1.228/30 | .252 | 2 |
| Reserva | 192.168.1.232/27 | — | — |

Cero desperdicio y espacio para crecer.

## VLSM vs CIDR vs subnetting

- **Subnetting**: dividir una red en partes iguales.
- **VLSM**: dividir con tamanos distintos segun necesidad.
- **CIDR**: notacion y ruteo sin clases (el marco general).

## Puntos clave

- Ordena necesidades de mayor a menor antes de asignar.
- Cada asignacion empieza donde termino la anterior (sin solapes).
- Los /30 son para enlaces punto a punto; reserva siempre un bloque de crecimiento.

:::quiz
[
  {
    "question": "Por que se ordena de mayor a menor en VLSM?",
    "options": ["Porque es mas rapido de calcular", "Para que las subredes grandes quepan sin fragmentar el espacio", "Porque lo exige el protocolo", "Para usar menos routers"],
    "correctIndex": 1,
    "explanation": "Si asignas primero las pequenas, fragmentas el espacio contiguo y las grandes ya no caben."
  },
  {
    "question": "Que mascara cubre 20 hosts con minimo desperdicio?",
    "options": ["/25", "/26", "/27", "/28"],
    "correctIndex": 2,
    "explanation": "20 + 2 = 22, siguiente potencia de 2 es 32 (2^5): mascara /27 con 30 utiles."
  },
  {
    "question": "Tras asignar 192.168.1.0/25, cual es el siguiente bloque libre?",
    "options": ["192.168.1.64/25", "192.168.1.128/25", "192.168.1.126/25", "192.168.1.127/25"],
    "correctIndex": 1,
    "explanation": "Una /25 ocupa .0 a .127. El siguiente bloque libre empieza en .128."
  }
]
:::
