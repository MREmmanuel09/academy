---
id: subnetting-practica
slug: subnetting-practica
title: Subnetting intensivo
module: capa-red
difficulty: intermediate
estimatedMinutes: 20
xp: 100
summary: Metodo rapido para subdividir redes, con ejercicios resueltos paso a paso.
---

# Subnetting intensivo

Subnetear es dividir una red grande en subredes manejables. En el CCNA debes hacerlo en menos de un minuto y sin calculadora.

## El metodo del bloque

1. Halla el tamano de bloque: `256 - ultimo octeto de la mascara`.
2. Los multiplos del bloque son las direcciones de red.
3. Broadcast = siguiente red menos 1. Rango util = entre ambas.

### Ejemplo: 192.168.10.0/26

Mascara: 255.255.255.192. Bloque = 256 - 192 = 64.

```
Redes:    .0     .64    .128   .192
Broadcast:.63    .127   .191   .255
Util:     .1-.62 .65-126 .129-190 .193-254
```

## Tabla de bloques (memoriza)

| Mascara | Bloque | Hosts |
|---------|--------|-------|
| 255.255.255.0 (/24) | 256 | 254 |
| 255.255.255.128 (/25) | 128 | 126 |
| 255.255.255.192 (/26) | 64 | 62 |
| 255.255.255.224 (/27) | 32 | 30 |
| 255.255.255.240 (/28) | 16 | 14 |
| 255.255.255.248 (/29) | 8 | 6 |
| 255.255.255.252 (/30) | 4 | 2 |

## Ejercicio resuelto: a que subred pertenece 10.5.23.77/21?

1. Mascara /21 = 255.255.248.0. El tercer octeto importa: bloque = 256 - 248 = 8.
2. Multiplos de 8: 0, 8, 16, 24... El 23 cae entre 16 y 24.
3. Red: 10.5.16.0/21. Broadcast: 10.5.23.255. Util: 10.5.16.1 a 10.5.23.254.

## Ejercicio resuelto: disena para 60 hosts

1. 60 + 2 (red y broadcast) = 62 direcciones minimas.
2. Potencia de 2 que cubra 62: 64 = 2^6. Bits de host = 6.
3. Mascara: 32 - 6 = /26 (255.255.255.192).

## Errores tipicos

- Olvidar restar red y broadcast (pedir 60 y usar /26 justo: 62 utiles, solo sobran 2).
- Confundir el octeto interesante (mira el ULTIMO octeto no-255 de la mascara).
- /31 y /32 son casos especiales (enlaces punto a punto, RFC 3021).

## Puntos clave

- Bloque = 256 menos el octeto interesante de la mascara.
- Red, broadcast y rango salen de los multiplos del bloque.
- Para disenar: suma 2 a los hosts, sube a la potencia de 2 y resta de 32.

:::quiz
[
  {
    "question": "Cual es la direccion de broadcast de 192.168.5.0/26?",
    "options": ["192.168.5.63", "192.168.5.64", "192.168.5.127", "192.168.5.255"],
    "correctIndex": 0,
    "explanation": "Bloque 64: redes .0, .64, .128, .192. La primera subred va de .0 a .63 (broadcast)."
  },
  {
    "question": "Que mascara da al menos 60 hosts utilizables?",
    "options": ["/25", "/26", "/27", "/28"],
    "correctIndex": 1,
    "explanation": "/26 da 62 utiles (64 menos red y broadcast). /27 solo da 30."
  },
  {
    "question": "A que subred pertenece 10.5.23.77/21?",
    "options": ["10.5.16.0/21", "10.5.23.0/21", "10.5.24.0/21", "10.5.8.0/21"],
    "correctIndex": 0,
    "explanation": "Bloque 8 en el tercer octeto: multiplos 0, 8, 16, 24. El 23 cae en la red .16."
  }
]
:::
