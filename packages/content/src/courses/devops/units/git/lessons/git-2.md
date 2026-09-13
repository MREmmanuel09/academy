---
id: git-2
slug: git-2
title: Branches, merge y rebase
module: devops
difficulty: intermediate
estimatedMinutes: 5
xp: 75
---

# Branches, merge y rebase

Trabajar en paralelo, integrar cambios, resolver conflictos.

## Branches

Una **branch** es una línea de desarrollo independiente. Por defecto, `main` (antes `master`).

```bash
git branch                            # listar
git branch feature-x                  # crear
git checkout feature-x                # cambiar
git checkout -b feature-x             # crear y cambiar
git switch feature-x                  # comando nuevo
git switch -c feature-y               # crear y cambiar (nuevo)

git branch -d feature-x               # borrar (si merged)
git branch -D feature-x               # forzar delete

git branch -r                         # remotos
git branch -a                         # todos
```

### Naming conventions

- `feature/nombre-descriptivo` - nueva funcionalidad
- `fix/bug-123` - corrección de bug
- `hotfix/critical` - arreglo urgente en producción
- `chore/limpiar-codigo` - tareas
- `release/v1.2.0` - preparación de release

## Merge

```bash
```bash
git checkout main
git merge feature-x                   # fast-forward o merge commit
git merge --no-ff feature-x           # siempre crea merge commit
git merge --squash feature-x          # todos los commits en uno
```

**Tipos de merge**:
- **Fast-forward**: la rama objetivo no avanzó, simplemente se mueve el puntero
- **3-way merge**: ambas ramas avanzaron, se crea merge commit

### Conflictos

Cuando los mismos archivos cambiaron en ambas ramas:

```bash
git merge feature-x
# Auto-merging archivo.txt
# CONFLICT (content): Merge conflict in archivo.txt
# Automatic merge failed; fix conflicts and then commit the result.

git status                            # ver archivos en conflicto
```

Editas el archivo y ves:

```
<<<<<<< HEAD
tu versión
=======
versión de feature-x
>>>>>>> feature-x
```

Resuelves manualmente, luego:

```bash
git add archivo.txt
git commit                            # completa el merge
git merge --abort                      # cancelar
```

### Herramientas visuales

```bash
git mergetool                         # abre tu merge tool
```

O usa VS Code, GitKraken, Sourcetree, GitHub Desktop.

## Rebase

**Rebase** reescribe la historia: toma tus commits y los \"reproduce\" sobre otra rama.

```bash
git checkout feature-x
git rebase main                       # mis commits ahora van después de main
git rebase -i HEAD~3                  # interactivo, últimos 3 commits
```

**¿Cuándo usar merge vs rebase?**

| Merge | Rebase |
|-------|--------|
| Preserva historia real | Historia lineal |
| Bueno para ramas compartidas | Solo para ramas locales |
| Crea merge commit | Reescribe commits (cambia SHA) |
| Default seguro | Requiere disciplina |

**Regla de oro**: NUNCA hagas rebase de commits que ya están en ramas públicas (compartidas con otros).

### Rebase interactivo

```bash
git rebase -i HEAD~5
```

Abre editor con lista de commits. Comandos:
- `pick`: mantener
- `reword`: cambiar mensaje
- `edit`: pausar para modificar
- `squash`: combinar con el anterior
- `drop`: eliminar

Útil para limpiar commits antes de PR.

## Puntos clave

- Branches permiten trabajo paralelo. -b crea y cambia, -d borra (merged).
- Merge integra cambios preservando historia. Rebase lineariza reescribiendo.
- Conflictos se resuelven editando marcadores <<<, ===, >>> en el archivo.
- Regla de oro: rebase solo en ramas locales, nunca en commits compartidos.

:::quiz
[
  {
    "question": "Merge frente a rebase: cual es la diferencia?",
    "options": ["No hay", "Merge preserva historia con commit de union; rebase lineariza reescribiendo", "Rebase es para remotos", "Merge borra ramas"],
    "correctIndex": 1,
    "explanation": "Merge conserva el grafo real; rebase reescribe commits en linea recta (historia limpia, con riesgo)."
  },
  {
    "question": "Como se resuelve un conflicto?",
    "options": ["Borrando el repo", "Editando los marcadores <<<, ===, >>> eligiendo el codigo final", "Con push --force siempre", "Ignorandolo"],
    "correctIndex": 1,
    "explanation": "Abres el archivo, decides el resultado entre marcadores, marcas resuelto y continuas."
  },
  {
    "question": "Cuando esta prohibido el rebase?",
    "options": ["En ramas locales propias", "En commits ya compartidos/pusheados (reescribe historia ajena)", "Los lunes", "Con merges pequenos"],
    "correctIndex": 1,
    "explanation": "Reescribir historia publicada rompe a quien ya la bajo. Regla de oro."
  }
]
:::
