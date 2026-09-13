---
id: sql-7
slug: sql-7
title: PostgreSQL deep dive
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 90
---

# PostgreSQL deep dive

Lo que hace a PostgreSQL especial: tipos, JSONB, FTS, CTEs recursivos, extensions.

## ¿Por qué PostgreSQL?

**PostgreSQL** es la base de datos open source más avanzada del mundo. Usada por Instagram, Spotify, Reddit, Uber, Apple, Notion.

### ¿Qué la hace especial?
- **ACID completa** (no como MySQL con MyISAM)
- **Tipos ricos**: JSONB, arrays, rangos, geometría
- **Extensibilidad**: PostGIS, pg_trgm, pgcrypto
- **Full-text search** integrado (sin Elasticsearch para casos simples)
- **CTEs recursivos**, **window functions**, **MERGE**, todo el SQL moderno
- **Concurrencia**: MVCC, no hay lock reads vs writes
- **Estándar SQL**: sigue el estándar más fielmente que la competencia

> **Dato curioso**: el "PG" de PostgreSQL no es "Post-gres-QL", se pronuncia "post-GRES-QL" en honor a su abuelo Ingres.

## Tipos de datos únicos

### JSONB: JSON binario indexable
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  attrs JSONB
);

INSERT INTO users (name, attrs) VALUES ('Ana', '{"age": 30, "city": "Lima", "tags": ["vip", "newsletter"]}');

-- Queries sobre JSON
SELECT * FROM users WHERE attrs->>'city' = 'Lima';
SELECT * FROM users WHERE attrs @> '{"tags": ["vip"]}';

-- Índice GIN para queries rápidas
CREATE INDEX idx_users_attrs ON users USING GIN(attrs);
```

### Arrays
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  tags TEXT[]
);

INSERT INTO posts (tags) VALUES (ARRAY['sql', 'data', 'postgres']);

-- Query: posts con el tag 'sql'
SELECT * FROM posts WHERE 'sql' = ANY(tags);
```

### Rangos (para tiempo, números, etc.)
```sql
CREATE TABLE reservations (
  room_id INT,
  during TSTZRANGE
);

SELECT * FROM reservations WHERE during @> '2026-08-15 14:00:00'::timestamptz;
```

## Full-Text Search nativo

Para búsqueda de texto, PostgreSQL trae todo lo necesario sin necesidad de Elasticsearch (para casos básicos).

```sql
-- Tipo TSVECTOR (texto preprocesado para búsqueda)
ALTER TABLE articles ADD COLUMN search_vector tsvector;

CREATE INDEX idx_articles_search ON articles USING GIN(search_vector);

-- Trigger para mantener el vector actualizado
CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE
ON articles FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', title, body);

-- Búsqueda
SELECT title FROM articles 
WHERE search_vector @@ plainto_tsquery('english', 'data analytics');

-- Ranking por relevancia
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, plainto_tsquery('english', 'data analytics') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

> **¿Cuándo usar Elasticsearch?** Cuando necesitas facetas, agregaciones complejas, scores con ML, o >10M documentos. Para <1M docs, FTS de PostgreSQL es suficiente y te ahorras un sistema.

## CTEs recursivos y queries avanzadas

PostgreSQL tiene los mejores CTEs recursivos del ecosistema.

### Recorrer una jerarquía
```sql
WITH RECURSIVE subordinates AS (
  -- Caso base: CEO
  SELECT id, name, manager_id, 1 AS level
  FROM employees
  WHERE manager_id IS NULL
  
  UNION ALL
  
  -- Caso recursivo: reportes
  SELECT e.id, e.name, e.manager_id, s.level + 1
  FROM employees e
  INNER JOIN subordinates s ON e.manager_id = s.id
)
SELECT * FROM subordinates ORDER BY level, name;
```

### Generación de series
```sql
-- Generar los últimos 30 días
SELECT generate_series(
  CURRENT_DATE - INTERVAL '29 days',
  CURRENT_DATE,
  '1 day'::interval
)::date AS day;
```

### LATERAL joins
Aplicar una función a cada fila de la izquierda.
```sql
SELECT 
  u.id, 
  u.name,
  recent.order_id
FROM users u
CROSS JOIN LATERAL (
  SELECT order_id 
  FROM orders 
  WHERE customer_id = u.id 
  ORDER BY order_date DESC 
  LIMIT 3
) recent;
```

## Extensions: el superpoder

PostgreSQL es extensible. Hay cientos de extensions oficiales.

### Las más útiles
```sql
-- PostGIS: geografía, geometría, GIS
CREATE EXTENSION postgis;
SELECT ST_Distance(
  ST_MakePoint(-90.5, 14.6)::geography,  -- Guatemala
  ST_MakePoint(-99.1, 19.4)::geography   -- CDMX
) AS distance_meters;

-- pg_trgm: búsqueda fuzzy
CREATE EXTENSION pg_trgm;
SELECT * FROM users WHERE name % 'Anya';  -- busca "Ana" incluso con typo

-- pgcrypto: cifrado
CREATE EXTENSION pgcrypto;
SELECT crypt('mypassword', gen_salt('bf'));

-- uuid-ossp: generar UUIDs
CREATE EXTENSION "uuid-ossp";
SELECT uuid_generate_v4();
```

> **PostGIS** convierte PostgreSQL en una base de datos geoespacial completa. Es la base de OpenStreetMap, foursquare, y muchos sistemas de mapas.

## Buenas prácticas PostgreSQL

### Configuración básica
```ini
# postgresql.conf
shared_buffers = 25% de RAM
effective_cache_size = 70% de RAM
work_mem = 64MB
maintenance_work_mem = 1GB
```

### Conexiones
- Usa **PgBouncer** para pool de conexiones
- Limita `max_connections` (default 100, no subas a 1000)
- Cada conexión consume ~10MB de RAM

### Backups
- `pg_dump` para backups lógicos (1 sola DB)
- `pg_basebackup` para backups físicos (toda la instancia)
- **PITR** (Point In Time Recovery) con WAL archiving

### Monitoreo
- `pg_stat_activity`: queries activas
- `pg_stat_statements`: queries más lentas (requiere extension)
- `pg_locks`: bloqueos
- **pgHero**, **pgwatch**, **Datadog** para dashboards

> **PostgreSQL es la navaja suiza de los datos**. No solo SQL: JSON, GIS, full-text, time series, graph (con Apache AGE), todo en un solo motor.

## Puntos clave

- PostgreSQL es la base open source más avanzada: JSONB, arrays, FTS, PostGIS, CTEs recursivos.
- JSONB es JSON binario indexable, ideal para datos semi-estructurados.
- Full-Text Search nativo cubre el 80% de casos sin necesitar Elasticsearch.
- Extensions como PostGIS y pg_trgm amplían PostgreSQL más allá del SQL tradicional.
