---
id: py-e2e
slug: py-e2e
title: End-to-end: script que se deploya a si mismo
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 110
---

# End-to-end: script que se deploya a si mismo

Proyecto integrador: pipeline completo con GitHub Actions, testing, deploy y monitoring.

## El objetivo

Construir un script Python que:

1. Lee configuracion de un archivo YAML
2. Hace health checks a N servicios via HTTP
3. Reporta resultados a una API (FastAPI)
4. Se testea con pytest
5. Se empaqueta con Docker
6. Se pushea a GitHub Container Registry
7. Se deploya a un servidor via SSH
8. Corre como systemd service o cron
9. Se monitorea a si mismo (heartbeat)
10. Alerta a Slack si falla

> **Filosofia**: tratar tu script de automation como un **producto**, no como codigo descartable.

## Estructura del proyecto

```
health-monitor/
├── src/
│   ├── monitor/
│   │   ├── __init__.py
│   │   ├── cli.py             # entrypoint
│   │   ├── checker.py         # health check logic
│   │   ├── reporter.py        # envio a FastAPI + Slack
│   │   ├── config.py          # YAML parsing
│   │   └── heartbeat.py       # self-monitoring
│   └── api/
│       ├── main.py            # FastAPI
│       └── models.py
├── tests/
│   ├── test_checker.py
│   ├── test_reporter.py
│   └── fixtures/
├── config/
│   └── services.yaml
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── .github/
│   └── workflows/
│       ├── ci.yml             # tests + lint
│       └── deploy.yml         # build + push + deploy
├── systemd/
│   └── health-monitor.service
└── README.md
```

## CI/CD y deployment

**GitHub Actions: CI**:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -e ".[dev]"
      - run: pytest --cov=src --cov-report=xml
      - run: ruff check src tests
      - run: black --check src tests
```

**Deploy** (build + push + deploy via SSH):
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push
        run: |
          echo "\${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u \${{ github.actor }} --password-stdin
          docker build -t ghcr.io/\${{ github.repository }}:\${{ github.sha }} .
          docker push ghcr.io/\${{ github.repository }}:\${{ github.sha }}
      - name: Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: \${{ secrets.HOST }}
          username: deploy
          key: \${{ secrets.SSH_KEY }}
          script: |
            cd /opt/health-monitor
            docker compose pull
            docker compose up -d
            docker system prune -f
```

**systemd service** (sin Docker, mas ligero):
```ini
[Unit]
Description=Health Monitor
After=network.target

[Service]
Type=simple
User=monitor
WorkingDirectory=/opt/health-monitor
ExecStart=/opt/health-monitor/.venv/bin/python -m monitor
Restart=always
RestartSec=10
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

> **Tip DevOps**: el script debe tener un endpoint `/health` o un mecanismo de heartbeat. Si no responde, el supervisor lo reinicia. **Dogfooding**: usa tu propia monitoring.

## Puntos clave

- Trata tu script de automation como un producto: testing, packaging, deploy.
- Estructura: src/ con modulos separados (cli, checker, reporter), tests/, Dockerfile.
- CI con lint + test + coverage, deploy automatizado via SSH o Kubernetes.
- systemd con Restart=always es la forma mas simple de mantener un script vivo.
