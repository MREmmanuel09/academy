---
id: sql-5
slug: sql-5
title: Window Functions: ROW_NUMBER, RANK, LAG, LEAD, PARTITION BY
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 85
---

# Window Functions: ROW_NUMBER, RANK, LAG, LEAD, PARTITION BY

Funciones que operan sobre ventanas de filas. La herramienta más poderosa de SQL analítico.

## ¿Qué son Window Functions?

Las **window functions** calculan sobre un conjunto de filas **relacionadas** con la fila actual, sin agrupar.

A diferencia de `GROUP BY`, que devuelve una fila por grupo, las window functions **mantienen las filas originales** y agregan una columna calculada.

### Sintaxis
```sql
función() OVER (
  [PARTITION BY columna]    -- divide en grupos
  [ORDER BY columna]        -- orden dentro del grupo
  [ROWS BETWEEN ...]        -- ventana específica (opcional)
) AS alias
```

> **Caso de uso típico**: "ranking de ventas por categoría", "diferencia con el mes anterior", "top 3 productos por cliente".

## ROW_NUMBER, RANK, DENSE_RANK

### ROW_NUMBER
Asigna un número único secuencial (1, 2, 3, 4...) dentro de la partición.
```sql
SELECT 
  product_name,
  category,
  price,
  ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn
FROM products;
-- Dentro de cada categoría, los productos se numeran 1, 2, 3...
```

### RANK
Asigna ranking, pero empates comparten el mismo número y dejan huecos.
```sql
SELECT 
  product_name,
  price,
  RANK() OVER (ORDER BY price DESC) AS rank
FROM products;
-- 1, 2, 2, 4, 5  (los empates comparten rank, el siguiente salta)
```

### DENSE_RANK
Como RANK pero sin huecos.
```sql
-- 1, 2, 2, 3, 4  (sin huecos)
```

> **Top N por grupo**: usa ROW_NUMBER y filtra `WHERE rn <= 3`. Es la pregunta de entrevista SQL más común.

## LAG, LEAD, FIRST_VALUE, LAST_VALUE

### LAG y LEAD: valor de la fila anterior/siguiente
```sql
SELECT 
  order_date,
  total,
  LAG(total) OVER (ORDER BY order_date) AS prev_day_total,
  LEAD(total) OVER (ORDER BY order_date) AS next_day_total,
  total - LAG(total) OVER (ORDER BY order_date) AS day_over_day_change
FROM daily_sales;
```

> **Caso de uso clásico**: comparación con el período anterior. Reportes ejecutivos, MoM (month over month), WoW (week over week).

### FIRST_VALUE y LAST_VALUE
```sql
SELECT 
  product_name,
  category,
  price,
  FIRST_VALUE(product_name) OVER (PARTITION BY category ORDER BY price DESC) AS most_expensive_in_cat
FROM products;
```

## Agregaciones como window functions

Puedes usar SUM, AVG, COUNT, etc. como window functions para acumular o promediar sobre una ventana.

```sql
-- Suma acumulada (running total)
SELECT 
  order_date,
  total,
  SUM(total) OVER (ORDER BY order_date) AS running_total
FROM daily_sales;

-- Promedio móvil de 7 días
SELECT 
  order_date,
  total,
  AVG(total) OVER (
    ORDER BY order_date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) AS moving_avg_7d
FROM daily_sales;
```

### Frames de ventana
- `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — desde el inicio
- `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` — últimos 7 (incluyendo actual)
- `ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING` — 3 antes, actual, 3 después
- `RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW` — ventana lógica (PostgreSQL)

> **Las agregaciones como window functions** son el pan de cada día del análisis de series temporales.

## Top N por grupo (clásico de entrevista)

La pregunta SQL más frecuente en entrevistas: "top 3 productos más vendidos por categoría".

```sql
WITH ranked AS (
  SELECT 
    category,
    product_name,
    total_sold,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_sold DESC) AS rn
  FROM product_sales
)
SELECT * FROM ranked WHERE rn <= 3 ORDER BY category, rn;
```

### Variación: top 1 por grupo
```sql
-- El más vendido por categoría
SELECT * FROM (
  SELECT 
    category,
    product_name,
    total_sold,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_sold DESC) AS rn
  FROM product_sales
) WHERE rn = 1;
```

> **Esta query sale en 1 de cada 3 entrevistas técnicas**. Memorízala.

## Window functions vs GROUP BY

| Caso | Usa |
|------|-----|
| Quiero una fila por grupo con totales | GROUP BY |
| Quiero todas las filas con info del grupo | Window function |
| Ranking | Window function |
| Suma total junto al detalle | Window function |
| Suma total solo | GROUP BY |
| Comparar con período anterior | Window function (LAG) |
| Top N por grupo | Window function (ROW_NUMBER + filter) |

## Puntos clave

- Window functions operan sobre un grupo de filas SIN colapsarlas (a diferencia de GROUP BY).
- ROW_NUMBER, RANK, DENSE_RANK para ranking. LAG/LEAD para comparar con fila anterior/siguiente.
- SUM, AVG como window functions: running totals y moving averages.
- Top N por grupo: ROW_NUMBER() + PARTITION BY + WHERE rn <= N.
