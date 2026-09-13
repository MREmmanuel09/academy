---
id: iac-3
slug: iac-3
title: Cloud: AWS fundamentals
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 90
---

# Cloud: AWS fundamentals

EC2, S3, VPC, IAM, RDS. Los servicios core de la nube más usada.

## Modelos de cloud

### IaaS, PaaS, SaaS, FaaS

- **IaaS** (Infrastructure as a Service): VMs, redes, storage. Tú gestionas OS, runtime, app. Ej: EC2, Azure VM
- **PaaS** (Platform as a Service): plataforma lista, deploy tu código. Ej: Elastic Beanstalk, App Engine
- **SaaS** (Software as a Service): software terminado. Ej: Gmail, Office 365
- **FaaS** (Function as a Service): serverless, ejecuta funciones. Ej: Lambda, Cloud Functions

### Proveedores principales

- **AWS** (Amazon): el más grande, ~32% market share
- **Azure** (Microsoft): #2, fuerte en enterprise
- **GCP** (Google): #3, fuerte en data/ML
- **Alibaba**: #4, fuerte en Asia
- **DigitalOcean**, **Linode**, **Hetzner**: más simples y baratos

### Regiones y zonas

- **Region**: área geográfica (us-east-1, eu-west-1)
- **Availability Zone (AZ)**: data center dentro de una region
- **Edge location**: CDN (CloudFront)

## Servicios core de AWS

### Compute

**EC2** (Elastic Compute Cloud): VMs. Tipos: `t3.micro` (burstable, gratis), `m5.large` (general), `c5.xlarge` (compute), `r5.large` (memoria), `p3.2xlarge` (GPU).

```bash
aws ec2 run-instances --image-id ami-12345 --instance-type t3.micro --key-name mykey
aws ec2 describe-instances
aws ec2 stop-instances --instance-ids i-12345
aws ec2 terminate-instances --instance-ids i-12345
```

**Lambda**: serverless, ejecuta función por evento. 1M requests/mes gratis.

**ECS / EKS**: containers (ECS es propio de AWS, EKS = K8s managed).

### Storage

**S3** (Simple Storage Service): object storage. 11 nueves de durabilidad. 5GB gratis.

```bash
aws s3 mb s3://mi-bucket
aws s3 cp archivo.txt s3://mi-bucket/
aws s3 sync ./local s3://mi-bucket/prefix/
aws s3 ls s3://mi-bucket/
```

**EBS** (Elastic Block Store): disks para EC2.

**EFS** (Elastic File System): NFS compartido entre instancias.

### Networking

**VPC** (Virtual Private Cloud): red privada aislada.

**Subnets**:
- **Public**: con route a Internet Gateway
- **Private**: sin acceso directo a Internet (usa NAT)

**Security Groups**: stateful firewall a nivel de instancia.

**NACL**: stateless firewall a nivel de subnet.

**Route 53**: DNS.

### Database

**RDS**: managed relational (Postgres, MySQL, Oracle, MSSQL, Aurora).

**DynamoDB**: NoSQL key-value, serverless, escala infinita.

**ElastiCache**: Redis/Memcached managed.

### IAM

**IAM** (Identity and Access Management): usuarios, roles, policies.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::mi-bucket/*"
  }]
}
```

**Principio de least privilege**: solo los permisos necesarios.

### Monitoring

**CloudWatch**: métricas, logs, alarms.

```bash
aws cloudwatch put-metric-alarm \\
  --alarm-name "high-cpu" \\
  --metric-name CPUUtilization \\
  --threshold 80 \\
  --comparison-operator GreaterThanThreshold
```

## Puntos clave

- Cloud = IaaS/PaaS/SaaS/FaaS. AWS domina con ~32% market share.
- EC2 = VMs. S3 = object storage. VPC = red privada. RDS = DB managed.
- IAM: usuarios + roles + policies. Least privilege siempre.
- CloudWatch para métricas, logs, alarms. Free tier generoso para aprender.

:::quiz
[
  {
    "question": "EC2, S3, VPC, RDS son respectivamente...",
    "options": ["DB, VMs, red, storage", "VMs, object storage, red privada, DB managed", "Red, VMs, DB, storage", "Todo serverless"],
    "correctIndex": 1,
    "explanation": "El cuarteto base de AWS: computo, objetos, red y base gestionada."
  },
  {
    "question": "Principio de IAM que siempre aplica?",
    "options": ["Admin para todos", "Least privilege: minimo permiso necesario", "Sin roles", "Una sola cuenta root compartida"],
    "correctIndex": 1,
    "explanation": "Usuarios + roles + policies ajustadas. Root con MFA y guardada."
  },
  {
    "question": "Para que usas CloudWatch?",
    "options": ["Solo facturacion", "Metricas, logs y alarmas de tus recursos", "Editar codigo", "Crear VPCs"],
    "correctIndex": 1,
    "explanation": "Observabilidad AWS nativa: mide, alerta y dispara respuestas."
  }
]
:::
