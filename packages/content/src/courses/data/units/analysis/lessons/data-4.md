---
id: data-4
slug: data-4
title: Formatos de datos: CSV, JSON, Parquet, ORC, Avro, XML
module: devops
difficulty: intermediate
estimatedMinutes: 7
xp: 65
---

# Formatos de datos: CSV, JSON, Parquet, ORC, Avro, XML

Comparación de formatos. Cuándo usar cada uno. Row-based vs columnar.

## Row-based vs Columnar

Hay dos familias de formatos y la diferencia es **enorme** en performance.

### Row-based (orientado a filas)
Guarda todos los campos de una fila juntos.
```
id=1, nombre="Ana",   edad=30, ciudad="Lima"
id=2, nombre="Luis",  edad=25, ciudad="Bogotá"
id=3, nombre="Marta", edad=40, ciudad="CDMX"
```
**Bueno para**: escribir fila por fila, leer filas completas, OLTP.
**Formatos**: CSV, JSON, Avro, XML.

### Columnar (orientado a columnas)
Guarda todos los valores de una columna juntos.
```
id:      [1, 2, 3]
nombre:  ["Ana", "Luis", "Marta"]
edad:    [30, 25, 40]
ciudad:  ["Lima", "Bogotá", "CDMX"]
```
**Bueno para**: queries analíticas que solo leen algunas columnas, agregaciones, compresión.
**Formatos**: Parquet, ORC.

> **Regla de oro**: CSV para intercambio, Parquet para análisis.

## CSV (Comma-Separated Values)

El formato más simple y universal. Texto plano, una fila por línea, campos separados por coma.

```csv
id,name,age,city
1,Ana,30,Lima
2,Luis,25,Bogota
3,Marta,40,CDMX
```

### Pros
- **Universal**: Excel, Google Sheets, todas las herramientas lo abren
- **Humano**: puedes leerlo en un editor de texto
- **Simple**: cualquier lenguaje lo parsea

### Contras
- **Sin tipos**: todo es texto. `"30"` vs `30` es ambiguo
- **Sin esquema**: no sabes qué columnas esperar
- **Ineficiente**: cada fila repite los nombres de columnas
- **Comas en datos**: hay que escapar (`"Marta, Jr."`) o usar delimitadores raros (TSV, pipe)

> **Cuándo usar CSV**: intercambio entre sistemas, archivos pequeños, humanos que necesitan leerlo.

## JSON (JavaScript Object Notation)

El formato estándar de APIs web. Anidado, flexible, jerárquico.

```json
{
  "id": 1,
  "name": "Ana",
  "orders": [
    {"id": 101, "total": 99.50},
    {"id": 102, "total": 45.00}
  ]
}
```

### Variantes para datos
- **JSON Lines (jsonl)**: un JSON por línea, ideal para streaming
- **NDJSON**: igual que jsonl, otro nombre
- **JSONB** (PostgreSQL): binario, indexable, más eficiente

### Pros
- Jerárquico, soporta anidación
- Estándar de facto en APIs
- Flexible: cada objeto puede tener campos distintos

### Contras
- Verboso: repite keys en cada objeto
- Más pesado que formatos binarios
- Sin comentarios, sin trailing commas (estricto)

> **Cuándo usar JSON**: APIs, configs, datos semi-estructurados, logs modernos.

## Parquet y ORC (columnar binarios)

Los reyes del big data analítico. Binarios, columnares, comprimidos.

### Parquet
- Creado por Cloudera y Twitter
- Estándar en Spark, Hadoop, AWS (Athena, Redshift Spectrum)
- Compresión excelente: 10x más pequeño que CSV
- Lee solo las columnas que necesitas (predicate pushdown)

### ORC (Optimized Row Columnar)
- Creado por Hortonworks
- Estándar en Hive
- Similar a Parquet, ligeramente más rápido para escritura

```python
# Pandas → Parquet
import pandas as pd
df = pd.read_csv("data.csv")
df.to_parquet("data.parquet")

# PyArrow directo (más control)
import pyarrow as pa
import pyarrow.parquet as pq
table = pa.Table.from_pandas(df)
pq.write_table(table, "data.parquet")
```

### Comparación de tamaño
| Formato | Tamaño (1M filas) | Tiempo query |
|---------|-------------------|--------------|
| CSV | 100 MB | 30s |
| JSON | 250 MB | 45s |
| Parquet | 15 MB | 0.5s |
| ORC | 17 MB | 0.7s |

> **Cuándo usar Parquet/ORC**: data lakes, data warehouses, análisis sobre grandes volúmenes.

## Avro y XML (legacy / específicos)

### Avro
- Formato binario con **schema embebido** (en JSON)
- Estándar de Kafka para serialización
- Ideal para escribir datos en streaming
- Soporta evolución de schema sin romper consumidores

```json

{"type": "record", "name": "User", "fields": [
  {"name": "id", "type": "int"},
  {"name": "name", "type": "string"}
]}
```

### XML (eXtensible Markup Language)
- Anterior a JSON, sigue vivo en legacy y enterprise (SOAP, SVG, configs)
- Más verboso que JSON
- Soporta namespaces, atributos, mixed content

```xml
<user id="1">
  <name>Ana</name>
  <age>30</age>
</user>
```

> **Regla moderna**: usa Avro en Kafka, Parquet en el lake, JSON en APIs, CSV solo para intercambio.

## Puntos clave

- Row-based (CSV, JSON) es bueno para escribir fila por fila; columnar (Parquet, ORC) para análisis.
- Parquet es el rey de data lakes: comprimido, columnar, predicate pushdown.
- Avro es el estándar en Kafka por su schema embebido y evolución.
- JSON anida, CSV es plano, XML es verboso. Usa cada uno en su contexto.
