---
id: py-notifications
slug: py-notifications
title: Notificaciones: email, Slack webhooks, PagerDuty
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Notificaciones: email, Slack webhooks, PagerDuty

Enviar alertas via email, Slack, PagerDuty desde scripts de monitoreo y automation.

## Email con smtplib y email.mime

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_email(subject: str, body: str, to: list[str]) -> None:
    msg = MIMEMultipart()
    msg["From"] = "alerts@example.com"
    msg["To"] = ", ".join(to)
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login("user", "app-password")   # NO tu password normal
        server.send_message(msg)


send_email(
    "Server web-01 down",
    "<h1>Critical</h1><p>Server web-01 not responding</p>",
    ["oncall@example.com"],
)
```

> **Tip DevOps**: usa SendGrid, Mailgun, AWS SES para email transaccional. Son mas confiables que SMTP directo.

## Slack incoming webhooks

Configura un webhook en Slack: Apps > Incoming Webhooks > Add to Slack.

```python
import httpx

WEBHOOK_URL = "https://hooks.slack.com/services/T.../B.../..."


def notify_slack(text: str, level: str = "info") -> None:
    """level: info, warning, error"""
    color = {"info": "#36a64f", "warning": "#ff9900", "error": "#ff0000"}[level]
    payload = {
        "attachments": [
            {
                "color": color,
                "fields": [{"title": level.upper(), "value": text}],
            }
        ]
    }
    response = httpx.post(WEBHOOK_URL, json=payload, timeout=10)
    response.raise_for_status()


notify_slack("Server web-01 CPU >90%", level="error")
```

**Bloques de Slack** (mas ricos):
```python
payload = {
    "blocks": [
        {"type": "header", "text": {"type": "plain_text", "text": "🚨 Alert"}},
        {"type": "section", "fields": [
            {"type": "mrkdwn", "text": "*Server:*\\nweb-01"},
            {"type": "mrkdwn", "text": "*CPU:*\\n95%"},
        ]},
    ]
}
```

## PagerDuty y alertas escaladas

**PagerDuty Events API**:
```bash
pip install pdpyras
```

```python
from pdpyras import EventsAPISession

session = EventsAPISession("your-integration-key")

session.trigger(
    "Server down: web-01",
    severity="critical",
    source="web-01.internal",
    custom_details={"host": "web-01", "downtime_min": 5},
)

# Resolver cuando vuelve
session.resolve("incident-key-here")
```

**Patron de alerta escalonada** (en monitoring scripts):
```python
def alert(message: str, severity: str = "warning") -> None:
    if severity == "info":
        notify_slack(message, "info")
    elif severity == "warning":
        notify_slack(message, "warning")
        send_email(f"[WARN] {message}", message, oncall_emails)
    elif severity == "critical":
        notify_slack(message, "error")
        send_email(f"[CRIT] {message}", message, oncall_emails)
        page_pagerduty(message)
```

> **Tip DevOps**: implementa **deduplicacion** (no spamear la misma alerta cada 30s) y **silencing** (ventanas de mantenimiento).

## Puntos clave

- Email: smtplib + MIMEText. Mejor usa SendGrid/SES que SMTP directo.
- Slack webhooks: simple, sin librerias. Solo httpx.post a la URL del webhook.
- PagerDuty: integracion oficial con pdpyras, dedup keys automaticas.
- Implementa deduplicacion y silencing para evitar spam en incidentes reales.
