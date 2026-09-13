---
id: data-2
slug: data-2
title: Ciclo de vida del dato
module: devops
difficulty: beginner
estimatedMinutes: 7
xp: 60
---

# Ciclo de vida del dato

Las fases del dato: collect, store, process, analyze, visualize. Desde la fuente hasta la decisión.

## Las 5 fases del ciclo de vida

El dato pasa por varias etapas desde que se genera hasta que genera valor:

```
1. COLLECT  →  2. STORE  →  3. PROCESS  →  4. ANALYZE  →  5. VISUALIZE
   (fuente)    (crudo)      (limpio)        (agregado)     (decision)
```

### 1. Collect (Recolección)

Capturar el dato de la fuente original.
- **Logs de aplicación** (stdout, syslog)
- **Eventos** (clickstream, IoT, transacciones)
- **APIs externas** (REST, GraphQL, webhooks)
- **Bases de datos** (CDC — Change Data Capture)
- **Archivos** (CSV, JSON, Parquet subidos)
- **Streaming** (Kafka, Kinesis, Pub/Sub)

### 2. Store (Almacenamiento)

Persistir el dato en un sistema adecuado.
- **Data Lake** (S3, GCS, HDFS) — crudo, barato, cualquier formato
- **Data Warehouse** (Snowflake, BigQuery, Redshift) — estructurado, optimizado para queries
- **Base de datos OLTP** (PostgreSQL, MySQL) — aplicación transaccional
- **Base de datos de series de tiempo** (InfluxDB, Timescale) — métricas, IoT

### 3. Process (Procesamiento)

Transformar el dato crudo en datos limpios y útiles.
- **Batch**: Spark, dbt, Airflow
- **Streaming**: Flink, Spark Streaming, Kafka Streams
- **ETL/ELT**: extraer, transformar, cargar

### 4. Analyze (Análisis)

Extraer insights: queries, estadísticas, modelos.
- **SQL** (la herramienta del 90% de los analistas)
- **Python/R** (pandas, scikit-learn)
- **BI tools** (Tableau, Looker, PowerBI)

### 5. Visualize (Visualización)

Presentar los insights a los tomadores de decisiones.
- **Dashboards** (Grafana, Metabase, Looker)
- **Reportes** (PDF, email)
- **Alertas** (PagerDuty cuando algo se sale de rango)

## Ejemplo end-to-end

Veamos un caso real: un e-commerce quiere saber **cuánto vendió cada categoría el último mes**.

### 1. Collect
Los web servers emiten logs en formato JSON:
```json
{"event": "purchase", "user_id": 1, "product_id": 5, "total": 89.50, "ts": "2026-01-15T10:30:00Z"}
```

### 2. Store
Kafka los captura y los persiste en un **Data Lake** (S3) en formato Parquet particionado por fecha.

### 3. Process
Un job de **Spark** lee los Parquet, los une con la tabla de productos para obtener la categoría, y agrega ventas por categoría.

### 4. Analyze
Se ejecuta una query SQL sobre el resultado:
```sql
SELECT categoria, SUM(total) as ventas
FROM ventas_enero
GROUP BY categoria
ORDER BY ventas DESC;
```

### 5. Visualize
Los resultados van a un **dashboard en Metabase** que el equipo de marketing revisa cada lunes.

> **El dato tiene valor solo cuando llega a la etapa 5**. Todo el resto es costo.

## Latencia del pipeline

Dependiendo del caso de uso, la latencia importa mucho:

| Tipo | Latencia | Caso de uso | Tecnología |
|------|----------|-------------|------------|
| **Batch** | horas - días | Reportes, ML training | Airflow, dbt, Spark |
| **Micro-batch** | minutos | Dashboards casi real-time | Spark Streaming, Flink |
| **Near real-time** | segundos | Alertas, fraude | Kafka Streams, Flink |
| **Real-time** | milisegundos | Trading, gaming | Custom, in-memory |

> **Regla**: usa la **latencia más baja que necesites, no la más baja que puedas**. Real-time es carísimo y complejo. Batch es gratis y simple.

## Puntos clave

- El ciclo de vida: Collect → Store → Process → Analyze → Visualize.
- Cada fase tiene tecnologías específicas (Kafka, S3, Spark, SQL, Metabase).
- El dato solo tiene valor cuando llega a la visualización/decision.
- Elige la latencia más baja que necesites: batch es gratis, real-time es carísimo.
