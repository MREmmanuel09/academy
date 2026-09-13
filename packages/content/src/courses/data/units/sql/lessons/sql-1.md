---
id: sql-1
slug: sql-1
title: SQL básico: SELECT, WHERE, ORDER BY, LIMIT
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# SQL básico: SELECT, WHERE, ORDER BY, LIMIT

Los fundamentos de SQL. Cómo consultar datos de una tabla: seleccionar, filtrar, ordenar y limitar resultados.

## ¿Qué es SQL?

**SQL** (Structured Query Language) es el lenguaje estándar para hablar con bases de datos relacionales. Nacido en los 70, sigue siendo la herramienta #1 de cualquier persona que trabaja con datos.

### ¿Por qué SQL sobrevive 50+ años?
- **Declarativo**: dices QUÉ quieres, no CÓMO obtenerlo
- **Universal**: funciona en PostgreSQL, MySQL, SQL Server, Oracle, BigQuery, Snowflake, DuckDB...
- **Optimizable**: el motor decide el mejor plan de ejecución
- **Componible**: las queries se construyen una sobre otra

> **Dato curioso**: SQL es la skill #1 más demandada en Data Analytics, Data Science, Data Engineering, BI y Backend. Aprender SQL es la mejor inversión de tiempo.

## SELECT: la consulta más básica

```sql
SELECT columna1, columna2
FROM tabla;
```

### Ejemplos
```sql
-- Todas las columnas
SELECT * FROM users;

-- Solo nombre y email
SELECT name, email FROM users;

-- Expresión: calcular el precio con IVA
SELECT name, price, price * 1.21 AS price_with_tax
FROM products;

-- DISTINCT: valores únicos
SELECT DISTINCT country FROM users;
```

> **Convención**: SQL es case-insensitive para keywords, pero por convención se escriben en MAYÚSCULAS. Los nombres de tablas/columnas varían (snake_case es el más común).

## WHERE: filtrar filas

```sql
SELECT columnas
FROM tabla
WHERE condición;
```

### Operadores de comparación
| Operador | Significado |
|----------|-------------|
| `=` | Igual |
| `!=` o `<>` | Distinto |
| `>`, `<`, `>=`, `<=` | Mayor, menor, etc. |
| `BETWEEN` | Entre dos valores |
| `IN` | En una lista |
| `LIKE` | Coincide con un patrón |
| `IS NULL` | Es nulo |

### Ejemplos
```sql
-- Usuarios de Guatemala
SELECT * FROM users WHERE country = 'Guatemala';

-- Productos caros
SELECT * FROM products WHERE price > 100;

-- Rango de precios
SELECT * FROM products WHERE price BETWEEN 50 AND 200;

-- Varios países
SELECT * FROM users WHERE country IN ('GT', 'MX', 'CO');

-- Email no proporcionado
SELECT * FROM users WHERE email IS NULL;

-- Patrón: emails de gmail
SELECT * FROM users WHERE email LIKE '%@gmail.com';

-- AND / OR / NOT
SELECT * FROM products 
WHERE price > 50 AND category = 'Electronics';
```

> **LIKE patterns**: `%` = cualquier cadena, `_` = un solo caracter. `'a%'` empieza con a, `'%a'` termina con a.

## ORDER BY y LIMIT

### ORDER BY: ordenar resultados
```sql
SELECT * FROM products ORDER BY price;        -- ascendente (default)
SELECT * FROM products ORDER BY price DESC;   -- descendente
SELECT * FROM products ORDER BY category, price DESC;  -- múltiples columnas
```

### LIMIT / OFFSET: paginar
```sql
-- Top 10 más caros
SELECT * FROM products ORDER BY price DESC LIMIT 10;

-- Paginar (página 3, 20 por página)
SELECT * FROM products 
ORDER BY id 
LIMIT 20 OFFSET 40;
-- Página 1: OFFSET 0
-- Página 2: OFFSET 20
-- Página 3: OFFSET 40
```

> **Truco pro**: `LIMIT` con `OFFSET` en tablas grandes es lento. Para paginación real, usa **keyset pagination** (`WHERE id > último_id_visto LIMIT 20`).

## Tu primera query completa

Juntemos todo. Ejemplo realista: "muéstrame los 5 productos de la categoría Electronics con precio mayor a 100, ordenados de más caro a más barato".

```sql
SELECT 
  product_id,
  product_name,
  price
FROM products
WHERE category = 'Electronics'
  AND price > 100
ORDER BY price DESC
LIMIT 5;
```

**Orden de ejecución de SQL** (importante para entender):
1. `FROM` — de qué tabla
2. `WHERE` — qué filas
3. `GROUP BY` — agrupación (lo vemos pronto)
4. `HAVING` — filtro de grupos
5. `SELECT` — qué columnas
6. `ORDER BY` — orden
7. `LIMIT` — cuántas filas

> **No es el orden que escribes**, es el orden en que el motor evalúa. Por eso no puedes usar un alias de `SELECT` en `WHERE`.

## Puntos clave

- SQL es declarativo: dices QUÉ quieres, no CÓMO obtenerlo.
- SELECT columnas FROM tabla WHERE filtro ORDER BY col LIMIT n.
- WHERE se evalúa antes que SELECT: no puedes usar alias de SELECT en WHERE.
- Para paginación real, keyset pagination es mejor que LIMIT/OFFSET en tablas grandes.

:::quiz
[
  {
    "question": "What does the SELECT statement do in SQL?",
    "options": ["Modifies table structure", "Retrieves specific columns from a table", "Deletes rows", "Creates a new database"],
    "correctIndex": 1,
    "explanation": "SELECT retrieves (queries) data from a database. You specify which columns to return and from which table."
  },
  {
    "question": "What does the WHERE clause do?",
    "options": ["Sorts the results", "Filters rows based on a condition", "Groups rows together", "Limits the number of columns"],
    "correctIndex": 1,
    "explanation": "WHERE filters rows based on a condition — only rows that match the condition are included in the result."
  },
  {
    "question": "What does ORDER BY do in SQL?",
    "options": ["Filters rows", "Specifies which columns to show", "Sorts the result set by one or more columns", "Creates an index"],
    "correctIndex": 2,
    "explanation": "ORDER BY sorts the result set by one or more columns. Use ASC (default) for ascending or DESC for descending order."
  }
]
:::

:::code sql
-- SELECT basico
SELECT name, email, created_at
FROM users
WHERE active = true
ORDER BY created_at DESC
LIMIT 10;
:::
