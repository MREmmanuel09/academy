# Pipeline ETL de Big Data

## Contexto

Una plataforma de e-commerce procesa transacciones 24/7. Los datos llegan como JSON por Kafka con un volumen de ~10GB/dia. El equipo de BI necesita reportes actualizados cada 5 minutos para tomar decisiones en tiempo real.

## Arquitectura

```
[App Transacciones] --> [Kafka] --> [Spark Streaming] --> [Parquet/S3] --> [PostgreSQL] --> [Grafana]
                                                |
                                         [Alertas Fraude]
```

## Componentes

1. **Ingesta (Kafka)**: Productor que serializa transacciones JSON con schema registry
2. **Procesamiento (Spark Streaming)**: Job que lee en micro-batches de 30s, aplica ventana de 5min
3. **Almacenamiento**: Parquet particionado por fecha/hora para consultas eficientes
4. **Analisis**: Queries SQL sobre los datos procesados
5. **Visualizacion**: Dashboard con metricas en tiempo real

## Metricas Clave

- Throughput: transacciones/segundo
- Latencia: tiempo desde ingesta hasta disponibilidad
- Alertas: transacciones con patrones anomalos
