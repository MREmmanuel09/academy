---
id: mc-1
slug: mc-1
title: Multi-cloud: AWS vs GCP vs Azure comparativa honesta
module: devops
difficulty: advanced
estimatedMinutes: 10
xp: 100
---

# Multi-cloud: AWS vs GCP vs Azure comparativa honesta

Comparativa real de los 3 hyperscalers: servicios equivalentes, pricing, fortalezas, cuando usar cada uno.

## Los 3 hyperscalers: contexto

**AWS** (Amazon, 2006, Jeff Bezos) es el mas viejo y mas grande. **Azure** (Microsoft, 2010, Satya Nadella) es el segundo, con fuerte integracion con el ecosistema Microsoft. **GCP** (Google, 2008, Eric Schmidt como CEO) es el tercero, pero a menudo el mas tecnicamente avanzado.

> **Dato curioso**: GCP nacio en 2008 con App Engine (PaaS), antes que EC2 de AWS. Google llevaba 10 anos operando la infra mas grande del mundo (busqueda, YouTube, Gmail) y ofrecio App Engine como servicio.

### Cuota de mercado (Q1 2024, Synergy Research)

- **AWS**: ~31% (~$90B ARR)
- **Azure**: ~25% (~$60B ARR)
- **GCP**: ~11% (~$35B ARR)
- Otros (Alibaba, Oracle, IBM, Tencent): ~33%

AWS sigue dominando pero Azure crece mas rapido, especialmente en enterprise. GCP es mas fuerte en startups tecnicas, data engineering (BigQuery), y machine learning.

## Servicios equivalentes

### Compute

| Servicio | AWS | Azure | GCP |
|----------|-----|-------|-----|
| VMs IaaS | EC2 | Virtual Machines | Compute Engine |
| Containers serverless | Fargate | Container Instances | Cloud Run |
| Kubernetes managed | EKS | AKS | GKE |
| Functions (serverless) | Lambda | Azure Functions | Cloud Functions |
| VMs pre-built ML | EC2 DL1 | ND A100 | A2 (TPU) |

### Storage

| Servicio | AWS | Azure | GCP |
|----------|-----|-------|-----|
| Object storage | S3 | Blob Storage | Cloud Storage |
| Block storage | EBS | Managed Disks | Persistent Disk |
| File storage | EFS | Azure Files | Filestore |
| Archive | S3 Glacier | Archive Storage | Coldline |

### Database

| Servicio | AWS | Azure | GCP |
|----------|-----|-------|-----|
| Relational | RDS, Aurora | Azure SQL | Cloud SQL, Cloud Spanner |
| NoSQL key-value | DynamoDB | Cosmos DB | Firestore, Bigtable |
| Data warehouse | Redshift | Synapse | **BigQuery** (lider) |
| In-memory cache | ElastiCache (Redis) | Cache for Redis | Memorystore |

### Networking

- **AWS VPC** = **Azure VNet** = **GCP VPC** (similares en concepto, diferentes APIs)
- **AWS Direct Connect** = **Azure ExpressRoute** = **GCP Cloud Interconnect** (conexion dedicada)
- **AWS Route 53** = **Azure DNS** = **GCP Cloud DNS** (DNS)

### Serverless y eventos

- **AWS Lambda** + SQS/SNS/EventBridge (lider del mercado, ~15 anos de madurez)
- **Azure Functions** + Service Bus / Event Grid (integrado con Logic Apps)
- **GCP Cloud Functions** + Pub/Sub (Pub/Sub es excelente, mejor que SQS para fan-out)

## Pricing: la verdad incomoda

### Pricing models

Los 3 hyperscalers cobran de forma similar pero con trucos diferentes:

**AWS**: el mas caro en egress (transferencia de datos OUT), pero descuento aggressive con **Savings Plans** (hasta 72% en EC2). Free tier limitado.

**Azure**: descuentos por **Reserved Instances** (1-3 anos) y **Hybrid Benefit** (reusar licencias Windows Server on-prem). Enterprise Agreement = aun mas descuento pero lock-in.

**GCP**: **Sustained Use Discounts automaticos** (sin compromiso, hasta 30% off por uso continuo) y **Committed Use Discounts** (hasta 55% por 1-3 anos). **BigQuery** es el mas barato del mercado.

### Comparativa de un workload tipico

Ejemplo: app web con 2 vCPUs, 8GB RAM, 100GB SSD, 1TB egress/mes, 24/7.

| Cloud | Compute | Storage | Egress | Total/mes |
|-------|---------|---------|--------|-----------|
| AWS (t3.large + EBS gp3) | $62 | $10 | $90 | **~$162** |
| Azure (B2s + Premium SSD) | $60 | estimatedMinutes: 5 | $87 | **~$162** |
| GCP (n2-standard-2 + pd-ssd) | $52 | estimatedMinutes: 7 | $80-120 (tiered) | **~estimatedMinutes: 50** |

> **Regla de oro**: **el costo real esta en los egress fees y los servicios de datos** (Redshift, BigQuery, Athena, S3 queries). El compute es similar.

### Free tiers

- **AWS**: 12 meses free (EC2 micro, S3 5GB, RDS 750h)
- **Azure**: 12 meses + servicios siempre free (Functions 1M requests, Cosmos DB 400 RUs)
- **GCP**: $300 creditos en 90 dias + always free tier generoso (Cloud Run 2M requests, BigQuery 1TB queries/mes, Cloud Functions 2M invocations)

> GCP siempre ha tenido el mejor free tier, especialmente para data.

## Cuando usar cada uno: decision real

### Elige **AWS** si:

- Ya tienes inversion significativa en AWS
- Necesitas el catalogo mas amplio (200+ servicios)
- Tu equipo tiene experiencia en AWS
- Necesitas regiones en muchos paises (AWS tiene 33+ regiones)
- Workloads de alta fiabilidad (AWS tiene 10+ anos de madurez)

### Elige **Azure** si:

- Tu empresa usa Microsoft (Windows Server, Active Directory, Office 365, .NET)
- Quieres hybrid cloud (on-prem + cloud con integracion nativa)
- Necesitas certificaciones enterprise (Azure tiene mejor adoption en Fortune 500)
- Tu industria es regulada (healthcare, finance, government): Azure tiene mas compliance certs

### Elige **GCP** si:

- **Data engineering / analytics**: BigQuery es el data warehouse mas avanzado y barato
- **Machine Learning**: Vertex AI + TPUs son superiores
- **Kubernetes puro**: GKE fue el primer managed K8s, sigue siendo el mas completo
- **Open source first**: GCP fue pioner en dar managed services de open source (Redis, Kafka, Postgres)
- **Networking global**: la red de Google (la misma que usa Search/YouTube) es superior
- **Startup tecnica**: muchas startups tech-first eligen GCP

### El consejo real (lo que nadie dice)

> **Evita multi-cloud por multi-cloud**. Multi-cloud es COMPLEJO: 2x de complejidad operacional, 2x de skills, 2x de costos (egress entre clouds). Solo vale la pena para:
>
> 1. **DR (Disaster Recovery)**: tener backup en otra region de otro provider (raro pero existe)
> 2. **Evitar lock-in**: estrategia comercial (mas facil decirlo que hacerlo)
> 3. **Best-of-breed**: usar BigQuery de GCP para analytics + el resto en AWS
> 4. **Adquisiciones**: cuando compras una empresa que ya estaba en otro cloud
>
> El 95% de empresas deberia estar en UN solo cloud. Si tu CTO dice "vamos multi-cloud", que tenga un plan de egress, de IAM, de observabilidad跨云, y de costos 2x.

### Certificaciones y formacion

- **AWS**: Cloud Practitioner, SAA (Associate), Professional, Specialty (Security, ML, etc)
- **Azure**: AZ-900 (fundamentals), AZ-104 (admin), AZ-305 (architect)
- **GCP**: Cloud Digital Leader, ACE (Associate Cloud Engineer), PCA (Professional Cloud Architect)

AWS tiene el mercado de certificaciones mas grande. Azure es fuerte en enterprise. GCP es mas pequeno pero las certificaciones son bien valoradas.

## Puntos clave

- AWS es el mas grande y veterano. Azure es fuerte en enterprise Microsoft. GCP es lider en data/ML.
- BigQuery (GCP) es el data warehouse mas avanzado y barato. Lambda (AWS) es el serverless mas maduro.
- Los 3 cobran similar en compute; la diferencia real esta en egress y servicios de datos.
- 95% de empresas deberia estar en UN solo cloud. Multi-cloud es 2x complejidad operacional.

:::quiz
[
  {
    "question": "Donde estan las diferencias reales de precio entre clouds?",
    "options": ["En compute, enormes", "En egress y servicios de datos; compute similar", "No hay diferencias", "Solo en soporte"],
    "correctIndex": 1,
    "explanation": "Sacar datos (egress) y data warehouses caros pesan mas que la VM."
  },
  {
    "question": "Cuando tiene sentido multi-cloud?",
    "options": ["Siempre", "Casi nunca: 2x complejidad; un cloud bien usado gana para el 95%", "Para ahorrar siempre", "Por moda"],
    "correctIndex": 1,
    "explanation": "Solo con motivos fuertes (regulatorios, adquisiciones, negociacion real)."
  },
  {
    "question": "Ejemplo de fortaleza diferencial?",
    "options": ["Todo igual", "BigQuery (GCP) en warehouse, Lambda (AWS) en serverless maduro", "Ninguna", "Solo marketing"],
    "correctIndex": 1,
    "explanation": "Conoce el mejor de cada uno aunque operes en uno solo."
  }
]
:::
