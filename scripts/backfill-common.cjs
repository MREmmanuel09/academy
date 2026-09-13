/**
 * One-off backfill: adds the `common.xp` and `common.lessons` keys
 * that the dashboard and achievements pages reference via
 * `useTranslations('common')`. The keys were always missing from
 * the catalogue but the dev server swallowed the warning; the prod
 * build surfaces it.
 */
const fs = require('node:fs');
const path = require('node:path');

const MESSAGES = path.resolve(__dirname, '..', 'packages/i18n/src/messages');

const COMMON = {
  es: { xp: 'XP', lessons: 'lecciones' },
  en: { xp: 'XP', lessons: 'lessons' },
  pt: { xp: 'XP', lessons: 'aulas' },
  fr: { xp: 'XP', lessons: 'leçons' },
  de: { xp: 'EP', lessons: 'Lektionen' },
  it: { xp: 'XP', lessons: 'lezioni' },
  pl: { xp: 'PD', lessons: 'lekcje' },
  zh: { xp: '经验', lessons: '课程' },
  ja: { xp: 'XP', lessons: 'レッスン' },
  ar: { xp: 'نقاط', lessons: 'دروس' },
};

for (const locale of Object.keys(COMMON)) {
  const file = path.join(MESSAGES, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.common) data.common = {};
  Object.assign(data.common, COMMON[locale]);
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  ✔ ${locale}.json (added common.xp + common.lessons)`);
}
console.log('Done.');
