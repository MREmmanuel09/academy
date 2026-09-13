---
id: http-https
slug: http-https
title: HTTP y HTTPS: el protocolo que mueve la web
module: capa-aplicacion
difficulty: beginner
estimatedMinutes: 5
xp: 65
---

# HTTP y HTTPS: el protocolo que mueve la web

Metodos, headers, codigos de estado, y como TLS protege las comunicaciones.

## HTTP basico

**HTTP** (HyperText Transfer Protocol) es un protocolo request-response. El cliente (browser) envia un request, el servidor responde.

### Estructura de un request

```http
GET /api/cursos HTTP/1.1
Host: academy.dev
Authorization: Bearer eyJhbG...
Accept: application/json
```

**Componentes:**
- **Metodo**: accion que quieres hacer (GET, POST, PUT, DELETE)
- **Path**: recurso que solicitas
- **Version**: HTTP/1.0, HTTP/1.1, HTTP/2, HTTP/3
- **Headers**: metadata (auth, content-type, etc.)

### Metodos HTTP

| Metodo | Uso | Tiene body | Idempotente |
|--------|-----|-----------|-------------|
| **GET** | Leer recurso | No | Si |
| **POST** | Crear recurso | Si | No |
| **PUT** | Reemplazar recurso | Si | Si |
| **PATCH** | Actualizar parcial | Si | No |
| **DELETE** | Eliminar recurso | Si | Si |
| **HEAD** | Solo headers | No | Si |
| **OPTIONS** | Ver metodos soportados | No | Si |

**Idempotente** = si haces la misma peticion N veces, el resultado es el mismo que hacerla una vez.

### Codigos de respuesta

| Rango | Significado | Ejemplos |
|-------|-------------|----------|
| **2xx** | Exito | 200 OK, 201 Created, 204 No Content |
| **3xx** | Redireccion | 301 Moved, 304 Not Modified |
| **4xx** | Error cliente | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| **5xx** | Error servidor | 500 Internal Error, 502 Bad Gateway, 503 Service Unavailable |

### Headers importantes

```http
Content-Type: application/json    # tipo de contenido
Content-Length: 1234               # tamano del body
Cache-Control: no-cache           # politica de cache
Authorization: Bearer <token>     # autenticacion
X-Request-Id: abc-123             # tracing
Set-Cookie: session=xyz           # cookies
```

## HTTPS y TLS

**HTTPS** = HTTP sobre **TLS** (Transport Layer Security). Cifra la comunicacion entre cliente y servidor.

### Como funciona TLS 1.3 (simplificado)

```
Cliente                              Servidor
  |--- ClientHello (versones, ciphers) -->|
  |<-- ServerHello (cipher elegido) ------|
  |<-- Certificate (certificado X.509) ---|
  |<-- Finished -------------------------|
  |--- Finished ----------------------->|
  |                                      |
  |<===== trafico cifrado ==============>|
```

**TLS 1.3** (2018) es mas rapido que TLS 1.2: solo 1 round-trip para el handshake (vs 2 en TLS 1.2).

### Certificados SSL/TLS

Los certificados validan la identidad del servidor. Los emiten **CA** (Certificate Authorities) como Let's Encrypt, DigiCert, GlobalSign.

```bash
# Verificar certificado de un sitio
openssl s_client -connect example.com:443 -showcerts

# Let's Encrypt (gratis, automatizado)
sudo apt install certbot
sudo certbot --nginx -d academy.dev
```

## HTTP/2 y HTTP/3

### HTTP/2 (2015)

- **Multiplexing**: multiples requests en un solo connection TCP (sin head-of-line blocking)
- **Header compression**: HPACK comprime headers repetidos
- **Server push**: el servidor puede enviar recursos sin que el cliente pida
- **Binary framing**: formato binario en vez de texto

### HTTP/3 (2022)

- Usa **QUIC** sobre UDP en vez de TCP
- Resuelve el head-of-line blocking de TCP
- Connection migration: si cambias de WiFi a 4G, la conexion no se pierde
- cifrado por defecto (no hay negociacion sin cifrar)

## Puntos clave

- HTTP es request-response: cliente envia metodo + path, servidor responde con codigo + body.
- GET y DELETE son idempotentes. POST y PUT requieren body. PATCH es para actualizaciones parciales.
- HTTPS usa TLS para cifrar. TLS 1.3 es el estandar actual (1 round-trip handshake).
- HTTP/2 usa multiplexing sobre TCP. HTTP/3 usa QUIC sobre UDP para evitar head-of-line blocking.

:::quiz
[
  {
    "question": "Que metodo HTTP usas para leer un recurso sin modificarlo?",
    "options": ["POST", "GET", "PUT", "DELETE"],
    "correctIndex": 1,
    "explanation": "GET es de lectura e idempotente. POST crea/envia datos, PUT reemplaza, DELETE elimina."
  },
  {
    "question": "Que aporta HTTP/3 frente a HTTP/2?",
    "options": ["Mas cabeceras", "QUIC sobre UDP: evita el bloqueo de head-of-line de TCP", "Solo cambia el puerto", "Elimina TLS"],
    "correctIndex": 1,
    "explanation": "HTTP/3 corre sobre QUIC (UDP): cada stream avanza independiente aunque se pierda un paquete."
  },
  {
    "question": "Que garantiza TLS 1.3 en HTTPS?",
    "options": ["Oculta la IP destino", "Cifrado con handshake de 1 round-trip", "Compresion gratis", "DNS privado"],
    "correctIndex": 1,
    "explanation": "TLS 1.3 cifra el contenido con un solo viaje de handshake. La IP/SNI siguen visibles."
  }
]
:::
