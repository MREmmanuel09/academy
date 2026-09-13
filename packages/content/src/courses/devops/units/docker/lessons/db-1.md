---
id: db-1
slug: db-1
title: Databases para DevOps: SQL, NoSQL, time-series
module: devops
difficulty: advanced
estimatedMinutes: 7
xp: 100
---

# Databases para DevOps: SQL, NoSQL, time-series

PostgreSQL, MySQL, MongoDB, Redis, InfluxDB, TimescaleDB. Cuándo usar cada uno.

## El triángulo CAP

**CAP theorem** (Eric Brewer, 2000): un sistema distribuido solo puede garantizar 2 de 3:

- **C**onsistency: todos los nodos ven los mismos datos al mismo tiempo
- **A**vailability: cada request recibe respuesta (sin error)
- **P**artition tolerance: el sistema sigue funcionando aunque haya perdidas de comunicacion

En la practica, **P siempre se necesita** (las redes fallan), asi que realmente es CP vs AP.

### Categorias principales

**SQL (relacional)**:
- Garantias ACID (Atomicity, Consistency, Isolation, Durability)
- Esquema fijo, tablas relacionadas
- Joins, transacciones
- Ejemplos: PostgreSQL, MySQL, MariaDB, SQLite
- Caso de uso: datos estructurados, integridad critica (finanzas, inventario)

**NoSQL**:
- Sin esquema fijo
- Escalado horizontal facil
- 4 tipos:
  - **Documento** (MongoDB, CouchDB): JSON-like, flexible
  - **Key-value** (Redis, DynamoDB): cache, sesiones
  - **Column-family** (Cassandra, HBase): time-series, big data
  - **Graph** (Neo4j, ArangoDB): relaciones complejas

**Time-series**:
- Optimizado para datos con timestamp
- Compresion, retention policies, downsampling
- Ejemplos: InfluxDB, TimescaleDB (extension de PostgreSQL), Prometheus
- Caso de uso: metricas, IoT, monitoring

**NewSQL**:
- Combina lo mejor de SQL (ACID) y NoSQL (escalado)
- CockroachDB, TiDB, Spanner-inspired

### Cuando usar cada uno

| Caso | Recomendacion |
|------|---------------|
| Transacciones financieras | PostgreSQL / MySQL (ACID) |
| Sesiones / cache | Redis |
| Catalogos de productos (flexible) | MongoDB |
| Metricas / monitoring | InfluxDB / TimescaleDB |
| Redes sociales (grafos) | Neo4j |
| Analytics sobre muchos datos | ClickHouse / BigQuery |
| Busqueda full-text | Elasticsearch |

## PostgreSQL: la base para SRE

**PostgreSQL** (1989, University of California Berkeley, Michael Stonebraker) es la base de datos open source mas avanzada. La usan Instagram, Spotify, Apple, Reddit, y casi todos los proveedores cloud la ofrecen como managed service (RDS, Cloud SQL, Azure Database).

### Por que PostgreSQL?

- **ACID compliant** real (no como MySQL con InnoDB)
- **MVCC** (Multi-Version Concurrency Control): readers no bloquean writers
- **Extensible**: tipos custom, indices (GIN, GiST, BRIN), lenguajes (PL/pgSQL, Python)
- **JSON nativo**: `jsonb` es excelente para datos semi-estructurados
- **Replicacion**: streaming, logical, fisica
- **Extensions potentes**: PostGIS (geo), TimescaleDB (time-series), pg_trgm (fuzzy search), pgvector (embeddings)

### Comandos SRE esenciales

```bash
# Conexion basica
psql -h db.example.com -U app -d mydb

# Listar bases de datos
\\l

# Ver queries lentas activas
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 seconds'
ORDER BY duration DESC;

# Matar una query colgada
SELECT pg_cancel_backend(pid);
-- Si no funciona, mas agresivo:
SELECT pg_terminate_backend(pid);

# Ver indices y su uso
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

# Ver tablas mas grandes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

# Reindexar (mejora performance tras muchos UPDATEs)
REINDEX TABLE my_table;

# Vacuum (reclamar espacio de tuplas muertas)
VACUUM ANALYZE;

# Explain plan de una query
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'foo@bar.com';
```

### Connection pooling: critico para SRE

Por defecto, cada conexion a Postgres usa ~10MB de RAM. Si tienes 1000 conexiones = 10GB solo en RAM. Usar **PgBouncer** o **Pgpool-II** para multiplexar:

- Modo **session**: cada cliente tiene su backend (default)
- Modo **transaction**: la conexion se reusa entre transacciones (10x mas eficiente)
- Modo **statement**: maximo multiplexing, pero rompe con prepared statements

```ini
# pgbouncer.ini
[databases]
mydb = host=localhost dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

### Backups y PITR

```bash
# Backup logico
pg_dump -h db.example.com -U app mydb | gzip > backup.sql.gz

# Backup fisico (mas rapido, hot)
pg_basebackup -h db.example.com -U replica -D /backup -Ft -z -P

# Point-in-time recovery: configurar WAL archiving
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

## Redis: el cache rey

**Redis** (REmote DIctionary Server, creado por Salvatore Sanfilippo @antirez, 2009, originalmente para reducir latencia en su startup italiana) es un store en memoria usado para cache, sesiones, leaderboards, rate limiting, pub/sub, y mas.

### Estructuras de datos

- **String**: hasta 512MB, perfecto para cache de objetos JSON
- **List**: cola/deque (LPUSH, RPUSH, LPOP, RPOP)
- **Set**: conjunto unico (SADD, SMEMBERS, SINTER para interseccion)
- **Sorted Set**: con score (ZADD, ZRANGEBYSCORE) - ideal para leaderboards
- **Hash**: campo-valor dentro de un key (HSET, HGETALL) - objetos
- **Stream**: log append-only con consumer groups (XADD, XREAD)
- **Bitmap, HyperLogLog, Geo**: especializados

### Casos de uso SRE

```bash
# Cache de query
SET user:1234 '{"id":1234,"name":"Ana","email":"ana@example.com"}' EX 3600
GET user:1234

# Rate limiting
INCR ratelimit:api:192.168.1.1
EXPIRE ratelimit:api:192.168.1.1 60

# Sesion de usuario
SET session:abc123 "{...}" EX 86400

# Leaderboard (ZSET)
ZADD game:scores 1500 "player1" 2300 "player2" 1800 "player3"
ZREVRANGE game:scores 0 9 WITHSCORES  # top 10

# Pub/Sub
PUBLISH news "Hola mundo"
SUBSCRIBE news
```

### Persistencia

- **RDB**: snapshot periodico (dump.rdb). Rapido恢复, pero pierde los ultimos segundos.
- **AOF**: append-only file, log de cada operacion. Mas durable pero mas lento.
- **RDB + AOF**: combo (recomendado para datos importantes).

### Modo cluster

Redis Cluster divide los datos en 16384 slots entre N nodos. Cada nodo tiene replicas para HA. Sharding automatico, rebalanceo automatico.

### Cuándo NO usar Redis

- Datos que no caben en RAM (tienes 64GB RAM? Son 64GB de datos maximo practico)
- Necesitas queries complejas con joins (usa Postgres + cache)
- Persistencia estricta (PostgreSQL es mejor choice)

> **Cuidado**: Redis NO es una base de datos primaria confiable. Es un cache. Si Redis se cae, no pierdes datos (los puedes regenerar), pero tampoco los tienes disponibles.

## Puntos clave

- CAP theorem: en sistemas distribuidos, solo puedes garantizar 2 de 3 (C, A, P). En la practica siempre es CP vs AP.
- PostgreSQL es la base SQL recomendada para SRE: ACID, MVCC, extensible (PostGIS, TimescaleDB, pgvector).
- PgBouncer multiplexa conexiones, evitando el problema de "1000 conexiones = 10GB RAM" en Postgres.
- Redis es un cache en memoria, NO una base primaria. Para sesiones, rate limiting, leaderboards es excelente.

:::quiz
[
  {
    "question": "Por que PostgreSQL es la base recomendada para SRE?",
    "options": ["Es la mas rapida en todo", "ACID, MVCC y extensible (PostGIS, TimescaleDB, pgvector)", "No necesita backups", "Es NoSQL"],
    "correctIndex": 1,
    "explanation": "Garantias transaccionales + concurrencia sin bloqueos + ecosistema de extensiones."
  },
  {
    "question": "Que problema resuelve PgBouncer?",
    "options": ["Replicacion", "Multiplexa conexiones: evita miles de conexiones directas que agotan RAM", "Sharding automatico", "Backups"],
    "correctIndex": 1,
    "explanation": "Cada conexion Postgres cuesta MBs; el pooler comparte un pool pequeno entre muchos clientes."
  },
  {
    "question": "Para que NO debes usar Redis?",
    "options": ["Cache", "Sesiones", "Rate limiting", "Base de datos primaria con durabilidad total"],
    "correctIndex": 3,
    "explanation": "Es memoria primero: perfecto para efimero y rapido, peligroso como unica copia de datos criticos."
  }
]
:::
