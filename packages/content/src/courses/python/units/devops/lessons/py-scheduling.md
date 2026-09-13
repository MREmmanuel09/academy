---
id: py-scheduling
slug: py-scheduling
title: Scheduling: cron, schedule, APScheduler
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Scheduling: cron, schedule, APScheduler

Automatizar tareas periodicas: cron de Linux, schedule lib, APScheduler para jobs complejos.

## Cron de Linux (el clasico)

**Sintaxis cron**: `minuto hora dia mes dia-semana comando`

```
* * * * * comando
│ │ │ │ │
│ │ │ │ └─── 0-6 (domingo=0)
│ │ │ └───── 1-12
│ │ └─────── 1-31
│ └───────── 0-23
└─────────── 0-59
```

**Ejemplos**:
```bash
# Cada 5 minutos
*/5 * * * * /usr/bin/python3 /opt/scripts/backup.py

# Cada lunes a las 3am
0 3 * * 1 /opt/scripts/weekly-report.sh

# Dias laborales a las 9am
0 9 * * 1-5 /opt/scripts/morning-check.py
```

**crontab**:
```bash
crontab -e              # editar
crontab -l              # listar
crontab -r              # eliminar
```

> **Tip DevOps**: en produccion usa la ruta absoluta del python (`/usr/bin/python3`) y redirige stderr/stdout a un log:
> `*/5 * * * * /usr/bin/python3 /opt/job.py >> /var/log/job.log 2>&1`

## schedule: simple y pitonico

Para scripts Python autocontenidos, la libreria `schedule` es ideal.

```bash
pip install schedule
```

```python
import schedule
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def health_check():
    logger.info("Running health check")
    # ... tu logica


def cleanup():
    logger.info("Cleaning temp files")
    # ...


schedule.every(5).minutes.do(health_check)
schedule.every().hour.do(cleanup)
schedule.every().day.at("03:00").do(backup)
schedule.every().monday.at("09:00").do(weekly_report)

while True:
    schedule.run_pending()
    time.sleep(1)
```

> **Limitacion**: `schedule` no persiste jobs ni es distribuido. Para eso usa Celery, RQ, o Airflow.

## APScheduler: persistente y robusto

```bash
pip install apscheduler
```

```python
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.triggers.cron import CronTrigger

scheduler = BlockingScheduler(
    jobstores={
        "default": SQLAlchemyJobStore(url="sqlite:///jobs.db"),
    },
)


@scheduler.scheduled_job(CronTrigger(minute="*/5"))
def health_check():
    print("Running health check")


@scheduler.scheduled_job("interval", hours=1)
def cleanup():
    print("Cleaning")


scheduler.start()
```

**Trigger types**:
- `interval`: cada X tiempo
- `cron`: como cron de Linux
- `date`: una vez en fecha especifica

**Coalescing** (evita ejecuciones acumuladas si el job tarda):
```python
@scheduler.scheduled_job("interval", minutes=1, coalesce=True, max_instances=1)
```

> **Caso real DevOps**: APScheduler en un script de monitoring 24/7, persistiendo en SQLite. Cuando reinicias, retoma donde quedo.

## Puntos clave

- Cron de Linux: simple, robusto, pero limitado (sin logs, sin retry).
- schedule lib: perfecto para scripts Python simples sin dependencias externas.
- APScheduler: persistente, con SQLAlchemy, coalescing para jobs lentos.
- Para sistemas distribuidos: Celery, RQ, Airflow, Temporal.
