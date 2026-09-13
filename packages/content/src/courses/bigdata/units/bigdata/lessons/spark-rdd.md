---
id: spark-rdd
slug: spark-rdd
title: Spark RDDs: transformations, actions, lazy evaluation
module: devops
difficulty: intermediate
estimatedMinutes: 7
xp: 80
---

# Spark RDDs: transformations, actions, lazy evaluation

La API de bajo nivel de Spark. Cuándo usarla, cuándo preferir DataFrames.

## Qué es un RDD?

**RDD** (Resilient Distributed Dataset) es la API original de Spark (2012). Una colección **inmutable**, **distribuida** y **tolerante a fallos** que vive en los executors.

```python
from pyspark import SparkContext

sc = SparkContext("local[*]", "RDDExample")

# Desde una lista local
rdd = sc.parallelize([1, 2, 3, 4, 5])

# Desde un archivo
rdd = sc.textFile("s3://bucket/data.txt")

# Desde un archivo HDFS
rdd = sc.textFile("hdfs://namenode:9000/data/logs.csv")
```

### Propiedades clave

| Propiedad | Descripción |
|-----------|-------------|
| **Resilient** | Puede reconstruirse si un executor falla (recetabilidad) |
| **Distributed** | Los datos están repartidos entre múltiples nodos |
| **Dataset** | Colección de elementos particionada en paralelo |
| **Immutable** | Una vez creado, no se modifica. Crea uno nuevo con transformaciones |
| **Lazy** | Las transformaciones no se ejecutan hasta que llamas a una action |

## Transformaciones (lazy)

Las transformaciones crean un nuevo RDD a partir de uno existente. Son **lazy** — construyen un grafo de ejecución (DAG) pero no procesan datos hasta que se llama a una action.

```python
# RDD de líneas de un archivo
lines = sc.textFile("access.log")

# Transformation: filtra líneas que contienen "ERROR"
errors = lines.filter(lambda line: "ERROR" in line)

# Transformation: extrae el timestamp
timestamps = errors.map(lambda line: line.split(" ")[3])

# Transformation: cuenta errores por minuto
counts = errors.map(lambda ts: (ts[:16], 1)).reduceByKey(lambda a, b: a + b)
```

### Transformaciones principales

#### map — Aplica una función a cada elemento

```python
nums = sc.parallelize([1, 2, 3, 4])
squared = nums.map(lambda x: x ** 2)
# Resultado: [1, 4, 9, 16]
```

#### filter — Selecciona elementos que cumplen una condición

```python
evens = nums.filter(lambda x: x % 2 == 0)
# Resultado: [2, 4]
```

#### flatMap — Map + aplanar en uno solo

```python
lines = sc.parallelize(["hello world", "hi spark"])
words = lines.flatMap(lambda line: line.split(" "))
# Resultado: ["hello", "world", "hi", "spark"]
```

#### reduceByKey — Combina valores por clave (más eficiente que groupByKey)

```python
pairs = sc.parallelize([("a", 1), ("b", 2), ("a", 3)])
reduced = pairs.reduceByKey(lambda a, b: a + b)
# Resultado: [("a", 4), ("b", 2)]
```

**¿Por qué reduceByKey es mejor que groupByKey?** Reduce localmente antes del shuffle, reduciendo el tráfico de red significativamente.

#### groupByKey — Agrupa valores por clave (usar con cuidado)

```python
grouped = pairs.groupByKey()
# Resultado: [("a", [1, 3]), ("b", [2])]
# ⚠️ Carga todos los valores en memoria. Prefiere reduceByKey.
```

#### sortByKey — Ordena por clave

```python
sorted_rdd = pairs.sortByKey()
# Resultado: [("a", 1), ("a", 3), ("b", 2)]
```

#### union — Unión de dos RDDs

```python
rdd1 = sc.parallelize([1, 2, 3])
rdd2 = sc.parallelize([3, 4, 5])
union_rdd = rdd1.union(rdd2)
# Resultado: [1, 2, 3, 3, 4, 5]
```

#### distinct — Elimina duplicados

```python
rdd = sc.parallelize([1, 1, 2, 3, 3])
distinct_rdd = rdd.distinct()
# Resultado: [1, 2, 3]
```

#### join — Join por clave (inner join)

```python
users = sc.parallelize([("u1", "Ana"), ("u2", "Bob")])
scores = sc.parallelize([("u1", 95), ("u1", 87), ("u2", 78)])
joined = users.join(scores)
# Resultado: [("u1", ("Ana", 95)), ("u1", ("Ana", 87)), ("u2", ("Bob", 78))]
```

## Actions (ejecutan el DAG)

Las actions disparan la ejecución del DAG y retornan un resultado al driver o lo escriben a disco.

```python
# Recoge TODO al driver (¡cuidado con datasets grandes!)
result = counts.collect()
print(result)

# Cuenta elementos
total = counts.count()
print(f"Minutos con errores: {total}")

# Toma los primeros N elementos
first_5 = counts.take(5)
print(first_5)

# Reduce todos los elementos
total_errors = errors.count()
print(f"Total errores: {total_errors}")

# Guarda a disco
counts.saveAsTextFile("hdfs://output/errors_per_minute")
```

### Actions principales

| Action | Retorna | Descripción |
|--------|---------|-------------|
| `collect()` | Array | Trae TODO al driver. Solo para datasets pequeños |
| `count()` | Long | Número total de elementos |
| `take(n)` | Array | Primeros n elementos |
| `first()` | Any | Primer elemento |
| `reduce(func)` | Any | Agrega todos los elementos |
| `saveAsTextFile(path)` | Void | Escribe a disco (un directorio por partición) |
| `foreach(func)` | Void | Aplica una función a cada elemento (side effects) |

## Lazy evaluation y el DAG

Spark construye un **Directed Acyclic Graph** (DAG) de transformaciones. Solo ejecuta cuando encuentra una action.

```python
# Esto NO ejecuta nada — solo construye el DAG
rdd = sc.textFile("data.txt")           # Transformation 1
filtered = rdd.filter(lambda x: "err" in x)  # Transformation 2
mapped = filtered.map(lambda x: x.upper())     # Transformation 3

# Esto SÍ ejecuta todo el DAG
result = mapped.collect()  # Action → ejecuta las 3 transformaciones
```

### Por qué importa la lazy evaluation?

1. **Optimización**: Spark reorganiza el pipeline antes de ejecutar (Catalyst Optimizer)
2. **Fallo parcial**: Si falla un executor, solo re-ejecuta las transformaciones perdidas
3. **Memoria**: No materializa intermedios innecesarios

### Para forzar la ejecución

```python
# force para debugging o para materializar un resultado intermedio
filtered.cache()  # o .persist() con nivel de almacenamiento
filtered.count()  # ejecuta y cachea en memoria

# Ver el plan de ejecución
filtered.explain()
```

## PairRDD — Operaciones por clave

Cuando los elementos son tuplas `(key, value)`, Spark habilita operaciones especiales:

```python
# Crear un PairRDD
rdd = sc.parallelize([("error", "timeout"), ("info", "ok"), ("error", "500")])

# Contar por clave
rdd.countByKey()  # {'error': 2, 'info': 1}

# Agrupar valores por clave
rdd.groupByKey()  # {'error': ['timeout', '500'], 'info': ['ok']}

# Promedio por clave
rdd.mapValues(lambda v: 1).reduceByKey(lambda a, b: a + b)

# Obtener todas las claves
rdd.keys().collect()  # ['error', 'info', 'error']

# Obtener todos los valores
rdd.values().collect()  # ['timeout', 'ok', '500']
```

## Persistencia (cache)

```python
from pyspark import StorageLevel

# Cache en memoria (default)
rdd.cache()  # equivalente a persist(StorageLevel.MEMORY_ONLY)

# Cache con spill a disco si no cabe en memoria
rdd.persist(StorageLevel.MEMORY_AND_DISK)

# Liberar caché
rdd.unpersist()
```

**Cuándo cachear:**
- RDDs que usas múltiples veces (evita re-computar)
- Procesos de ML iterativos (loops de entrenamiento)
- Datos que son costosos de leer (S3, HDFS)

## RDD vs DataFrame — Cuándo usar cada uno

| RDD | DataFrame |
|-----|-----------|
| Datos no estructurados (texto crudo, logs) | Datos estructurados con schema |
| No tiene schema | Tiene schema (columnas tipadas) |
| Transformaciones funcionales (map, filter) | Transformaciones SQL-like (select, where) |
| No usa Catalyst Optimizer | Catalyst optimiza el plan de ejecución |
| Tardes más en serializar | Tardes menos (formato columnar) |
| Para preprocessing de ML custom | Para analytics y ETL estándar |

### Ejemplo comparativo

```python
# RDD: procesar logs crudos
lines = sc.textFile("access.log")
errors = lines.filter(lambda l: "404" in l)
parsed = errors.map(lambda l: {
    "ip": l.split(" ")[0],
    "path": l.split(" ")[6],
    "time": l.split(" ")[3]
})

# DataFrame: lo mismo pero con schema
from pyspark.sql import SparkSession
from pyspark.sql.functions import col

spark = SparkSession.builder.getOrCreate()
df = spark.read.json("access.json")
errors_df = df.filter(col("status") == 404)
errors_df.select("ip", "path", "timestamp")
```

**Regla general**: Si tu datos tiene schema → DataFrame. Si es texto crudo o necesitas transformaciones custom → RDD.

## Ejemplo práctico: Word Count

```python
from pyspark import SparkContext

sc = SparkContext("local[*]", "WordCount")

# Leer archivo
lines = sc.textFile("book.txt")

# Contar palabras
word_counts = (
    lines
    .flatMap(lambda line: line.split(" "))     # Dividir en palabras
    .map(lambda word: (word.lower(), 1))       # Par (palabra, 1)
    .reduceByKey(lambda a, b: a + b)           # Sumar por palabra
    .sortBy(lambda x: -x[1])                   # Ordenar descendente
)

# Mostrar top 10
for word, count in word_counts.take(10):
    print(f"{word}: {count}")

sc.stop()
```

## Puntos clave

- RDD es la primitiva fundamental de Spark. Transformations son lazy, actions ejecutan el DAG.
- `map`, `filter`, `flatMap` son transformations. `collect`, `count`, `reduce`, `saveAsTextFile` son actions.
- RDDs son tipados pero no tienen schema. Para datos estructurados, usa DataFrames.
- Spark decide el plan de ejecución optimo via Catalyst Optimizer en DataFrames, no en RDDs.
- Usa `cache()` o `persist()` cuando reutilices un RDD múltiples veces.
- Prefiere `reduceByKey` sobre `groupByKey` — reduce localmente antes del shuffle.
