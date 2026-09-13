---
id: git-1
slug: git-1
title: Git fundamentals
module: devops
difficulty: beginner
estimatedMinutes: 5
xp: 60
---

# Git fundamentals

Sistema de control de versiones distribuido. init, add, commit, status, log.

## ¿Qué es Git?

**Git** es un sistema de control de versiones distribuido creado por Linus Torvalds en 2005. Permite:

- Rastrear cambios en archivos a lo largo del tiempo
- Colaborar con múltiples personas en el mismo código
- Volver a versiones anteriores
- Ramificar (branch) para experimentar sin romper

**Conceptos clave**:
- **Working directory**: tus archivos actuales
- **Staging area** (index): archivos marcados para el próximo commit
- **Repository** (.git): historial completo de cambios
- **Commit**: snapshot del estado en un momento dado
- **Branch**: línea de desarrollo independiente
- **Remote**: copia del repo en otro servidor (GitHub, GitLab)

**Flujo básico**:
```
working dir  →  staging  →  repository
   edit          add          commit
```

## Configuración inicial

```bash
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
git config --global init.defaultBranch main
git config --global pull.rebase true

# Editor
git config --global core.editor "vim"
git config --global core.editor "code --wait"   # VS Code

# Diff y merge tools
git config --global merge.tool vimdiff

# Alias útiles
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --all"
```

## Comandos básicos

### Inicializar o clonar

```bash
git init                              # crear repo nuevo
git clone https://github.com/user/repo.git
git clone https://github.com/user/repo.git my-folder
```

### El ciclo de trabajo

```bash
git status                            # qué cambió
git add archivo.txt                   # añadir al staging
git add .                             # añadir todo
git add -p                            # interactivo (hunks)
git commit -m "Mensaje descriptivo"
git commit -am "Mensaje"              # add tracked + commit
```

### Inspeccionar

```bash
git log                               # historial
git log --oneline                     # compacto
git log --oneline --graph --all       # visual
git log -p archivo.txt                # con diff
git show abc123                       # un commit específico
git diff                              # working dir vs staging
git diff --staged                     # staging vs último commit
git diff HEAD~1 HEAD                  # entre commits
```

### .gitignore

Archivo que lista qué NO trackear:

```
node_modules/
*.log
.env
.DS_Store
dist/
build/
```

> **Tip**: hay plantillas en [github.com/github/gitignore](https://github.com/github/gitignore) para cada lenguaje.

## Puntos clave

- Git es un VCS distribuido. Tres áreas: working dir, staging, repository.
- Ciclo: edit → add → commit. Usa `git status` constantemente.
- `.gitignore` evita trackear archivos generados o sensibles.
- Mensajes de commit claros son documentación para el futuro.

:::quiz
[
  {
    "question": "What is the staging area in Git?",
    "options": ["Where committed code is stored", "Files marked for inclusion in the next commit", "A temporary backup folder", "The remote repository"],
    "correctIndex": 1,
    "explanation": "The staging area (also called the index) is where you place files that you want to include in the next commit."
  },
  {
    "question": "What does `git add .` do?",
    "options": ["Creates a new commit", "Stages all changes in the working directory", "Pushes code to the remote", "Deletes untracked files"],
    "correctIndex": 1,
    "explanation": "The `git add .` command stages all modified and new files in the current directory, preparing them for the next commit."
  },
  {
    "question": "What is a commit in Git?",
    "options": ["A branch name", "A snapshot of the repository state at a given moment", "A remote server", "A merge conflict"],
    "correctIndex": 1,
    "explanation": "A commit is a snapshot of the repository at a specific point in time, capturing the state of all tracked files."
  }
]
:::
