---
id: data-5
slug: data-5
title: Data Warehouse vs Data Lake vs Lakehouse
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# Data Warehouse vs Data Lake vs Lakehouse

Las tres arquitecturas de almacenamiento. Cuándo usar cada una y por qué el lakehouse está ganando.

## Las tres arquitecturas

### Data Warehouse (almacén de datos)
Sistema **estructurado y optimizado** para queries analíticas. Datos limpios, esquematizados, listos para análisis.

**Ejemplos**: Snowflake, BigQuery, Redshift, Databricks SQL, ClickHouse.

**Pensado para**:
- Reportes y BI
- SQL complejo, joins, agregaciones
- Datos estructurados y semi-estructurados
- Usuarios de negocio

### Data Lake (lago de datos)
Almacén de **datos crudos en cualquier formato**. Barato, escalable, sin esquema fijo.

**Ejemplos**: S3 + Athena, GCS + BigQuery external, ADLS + Synapse, MinIO.

**Pensado para**:
- Data science y ML
- Datos en cualquier formato (incluyendo video, logs, JSON anidado)
- Exploración, no producción

### Data Lakehouse (híbrido)
Combina lo mejor: almacén barato con **transacciones ACID y schema** del warehouse. Usa formatos abiertos (Parquet, Delta, Iceberg).

**Ejemplos**: Databricks (Delta Lake), Apache Iceberg, Apache Hudi, Snowflake + Iceberg.

**Pensado para**:
- Unificar batch y streaming
- ML y SQL sobre los mismos datos
- Reducir duplicación

## Comparación directa

| Característica | Data Warehouse | Data Lake | Data Lakehouse |
|----------------|----------------|-----------|---------------|
| **Datos** | Estructurados | Cualquier formato | Cualquier formato |
| **Schema** | On-write (schema-on-read) | On-read | On-read + on-write |
| **Costo** | Alto (compute + storage) | Bajo (storage) | Medio |
| **ACID** | Sí | No | Sí (con Delta/Iceberg) |
| **Performance SQL** | Excelente | Variable (depende del formato) | Excelente |
| **ML / Data Science** | Limitado | Excelente | Excelente |
| **Gobierno** | Fácil | Difícil | Mejorado |
| **Vendor lock-in** | Alto (Snowflake, Redshift) | Bajo (S3, formatos abiertos) | Bajo (Iceberg) |

> **El lakehouse está ganando** porque elimina la duplicación: un solo almacén, dos casos de uso (BI + ML).

## Cuándo usar cada uno

### Elige Data Warehouse si:
- Eres una empresa tradicional con datos estructurados
- Quieres reporting y BI rápido, sin quebraderos de cabeza
- Tu equipo es 100% SQL / analistas
- Presupuesto no es problema

### Elige Data Lake si:
- Haces ML, data science, investigación
- Tienes datos no estructurados (imágenes, video, logs)
- Quieres máximo ahorro en storage
- Tu equipo es ingeniería / Python

### Elige Data Lakehouse si:
- Combinas BI y ML
- Quieres unificar pipelines batch y streaming
- Estás empezando un proyecto nuevo (recomendado en 2026)
- Quieres evitar vendor lock-in

## Arquitectura moderna típica

En 2026, la mayoría de empresas nuevas adoptan esta arquitectura:

```
┌──────────────────────────────────────────────┐
│        Fuentes: apps, logs, APIs, IoT         │
└──────────────┬───────────────────────────────┘
               │ (Kafka, Kinesis, Pub/Sub)
               ↓
┌──────────────────────────────────────────────┐
│       Data Lakehouse (S3/GCS/ADLS)           │
│   - Bronze: crudo                             │
│   - Silver: limpio                            │
│   - Gold:   agregado, listo para BI           │
│   Formato: Delta Lake / Iceberg              │
└──────────────┬───────────────────────────────┘
               │
       ┌───────┴───────┐
       ↓               ↓
┌─────────────┐  ┌──────────────┐
│   BI / SQL  │  │  ML / Python │
│ (Snowflake, │  │  (Databricks,│
│  BigQuery)  │  │   EMR)       │
└─────────────┘  └──────────────┘
```

> **El patrón medallion (Bronze/Silver/Gold)** es el estándar: crudo, limpio, agregado. Cada capa tiene un propósito claro.

## Puntos clave

- Data Warehouse: estructurado, caro, rápido. Para BI y reporting.
- Data Lake: cualquier formato, barato, flexible. Para ML y exploración.
- Data Lakehouse: combina lo mejor de ambos con formatos abiertos (Delta, Iceberg).
- El patrón medallion (Bronze/Silver/Gold) es el estándar moderno en lakehouses.
