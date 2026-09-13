# Sprint L2 v0.4 content audit

The plan-level estimates for the Sprint L2 migration turned out to
match the source. Below is the breakdown of what the importer reads
from the v0.4 source tree at `D:\Proyectos\DevOps\Ingres\sprint-l2-v0.4_extracted\sprint-l2\`.

## Counts (all match the plan)

| Item               | Plan | Actual | Source breakdown                                  |
| ------------------ | ---- | ------ | ------------------------------------------------- |
| Arcs               | 6    | 6      | `content/arcs/{01..06}-*`                        |
| Episodes           | 30   | 30     | 5 per arc × 6 arcs = 30                          |
| Roleplays          | 18   | 18     | `content/roleplays/*.json` (excludes `schema.json`) |
| Games with data    | n/a  | 4      | `content/games/{false-friends,grammar,idioms-uk,listening}.json` |
| Games total (incl. UI placeholders) | 5 | 5 | 4 with data + 1 placeholder for `word-match` |
| Vocab              | 805  | 805    | `public/vocab.json`                               |
| Locales            | 9    | 10     | en, es, pt, fr (full), de, it, pl, zh, ja, ar (fallback to en) |

## Where the plan's "9 idiomas" differs

The plan said 9 locales, but the source ships 10 (`en` is also a
first-class locale in addition to the 9 L1s). We migrated all 10
because `en` is the default fallback for users who haven't selected
an L1.

## Game data shape

Sprint L2's `content/games/` directory has 4 JSON files. Two of the
five UI game routes (`speed-recall`, `word-match`) exist only as
React components in `src/app/learn/games/{speed-recall,word-match}/`
with no content data. The importer writes an empty placeholder for
`word-match.json` so the UI can render the route without crashing;
`speed-recall` is left out because the route is unused in v0.4.

## i18n extraction

We re-parse `src/lib/i18n.ts` as text (no imports) and pull each
`const XX: TranslationKeys = { ... }` block. Each locale file
becomes 109 keys under the `common` namespace. Locales without full
translations in the source (de, it, pl, zh, ja, ar) are written as
copies of the English file — exactly what the Sprint L2 runtime
does at `getTranslation(l1)`.

## Output layout

```
packages/content/src/english/
├── arcs/
│   ├── 01-aterrizaje/
│   │   ├── arc.json
│   │   ├── welcome.md
│   │   ├── taxi.md
│   │   ├── hotel.md
│   │   ├── cafe.md
│   │   └── directions.md
│   └── ... 5 more arcs × 5 episodes
├── roleplays/
│   ├── 01-cafe-order.json
│   └── ... 17 more
└── games/
    ├── false-friends.json
    ├── grammar.json
    ├── idioms-uk.json
    ├── listening.json
    └── word-match.json (placeholder)

packages/i18n/src/messages/
├── en.json (109 keys)
├── es.json (109 keys, ES overrides)
├── pt.json (109 keys, PT overrides)
├── fr.json (109 keys, FR overrides)
├── de.json (109 keys, EN fallback)
├── it.json (109 keys, EN fallback)
├── pl.json (109 keys, EN fallback)
├── zh.json (109 keys, EN fallback)
├── ja.json (109 keys, EN fallback)
└── ar.json (109 keys, EN fallback)

DB `vocab` table: 805 rows
```
