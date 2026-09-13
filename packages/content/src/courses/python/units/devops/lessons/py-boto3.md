---
id: py-boto3
slug: py-boto3
title: AWS SDK boto3: EC2, S3, IAM
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 90
---

# AWS SDK boto3: EC2, S3, IAM

Automatizar AWS con boto3: clientes, recursos, waiters, paginators, IAM.

## Clientes vs recursos

```bash
pip install boto3
```

**Cliente** = API de bajo nivel (1 a 1 con la API AWS).
**Recurso** = API de alto nivel orientada a objetos.

```python
import boto3

# Cliente
ec2 = boto3.client("ec2", region_name="us-east-1")
response = ec2.describe_instances()
for reservation in response["Reservations"]:
    for instance in reservation["Instances"]:
        print(instance["InstanceId"], instance["State"]["Name"])

# Recurso (mas pitonico)
ec2 = boto3.resource("ec2", region_name="us-east-1")
for instance in ec2.instances.all():
    print(instance.id, instance.state["Name"])
```

> **Regla**: usa **recursos** cuando existan (mas legible). Usa **clientes** para features no cubiertas.

## S3: listar, subir, descargar

```python
import boto3

s3 = boto3.client("s3")

# Listar
response = s3.list_objects_v2(Bucket="my-bucket")
for obj in response.get("Contents", []):
    print(obj["Key"], obj["Size"])

# Subir
s3.upload_file("local.txt", "my-bucket", "remote/path.txt")

# Descargar
s3.download_file("my-bucket", "remote/path.txt", "local_copy.txt")

# Generar URL presigned (temporal, para descargar)
url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": "my-bucket", "Key": "secret.txt"},
    ExpiresIn=3600,
)
```

## IAM, waiters, paginators, errores

**Autenticacion** (orden de prioridad):
1. Variables de entorno (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. `~/.aws/credentials` (compartido con AWS CLI)
3. IAM Role (EC2, ECS, Lambda — recomendado)

**Waiters** (esperar a que un recurso este listo):
```python
ec2 = boto3.client("ec2")
ec2.run_instances(ImageId="ami-...", MinCount=1, MaxCount=1)
waiter = ec2.get_waiter("instance_running")
waiter.wait(InstanceIds=["i-12345"])
print("Instance is up")
```

**Paginators** (iterar respuestas grandes):
```python
paginator = s3.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket="my-bucket"):
    for obj in page["Contents"]:
        process(obj)
```

**Errores comunes**:
- `botocore.exceptions.NoCredentialsError`: no encontro credenciales
- `ClientError` con `e.response["Error"]["Code"]`: AccessDenied, Throttling, etc.

> **Tip DevOps**: en scripts de larga duracion, `paginators` evitan perder datos cuando hay mas de 1000 objetos.

## Puntos clave

- boto3 tiene dos APIs: client (bajo nivel) y resource (alto nivel).
- Credenciales: env vars > ~/.aws/credentials > IAM role. NUNCA hardcodear.
- Waiters para esperar estados. Paginators para listas grandes.
- Captura ClientError y revisa e.response["Error"]["Code"].
