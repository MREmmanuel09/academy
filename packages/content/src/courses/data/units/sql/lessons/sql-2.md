---
id: sql-2
slug: sql-2
title: JOINs: INNER, LEFT, RIGHT, FULL, CROSS
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# JOINs: INNER, LEFT, RIGHT, FULL, CROSS

Cómo combinar datos de múltiples tablas. La operación más importante de SQL.

## El problema de los datos normalizados

En una base de datos bien diseñada, los datos están en **múltiples tablas** relacionadas. Para responder preguntas de negocio, necesitas **combinarlas**.

**Ejemplo**:
- Tabla `orders`: `order_id, customer_id, total`
- Tabla `customers`: `customer_id, name, country`

Pregunta: "¿Cuál es el nombre del cliente que más gastó?"

Necesitas los **dos** datos. Aquí entran los JOINs.

## INNER JOIN: la intersección

Devuelve solo las filas que **tienen coincidencia en ambas tablas**.

```sql
SELECT 
  o.order_id,
  c.name,
  o.total
FROM orders o
INNER JOIN customers c ON o.customer_id = c.customer_id;
```

**Visualización**:
```
    customers         orders
   ┌─────────┐      ┌──────────┐
   │ Ana     │──────│ order_1  │ ✅ match
   │ Luis    │      │ order_2  │ ❌ no match (Luis sin orden)
   │ Marta   │──────│ order_3  │ ✅ match
   │ Pedro   │      │ order_4  │ ❌ no match (orden sin cliente)
   └─────────┘      └──────────┘

INNER JOIN: solo Ana y Marta
```

> **Cuándo usar INNER JOIN**: cuando solo te interesan los registros que tienen relación en ambas tablas. Es el JOIN más común y el más performante.

## LEFT JOIN: la tabla izquierda manda

Devuelve **todas** las filas de la tabla izquierda, y las coincidencias de la derecha (NULL si no hay match).

```sql
SELECT 
  c.name,
  COUNT(o.order_id) AS num_orders,
  COALESCE(SUM(o.total), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name;
```

**Visualización**:
```
LEFT JOIN: Ana, Luis, Marta, Pedro (todas las customers)
           con NULL en ordenes para Luis y Pedro
```

> **Caso de uso clásico**: "¿Cuántos clientes **no** han comprado?" →
> `SELECT c.name FROM customers c LEFT JOIN orders o ON ... WHERE o.order_id IS NULL;`

## RIGHT JOIN y FULL OUTER JOIN

### RIGHT JOIN
Lo opuesto a LEFT: mantiene todas las filas de la **derecha**.

```sql
SELECT * FROM orders o
RIGHT JOIN customers c ON o.customer_id = c.customer_id;
```

> En la práctica casi no se usa. Es más legible invertir el orden y usar LEFT JOIN.

### FULL OUTER JOIN
Devuelve **todas** las filas de ambas tablas. NULL donde no hay match.

```sql
SELECT * FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```

> Útil para auditorías: "¿qué clientes sin órdenes y qué órdenes sin clientes existen?"

## CROSS JOIN y SELF JOIN

### CROSS JOIN
Producto cartesiano: cada fila de A con cada fila de B.

```sql
SELECT * FROM colors CROSS JOIN sizes;
-- Genera color x size para todas las combinaciones
```

> Útil para generar combinaciones (ej. todas las variantes de un producto). Pero cuidado, explota en cardinalidad: 1000 x 1000 = 1M filas.

### SELF JOIN
Une una tabla consigo misma.

```sql
-- Empleados con su manager
SELECT 
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id;
```

> Útil para jerarquías, grafos, comparaciones dentro de la misma tabla.

## Performance: los joins cuestan

Los JOINs son la operación **más cara** de SQL. Tips:

1. **Indexa las columnas de join**: `CREATE INDEX idx_orders_customer_id ON orders(customer_id);`
2. **Evita `SELECT *`**: solo trae las columnas que necesitas
3. **Filtra antes de joinear**: usa subqueries o CTEs para reducir el dataset
4. **Cuidado con `OR` en joins**: `ON a.x = b.x OR a.y = b.y` puede ser lentísimo
5. **Entiende el plan de ejecución**: `EXPLAIN ANALYZE` (lo veremos en la lección de indexes)

```sql
-- MALO: join + filter tarde
SELECT * FROM big_orders o
JOIN big_customers c ON o.customer_id = c.customer_id
WHERE c.country = 'GT';

-- MEJOR: filter primero
SELECT * FROM big_orders o
JOIN (SELECT * FROM big_customers WHERE country = 'GT') c
  ON o.customer_id = c.customer_id;
```

> **Regla de oro**: 90% de los problemas de performance en SQL son JOINs mal hechos o falta de índices.

## Puntos clave

- INNER JOIN: solo coincidencias. LEFT JOIN: todas las filas de la izquierda + matches.
- LEFT JOIN + WHERE right.id IS NULL = anti-join (registros sin match).
- RIGHT JOIN casi no se usa; FULL OUTER JOIN para auditorías.
- Indexa las columnas de join y filtra antes de joinear para mejor performance.
