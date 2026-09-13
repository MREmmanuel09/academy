---
id: web-email-protocolos
slug: web-email-protocolos
title: HTTP, correo y transferencia de archivos
module: capa-aplicacion
difficulty: beginner
estimatedMinutes: 15
xp: 70
summary: Como viajan la web, el correo y los archivos: metodos, estados, puertos y versiones seguras.
---

# HTTP, correo y transferencia de archivos

## HTTP: el protocolo de la web

Peticion-respuesta sin estado. Cada peticion es independiente; las **cookies** y tokens mantienen la sesion.

### Metodos principales

| Metodo | Uso |
|--------|-----|
| GET | Leer un recurso (nunca cambia nada) |
| POST | Crear/enviar datos (formularios) |
| PUT | Reemplazar un recurso completo |
| PATCH | Modificar parte de un recurso |
| DELETE | Eliminar |
| HEAD | Solo cabeceras (probar si existe) |

### Codigos de estado

| Rango | Significado | Ejemplos |
|-------|-------------|----------|
| 2xx | Exito | 200 OK, 201 Created |
| 3xx | Redireccion | 301 Moved, 304 Not Modified |
| 4xx | Error del cliente | 400 Bad Request, 401 Unauthorized, 404 Not Found |
| 5xx | Error del servidor | 500 Internal Error, 503 Unavailable |

**HTTPS** = HTTP sobre TLS (puerto 443 frente al 80). Cifra el contenido, no el destino (la IP/SNI siguen visibles).

## Correo electronico

| Protocolo | Puerto | Funcion |
|-----------|--------|---------|
| SMTP | 25 (587 envio) | ENVIAR correo entre servidores |
| POP3 | 110 (995 TLS) | DESCARGAR y borrar del servidor |
| IMAP | 143 (993 TLS) | LEER sincronizado en varios dispositivos |

Envias con SMTP; lees con IMAP (moderno) o POP3 (legado). SPF, DKIM y DMARC autentican al remitente contra spam/phishing.

## Transferencia de archivos

| Protocolo | Puerto | Notas |
|-----------|--------|-------|
| FTP | 20/21 | Legado, texto plano. Evitalo en Internet |
| SFTP | 22 | FTP sobre SSH. La opcion segura |
| TFTP | 69/UDP | Trivial, sin auth. Solo arranque de red (PXE) |
| SMB/CIFS | 445 | Carpetas Windows en LAN |

## Telnet vs SSH

- **Telnet (23)**: texto plano, credenciales visibles. Solo museos y consolas serie.
- **SSH (22)**: cifrado, claves publicas, tuneles y SFTP incluidos. Administracion remota por defecto.

## Puntos clave

- HTTP es sin estado: GET lee, POST crea; 2xx ok, 3xx redirige, 4xx tu culpa, 5xx la suya.
- HTTPS cifra el contenido (443); el destino sigue visible.
- SMTP envia, IMAP lee sincronizado; SFTP (22) para archivos, nunca FTP plano.
- SSH para administrar; Telnet solo en laboratorio aislado.

:::quiz
[
  {
    "question": "Que codigo indica que el recurso se movio permanentemente?",
    "options": ["200", "301", "404", "500"],
    "correctIndex": 1,
    "explanation": "3xx son redirecciones; 301 es movimiento permanente (actualiza tus enlaces)."
  },
  {
    "question": "Que protocolo usas para LEER tu correo sincronizado en movil y PC?",
    "options": ["SMTP", "POP3", "IMAP", "FTP"],
    "correctIndex": 2,
    "explanation": "IMAP mantiene el correo en el servidor y sincroniza todos los dispositivos. SMTP solo envia."
  },
  {
    "question": "Por que SFTP y no FTP para subir archivos por Internet?",
    "options": ["Es mas rapido", "Cifra todo incluido credenciales; FTP va en texto plano", "Usa menos puertos", "No necesita servidor"],
    "correctIndex": 1,
    "explanation": "FTP envia usuario, clave y datos legibles para cualquiera en el camino. SFTP va sobre SSH cifrado."
  }
]
:::
