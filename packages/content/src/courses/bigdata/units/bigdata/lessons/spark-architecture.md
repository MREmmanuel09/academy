---
id: spark-architecture
slug: spark-architecture
title: Apache Spark: arquitectura (Driver, Executors, DAG)
module: devops
difficulty: intermediate
estimatedMinutes: 7
xp: 85
---

# Apache Spark: arquitectura (Driver, Executors, DAG)

Como Spark ejecuta tu codigo en un cluster. Driver, Executors, Cluster Manager y el DAG scheduler.

## Que es Apache Spark?

**Spark** es un motor de procesamiento distribuido **in-memory**. Corre 100x mas rapido que MapReduce para muchas cargas porque mantiene datos en RAM entre etapas en vez de escribir a disco.

**Usos tipicos**:
- ETL masivo (terabytes de logs)
- ML a escala (MLlib)
- SQL interactivo (Spark SQL)
- Streaming (Structured Streaming)
- Procesamiento de grafos (GraphX, GraphFrames)

## Componentes del cluster

### Driver
- Corre tu `main()`.
- Construye el **DAG** de operaciones.
- Coordina los executors.
- Es UNO solo (puede ser SPOF si no usas HA).

### Executors
- Procesos JVM en los **workers**.
- Ejecutan tasks y guardan datos **en memoria**.
- Viven toda la duracion del job (a diferencia de MapReduce, donde cada task es un proceso nuevo).

### Cluster Manager
- Asigna recursos (CPU+RAM) al driver y a los executors.
- Opciones: **Standalone** (incluido en Spark), **YARN** (Hadoop), **Kubernetes**, **Mesos** (deprecated).

```
spark-submit --master k8s://... --num-executors 10 --executor-memory 4g app.py
```

## El DAG scheduler: como Spark optimiza

Cuando llamas `df.filter().groupBy().agg()`, Spark no ejecuta nada. Solo construye un **DAG** (Directed Acyclic Graph) de stages y tasks.

**Optimizaciones que hace**:
- **Predicate pushdown**: empuja el `WHERE` cerca de la fuente.
- **Column pruning**: solo lee las columnas necesarias (en Parquet/ORC).
- **Constant folding**: evalua expresiones constantes en compile time.
- **Pipelining**: fusiona operaciones narrow (map, filter) en un solo stage.

Cuando llamas una **action** (`collect`, `count`, `write`), Spark:
1. Optimiza el DAG (Catalyst optimizer).
2. Lo parte en **stages** separados por **shuffles** (operaciones que mueven datos entre nodos, como `groupByKey`).
3. Cada stage en **tasks** paralelas.
4. Ejecuta task por task en los executors.

## Conceptos clave: partitions, tasks, shuffles

### Partition
- Unidad minima de paralelismo. Un DataFrame de 1TB puede tener 1000 particiones de 1GB cada una.
- `spark.sql.shuffle.partitions` (default 200) controla cuantas particiones se crean tras un shuffle.

### Task
- Una unidad de trabajo que corre en un executor. Una task procesa una particion.

### Shuffle
- Cuando Spark tiene que mover datos entre nodos (ej. `groupBy` en cluster mode). **ES LO MAS CARO**. Disco + red.
- Minimiza shuffles: usa `reduceByKey` en vez de `groupByKey`, `join` con bucket sort.

```python
# MAL: groupByKey trae todos los valores al driver antes de reducir
rdd.groupByKey().mapValues(sum)

# BIEN: reduceByKey combina en el mismo executor antes del shuffle
rdd.reduceByKey(lambda a, b: a + b)
```

## Catalyst y Tungsten

**Catalyst**: el optimizador de queries de Spark SQL. Reescribe tu query para que sea mas eficiente (reglas logicas + cost-based).

**Tungsten**: el backend de ejecucion. Genera codigo bytecode optimizado (similar a una base de datos columnar), usa off-heap memory, y minimiza GC pressure.

**Juntos**: hacen que Spark SQL sea casi tan rapido como una DB columnar especializada (Impala, ClickHouse) para queries analiticas.

## Puntos clave

- Driver construye el DAG, executors ejecutan tasks, Cluster Manager asigna recursos.
- Spark hace lazy evaluation: solo ejecuta cuando hay una action.
- Shuffles son lo mas caro: minimiza groupByKey, prefiere reduceByKey.

:::quiz
[
  {
    "question": "What is the Driver in Apache Spark?",
    "options": ["A worker node that processes data", "The program that runs main(), builds the DAG, and coordinates executors", "The cluster manager that assigns resources", "A storage layer for intermediate results"],
    "correctIndex": 1,
    "explanation": "The Driver runs your main() function, constructs the DAG of operations, and coordinates the executors across the cluster."
  },
  {
    "question": "What are Executors in Spark?",
    "options": ["The main entry point of the application", "Worker processes on nodes that execute tasks and store data in memory", "A type of cluster manager", "Network interfaces between nodes"],
    "correctIndex": 1,
    "explanation": "Executors are JVM processes running on worker nodes. They execute tasks, store data in memory, and live for the duration of the job."
  },
  {
    "question": "Why is Spark faster than MapReduce?",
    "options": ["It uses fewer nodes", "It processes data in-memory between stages instead of writing to disk", "It uses a different programming language", "It doesn't support parallel processing"],
    "correctIndex": 1,
    "explanation": "Spark keeps data in RAM between processing stages (in-memory processing), avoiding the expensive disk I/O that MapReduce requires between each step."
  }
]
:::
