---
id: bigdata-intro
slug: bigdata-intro
title: Que es Big Data? Las 5Vs
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 55
---

# Que es Big Data? Las 5Vs

Volumen, velocidad, variedad, veracidad y valor: por que el dato dejo de caber en una sola maquina.

## El problema que Big Data resuelve

Cuando un solo servidor MySQL ya no aguanta las consultas, cuando un CSV de 2GB no se puede abrir en Excel, cuando un log de clicks por segundo colapsa tu disco, **necesitas Big Data**.

Big Data no es solo "muchos datos". Es un conjunto de patrones, arquitecturas y herramientas para capturar, almacenar y analizar volumenes que no caben en una sola maquina (ni en una sola base de datos relacional tradicional).

## Las 5Vs (o 7Vs segun quien lo cuente)

### 1. **Volume** (Volumen)
Terabytes, petabytes, exabytes. Facebook genera >4 petabytes por dia. Sensores IoT, logs, transacciones.

### 2. **Velocity** (Velocidad)
Los datos llegan rapidisimo: streams de clicks, eventos de tarjetas de credito, telemetria. A veces hay que procesarlos en **milisegundos** (fraude) o **segundos** (dashboards).

### 3. **Variety** (Variedad)
Datos estructurados (tablas SQL), semi-estructurados (JSON, logs, XML) y **no estructurados** (imagenes, video, audio, texto libre).

### 4. **Veracity** (Veracidad)
De donde viene el dato? Es confiable? Tiene ruido, valores faltantes, sesgos? **Calidad > cantidad**.

### 5. **Value** (Valor)
El dato por si solo no vale. Lo que importa es el **insight** que extraes. Un PB de logs inútiles no es Big Data, es Big Cost.

## Ejemplos reales

- **Netflix**: 500B+ eventos al dia, personalizacion de portada, recomendaciones en tiempo real.
- **Uber**: matching de conductor-pasajero en <1s, 15M de trips/dia a nivel global.
- **Banco**: deteccion de fraude en transacciones en tiempo real, <50ms latencia.
- **Spotify**: 600M+ de usuarios, procesa logs de escucha para Discover Weekly.

## Stack tipico de Big Data

```
Ingestion   -> Kafka, Kinesis, Flume, NiFi
Storage     -> HDFS, S3, GCS, Hudi, Iceberg
Processing  -> Spark, Flink, Beam, MapReduce
Orchestr.   -> Airflow, Dagster, Prefect
Query       -> Hive, Trino, Presto, Spark SQL
Monitoring  -> Prometheus, Grafana, ELK
```

Estas 10 lecciones cubren las piezas mas importantes: **Spark** (el motor por excelencia), **Kafka** (el bus de datos) y **Airflow** (el orquestador).

## Puntos clave

- Big Data resuelve volumenes que no caben en una sola maquina.
- Las 5Vs: Volume, Velocity, Variety, Veracity, Value.
- El stack tipico: Kafka + Spark + Airflow + storage distribuido.

:::quiz
[
  {
    "question": "What are the 5 Vs of Big Data?",
    "options": ["Volume, Velocity, Variety, Veracity, Value", "Volume, Voltage, Variety, Veracity, Value", "Volume, Velocity, Virtual, Veracity, Value", "Volume, Velocity, Variety, Version, Value"],
    "correctIndex": 0,
    "explanation": "The 5 Vs are Volume (scale), Velocity (speed), Variety (types), Veracity (quality/trustworthiness), and Value (useful insights)."
  },
  {
    "question": "Why can't Excel handle Big Data?",
    "options": ["It doesn't support formulas", "Single machine limits — rows, memory, and processing power", "It's too expensive", "It can't connect to the internet"],
    "correctIndex": 1,
    "explanation": "Excel runs on a single machine with limited memory and row limits. Big Data requires distributed processing across multiple machines."
  },
  {
    "question": "What does 'veracity' mean in Big Data?",
    "options": ["How fast data arrives", "The quality, accuracy, and trustworthiness of the data", "The size of the dataset", "How varied the data types are"],
    "correctIndex": 1,
    "explanation": "Veracity refers to the quality and trustworthiness of data — including noise, biases, and missing values. Quality matters more than quantity."
  }
]
:::
