---
id: sec-devops-1
slug: sec-devops-1
title: DevSecOps: seguridad en el ciclo de vida
module: seguridad
difficulty: advanced
estimatedMinutes: 7
xp: 90
---

# DevSecOps: seguridad en el ciclo de vida

SAST, DAST, SCA, SBOM, secrets management, OWASP, secure by design. Seguridad sin frenar la entrega.

## Por que DevSecOps

**DevSecOps** = integrar seguridad en el ciclo de desarrollo, no como gate al final.

### El modelo tradicional (equivocado)

```
Dev -> [Build] -> [Test] -> [Security Audit] -> [Deploy]   # 3 meses de retraso
                                      |
                                      v
                              "No hay tiempo para seguridad"
```

### El modelo DevSecOps

```
Dev -> [SAST] -> [SCA] -> [Test] -> [DAST] -> [Deploy]
        |        |                |
        v        v                v
    codigo  dependencies    runtime scan
    seguro   seguras        en staging
```

### OWASP Top 10 (2021)

El **OWASP Top 10** es la lista mas citada de vulnerabilidades web, actualizada cada 3-4 anos. La version 2021:

1. **A01 Broken Access Control**: usuarios pueden acceder a datos que no deberian (IDOR, missing auth)
2. **A02 Cryptographic Failures**: HTTPS mal configurado, passwords en texto plano, algoritmos debiles
3. **A03 Injection**: SQL injection, XSS, command injection
4. **A04 Insecure Design**: fallos de diseno, no de codigo
5. **A05 Security Misconfiguration**: defaults inseguros, error messages verbose
6. **A06 Vulnerable Components**: dependencies con CVEs conocidos
7. **A07 Auth Failures**: sesiones mal manejadas, credential stuffing
8. **A08 Software & Data Integrity**: updates sin verificar, CI/CD inseguros
9. **A09 Logging Failures**: no detectar breaches
10. **A10 SSRF**: Server-Side Request Forgery (servidor hace requests a recursos internos)

## Tipos de scanning

### SAST (Static Application Security Testing)

Analiza el codigo fuente sin ejecutarlo. Encuentra: SQL injection, XSS, hardcoded secrets, etc.

Herramientas: **SonarQube**, **Semgrep**, **Snyk Code**, **Checkmarx**.

```bash
# Semgrep (open source, rapido)
semgrep --config=auto .

# Reglas custom
semgrep --config=p/security-audit
```

### SCA (Software Composition Analysis)

Analiza las **dependencies** de terceros. Encuentra CVEs conocidos.

Herramientas: **Snyk**, **Dependabot** (GitHub), **Trivy**, **OWASP Dependency-Check**.

```bash
# npm audit
npm audit

# Snyk
snyk test

# Trivy (multi-lenguaje)
trivy fs .
trivy image nginx:latest
```

### DAST (Dynamic Application Security Testing)

Prueba la app **en ejecucion** sin ver el codigo. Simula ataques. Encuentra: misconfiguration, runtime vulns.

Herramientas: **OWASP ZAP**, **Burp Suite**, **Nuclei**.

```bash
# OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://example.com

# Nuclei
nuclei -u https://example.com -t nuclei-templates/
```

### SBOM (Software Bill of Materials)

Lista de TODOS los componentes de tu software. Requerido por regulaciones (NTIA, Executive Order 14028 de Biden).

Formatos: **SPDX** (Linux Foundation), **CycloneDX** (OWASP).

```bash
# Generar SBOM
syft . -o spdx-json > sbom.spdx.json
syft . -o cyclonedx-json > sbom.cdx.json
```

### Container scanning

```bash
# Trivy para imagenes
trivy image myorg/api:v1.0

# Scan del Dockerfile
trivy config Dockerfile

# Grype (de Anchore)
grype myorg/api:v1.0
```

### Secrets scanning

```bash
# TruffleHog (busca secrets en Git)
trufflehog git https://github.com/myorg/myrepo

# git-secrets (pre-commit hook)
git secrets --scan
```

## Secure by design y supply chain

### Principios de secure by design

1. **Least privilege**: cada componente solo tiene los permisos minimos
2. **Defense in depth**: multiples capas de seguridad
3. **Fail secure**: en error, negar acceso (no abrir)
4. **Zero trust**: nunca confiar, siempre verificar (red, usuario, servicio)
5. **Shift left**: seguridad desde el diseno, no al final

### Supply chain security (SLSA, Sigstore)

Despues del ataque a **SolarWinds** (2020) y **Codecov** (2021), el supply chain software es un vector critico. Frameworks:

- **SLSA** (Supply chain Levels for Software Artifacts): niveles 1-3 de assurance
- **Sigstore**: firma de artefactos con **cosign** (firma), **Rekor** (transparency log)
- **in-toto**: attestation de la cadena de supply chain

```bash
# Firmar imagen con cosign
cosign sign --key cosign.key myorg/api:v1.0

# Verificar
cosign verify --key cosign.pub myorg/api:v1.0
```

### Secrets management

**NUNCA** pongas secrets en codigo o en variables de entorno. Usa un secret manager:

- **HashiCorp Vault** (open source, gold standard)
- **AWS Secrets Manager** / **Parameter Store**
- **Azure Key Vault**
- **GCP Secret Manager**
- **Kubernetes External Secrets Operator** (ESO): sincroniza secrets desde Vault/AWS a K8s

```bash
# Vault CLI
vault kv put secret/myapp/db password=secretpass
vault kv get secret/myapp/db

# K8s External Secrets
kubectl apply -f external-secret.yaml
kubectl get secretstore vault-backend
```

### Runtime security

- **Falco** (CNCF): detecta comportamiento anomalo en containers (syscalls sospechosos)
- **Tracee**: similar pero basado en eBPF
- **AppArmor** / **SELinux**: MAC (Mandatory Access Control) en Linux

```bash
# Falco
helm install falco falcosecurity/falco

# Detecta cosas como:
# - Shell spawned in container
# - Sensitive file accessed
# - Outbound connection to suspicious IP
```

### Compliance frameworks

- **SOC 2**: controles de seguridad para SaaS (clientes enterprise lo piden)
- **ISO 27001**: estandar internacional de seguridad
- **PCI-DSS**: si manejas tarjetas de credito
- **HIPAA**: datos medicos en USA
- **GDPR**: datos personales en EU
- **NIST CSF**: framework NIST de cybersecurity

### Bug Bounty

Programa donde hackers externos reportan bugs a cambio de recompensa. Empresas como Google, Microsoft, Apple pagan $1000-$100,000+ por bugs criticos.

Plataformas: **HackerOne**, **Bugcrowd**.

## Puntos clave

- DevSecOps = seguridad en el pipeline, no como gate al final. SAST + SCA + DAST + secrets scan + container scan.
- OWASP Top 10 es la biblia de vulnerabilidades web. Broken Access Control e Injection son las mas comunes.
- SBOM es requerido por regulaciones. Genera SPDX o CycloneDX para todos tus artefactos.
- Nunca pongas secrets en codigo. Usa Vault, AWS Secrets Manager, o ESO. Firma imagenes con cosign.

:::quiz
[
  {
    "question": "Que significa 'shift left' en DevSecOps?",
    "options": ["Mover servidores", "Integrar seguridad desde el inicio del pipeline, no como gate final", "Trabajar de noche", "Usar solo Linux"],
    "correctIndex": 1,
    "explanation": "SAST + SCA + DAST + secrets/container scan corren en el pipeline, no al final."
  },
  {
    "question": "Cuales son las vulnerabilidades web mas comunes segun OWASP Top 10?",
    "options": ["DDoS y phishing", "Broken Access Control e Injection", "Ransomware", "Spam"],
    "correctIndex": 1,
    "explanation": "Control de acceso roto e inyeccion lideran el Top 10."
  },
  {
    "question": "Donde van los secrets?",
    "options": ["En el codigo, si es privado", "En Vault/Secrets Manager/ESO, nunca en codigo", "En el README", "En variables globales sin proteccion"],
    "correctIndex": 1,
    "explanation": "El codigo se filtra (repos, logs, imagenes). Gestor de secretos + firma con cosign."
  }
]
:::
