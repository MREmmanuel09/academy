---
id: sql-4
slug: sql-4
title: Subqueries y CTEs (WITH)
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# Subqueries y CTEs (WITH)

Cómo escribir queries complejas. Subqueries vs CTEs y cuándo usar cada uno.

## Subqueries: queries dentro de queries

Una **subquery** es una query anidada dentro de otra. Hay tres tipos.

### 1. Subquery en WHERE
```sql
-- Productos más caros que el promedio
SELECT product_name, price
FROM products
WHERE price > (SELECT AVG(price) FROM products);
```

### 2. Subquery en FROM (tabla derivada)
```sql
SELECT category, avg_price
FROM (
  SELECT category, AVG(price) AS avg_price
  FROM products
  GROUP BY category
) AS category_stats
WHERE avg_price > 100;
```

### 3. Subquery en SELECT (escalar)
```sql
SELECT 
  product_name,
  price,
  (SELECT AVG(price) FROM products) AS overall_avg,
  price - (SELECT AVG(price) FROM products) AS diff_from_avg
FROM products;
```

## IN, EXISTS, ANY, ALL

### IN: pertenece a un conjunto
```sql
-- Clientes que SÍ han comprado
SELECT * FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);

-- Clientes que NO han comprado
SELECT * FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders);
```

### EXISTS: ¿existe al menos una coincidencia?
```sql
SELECT * FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);
```

> **IN vs EXISTS**: en muchos motores, `EXISTS` es más rápido porque corta en el primer match. `IN` puede cargar todo el subconjunto.

### ANY y ALL
```sql
-- Productos más caros que AL MENOS uno de Electronics
SELECT * FROM products
WHERE price > ANY (SELECT price FROM products WHERE category = 'Electronics');

-- Productos más caros que TODOS los de Electronics
SELECT * FROM products
WHERE price > ALL (SELECT price FROM products WHERE category = 'Electronics');
```

## CTEs: la forma moderna

**CTE** (Common Table Expression) es una "subquery con nombre" usando `WITH`. Más legible y reutilizable que subqueries anidadas.

```sql
WITH high_spenders AS (
  SELECT customer_id, SUM(total) AS spent
  FROM orders
  GROUP BY customer_id
  HAVING SUM(total) > 1000
),
top_products AS (
  SELECT product_id, COUNT(*) AS times_ordered
  FROM order_items
  GROUP BY product_id
  ORDER BY times_ordered DESC
  LIMIT 10
)
SELECT 
  c.name,
  hs.spent
FROM high_spenders hs
JOIN customers c ON c.customer_id = hs.customer_id
ORDER BY hs.spent DESC;
```

### Ventajas sobre subqueries
- **Legible**: como una "tabla virtual" con nombre
- **Reutilizable**: defines una vez, usas varias veces
- **Debuggeable**: puedes hacer `SELECT * FROM nombre_cte` para inspeccionar
- **Recursivo**: CTEs recursivos (lo vemos pronto)

## CTEs recursivos: queries sobre jerarquías

Los CTEs pueden ser **recursivos**: la query se llama a sí misma hasta agotar la jerarquía.

```sql
-- Ejemplo: empleados con su nivel jerárquico
WITH RECURSIVE org_chart AS (
  -- Caso base: CEO (sin manager)
  SELECT employee_id, name, manager_id, 0 AS level
  FROM employees
  WHERE manager_id IS NULL
  
  UNION ALL
  
  -- Caso recursivo: subordinados
  SELECT e.employee_id, e.name, e.manager_id, oc.level + 1
  FROM employees e
  JOIN org_chart oc ON e.manager_id = oc.employee_id
)
SELECT * FROM org_chart ORDER BY level, name;
```

### Casos de uso
- **Jerarquías**: organigramas, categorías con subcategorías
- **Grafos**: redes de seguidores, dependencias
- **Series temporales**: calcular valores día a día
- **Árboles**: comentarios anidados, taxonomías

> En PostgreSQL, los CTEs recursivos son increíblemente poderosos. Son tu herramienta #1 para datos jerárquicos.

## Cuándo usar cada uno

| Situación | Recomendación |
|-----------|---------------|
| Lógica simple, una sola capa | Subquery en WHERE |
| Lógica compleja, múltiples pasos | CTE con WITH |
| Reutilizo el mismo subquery 2+ veces | CTE (mejor que duplicar) |
| Quiero debuggear un paso intermedio | CTE (puedo comentar/aislar) |
| Performance crítica con subquery en WHERE | EXISTS / JOIN (depende del motor) |
| Jerarquías, grafos, árboles | CTE recursivo |

> **Regla moderna**: prefiere CTEs sobre subqueries profundas. Es más legible y los optimizadores modernos los manejan igual de bien.

## Puntos clave

- Subqueries: en WHERE (filtro), FROM (tabla derivada), SELECT (escalar).
- CTEs con WITH son como subqueries con nombre: más legibles y reutilizables.
- CTEs recursivos resuelven problemas de jerarquías, grafos y árboles.
- Prefiere CTEs sobre subqueries profundas en queries complejas.
