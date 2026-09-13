---
id: cicd-1
slug: cicd-1
title: CI/CD: integración y entrega continua
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 70
---

# CI/CD: integración y entrega continua

Pipelines, GitHub Actions, GitLab CI, Jenkins. Automatiza tu deploy.

## ¿Qué es CI/CD?

**CI (Continuous Integration)**: cada commit se integra automáticamente. Corre tests, linter, build.

**CD (Continuous Delivery/Deployment)**: cada cambio validado se deploya automáticamente (o con un click).

### Beneficios

- **Bugs detectados temprano** (no en producción)
- **Deploy frecuente** y seguro
- **Menos stress** en releases
- **Feedback rápido** a developers
- **Reproducibilidad** del build

### El pipeline típico

```
commit → test → build → scan → deploy staging → manual approval → deploy prod
```

### Herramientas

- **GitHub Actions** (integrado con GitHub)
- **GitLab CI** (integrado con GitLab)
- **CircleCI**
- **Jenkins** (self-hosted, super flexible)
- **Drone**
- **Buildkite**
- **Azure DevOps**
- **Bitbucket Pipelines**

### Conceptos

- **Pipeline**: workflow completo
- **Stage/Job**: grupo de pasos
- **Step/Task**: comando individual
- **Runner/Agent**: máquina que ejecuta
- **Artifact**: archivo producido (binarios, reportes)
- **Cache**: acelerar builds reutilizando

## GitHub Actions

GitHub Actions vive en `.github/workflows/` como archivos YAML.

### Workflow básico

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
```

### Deploy a producción

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build and push Docker
        run: |
          docker build -t \$ECR_REGISTRY/\$ECR_REPO:\$GITHUB_SHA .
          docker push \$ECR_REGISTRY/\$ECR_REPO:\$GITHUB_SHA

      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name prod-cluster
          kubectl set image deployment/mi-app web=\$ECR_REGISTRY/\$ECR_REPO:\$GITHUB_SHA
          kubectl rollout status deployment/mi-app

env:
  ECR_REGISTRY: 123.dkr.ecr.us-east-1.amazonaws.com
  ECR_REPO: mi-app
```

### Matrix, secrets, caché

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
```

Secrets en **Settings → Secrets and variables → Actions**.

## GitLab CI

GitLab CI se configura en `.gitlab-ci.yml` en la raíz.

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: registry.gitlab.com/mygroup/myapp

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm run lint
    - npm test
  coverage: '/Lines:\\s*\\d+\\.\\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker build -t \$DOCKER_IMAGE:\$CI_COMMIT_SHA .
    - docker push \$DOCKER_IMAGE:\$CI_COMMIT_SHA
  only:
    - main

deploy_production:
  stage: deploy
  image: bitnami/kubectl
  script:
    - kubectl config use-context production
    - kubectl set image deployment/mi-app web=\$DOCKER_IMAGE:\$CI_COMMIT_SHA
    - kubectl rollout status deployment/mi-app
  environment:
    name: production
    url: https://app.example.com
  when: manual
  only:
    - main
```

### Jenkins (self-hosted, super flexible)

`groovy
pipeline {
  agent any

  stages {
    stage('Test') {
      steps {
        sh 'npm ci'
        sh 'npm test'
      }
    }
    stage('Build') {
      steps {
        sh 'docker build -t myapp:\${BUILD_NUMBER} .'
        sh 'docker push myapp:\${BUILD_NUMBER}'
      }
    }
    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        sh 'kubectl set image deployment/myapp web=myapp:\${BUILD_NUMBER}'
      }
    }
  }

  post {
    always {
      junit 'test-results.xml'
    }
  }
}
```

## Puntos clave

- CI/CD automatiza test, build, deploy. Reduce bugs y acelera releases.
- GitHub Actions: workflows en .github/workflows/*.yml. Usa actions/setup-node, checkout, etc.
- GitLab CI: .gitlab-ci.yml. Stages: test, build, deploy. Runners ejecutan.
- Jenkins: pipelines Groovy. Self-hosted, ultra flexible pero requiere mantenimiento.

:::quiz
[
  {
    "question": "Donde viven los workflows de GitHub Actions?",
    "options": [".github/workflows/*.yml", "/etc/jenkins", ".gitlab-ci.yml", "Dockerfile"],
    "correctIndex": 0,
    "explanation": "Cada repo define sus workflows en .github/workflows con jobs, steps y actions reutilizables."
  },
  {
    "question": "Que son los stages en GitLab CI?",
    "options": ["Servidores fisicos", "Fases (test, build, deploy) que agrupan jobs y se ejecutan en orden", "Tipos de runner", "Ramas protegidas"],
    "correctIndex": 1,
    "explanation": "Stages ordenan el pipeline; los runners ejecutan los jobs de cada stage."
  },
  {
    "question": "Cuando eliges Jenkins frente a SaaS?",
    "options": ["Siempre, es mas moderno", "Cuando necesitas self-hosted ultra flexible y asumes su mantenimiento", "Para proyectos sin pipeline", "Nunca"],
    "correctIndex": 1,
    "explanation": "Jenkins da control total on-prem a cambio de mantener controladores, agentes y plugins."
  }
]
:::
