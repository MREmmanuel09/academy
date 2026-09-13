---
id: py-cli
slug: py-cli
title: CLI tools con argparse y Click
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 65
---

# CLI tools con argparse y Click

Construir herramientas de linea de comandos profesionales: argparse (stdlib) y Click (third-party).

## argparse (stdlib)

```python
#!/usr/bin/env python3
"""deploy.py — despliega una app a un entorno."""

import argparse
import sys


def deploy(app: str, env: str, replicas: int, dry_run: bool) -> int:
    if dry_run:
        print(f"[DRY-RUN] Would deploy {app} to {env} with {replicas} replicas")
        return 0
    print(f"Deploying {app} to {env}...")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Deploy a service",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("app", help="Nombre de la aplicacion")
    parser.add_argument("env", choices=["dev", "staging", "prod"], help="Entorno destino")
    parser.add_argument("-r", "--replicas", type=int, default=3, help="Numero de replicas")
    parser.add_argument("--dry-run", action="store_true", help="Solo simular")
    parser.add_argument("-v", "--verbose", action="store_true")

    args = parser.parse_args()
    return deploy(args.app, args.env, args.replicas, args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
```

**Uso**:
```bash
./deploy.py api prod --replicas 5 --dry-run
./deploy.py --help
```

## Subcomandos (git style)

```python
parser = argparse.ArgumentParser(prog="redlab")
sub = parser.add_subparsers(dest="command", required=True)

deploy_cmd = sub.add_parser("deploy", help="Deploy a service")
deploy_cmd.add_argument("app")
deploy_cmd.add_argument("--env", default="dev")

logs_cmd = sub.add_parser("logs", help="Show logs")
logs_cmd.add_argument("service")
logs_cmd.add_argument("--tail", type=int, default=100)
logs_cmd.add_argument("-f", "--follow", action="store_true")

args = parser.parse_args()

if args.command == "deploy":
    do_deploy(args.app, args.env)
elif args.command == "logs":
    show_logs(args.service, args.tail, args.follow)
```

> **Resultado**: `redlab deploy api --env prod` y `redlab logs api -f`. Como kubectl, docker, aws.

## Click: mas pitonico

```bash
pip install click
```

```python
import click

@click.group()
def cli():
    """RedLab CLI."""

@cli.command()
@click.argument("app")
@click.option("--env", default="dev", type=click.Choice(["dev", "staging", "prod"]))
@click.option("--replicas", default=3, type=int, show_default=True)
@click.option("--dry-run", is_flag=True, help="Solo simular")
def deploy(app: str, env: str, replicas: int, dry_run: bool):
    """Deploy a service."""
    if dry_run:
        click.echo(f"[DRY-RUN] {app} -> {env} x{replicas}")
        return
    click.echo(f"Deploying {app}...")

@cli.command()
@click.argument("service")
@click.option("--tail", default=100, type=int)
@click.option("-f", "--follow", is_flag=True)
def logs(service: str, tail: int, follow: bool):
    """Show service logs."""
    click.echo(f"Fetching logs for {service}...")

if __name__ == "__main__":
    cli()
```

> **Tip**: Click genera automaticamente `--help`, completa con shell, soporta colores. Usado por Flask, Black, pip, AWS CDK.

## Puntos clave

- argparse esta en stdlib — buena opcion para scripts simples sin dependencias.
- add_subparsers para CLIs tipo git/kubectl con multiples comandos.
- Click es mas conciso y pitonico. Usado por herramientas profesionales.
- SIEMPRE incluye --help, --dry-run y validacion de choices para CLIs production-ready.
