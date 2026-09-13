---
id: sql-3
slug: sql-3
title: Aggregations: GROUP BY, HAVING, COUNT, SUM, AVG, MIN, MAX
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 65
---

# Aggregations: GROUP BY, HAVING, COUNT, SUM, AVG, MIN, MAX

Cómo resumir datos: contar, sumar, promediar. La base del análisis de datos.

## Funciones de agregación

Las funciones de agregación **resumen** múltiples filas en un solo valor.

| Función | Qué hace | Ejemplo |
|---------|----------|---------|
| `COUNT()` | Cuenta filas | `COUNT(*)` = total de filas |
| `SUM()` | Suma valores | `SUM(total)` = total vendido |
| `AVG()` | Promedio | `AVG(price)` = precio promedio |
| `MIN()` | Mínimo | `MIN(age)` = edad mínima |
| `MAX()` | Máximo | `MAX(age)` = edad máxima |

> **COUNT vs COUNT(columna)**: `COUNT(*)` cuenta todas las filas; `COUNT(email)` cuenta solo las que email no es NULL.

## GROUP BY: dividir en grupos

`GROUP BY` divide la tabla en grupos y aplica la agregación a cada uno.

```sql
-- Ventas por categoría
SELECT 
  category,
  COUNT(*) AS num_products,
  AVG(price) AS avg_price,
  MAX(price) AS max_price
FROM products
GROUP BY category;
```

### Resultado
| category | num_products | avg_price | max_price |
|----------|--------------|-----------|-----------|
| Electronics | 5 | 599.99 | 1299.99 |
| Appliances | 3 | 89.50 | 150.00 |
| Books | 10 | 25.00 | 45.00 |

> **Regla fundamental**: cualquier columna en `SELECT` que **no** sea una agregación debe estar en `GROUP BY`.

## HAVING: filtrar grupos

`WHERE` filtra filas **antes** de agrupar. `HAVING` filtra grupos **después** de agrupar.

```sql
-- Categorías con más de 5 productos y precio promedio > 50
SELECT 
  category,
  COUNT(*) AS num_products,
  AVG(price) AS avg_price
FROM products
GROUP BY category
HAVING COUNT(*) > 5 AND AVG(price) > 50;
```

### Orden de ejecución
1. `FROM`
2. `WHERE` ← filtra filas
3. `GROUP BY` ← agrupa
4. `HAVING` ← filtra grupos
5. `SELECT`
6. `ORDER BY`
7. `LIMIT`

> **Truco mental**: `WHERE` no puede usar `COUNT()` o `AVG()`, pero `HAVING` sí, porque `WHERE` corre antes de la agregación.

## COUNT, SUM y casos prácticos

### Análisis de negocio típico

```sql
-- Total de ventas y ticket promedio
SELECT 
  COUNT(DISTINCT order_id) AS num_orders,
  COUNT(DISTINCT customer_id) AS num_customers,
  SUM(total) AS total_revenue,
  AVG(total) AS avg_ticket
FROM orders
WHERE order_date >= '2026-01-01';

-- Top 10 clientes por gasto
SELECT 
  customer_id,
  COUNT(*) AS num_orders,
  SUM(total) AS total_spent
FROM orders
GROUP BY customer_id
ORDER BY total_spent DESC
LIMIT 10;

-- Productos que nunca se vendieron
SELECT p.product_id, p.product_name
FROM products p
LEFT JOIN orders o ON p.product_id = o.product_id
WHERE o.order_id IS NULL;
```

> **Regla**: `COUNT(DISTINCT col)` te dice cuántos valores únicos hay. `COUNT(*)` te dice cuántas filas hay. Son cosas distintas.

## Funciones avanzadas de agregación

### COUNT con FILTER (PostgreSQL)
```sql
SELECT 
  COUNT(*) FILTER (WHERE country = 'GT') AS guatemala_count,
  COUNT(*) FILTER (WHERE country = 'MX') AS mexico_count
FROM users;
```

### STRING_AGG: concatenar
```sql
SELECT 
  category,
  STRING_AGG(product_name, ', ' ORDER BY product_name) AS products
FROM products
GROUP BY category;
-- 'Laptop, Mouse, Keyboard' (todos los nombres separados por coma)
```

### Percentiles
```sql
SELECT 
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total) AS median_order,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total) AS p95_order
FROM orders;
```

> Los percentiles son cruciales para SLOs y análisis de latencia. La mediana (p50) es más robusta que el promedio.

## Puntos clave

- COUNT, SUM, AVG, MIN, MAX: las 5 funciones de agregación básicas.
- GROUP BY divide la tabla en grupos; toda columna en SELECT sin agregación debe estar en GROUP BY.
- WHERE filtra filas antes de agrupar; HAVING filtra grupos después.
- COUNT(*) cuenta filas; COUNT(columna) cuenta no-NULLs; COUNT(DISTINCT col) cuenta únicos.
