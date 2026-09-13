---
id: acls
slug: acls
title: ACLs estandar y extendidas
module: seguridad
difficulty: intermediate
estimatedMinutes: 20
xp: 100
summary: Filtrar trafico con wildcard masks, orden de reglas y colocacion correcta.
---

# ACLs estandar y extendidas

Una **ACL** (Access Control List) es una lista ordenada de permisos/denegaciones que el router evalua de arriba abajo. La primera coincidencia decide; al final hay un **deny implicito**.

## Wildcard mask (la inversa)

A diferencia de la mascara de subred: **0 = debe coincidir, 1 = me da igual**.

```
Red 192.168.10.0/24  ->  wildcard 0.0.0.255
Host 10.1.1.1         ->  wildcard 0.0.0.0  (o la palabra 'host')
Cualquiera            ->  0.0.0.0 255.255.255.255  (o 'any')
```

Truco: wildcard = 255.255.255.255 menos la mascara.

## Estandar vs extendida

| Tipo | Filtra por | Rango | Donde se coloca |
|------|-----------|-------|-----------------|
| Estandar (1-99) | Solo ORIGEN | `access-list 10 permit 192.168.1.0 0.0.0.255` | CERCA del destino (filtra poco, no bloquees de mas) |
| Extendida (100-199) | Origen, destino, protocolo, puerto | `access-list 100 permit tcp any host 10.0.0.5 eq 443` | CERCA del origen (descarta pronto, ahorra CPU) |

## Ejemplo extendida: solo web al servidor

```
access-list 100 permit tcp any host 10.0.0.5 eq 80
access-list 100 permit tcp any host 10.0.0.5 eq 443
access-list 100 deny ip any host 10.0.0.5
access-list 100 permit ip any any
```

Y se aplica a la interfaz en direccion: `ip access-group 100 in`.

## Reglas de examen

1. **Orden importa**: las especificas primero, las generales despues.
2. **Deny implicito al final**: si no lo tienes en cuenta, cortas de mas (o anades `permit ip any any` consciente).
3. **Una ACL por interfaz, por direccion, por protocolo**.
4. **Estandar cerca del destino, extendida cerca del origen**.
5. Editar = reescribir (las numeradas clasicas no insertan en medio; usa nombradas para editar lineas).

## Verificar

```
show access-lists          # reglas + contadores de coincidencias
show ip interface Gi0/0    # ACL aplicada y direccion
```

Los contadores (`matches`) delatan si tu regla se evalua o si el trafico va por otra.

## Puntos clave

- Wildcard: 0 coincide, 1 ignora. Inversa de la mascara.
- Estandar filtra origen (cerca del destino); extendida todo (cerca del origen).
- Primera coincidencia gana; deny implicito cierra.
- Comprueba con contadores, no con fe.

:::quiz
[
  {
    "question": "Que wildcard cubre la red 10.20.0.0/16?",
    "options": ["255.255.0.0", "0.0.255.255", "0.0.0.255", "255.255.255.0"],
    "correctIndex": 1,
    "explanation": "Wildcard invierte la mascara: /16 (255.255.0.0) -> 0.0.255.255."
  },
  {
    "question": "Donde colocas una ACL extendida y por que?",
    "options": ["Cerca del destino, por seguridad", "Cerca del origen, para descartar pronto y ahorrar recursos", "Solo en el core", "Da igual"],
    "correctIndex": 1,
    "explanation": "Como filtra con precision, se pone cerca del origen: el trafico malo no viaja por la red."
  },
  {
    "question": "Permites web a un servidor pero nada mas hacia el, y el resto del trafico sigue igual. Orden correcto?",
    "options": ["deny ip any host + permit tcp any host eq 80/443", "permit tcp any host eq 80, eq 443, deny ip any host, permit ip any any", "permit ip any any al principio", "Solo deny ip any host"],
    "correctIndex": 1,
    "explanation": "Especifico primero (80/443), luego denegar ese host, luego permitir el resto. El deny implicito haria el resto, pero explicitarlo documenta."
  }
]
:::
