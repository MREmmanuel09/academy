---
id: data-6
slug: data-6
title: OLTP vs OLAP: transaccional vs analítico
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# OLTP vs OLAP: transaccional vs analítico

Las dos caras del procesamiento de datos. Por qué no usas Excel para tu banco.

## Dos workloads muy diferentes

**OLTP** (Online Transaction Processing) y **OLAP** (Online Analytical Processing) resuelven problemas opuestos. Confundirlos es un error clásico.

### OLTP: el día a día
- Muchas transacciones pequeñas
- Lectura/escritura de filas individuales
- Latencia ultra-baja (milisegundos)
- Usuarios concurrentes: miles
- Datos actuales (últimas horas/días)

**Ejemplo**: cuando compras en Amazon, la app hace ~50 queries OLTP para verificar inventario, procesar pago, crear orden, enviar email.

**Tecnología**: PostgreSQL, MySQL, MongoDB, DynamoDB.

### OLAP: el análisis
- Pocas queries, pero pesadas
- Escaneo de millones/ billones de filas
- Latencia aceptable en segundos/minutos
- Usuarios concurrentes: pocos (analistas)
- Datos históricos (meses, años)

**Ejemplo**: el equipo de marketing quiere saber "ventas por categoría, región y mes, últimos 3 años".

**Tecnología**: Snowflake, BigQuery, Redshift, ClickHouse, DuckDB.

## Comparación detallada

| Característica | OLTP | OLAP |
|----------------|------|------|
| **Propósito** | Operación del negocio | Análisis del negocio |
| **Queries típicas** | `SELECT * FROM users WHERE id=1` | `SELECT region, SUM(sales) GROUP BY region` |
| **Volumen por query** | 1-100 filas | Millones de filas |
| **Latencia objetivo** | < 100ms | segundos - minutos |
| **Datos** | Actuales | Históricos |
| **Escritura** | Continua (inserts, updates) | Rara (cargas batch) |
| **Normalización** | Alta (3NF, evitar redundancia) | Baja (denormalizado, star schema) |
| **Índices** | Muchos (B-tree en columnas clave) | Pocos (bitmap, columnar) |
| **Usuarios** | Empleados, clientes | Analistas, científicos, managers |
| **Storage cost** | Por GB caro (rápido) | Por GB barato (masivo) |

## Por qué NO debes hacer analytics en la DB transaccional

### El error clásico

```
[App] → [PostgreSQL] ← [Analyst ejecutando query pesada]
                          SELECT customer_id, SUM(amount), AVG(amount), ...
                          FROM orders
                          JOIN order_items ON ...
                          JOIN products ON ...
                          JOIN users ON ...
                          WHERE created_at > '2023-01-01'
                          GROUP BY customer_id, month;
```

**Problemas**:
1. **Bloqueos**: la query pesada bloquea inserts/updates de la app
2. **Performance**: la app se vuelve lentísima
3. **Storage**: la DB transaccional se llena de datos históricos innecesarios
4. **Recursos**: compites por CPU/memoria con la app

> **Regla de oro**: la base de datos de la aplicación es **sagrada**. Para análisis, replica los datos a un warehouse.

## HTAP: el híbrido

**HTAP** (Hybrid Transactional/Analytical Processing) intenta resolver el problema haciendo **una sola base de datos** que sirva ambos workloads.

**Ejemplos**:
- TiDB
- SingleStore
- ClickHouse (con almacenamiento transaccional)
- Snowflake Unistore
- Apache Pinot

**Ventaja**: un solo sistema, datos siempre frescos.

**Desventaja**:
- Más caro y complejo
- Trade-offs inevitables
- Aún no maduro en todos los casos

> **En 2026, HTAP tiene sentido para casos específicos** (ej. feature stores de ML) pero la mayoría sigue usando la separación clásica OLTP + OLAP.

## Puntos clave

- OLTP = transacciones rápidas y actuales (PostgreSQL, MySQL).
- OLAP = análisis pesado sobre datos históricos (Snowflake, BigQuery).
- Nunca corras queries analíticas pesadas en la DB de la aplicación.
- HTAP existe pero es caso especial. La separación clásica sigue siendo el estándar.
