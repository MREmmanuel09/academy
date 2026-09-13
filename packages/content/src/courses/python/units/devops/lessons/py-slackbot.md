---
id: py-slackbot
slug: py-slackbot
title: Slack bot completo: comandos, eventos, modals
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 100
---

# Slack bot completo: comandos, eventos, modals

Construir un Slack bot funcional: Bolt SDK, slash commands, eventos, interactive modals.

## Configuracion del bot

1. Crear app en api.slack.com
2. Agregar scopes: `chat:write`, `commands`, `app_mentions:read`
3. Instalar en workspace
4. Copiar `SLACK_BOT_TOKEN` y `SLACK_SIGNING_SECRET`

```bash
pip install slack-bolt slack-sdk
```

## Slack Bolt: comandos y eventos

```python
import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

app = App(
    token=os.environ["SLACK_BOT_TOKEN"],
    signing_secret=os.environ["SLACK_SIGNING_SECRET"],
)


@app.command("/deploy")
def handle_deploy_command(ack, respond, command):
    ack()  # SIEMPRE ack primero
    env = command["text"].strip() or "dev"
    respond(f"Deploying to {env}...")
    # logica de deploy aqui
    respond(f"✅ Deploy to {env} completed")


@app.event("app_mention")
def handle_mention(event, say):
    user = event["user"]
    text = event["text"]
    say(f"Hi <@{user}>, you said: {text}")


@app.message("help")
def help_message(message, say):
    say("Commands: /deploy [env], /status, /logs <service>")


if __name__ == "__main__":
    SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"]).start()
```

> **Importante**: `ack()` debe llamarse en <3 segundos o Slack reintenta. Para tareas largas, ack primero y luego `respond()`.

## Modals interactivos y scheduled messages

**Modal** (formularios en Slack):
```python
from slack_bolt import App

app = App(token=os.environ["SLACK_BOT_TOKEN"])


@app.command("/incident")
def open_incident_modal(ack, body, client):
    ack()
    client.views_open(
        trigger_id=body["trigger_id"],
        view={
            "type": "modal",
            "title": {"type": "plain_text", "text": "Report Incident"},
            "blocks": [
                {
                    "type": "input",
                    "block_id": "severity",
                    "element": {
                        "type": "static_select",
                        "options": [
                            {"text": {"type": "plain_text", "text": "SEV1"}, "value": "1"},
                            {"text": {"type": "plain_text", "text": "SEV2"}, "value": "2"},
                        ],
                    },
                    "label": {"type": "plain_text", "text": "Severity"},
                },
            ],
            "submit": {"type": "plain_text", "text": "Create"},
        },
    )


@app.view("incident_submission")
def handle_submission(ack, body, view):
    ack()
    severity = view["state"]["values"]["severity"]["severity"]["selected_option"]["value"]
    create_incident(severity)
```

**Scheduled messages** (chat.scheduleMessage):
```python
import datetime
from slack_sdk import WebClient

client = WebClient(token=os.environ["SLACK_BOT_TOKEN"])

post_at = int((datetime.datetime.now() + timedelta(hours=1)).timestamp())
response = client.chat_scheduleMessage(
    channel="#alerts",
    text="🔔 Scheduled check reminder",
    post_at=post_at,
)
```

> **Caso real DevOps**: bot de oncall que pagina al equipo segun rotacion, recibe ack via botones, y crea incidents automaticamente.

## Puntos clave

- Slack Bolt: SDK oficial, maneja auth, eventos, comandos, modals.
- SIEMPRE llama ack() en <3s. Para tareas largas, ack + respond.
- Modals son ideales para forms: incident creation, deploy approval, etc.
- Socket Mode simplifica el dev (no necesitas ngrok ni public endpoint).
