---
id: iac-1
slug: iac-1
title: Terraform: Infrastructure as Code
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 80
---

# Terraform: Infrastructure as Code

Definir infraestructura como código. Multi-cloud, reproducible, versionado.

## ¿Por qué IaC?

**Infrastructure as Code** = definir tu infra en archivos, no clicks manuales.

**Problemas del approach manual**:
- No reproducible: cada ambiente es único
- No versionado: quién cambió qué
- Lento: 50 clicks para 50 servidores
- Frágil: un error humano y se cae todo
- Caro: documentar es pesadilla

**Beneficios de IaC**:
- **Reproducible**: mismo código → mismo resultado
- **Versionado**: git history de toda tu infra
- **Testeable**: valida antes de aplicar
- **Documentado**: el código ES la documentación
- **Rápido**: deploy 1000 servidores en minutos

### Herramientas

- **Terraform** (HashiCorp): multi-cloud, el estándar
- **Pulumi**: IaC con lenguajes reales (TS, Python, Go)
- **CloudFormation** (AWS): solo AWS
- **ARM Templates** (Azure)
- **Ansible**: configuration management, no es 100% IaC
- **Crossplane**: K8s-native IaC

## Terraform basics

### Workflow

```bash
terraform init          # descargar providers
terraform plan          # ver qué cambiaría
terraform apply         # aplicar
terraform destroy       # borrar todo
terraform fmt           # formatear
terraform validate      # validar sintaxis
```

### providers.tf

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-tf-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}
```

### main.tf

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "HelloWorld"
    Env  = "production"
  }
}

resource "aws_s3_bucket" "data" {
  bucket = "my-app-data-2024"
}

output "instance_ip" {
  value = aws_instance.web.public_ip
}
```

### Variables y outputs

```hcl
# variables.tf
variable "environment" {
  type        = string
  default     = "dev"
  description = "Environment name"
}

variable "instance_count" {
  type    = number
  default = 1
}
```

```hcl
# outputs.tf
output "api_url" {
  value = "https://\${aws_instance.web.public_dns}"
}
```

Uso: `terraform apply -var="environment=prod"`

## State y módulos

### State

Terraform guarda el estado en `terraform.tfstate`. Este archivo es **crítico** — describe tu infra real.

**NUNCA** lo commitees a git. Usa **remote state** (S3 + DynamoDB lock, Terraform Cloud, GCS, etc).

### Módulos

Reutiliza código agrupando recursos:

```hcl
# modules/webserver/main.tf
variable "ami" {}
variable "instance_type" {}
variable "name" {}

resource "aws_instance" "this" {
  ami           = var.ami
  instance_type = var.instance_type
  tags = { Name = var.name }
}

output "id" {
  value = aws_instance.this.id
}

output "public_ip" {
  value = aws_instance.this.public_ip
}
```

Uso:

```hcl
module "web" {
  source        = "./modules/webserver"
  ami           = "ami-12345"
  instance_type = "t3.small"
  name          = "web-prod-1"
}

module "web2" {
  source        = "./modules/webserver"
  ami           = "ami-12345"
  instance_type = "t3.small"
  name          = "web-prod-2"
}
```

O desde registry:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}
```

### Lifecycle rules

```hcl
resource "aws_instance" "web" {
  ami           = "ami-12345"
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true   # crea nuevo antes de borrar
    prevent_destroy       = true   # proteje de borrado accidental
    ignore_changes        = [tags] # ignora cambios manuales en tags
  }
}
```

## Puntos clave

- Terraform define infra como código. Workflow: init, plan, apply, destroy.
- Providers se declaran en required_providers. Recursos con resource "tipo" "nombre".
- State es crítico: en remote backend (S3, Terraform Cloud), NUNCA en git.
- Módulos reutilizan código. Lifecycle rules controlan creación/destrucción.

:::quiz
[
  {
    "question": "Donde debe vivir el state de Terraform en equipo?",
    "options": ["En git junto al codigo", "En remote backend (S3, Terraform Cloud), nunca en git", "En local de cada dev", "No hace falta state"],
    "correctIndex": 1,
    "explanation": "El state es la fuente de verdad compartida (con lock). En git hay conflictos y secretos expuestos."
  },
  {
    "question": "Que hace un modulo?",
    "options": ["Instala providers", "Empaqueta recursos reutilizables con inputs/outputs", "Borra infraestructura", "Genera passwords"],
    "correctIndex": 1,
    "explanation": "Modulos = funciones de infra: parametrizas una vez y reutilizas en cada entorno."
  },
  {
    "question": "Para que sirve un lifecycle rule?",
    "options": ["Para documentar", "Controlar creacion/destruccion (p. ej. prevent_destroy en datos)", "Para formatear codigo", "Para elegir region"],
    "correctIndex": 1,
    "explanation": "Protege recursos criticos de borrados accidentales y controla reemplazos."
  }
]
:::
