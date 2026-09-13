---
id: cost-1
slug: cost-1
title: FinOps y optimización de costos cloud
module: devops
difficulty: advanced
estimatedMinutes: 5
xp: 65
---

# FinOps y optimización de costos cloud

Cost monitoring, right-sizing, reserved instances, spot instances, FinOps culture.

## ¿Por qué FinOps importa?

El **cloud waste** promedio es 30-40%. Las empresas gastan millones en recursos subutilizados o mal configurados.

### Problemas comunes

- **Over-provisioned**: instancias EC2 con 5% CPU
- **Always-on**: dev environments 24/7
- **Untaged resources**: nadie sabe a qué equipo pertenecen
- **Orphaned volumes**: EBS sin instancia
- **Forgotten snapshots**: backups de años
- **Wrong tier**: Premium Storage cuando Standard basta

### FinOps Framework

**FinOps Foundation** (CNCF) define 3 fases:

1. **Inform**: visibilidad de costos (dashboards, allocation)
2. **Optimize**: actuar sobre los datos (right-sizing, commitments)
3. **Operate**: cultura continua, automatización, KPIs

## Estrategias de optimización

### Right-sizing

Reducir tamaño de instancias basándose en uso real.

**Herramientas**:
- AWS Compute Optimizer
- GCP Recommender
- Azure Advisor
- Vantage, CloudHealth, Spot.io (third party)

### Reserved Instances / Savings Plans

Descuento de hasta 75% a cambio de compromiso 1-3 años.

- **AWS Savings Plans**: flexible, aplica a EC2, Fargate, Lambda
- **AWS Reserved Instances**: específico por tipo
- **GCP Committed Use Discounts**
- **Azure Reserved VM Instances**

### Spot instances

Capacidad sobrante a 60-90% descuento. Pero pueden ser terminadas con 2 min notice.

Bueno para:
- Batch processing
- CI/CD runners
- Stateless workloads
- Análisis de datos
- ML training (con checkpointing)

Malo para:
- DBs stateful
- Servicios críticos 24/7

### Auto Scaling

Apaga recursos en horas de bajo uso:

```bash
# Lambda para apagar dev environments a las 7pm
aws autoscaling update-auto-scaling-group \\
  --auto-scaling-group-name dev-asg \\
  --min-size 0 \\
  --max-size 0 \\
  --desired-capacity 0
```

### Storage optimization

- S3 Intelligent-Tiering: mueve automáticamente a la tier más barata
- EBS gp3 en vez de gp2 (20% más barato, mejor performance)
- Lifecycle policies: archivar logs viejos a Glacier
- Borrar snapshots no referenciados

### Tagging strategy

Obligatorio para atribuir costos:

```
Environment: prod | staging | dev
Team: backend | frontend | data
Project: mi-app
CostCenter: 12345
Owner: juan@example.com
```

Con tags, puedes hacer **showback** (mostrar a cada equipo cuánto gasta) y **chargeback** (cobrar internamente).

## Puntos clave

- Cloud waste promedio: 30-40%. FinOps es la cultura para combatirlo.
- Right-sizing, Reserved Instances, Spot, auto-scaling son las 4 palancas.
- Spot instances: 60-90% descuento, ideal para stateless y batch.
- Tagging obligatorio para atribuir costos a equipos/proyectos.

:::quiz
[
  {
    "question": "Cuales son las 4 palancas de FinOps?",
    "options": ["Mas servidores", "Right-sizing, Reserved, Spot y auto-scaling", "Solo descuentos", "Apagar todo"],
    "correctIndex": 1,
    "explanation": "Ajusta tamano, compromete base, aprovecha sobrante y escala con demanda."
  },
  {
    "question": "Cuando convienen Spot instances?",
    "options": ["Para DBs criticas", "Stateless y batch tolerante a interrupciones (60-90% dto.)", "Nunca", "Solo en local"],
    "correctIndex": 1,
    "explanation": "Baratas porque son interrumpibles: batch, CI y stateless las aman."
  },
  {
    "question": "Por que tagging obligatorio?",
    "options": ["Burocracia", "Atribuir costo a equipos/proyectos y decidir con datos", "Estetica", "Compliance teatral"],
    "correctIndex": 1,
    "explanation": "Sin tags la factura es una caja negra y nadie optimiza lo suyo."
  }
]
:::
