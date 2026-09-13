# Sistema de Automatizacion DevOps con Python

## Contexto

Un equipo de infraestructura maneja 50+ servidores. Las tareas actuales son manuales: revisar monitoreo, enviar alertas, ejecutar despliegues, generar reportes. Todo esto toma 2-3 horas diarias.

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                   CLI Principal                 │
│    monitor | deploy | report | notify           │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Monitor  │  │ Deploy   │  │ Report   │      │
│  │  - HTTP  │  │  - SSH   │  │  - PDF   │      │
│  │  - CPU   │  │  - Rollback│ │  - HTML  │      │
│  │  - Disk  │  │  - Health │  │  - Stats │      │
│  └──────────┘  └──────────┘  └──────────┘      │
│                                                 │
│  ┌──────────────────────────────────┐           │
│  │         Notify Module           │           │
│  │  Slack | Email | Webhook        │           │
│  │  Dedup | Retry | Rate Limit     │           │
│  └──────────────────────────────────┘           │
│                                                 │
│  ┌──────────────────────────────────┐           │
│  │       Config (YAML/TOML)        │           │
│  │       Pydantic Validation       │           │
│  └──────────────────────────────────┘           │
└─────────────────────────────────────────────────┘
```

## Ejemplo de Config

```yaml
servers:
  - name: web-01
    host: 10.0.1.10
    checks:
      http: { url: "http://localhost:8080/health", timeout: 5 }
      cpu: { threshold: 85 }
      disk: { path: "/", threshold: 90 }

alerts:
  slack:
    webhook: ${SLACK_WEBHOOK}
    channel: "#ops-alerts"
  email:
    smtp: "smtp.company.com"
    to: "ops@company.com"

deploy:
  ssh_key: "~/.ssh/id_rsa"
  rollback_on_failure: true
```

## Uso

```bash
# Monitoreo continuo
python -m devops_cli monitor --config config.yaml --interval 60

# Despliegue con rollback
python -m devops_cli deploy --app myapp --env prod --rollback

# Generar reporte semanal
python -m devops_cli report --period 7d --format pdf --output report.pdf

# Notificacion manual
python -m devops_cli notify --message "Deploy completado" --channel slack
```
