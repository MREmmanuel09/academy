---
id: proj-streaming-pipeline
title: Real-time streaming pipeline con Kafka + Spark
difficulty: senior
duration: 5 semanas
xp: 1500
---

# Real-time streaming pipeline con Kafka + Spark

## Escenario

Una fintech procesa 100K eventos/segundo de transacciones financieras. Necesitan:
- Ingesta en tiempo real con menos de 100ms de latencia
- Detección de fraude en tiempo real (<50ms desde la transacción)
- Dashboard operativo con métricas en vivo
- Almacenamiento histórico para análisis batch

## Arquitectura

```
[Mobile App] ──▶ [API Gateway] ──▶ [Kafka Producers]
                                         │
                    ┌────────────────────┤
                    ▼                    ▼
             ┌────────────┐      ┌────────────┐
             │ Kafka      │      │ Kafka      │
             │ Broker 1   │      │ Broker 2   │
             └─────┬──────┘      └──────┬─────┘
                   │                     │
                   ▼                     ▼
             ┌─────────────────────────────────┐
             │      Spark Structured Streaming  │
             │  (micro-batches de 10 segundos)  │
             └───────────────┬─────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ PostgreSQL│  │ Redis    │  │ S3/Parquet│
        │ (metadata)│  │ (cache)  │  │ (history) │
        └──────────┘  └──────────┘  └──────────┘
              │              │
              ▼              ▼
        ┌──────────────────────────┐
        │     Grafana Dashboard    │
        └──────────────────────────┘
```

## Componentes

1. **Kafka Cluster** (3 brokers): Schema Registry para validación de esquemas
2. **Spark Streaming**: Procesa micro-batches, ventanas de 1 minuto para agregaciones
3. **Fraud Detection Engine**: Reglas + ML scoring en cada transacción
4. **PostgreSQL**: Metadata de transacciones y usuarios
5. **Redis**: Cache de resultados recientes para consultas rápidas
6. **S3/Parquet**: Almacenamiento histórico particionado por fecha
7. **Grafana**: Dashboard con throughput, latencia, alertas de fraude

## Métricas Clave

| Métrica | Target |
|---------|--------|
| Throughput | 100K eventos/segundo |
| Latencia ingesta | <100ms |
| Latencia detección fraude | <50ms |
| Disponibilidad | 99.95% |
| Datos procesados/día | ~8.6 billones de eventos |
