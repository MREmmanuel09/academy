---
id: dk-2
slug: dk-2
title: Dockerfile: construyendo tus imágenes
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Dockerfile: construyendo tus imágenes

FROM, RUN, COPY, CMD, ENTRYPOINT. Crea imágenes optimizadas.

## Anatomía de un Dockerfile

Un **Dockerfile** es un archivo de texto con instrucciones para construir una imagen.

```dockerfile
# Comentario
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias primero (mejor cache)
COPY package*.json ./
RUN npm ci --only=production

# Copiar el resto del código
COPY . .

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Exponer puerto (documentación, no publica)
EXPOSE 3000

# Usuario no-root (seguridad)
USER node

# Comando por defecto
CMD ["node", "server.js"]
```

### Instrucciones principales

| Instrucción | Función |
|-------------|---------|
| `FROM` | Imagen base |
| `RUN` | Ejecuta comando al build |
| `COPY` | Copia archivos del host |
| `ADD` | COPY + URL/tar extract |
| `WORKDIR` | Cambia directorio de trabajo |
| `ENV` | Variable de entorno |
| `ARG` | Variable solo en build |
| `EXPOSE` | Documenta puerto (no publica) |
| `VOLUME` | Declara punto de montaje |
| `USER` | Cambia usuario |
| `CMD` | Comando por defecto (reemplazable) |
| `ENTRYPOINT` | Comando fijo (no reemplazable) |
| `LABEL` | Metadata |
| `HEALTHCHECK` | Comando de health |

## Mejores prácticas

### Multi-stage builds (reducir tamaño)

```dockerfile
# Stage 1: build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: production, solo lo necesario
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

Resultado: imagen final con nginx + tu app, sin node_modules ni código fuente.

### Optimizaciones

1. **Imágenes base ligeras**: `alpine`, `slim`, `distroless`
2. **Orden importa**: copia package.json ANTES que el código (cache de layers)
3. **Combinar RUN** con `&&` para menos layers
4. **``.dockerignore``** como `.gitignore`
5. **Usuario no-root**: `USER node`
6. **Multi-stage** para apps compiladas

### .dockerignore

```
node_modules
.git
.env
*.md
Dockerfile
.dockerignore
dist
coverage
```

### Build

```bash
docker build -t mi-app:1.0 .
docker build -t mi-app:1.0 -f Dockerfile.prod .
docker build -t mi-app --build-arg VERSION=1.0 .
docker build --no-cache -t mi-app .       # sin cache
```

### CMD vs ENTRYPOINT

- **CMD**: comando por defecto. Si pasas comando al `docker run`, lo REEMPLAZA.
- **ENTRYPOINT**: el binario principal. Argumentos del `docker run` se AGREGAN.

```dockerfile
ENTRYPOINT ["python", "app.py"]
CMD ["--port", "8080"]
# docker run img --debug -> python app.py --debug (CMD ignorado, args agregados)
# docker run img       -> python app.py --port 8080 (CMD usado)
```

Mejor práctica: usar `ENTRYPOINT` exec form (JSON array) para evitar shell wrapper.

## Puntos clave

- FROM define la base, RUN ejecuta al build, COPY trae archivos, CMD arranca el container.
- Multi-stage builds separan build de runtime, reduciendo tamaño final.
- Orden de COPY importa: dependencias primero para aprovechar cache de layers.
- Usa imágenes alpine/slim, .dockerignore, y usuario no-root.

:::quiz
[
  {
    "question": "Que logran los multi-stage builds?",
    "options": ["Mas capas", "Separar build de runtime: imagen final pequena sin toolchains", "Builds mas lentos a proposito", "Nada, es cosmetico"],
    "correctIndex": 1,
    "explanation": "Compilas en una etapa gorda y copias solo el artefacto a una imagen slim."
  },
  {
    "question": "Por que importa el orden de COPY?",
    "options": ["No importa", "Dependencias primero aprovecha la cache de layers y acelera rebuilds", "Alfabetico obligatorio", "Solo estetica"],
    "correctIndex": 1,
    "explanation": "Docker invalida la cache desde la primera capa cambiada: lo estable va primero."
  },
  {
    "question": "Cual es buena practica de seguridad en imagenes?",
    "options": ["Correr como root siempre", "Base alpine/slim + .dockerignore + usuario no-root", "Incluir el .git", "Usar :latest en prod"],
    "correctIndex": 1,
    "explanation": "Menos superficie (slim, sin contexto extra) y sin root limitan el impacto de un escape."
  }
]
:::
