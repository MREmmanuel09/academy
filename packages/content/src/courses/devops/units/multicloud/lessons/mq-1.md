---
id: mq-1
slug: mq-1
title: Message Queues: Kafka, RabbitMQ, NATS
module: devops
difficulty: advanced
estimatedMinutes: 10
xp: 95
---

# Message Queues: Kafka, RabbitMQ, NATS

Colas de mensajes, event streaming, pub/sub, garantias de entrega, cuando usar cada uno.

## Que es una message queue y por que la necesitas

Una **message queue** es un sistema que recibe mensajes de producers y los entrega a consumers, desacoplando los dos.

### Por que la necesitas

**Sin message queue**:
```
[API] -> [Database]  # si la DB esta lenta, la API se cuelga
[API] -> [Email Service]  # si Email esta caido, falla el checkout
```

**Con message queue**:
```
[API] -> [Queue] -> [Email Service]  # API responde rapido, email se procesa async
[API] -> [Queue] -> [Analytics]     # multiple consumers
```

### Garantias de entrega

- **At-most-once**: el mensaje se entrega 0 o 1 vez. Puede perderse. Rapido.
- **At-least-once**: el mensaje se entrega al menos 1 vez. Puede duplicarse. El consumer debe ser **idempotente**.
- **Exactly-once**: el mensaje se entrega exactamente 1 vez. Dificil de lograr, requiere coordination (transacciones distribuidas, idempotent producers, dedup). Kafka soporta con transactions.

### Patrones comunes

- **Pub/Sub**: un mensaje va a multiples consumers (fan-out)
- **Work queue**: multiples workers compiten por mensajes (load balancing)
- **Request-Reply**: con correlation ID para saber que response es de que request
- **Dead Letter Queue (DLQ)**: mensajes que fallaron N veces van a una cola aparte para analisis
- **Sagas**: secuencia de operaciones distribuidas con compensaciones (vs transacciones ACID)

## Apache Kafka: el event store

**Apache Kafka** (creado por Jay Kreps, Neha Narkhede, y Jun Rao en LinkedIn, 2011, ahora en la Apache Software Foundation) es la plataforma de event streaming mas usada. La usan LinkedIn, Uber, Netflix, Airbnb, y la mayoria de empresas grandes.

### Conceptos clave

- **Topic**: categoria de mensajes (orders, payments, logs)
- **Partition**: subdivision de un topic para paralelismo. **Orden garantizado solo dentro de una partition**.
- **Offset**: posicion de un mensaje en una partition. Consumer lo maneja.
- **Broker**: servidor Kafka. Cluster = N brokers.
- **Consumer group**: grupo de consumers que se reparten las partitions.
- **Producer**: publica mensajes a un topic.
- **Consumer**: lee mensajes de un topic.

### Retention

Kafka NO borra mensajes al consumirlos. Retiene por tiempo (7 dias default) o tamano. Esto permite:
- Re-procesar mensajes cambiando el offset
- Multiples consumers leen el mismo stream
- Compliance / audit (replay transacciones)

### Garantias

- **Ack**: cuando un consumer hace commit del offset, ese mensaje se considera procesado
- **Replication factor**: cada partition se replica en N brokers (RF=3 tipico)
- **min.insync.replicas**: minimo de replicas sincronizadas para aceptar un write
- **Idempotent producer**: el mismo mensaje enviado 2 veces resulta en 1 (evita duplicados por retry)

### Kafka no es para todo

- **NO usar para**: queries ad-hoc, OLAP, full-text search. Para eso: ClickHouse, Druid, Elasticsearch.
- **Usar para**: event sourcing, log aggregation, stream processing, message broker, change data capture (CDC).

### Comandos esenciales

```bash
# Listar topics
kafka-topics.sh --bootstrap-server localhost:9092 --list

# Crear topic
kafka-topics.sh --bootstrap-server localhost:9092 \\
  --create --topic orders --partitions 3 --replication-factor 2

# Consumir desde el inicio
kafka-console-consumer.sh --bootstrap-server localhost:9092 \\
  --topic orders --from-beginning

# Produccion
kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders
> {"orderId": 1, "amount": 100}
> {"orderId": 2, "amount": 200}
```

## RabbitMQ y NATS: alternativas

### RabbitMQ

**RabbitMQ** (escrito en Erlang, 2007, originalmente por LShift y CohesiveFT, ahora en Pivotal/VMware) es el message broker tradicional mas popular. Implementa AMQP 0-9-1.

**Fortalezas**:
- **Smart routing**: exchanges de tipo direct, topic, fanout, headers
- **Dead letter queues**: mensajes fallidos van a otra cola
- **Quorum queues**: replicacion Raft (HA fuerte)
- **Management UI**: web UI incluida

```bash
# Declarar exchange y queue
rabbitmqadmin declare exchange name=orders type=topic
rabbitmqadmin declare queue name=orders-q durable=true
rabbitmqadmin declare binding source=orders destination=orders-q routing_key="order.*"

# Publicar
rabbitmqadmin publish exchange=orders routing_key="order.created" payload='{"id":1}'

# Consumir
rabbitmqadmin get queue=orders-q count=5
```

**Usar para**: tareas async, RPC patterns, integracion enterprise, cuando necesitas routing complejo.

### NATS

**NATS** (2010, Derek Collison, ex-Apcera, ex-TIBCO, ex-CloudFoundry) es un sistema de mensajeria cloud-native, ligero, y muy rapido. Reune lo mejor de Redis (simpleza), Kafka (pub/sub), y MQTT (IoT).

**Caracteristicas**:
- Subject-based addressing (como topics de Kafka pero jerarquico)
- At-most-once, at-least-once, exactly-once
- **JetStream**: persistencia opcional (como mini-Kafka)
- **Leaf nodes**: mensajeria edge-to-cloud
- **Request-Reply**: built-in
- Multi-tenancy

```bash
# Publicar
nats pub orders.created '{"id": 1, "amount": 100}'

# Suscribirse
nats sub 'orders.>'

# Request-Reply
nats req users.lookup '{"id": 123}'
```

**Usar para**: microservicios cloud-native, edge computing, IoT, low-latency pub/sub.

### Cuando usar cada uno

| Caso | Recomendacion |
|------|---------------|
| Event sourcing, log aggregation, multiples consumers | **Kafka** |
| Tareas async, RPC, integracion enterprise, routing complejo | **RabbitMQ** |
| Microservicios cloud-native, edge, baja latencia | **NATS** |
| Streaming + processing real-time (Kafka + Flink/Spark) | **Kafka** |
| Simple, rapido, ligero (< 1MB) | **NATS** |

## Puntos clave

- Message queue desacopla producers y consumers, haciendo sistemas mas resilientes.
- 3 garantias: at-most-once (rapido, puede perder), at-least-once (duplicados posibles), exactly-once (complejo).
- Kafka = event store persistente (LinkedIn, 2011), ideal para event sourcing y multiples consumers.
- RabbitMQ = AMQP con routing complejo, ideal para tareas async enterprise. NATS = cloud-native, low-latency.

:::quiz
[
  {
    "question": "Por que una cola entre servicios?",
    "options": ["Para ir mas lento", "Desacoplo: picos absorbidos, reintentos y consumidores independientes", "Para gastar mas", "No sirve"],
    "correctIndex": 1,
    "explanation": "Productor y consumidor evolucionan y escalan por separado; nada se pierde en picos."
  },
  {
    "question": "At-most-once frente a at-least-once?",
    "options": ["Iguales", "At-most: rapido, puede perder; at-least: no pierde pero puede duplicar", "At-most es mejor siempre", "Nadie los usa"],
    "correctIndex": 1,
    "explanation": "Elige segun tolerancia: metrica descartable vs pago que exige idempotencia."
  },
  {
    "question": "Kafka frente a RabbitMQ?",
    "options": ["Iguales", "Kafka = event store persistente para event sourcing; RabbitMQ = routing AMQP para tareas", "Kafka es mas viejo", "RabbitMQ no persiste"],
    "correctIndex": 1,
    "explanation": "Kafka guarda el log para multiples consumers; RabbitMQ rutea mensajes entre colas."
  }
]
:::
