---
id: sql-6
slug: sql-6
title: Indexes y query performance (EXPLAIN, B-tree, hash)
module: devops
difficulty: advanced
estimatedMinutes: 7
xp: 85
---

# Indexes y query performance (EXPLAIN, B-tree, hash)

Cómo hacer queries rápidas. Indexes, planes de ejecución, y por qué tu query tarda 10 minutos.

## Por qué importan los indexes

Sin índices, una query hace un **full table scan**: lee fila por fila, todas las millones de filas. Como buscar una palabra en un diccionario sin índice.

Con índices, la base de datos tiene un **"mapa"** que le dice dónde está cada valor, sin escanear todo.

### Benchmark típico
- Sin índice: `SELECT * FROM users WHERE email = 'ana@example.com'` — 2 segundos en 10M filas
- Con índice en email: 5 milisegundos

> **Regla**: cualquier columna usada en `WHERE`, `JOIN`, o `ORDER BY` debería tener un índice (si la tabla es grande).

## B-tree: el index default

El **B-tree** (Balanced Tree) es el tipo de índice más común. Funciona como un árbol binario, pero con muchos hijos por nodo.

**Bueno para**:
- Igualdad: `WHERE id = 5`
- Rangos: `WHERE price BETWEEN 10 AND 100`
- Orden: `ORDER BY created_at`
- `LIKE 'prefix%'` (prefijos)

**Malo para**:
- `LIKE '%suffix'` (sufijos — no usa el árbol)
- Funciones sobre la columna: `WHERE LOWER(email) = ...`

```sql
-- Crear índice
CREATE INDEX idx_users_email ON users(email);

-- Índice compuesto (orden importa)
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date);
```

> **Truco**: en un índice compuesto `(a, b)`, las queries con `WHERE a = ?` lo usan, pero `WHERE b = ?` no. El orden de las columnas importa.

## Hash, Bitmap, GIN, BRIN

### Hash
Muy rápido para igualdad exacta, no soporta rangos.
```sql
CREATE INDEX idx_users_hash ON users USING HASH(country);
```

### Bitmap
Bueno para columnas con pocos valores distintos (ej. género, país).
```sql
CREATE INDEX idx_users_country_bitmap ON users USING BITMAP(country);
```

### GIN (Generalized Inverted Index)
Para datos complejos: JSONB, arrays, full-text search.
```sql
CREATE INDEX idx_products_attrs ON products USING GIN(attrs);
-- WHERE attrs @> '{"color": "red"}'  usa este índice
```

### BRIN (Block Range Index)
Para tablas enormes con datos naturalmente ordenados (logs, time series). Muy compacto.
```sql
CREATE INDEX idx_logs_time ON logs USING BRIN(created_at);
```

> **El 95% del tiempo, B-tree es lo que necesitas**. Los otros son para casos especiales.

## EXPLAIN: el plan de ejecución

`EXPLAIN` te dice **cómo** la base de datos va a ejecutar tu query. **EXPLAIN ANALYZE** además la ejecuta y mide tiempos.

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42;
```

**Output típico**:
```
Index Scan using idx_orders_customer_id on orders
  (cost=0.43..50.12 rows=10 width=80) (actual time=0.05..0.12 rows=8 loops=1)
  Index Cond: (customer_id = 42)
Planning Time: 0.15 ms
Execution Time: 0.20 ms
```

### Qué buscar
- **Seq Scan**: ⚠️ escaneo completo. Si la tabla es grande, falta un índice.
- **Index Scan**: ✅ usando índice.
- **Bitmap Index Scan**: ✅ para queries con varios filtros.
- **Nested Loop / Hash Join / Merge Join**: cómo combina tablas en JOIN.
- **cost=0.43..50.12**: estimación del motor (menor = mejor, pero es relativo).

> **Hábito clave**: antes de poner una query en producción, ejecútala con EXPLAIN ANALYZE. Si ves Seq Scan en una tabla grande, agrega índice.

## Errores comunes que matan performance

### 1. Funciones sobre columnas indexadas
```sql
-- MAL: no usa el índice
SELECT * FROM users WHERE LOWER(email) = 'ana@example.com';

-- BIEN: índice funcional
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'ana@example.com';
```

### 2. Conversión implícita de tipos
```sql
-- MAL: si customer_id es INT pero pasas STRING
SELECT * FROM orders WHERE customer_id = '42';
-- En algunos motores no usa el índice
```

### 3. SELECT *
```sql
-- MAL: trae columnas innecesarias
SELECT * FROM users_with_50_columns;

-- BIEN: solo lo necesario
SELECT id, name FROM users;
```

### 4. OR en WHERE
```sql
-- MAL: a veces no usa índices
SELECT * FROM users WHERE email = 'x' OR phone = 'y';

-- MEJOR: UNION de queries indexadas
SELECT * FROM users WHERE email = 'x'
UNION
SELECT * FROM users WHERE phone = 'y';
```

### 5. LIKE con wildcard al inicio
```sql
-- MAL: '%gmail.com' no usa índice
SELECT * FROM users WHERE email LIKE '%@gmail.com';

-- BIEN: 'ana%' sí usa índice
SELECT * FROM users WHERE email LIKE 'ana%';
```

## Mantenimiento de índices

Los índices **no son gratis**. Cada INSERT/UPDATE/DELETE debe actualizar todos los índices. Más índices = escrituras más lentas.

### Cuándo NO indexar
- Tablas pequeñas (< 1000 filas): el motor prefiere seq scan
- Columnas con muchos duplicados (ej. `is_active` con 99% TRUE)
- Columnas que nunca se usan en WHERE/JOIN/ORDER BY

### Mantenimiento
```sql
-- Reconstruir índice fragmentado (PostgreSQL)
REINDEX INDEX idx_users_email;

-- Ver uso de índices
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
-- Índices con idx_scan = 0 son candidatos a borrar
```

> **Regla**: en una tabla, mantén entre 3-7 índices. Más de eso y las escrituras sufren. Menos y las queries sufren.

## Puntos clave

- Sin índice, las queries hacen full table scan. Indexa columnas en WHERE, JOIN, ORDER BY.
- B-tree es el default y cubre 95% de los casos. GIN para JSON/arrays, BRIN para time series.
- EXPLAIN ANALYZE muestra el plan. Si ves Seq Scan en tabla grande, falta índice.
- Los índices cuestan en escrituras. Mantén 3-7 por tabla. Borra los que nadie usa.
