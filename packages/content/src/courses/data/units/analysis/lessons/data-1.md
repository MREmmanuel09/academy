---
id: data-1
slug: data-1
title: ¿Qué es data? Tipos y características
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# ¿Qué es data? Tipos y características

Definición de dato, información y conocimiento. Tipos de datos: estructurados, semi y no estructurados.

## Dato vs Información vs Conocimiento

En el mundo de los datos es importante distinguir tres conceptos que se confunden constantemente.

**Dato**: un hecho crudo, sin contexto. Por sí solo no dice mucho.
- `42`, `"Guatemala"`, `true`, `2026-01-15`

**Información**: dato + contexto. Ya tiene significado.
- `42°C`, `"Guatemala"` con la columna `país`, `true` con la columna `activo`

**Conocimiento**: información aplicada, patrones y reglas que permiten decidir.
- `"La temperatura óptima para servidores es entre 18-27°C"`

> En Data Analytics trabajamos principalmente con **datos** y los convertimos en **información** útil para tomar decisiones.

## Los 3 tipos de datos

### 1. Datos estructurados

Tienen un esquema definido, generalmente tabulares (filas y columnas). Son los más fáciles de consultar.

**Ejemplos**:
- Tablas de bases de datos relacionales (PostgreSQL, MySQL)
- Archivos CSV
- Spreadsheets
- Logs en formato fijo

```
id | nombre     | precio | categoria
1  | Laptop Pro | 1299.99| Electronics
2  | Coffee Mk  | 89.50  | Appliances
```

### 2. Datos semi-estructurados

No siguen un esquema rígido pero tienen tags o marcadores que los organizan.

**Ejemplos**:
- JSON
- XML
- YAML
- Logs en formato JSON
- Emails (asunto, remitente, cuerpo)

```json
{
  "user_id": 1,
  "name": "Ana",
  "orders": [
    {"id": 101, "total": 1299.99}
  ]
}
```

### 3. Datos no estructurados

No tienen esquema. Son el ~80-90% de los datos que generamos.

**Ejemplos**:
- Texto libre (documentos, posts, comentarios)
- Imágenes y video
- Audio
- PDFs
- Código fuente

> **Dato curioso**: el 80% del trabajo de un data engineer es **transformar datos no/semi-estructurados en estructurados** para poder analizarlos.

## Características del dato: las 5V

El **modelo de las 5V** describe las propiedades clave de un dataset:

### 1. Volume (Volumen)
Cuántos datos tenemos. Terabytes, petabytes, exabytes.
- Twitter genera ~500M tweets/día
- Google procesa ~8.5B búsquedas/día

### 2. Velocity (Velocidad)
Qué tan rápido se generan y se necesitan procesar.
- Streaming en tiempo real (sensores IoT, trading)
- Batch (procesamiento nocturno, reportes)

### 3. Variety (Variedad)
Qué tan diversos son los formatos y fuentes.
- Logs + imágenes + JSON + CSV + APIs

### 4. Veracity (Veracidad)
Qué tan confiables y limpios son los datos.
- Datos con errores, nulos, duplicados
- Datos de fuentes poco confiables

### 5. Value (Valor)
Qué tan útiles son para el negocio. Sin valor, todo lo anterior no importa.

> Las 5V definen los **requisitos no funcionales** de tu pipeline de datos. Si tu dataset es enorme (Volume) y rápido (Velocity), no puedes usar Excel.

## Puntos clave

- Dato es un hecho crudo; información es dato con contexto; conocimiento es información aplicada.
- Los datos se clasifican en estructurados, semi-estructurados y no estructurados.
- El modelo de las 5V (Volume, Velocity, Variety, Veracity, Value) define los requisitos del pipeline.
- ~80-90% de los datos son no estructurados. Transformarlos es el trabajo principal de un data engineer.
