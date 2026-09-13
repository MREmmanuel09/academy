---
id: data-7
slug: data-7
title: ETL vs ELT: extracción, transformación y carga
module: devops
difficulty: intermediate
estimatedMinutes: 7
xp: 65
---

# ETL vs ELT: extracción, transformación y carga

Los dos patrones para mover datos. Cuándo cada uno y por qué ELT ganó.

## ¿Qué es ETL?

**ETL** = **E**xtract, **T**ransform, **L**oad. El patrón clásico desde los 70.

```
Source DB → Extract → [Transform Engine] → Transform → Load → Data Warehouse
                                                          (ya limpio)
```

### Flujo paso a paso

1. **Extract**: sacar datos de la fuente (DB, API, archivo)
2. **Transform**: limpiarlos, enriquecerlos, agregarlos (en un motor intermedio)
3. **Load**: cargarlos ya transformados al warehouse

**Tecnología clásica**: Informatica, Talend, DataStage, SSIS.

### Caso de uso típico

Tienes datos de ventas en MySQL, pero el equipo de marketing quiere un modelo dimensional con estrellas y agregaciones.

1. Extraes las órdenes de MySQL
2. En Informatica, las limpias, calculas campos derivados, las pivotás
3. Cargas el resultado ya listo a Snowflake

> **Problema**: si quieres cambiar la transformación, tienes que volver a extraer y transformar todo. Caro y lento.

## ¿Qué es ELT?

**ELT** = **E**xtract, **L**oad, **T**ransform. La versión moderna.

```
Source DB → Extract → Load → Data Lake/Warehouse (crudo)
                                       ↓
                                  [Transform inside the warehouse]
                                       ↓
                              Tablas listas para análisis
```

### Flujo paso a paso

1. **Extract**: sacar datos de la fuente
2. **Load**: cargarlos **crudos** al warehouse (Bronze layer)
3. **Transform**: hacer las transformaciones **dentro del warehouse** usando SQL (dbt)

**Tecnología moderna**: dbt, Snowflake, BigQuery, Databricks.

### Caso de uso típico

1. Extraes las órdenes de MySQL
2. Las cargas tal cual a BigQuery en una tabla `raw.orders`
3. Usando dbt, creas `staging.orders`, `marts.fct_sales` con SQL puro dentro de BigQuery

> **Ventaja**: el warehouse es masivamente potente. Las transformaciones se aprovechan de su poder. Además, conservas el dato crudo para transformaciones futuras.

## Comparación ETL vs ELT

| Característica | ETL | ELT |
|----------------|-----|-----|
| **Transformación** | Antes de cargar (engine externo) | Después de cargar (dentro del warehouse) |
| **Latencia** | Alta (cargas batch pesadas) | Baja (carga crudo, transforma en query) |
| **Costo compute** | Alto en el engine de transformación | Bajo (warehouse moderno es eficiente) |
| **Flexibilidad** | Baja (cambiar transformación = reproceso) | Alta (re-transformar sin recargar) |
| **Dato crudo** | Se pierde o se guarda aparte | Se queda en el warehouse |
| **Tecnología** | Informatica, Talend, DataStage | dbt, Snowflake, BigQuery |
| **Skill requerido** | Herramienta específica | SQL (que ya dominás) |
| **Vendor lock-in** | Alto | Bajo (SQL estándar) |

## ¿Por qué ELT ganó?

1. **Cloud warehouses son bestiales**: Snowflake, BigQuery, Redshift pueden escanear petabytes en segundos.
2. **dbt democratizó las transformaciones**: SQL + Jinja, control de versiones con Git, tests automáticos.
3. **El dato crudo tiene valor**: mañana quieres calcular algo que hoy no imaginas. Si solo guardaste el transformado, lo perdiste.
4. **Storage es barato**: `$0.02/GB/mes` en S3. No vale la pena transformar para "ahorrar espacio".

> **En 2026, ELT es el default para nuevos proyectos**. ETL sigue siendo relevante en legacy, on-premise, y casos donde necesitas transformaciones muy pesadas antes de cargar (ej. PII, datos sensibles).

## Cuándo SÍ usar ETL clásico

A pesar del dominio de ELT, hay casos válidos para ETL:

- **Compliance / PII**: necesitas anonimizar datos antes de que toquen el warehouse (ej. eliminar emails, tarjetas de crédito). El warehouse no debe ver el dato crudo.
- **Sistemas legacy**: ya tienes Informatica corriendo, migrar es carísimo.
- **Latencia ultra-baja + transformación compleja**: necesitas microsegundos y mucha lógica.
- **Destino no-warehouse**: lavas datos para alimentar una API o sistema externo que no es un warehouse.

> **Regla**: usa ELT por defecto. ETL solo cuando tienes una razón específica.

## Puntos clave

- ETL: transforma antes de cargar. ELT: carga crudo y transforma después dentro del warehouse.
- ELT ganó porque los warehouses modernos son potentes, dbt democratizó SQL, y el storage es barato.
- Mantén los datos crudos siempre accesibles: las transformaciones pueden cambiar.
- Usa ETL solo para casos especiales: PII, compliance, sistemas legacy.
