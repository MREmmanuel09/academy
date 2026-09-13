---
id: bigdata-hadoop
slug: bigdata-hadoop
title: Hadoop ecosystem: HDFS, YARN, MapReduce
module: devops
difficulty: beginner
estimatedMinutes: 7
xp: 60
---

# Hadoop ecosystem: HDFS, YARN, MapReduce

Contexto historico. Por que Hadoop importa aunque ya no se use directamente.

## Que es Hadoop?

**Hadoop** (2006) es el framework que **inicio la era Big Data** open source. Basado en los papers de Google (GFS + MapReduce), fue el primero en hacer facil correr computacion sobre petabytes en hardware commodity.

**Hoy**: esta en **retirada gradual** (deprecated en muchos vendors), reemplazado por Spark, cloud storage (S3) y servicios gestionados. Pero todo el ecosistema actual (Spark, Hive, HBase, Kafka) nacio alrededor de Hadoop. **Entenderlo es entender el por que** de las decisiones de diseno actuales.

## HDFS — el sistema de archivos distribuido

**Hadoop Distributed File System**: divide archivos grandes en bloques (default 128MB) y los replica en N nodos (default 3).

```
Cliente -> NameNode (metadata) -> DataNodes (bloques reales)
```

- **NameNode**: maestro, guarda metadata (que bloque esta donde). Es SPOF (single point of failure) en la version clasica — por eso se usan HA setups con Zookeeper.
- **DataNodes**: esclavos, guardan los bloques reales. Mueven datos entre si para re-balancear.

**Write-once, read-many**: optimizado para escribir una vez y leer muchas (es el patron tipico de jobs batch). **No** es bueno para muchos archivos pequenos.

## MapReduce — el modelo de programacion

**MapReduce** programa en dos fases:

1. **Map**: por cada input, produces 0+ pares `(clave, valor)`. Se ejecuta en paralelo en cada nodo con datos locales.
2. **Reduce**: agregas todos los valores de la misma clave. Se ejecuta despues del shuffle&sort.

```python
# Word Count clasico
def mapper(line):
    for word in line.split():
        yield (word, 1)

def reducer(word, counts):
    yield (word, sum(counts))
```

**Limitaciones**:
- Lento: escribe a disco entre cada etapa.
- Verboso: para queries simples (SELECT) se reescriben 50 lineas de Java.
- Solo batch: no sirve para streaming.

Por eso **Spark** lo reemplazo: hace lo mismo pero en memoria, 100x mas rapido.

## YARN — el resource manager

**YARN** (Yet Another Resource Negotiator) separa la gestion de recursos del modelo de programacion.

```
ResourceManager (master global)
  └── NodeManager (uno por nodo)
        └── Container (slot de CPU+RAM)
```

- **ResourceManager**: decide que aplicacion corre y donde.
- **NodeManager**: corre en cada nodo, maneja los containers.
- **ApplicationMaster**: uno por aplicacion (job), negocia recursos con el RM.

Hoy Spark puede correr sobre YARN, Kubernetes o su propio cluster manager (Standalone). **Kubernetes** gano la batalla de la orquestacion general.

## Por que Hadoop sigue vivo (en parte)

Aunque Hadoop MapReduce esta retirado, **HDFS sigue** en muchos lugares on-premise y **Hadoop como concepto** (procesar datos donde estan) es la base de todo lo que vino despues:

- **Spark** corre sobre HDFS o S3 (drop-in replacement).
- **Hive** (SQL sobre Hadoop) sigue en muchos data warehouses legacy.
- **HBase** se sigue usando para low-latency NoSQL sobre HDFS.
- **S3 + Athena + EMR** es el "Hadoop manejado" de AWS.

**Conclusion**: aprende Hadoop para entender el por que, pero enfocate en Spark, Kafka y servicios cloud.

## Puntos clave

- Hadoop (HDFS + MapReduce + YARN) inicio la era Big Data pero esta en retirada.
- HDFS divide archivos en bloques de 128MB con replica 3.
- Spark reemplazo a MapReduce por velocidad (in-memory vs disk).
