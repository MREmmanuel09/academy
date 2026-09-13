---
id: dk-3
slug: dk-3
title: Docker Compose: aplicaciones multi-container
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 65
---

# Docker Compose: aplicaciones multi-container

docker-compose.yml. Orquestar varios servicios.

## ¿Qué es Compose?

**Docker Compose** define y corre aplicaciones multi-container con un archivo YAML.

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "8080:80"
    depends_on:
      - api
    environment:
      - API_URL=http://api:3000
    volumes:
      - ./web/public:/app/public
    restart: unless-stopped

  api:
    build: ./api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  db_data:

networks:
  default:
    name: my-network
```

### Comandos

```bash
docker compose up                        # arranca
docker compose up -d                     # detached
docker compose up --build                # rebuild primero
docker compose down                      # para y borra containers
docker compose down -v                   # también borra volumes
docker compose ps                        # estado
docker compose logs -f web               # logs
docker compose exec web bash             # shell
docker compose restart api               # reinicia un servicio
docker compose pull                      # actualizar imágenes
docker compose config                    # validar YAML
```

## Casos de uso típicos

### Stack de desarrollo local

Levantar Postgres, Redis, MailHog, MinIO, todo con un comando:

```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_PASSWORD: devpass
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports: ["6379:6379"]

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio123
    volumes:
      - minio_data:/data

volumes:
  pgdata:
  minio_data:
```

```bash
docker compose up -d
# Postgres en localhost:5432
# MailHog UI en localhost:8025
# MinIO en localhost:9001
```

### Profiles (selectivos)

```yaml
services:
  web:
    profiles: ["app"]
    build: .
  
  debug-tools:
    profiles: ["debug"]
    image: nicolaka/netshoot
    network_mode: service:web
```

```bash
docker compose --profile app up
docker compose --profile debug up
```

### Production vs development

Usa `docker-compose.override.yml` para overrides locales:

```yaml
# docker-compose.yml (producción)
services:
  web:
    image: my-registry.com/web:v1.0
    ports: ["80:80"]

# docker-compose.override.yml (local, auto-merge)
services:
  web:
    build: .
    volumes:
      - ./src:/app/src   # hot reload
```

## Puntos clave

- docker-compose.yml define servicios, networks y volumes en un solo archivo.
- depends_on controla orden de arranque, pero NO espera a que esté "ready".
- Profiles permiten subsets de servicios. Override files para diferencias dev/prod.
- docker compose up -d arranca, docker compose down -v limpia todo.

:::quiz
[
  {
    "question": "Que garantiza depends_on?",
    "options": ["Que el servicio este listo (healthy)", "Orden de arranque, pero NO que este ready", "Reinicio automatico", "Red aislada"],
    "correctIndex": 1,
    "explanation": "Ordena el inicio; para 'ready' necesitas healthchecks + depends_on condition o waits."
  },
  {
    "question": "Para que sirven los profiles en Compose?",
    "options": ["Para produccion unicamente", "Subsets de servicios: arrancar solo lo necesario por escenario", "Para backups", "Para logs"],
    "correctIndex": 1,
    "explanation": "Activas grupos (debug, test, gpu...) sin duplicar ficheros."
  },
  {
    "question": "Que hace docker compose down -v?",
    "options": ["Solo para contenedores", "Para todo y borra volumenes nombrados (datos!)", "Reinicia sin cambios", "Actualiza imagenes"],
    "correctIndex": 1,
    "explanation": "-v elimina volumenes: util en dev, peligroso con datos que quieras conservar."
  }
]
:::
