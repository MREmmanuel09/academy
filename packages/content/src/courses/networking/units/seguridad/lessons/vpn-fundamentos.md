---
id: vpn-fundamentos
slug: vpn-fundamentos
title: VPN site-to-site y acceso remoto
module: seguridad
difficulty: intermediate
estimatedMinutes: 15
xp: 90
summary: Tuneles IPsec y GRE, remote access y cuando usar cada uno.
---

# VPN site-to-site y acceso remoto

Una **VPN** crea un tunel cifrado sobre una red insegura (Internet) como si fuera un cable privado.

## Site-to-site vs remote access

| Tipo | Une | Ejemplo |
|------|-----|---------|
| Site-to-site | Red con red (siempre activo) | Oficina central con sucursal |
| Remote access | Usuario con red (bajo demanda) | Teletrabajo al corporativo |

## IPsec: el estandar

Cifra y autentica a nivel IP. Dos fases (IKE):

1. **Fase 1**: canal seguro de gestion (ISAKMP). Autenticacion mutua (PSK o certificados).
2. **Fase 2**: Security Associations con las **transform sets** (cifrado + hash + DH) que protegen los datos.

Modos: **tunel** (todo el paquete IP cifrado, lo normal site-to-site) y **transporte** (solo payload).

## GRE + IPsec

- **GRE** crea el tunel (soporta multicast y protocolos no-IP como OSPF) pero **no cifra**.
- Combinacion tipica: GRE para rutear + IPsec para cifrar (DMVPN en Cisco).

## Remote access moderno

- **IPsec/SSL VPN** con cliente (AnyConnect y cia).
- **WireGuard**: simple, rapido, poco codigo auditable. Ideal para accesos nuevos.
- **Zero Trust / ZTNA**: sin tunel total; acceso por aplicacion con identidad y postura del dispositivo.

## Split tunnel vs full tunnel

- **Split**: solo el trafico corporativo va por VPN; Netflix directo. Rapido, menos carga.
- **Full**: todo por VPN (inspeccion total, mas lento, mas control).

## Troubleshooting VPN

1. Fase 1 no sube: PSK distinta, peer mal, UDP 500/4500 bloqueado (NAT-T).
2. Fase 1 ok, fase 2 no: transform set o interesting traffic (ACL crypto) distintos.
3. Tunel ok pero sin trafico: rutas/NAT excluyendo el tunel, firewall.

```
show crypto isakmp sa   # fase 1 (QM_IDLE es sano)
show crypto ipsec sa    # fase 2 (encaps/decaps creciendo)
```

## Puntos clave

- Site-to-site une redes; remote access une usuarios.
- IPsec = fase 1 gestion + fase 2 datos; GRE rutea, IPsec cifra.
- WireGuard para lo nuevo simple; ZTNA para acceso por app.
- QM_IDLE + encaps creciendo = tunel sano.

:::quiz
[
  {
    "question": "Que aporta IPsec que GRE solo no da?",
    "options": ["Mas velocidad", "Cifrado y autenticacion del trafico", "Soporte multicast", "Menos configuracion"],
    "correctIndex": 1,
    "explanation": "GRE encapsula y rutea (incluso multicast/OSPF) pero en claro. IPsec cifra y autentica."
  },
  {
    "question": "Fase 1 OK pero la fase 2 no levanta. Revisas primero...",
    "options": ["El cableado", "Transform set y interesting traffic en ambos extremos", "El DNS", "La VLAN nativa"],
    "correctIndex": 1,
    "explanation": "Si IKE autentica pero IPsec no, casi siempre difieren cifrado/hash o lo que debe cifrarse."
  },
  {
    "question": "Cuando prefieres split tunnel?",
    "options": ["Siempre, es mas seguro", "Cuando quieres descargar el concentrador y dar salida directa a Internet no corporativo", "Nunca se usa", "Solo con IPv6"],
    "correctIndex": 1,
    "explanation": "Split manda por VPN solo lo corporativo: menos carga y mejor experiencia, a cambio de menos inspeccion."
  }
]
:::
