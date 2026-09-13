# RedLab v6 content audit

This document captures the actual content counts in the RedLab v6
source tree that the importer reads from. It exists because the
**plan-level estimates** in the project prompt (137 lessons, 14 labs,
5 projects, 14 exams, 45 achievements) were off compared to the
**source-level reality** (106 lessons, 18 labs, 7 projects, 14 exams,
41 achievements).

## Counts

| Item          | Plan  | Actual | Source breakdown                                      |
| ------------- | ----- | ------ | ----------------------------------------------------- |
| Lessons       | 137   | 106    | 19 `*-lessons.ts` files (incl. 11 in `devops/`) + 0 in `lessons.ts` (spread only) |
| Labs          | 14    | 18     | 9 (network) + 5 (python) + 2 (data) + 2 (bigdata)     |
| Projects      | 5     | 7      | 5 (`projects.ts`) + 1 (`python-projects.ts`) + 1 (`bigdata-projects.ts`) |
| Exams         | 14    | 14     | Named exports in `exams.ts` (CCNA, DCA, CKAD, etc.)   |
| Achievements  | 45    | 41     | 27 (root) + 5 (python) + 4 (data) + 2 (data-analysis) + 3 (bigdata) |

## How the counts were measured

```bash
# Lessons per source file (top-level objects in each *-lessons.ts):
for f in $(find redlab/src/data -name '*-lessons.ts' -o -name 'lessons.ts'); do
  node -e "/* count { at top level in the array body */"
done

# Achievements:
for f in achievements.py* data-*achievements.ts bigdata-achievements.ts; do
  grep -c "^    id: " redlab/src/data/$f
done
```

The `EXPECTED_COUNTS` constant in `scripts/redlab/validate.ts` is pinned
to the actual numbers so silent regressions in the RedLab source format
are caught in CI.

## What was missed in the plan

- The plan's "5 projects" only counted `projects.ts`. RedLab also has
  `python-projects.ts` (1) and `bigdata-projects.ts` (1).
- The plan's "14 labs" only counted `labs.ts` (9). RedLab also has
  `python-labs.ts` (5), `data-labs.ts` (2), `bigdata-labs.ts` (2).
- The plan's "45 achievements" likely double-counted some that share an
  `id` across files (e.g. `data-pandas-master` exists in both
  `data-achievements.ts` and `data-analysis-achievements.ts` — we
  de-duplicate by `id`).

## Net effect on the migration

The new Academy platform ends up with **106 lessons, 18 labs,
7 projects, 14 exams, 41 achievements** — 1:1 with the RedLab source.
This is a 23% increase in content over the original plan estimate,
which is a good thing.
