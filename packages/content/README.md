# @academy/content — content layout

This package holds the static content (lessons, labs, projects, exams,
achievements) that gets imported into the DB by `scripts/import-redlab.ts`
(Fase 3) and `scripts/import-sprint-l2.ts` (Fase 4).

## Directory layout (post-Fase 3)

```
packages/content/src/
├── courses/
│   ├── networking/                     # RedLab v6 module 1-9
│   │   ├── course.json                 # course metadata
│   │   ├── units/
│   │   │   ├── fundamentos/
│   │   │   │   ├── unit.json
│   │   │   │   ├── lessons/
│   │   │   │   │   ├── f-osi.md
│   │   │   │   │   ├── f-osi.meta.json
│   │   │   │   │   └── ...
│   │   │   │   ├── labs/
│   │   │   │   │   ├── lab-vlan.md
│   │   │   │   │   └── lab-vlan.steps.json
│   │   │   │   └── exams/
│   │   │   │       └── fundamentals-exam.json
│   │   │   └── ...
│   │   └── projects/
│   │       ├── p-vpn.md
│   │       └── p-vpn.deliverables.json
│   ├── devops/                         # RedLab v6 DevOps
│   ├── python/                         # RedLab v6 Python
│   ├── data/                           # RedLab v6 Data Analytics
│   └── bigdata/                        # RedLab v6 Big Data
├── achievements/
│   ├── networking.json                 # declarative rules
│   ├── devops.json
│   ├── python.json
│   ├── data.json
│   └── bigdata.json
└── ...
```

## File formats

- **`<slug>.md`**: lesson body in Markdown.
- **`<slug>.meta.json`**: lesson metadata (title, module, difficulty, XP, keyTakeaways).
- **`<lab-slug>.md`**: lab overview + objective.
- **`<lab-slug>.steps.json`**: ordered list of step instructions + hints.
- **`<project-slug>.md`**: project scenario + goal.
- **`<project-slug>.deliverables.json`**: array of deliverables + tech list.

## Frontmatter

Markdown files include a tiny YAML frontmatter for the metadata that
matters at import time (id, slug, version). The `.meta.json` files hold
anything we don't want in the rendered Markdown (e.g. keyTakeaways list).
