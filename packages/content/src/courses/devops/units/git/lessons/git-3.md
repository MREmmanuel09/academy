---
id: git-3
slug: git-3
title: Remotos: GitHub, GitLab, Bitbucket
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 65
---

# Remotos: GitHub, GitLab, Bitbucket

push, pull, fetch, PR/MR, forking, code review.

## Remotos

Un **remote** es una versión de tu repo en otro servidor (GitHub, GitLab, Bitbucket, tu propio server).

```bash
git remote -v                                    # listar
git remote add origin https://github.com/user/repo.git
git remote add upstream https://github.com/original/repo.git
git remote remove origin
git remote rename origin upstream
```

### Push y pull

```bash
git push origin main                             # subir
git push -u origin feature-x                     # -u trackea la rama
git push origin --tags                           # también tags

git pull                                         # traer y mergear
git pull --rebase                                # traer y rebase
git pull origin main --rebase

git fetch                                        # descargar sin mergear
git fetch --all --prune                          # traer todo y limpiar refs borradas
```

### Tags

```bash
git tag v1.0.0                                   # tag ligero
git tag -a v1.0.0 -m "Release 1.0.0"             # tag anotado
git tag                                          # listar
git push origin v1.0.0                           # subir tag
git push origin --tags                           # todos
git tag -d v1.0.0                                # borrar local
git push origin :refs/tags/v1.0.0                # borrar remoto
```

## Pull Requests y Merge Requests

En **GitHub** se llama **Pull Request (PR)**, en **GitLab** **Merge Request (MR)**. Es pedir a los mantenedores que \"pull\" tus cambios.

### Flujo de contribución

1. **Fork** el repo (en GitHub, click en Fork)
2. **Clone** tu fork
3. Crea una **branch** (`feature-x`)
4. **Commit** tus cambios
5. **Push** a tu fork
6. Abre un **PR** desde tu branch hacia el repo original
7. **Code review** por mantenedores
8. **Discusión** y cambios
9. **Merge** cuando se apruebe

### Buenas prácticas para PRs

- **Pequeños y enfocados**: un PR = un cambio lógico
- **Título claro**: \"Fix: bug en login cuando password vacío\"
- **Descripción**: qué hace, por qué, cómo testearlo
- **Issue link**: \"Closes #123\"
- **Screenshots** si es UI
- **Tests** incluidos
- **Commits limpios**: squash antes de merge si hay ruido

### Revisión de código

```markdown
# Comentarios específicos por línea en GitHub
> ¿Por qué usamos `setTimeout` aquí? ¿Hay race condition?

# Comentarios generales
> En general, considera usar async/await en lugar de promises con .then()
```

> **Mentalidad**: el code review no es ataque, es colaboración para mejorar el código.

## Estrategias de branching

### Git Flow (clásico, equipos grandes)

```
main         ─────●────────────────●────────●────  (releases)
              ╲   ╱ ╲              ╱
develop   ────●─●────●────●───────●────────●───  (integración)
              ╲     ╱     ╲     ╱
feature        ●───●        ●───●     ← features
hotfix                          ╲ ╱
                                 ●  (volvió a main)
```

- **main**: producción
- **develop**: integración
- **feature/***: nuevas funcionalidades (de develop)
- **release/***: preparación (de develop, merge a main+develop)
- **hotfix/***: urgencias (de main, merge a main+develop)

### GitHub Flow (más simple)

1. main siempre deployable
2. Creas branch desde main
3. Commits + push
4. PR
5. Review + approval
6. Merge a main
7. Deploy automático

### Trunk-based development (más moderno, usado en FAANG)

- Todos commitean a main
- Branch de vida muy corta (< 1 día)
- Feature flags para WIP
- Deploy continuo

## Puntos clave

- git remote -v lista remotos. push envía, pull trae y merge, fetch solo descarga.
- Pull/Merge Requests: pide code review antes de integrar. Pequeños y enfocados.
- Git Flow: main + develop + features. GitHub Flow: solo main + branches cortas.
- Code review es colaboración, no crítica. Comentarios específicos y constructivos.

:::quiz
[
  {
    "question": "Como debe ser un buen Pull Request?",
    "options": ["Gigante para ahorrar tiempo", "Pequeno y enfocado para review rapida y rollback facil", "Sin descripcion", "Directo a main sin review"],
    "correctIndex": 1,
    "explanation": "PRs pequenos se revisan bien, se integran rapido y se revierten sin drama."
  },
  {
    "question": "Git Flow frente a GitHub Flow?",
    "options": ["Iguales", "Git Flow: main+develop+features (releases); GitHub Flow: main + ramas cortas (deploy continuo)", "GitHub Flow es mas lento", "Git Flow no usa ramas"],
    "correctIndex": 1,
    "explanation": "Elige segun tu cadencia: releases versionados (Flow) o deploy continuo (GitHub Flow)."
  },
  {
    "question": "Que hace util un comentario de review?",
    "options": ["Ser vago ('esto esta mal')", "Especifico y constructivo: que, por que y sugerencia", "Solo emojis", "Aprobar sin leer"],
    "correctIndex": 1,
    "explanation": "Senala el que y el por que, propone alternativa. Colaboracion, no critica."
  }
]
:::
