import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { EXPECTED_COUNTS } from '../../../../scripts/sprint-l2/counts.js';
import { importEpisodes } from '../../../../scripts/sprint-l2/episodes.js';
import { importGames } from '../../../../scripts/sprint-l2/games.js';
import { importI18n } from '../../../../scripts/sprint-l2/i18n-extract.js';
import { importRoleplays } from '../../../../scripts/sprint-l2/roleplays.js';

function buildFixture(root: string): void {
  const arcs = join(root, 'content', 'arcs');
  mkdirSync(join(arcs, '01-aterrizaje'), { recursive: true });
  mkdirSync(join(arcs, '02-sobrevivir'), { recursive: true });

  // 3 episodes in arc 1.
  for (let i = 1; i <= 3; i += 1) {
    const slug = ['welcome', 'taxi', 'hotel'][i - 1] ?? 'x';
    writeFileSync(
      join(arcs, '01-aterrizaje', `episode-0${i}-${slug}.md`),
      `# Episode 1.${i}: ${slug}\n\n**Duration:** ~12 min\n**Target level:** A1\n\nWelcome to the episode.\n\n## Scene 1\n\nSome content here.\n`,
    );
  }
  // 2 episodes in arc 2.
  for (let i = 1; i <= 2; i += 1) {
    writeFileSync(
      join(arcs, '02-sobrevivir', `episode-0${i}-survive.md`),
      `# Episode 2.${i}\n\n**Duration:** ~10 min\n\nSurvival episode ${i}.\n`,
    );
  }

  // Roleplays.
  const rps = join(root, 'content', 'roleplays');
  mkdirSync(rps, { recursive: true });
  for (let i = 1; i <= 2; i += 1) {
    writeFileSync(
      join(rps, `rp-0${i}-cafe.json`),
      JSON.stringify({
        id: `rp-0${i}-cafe`,
        level: 'A1',
        title: 'Cafe',
        greeting: 'Hi',
        objectives: ['order'],
        vocabulary: ['coffee'],
      }),
    );
  }
  // One broken (missing fields).
  writeFileSync(join(rps, 'broken.json'), JSON.stringify({ id: 'broken' }));
  // A non-roleplay (index).
  writeFileSync(join(rps, 'schema.json'), JSON.stringify({ note: 'schema' }));

  // Games: 2 with data + 1 missing.
  const games = join(root, 'content', 'games');
  mkdirSync(games, { recursive: true });
  writeFileSync(join(games, 'false-friends.json'), JSON.stringify({ id: 'ff', rounds: [] }));
  writeFileSync(join(games, 'grammar.json'), JSON.stringify({ id: 'gr', categories: [] }));

  // i18n: a minimal but realistic stub.
  const lib = join(root, 'src', 'lib');
  mkdirSync(lib, { recursive: true });
  writeFileSync(
    join(lib, 'i18n.ts'),
    `
      const EN: TranslationKeys = {
        appName: 'Sprint L2',
        loading: 'Loading...',
        back: 'Back',
      };
      const ES: TranslationKeys = {
        ...EN,
        loading: 'Cargando...',
        back: 'Atrás',
      };
      const PT: TranslationKeys = {
        ...EN,
        loading: 'Carregando...',
      };
      const FR: TranslationKeys = {
        ...EN,
        loading: 'Chargement...',
      };
    `,
  );
}

describe('sprint-l2 importer — fixture-based', () => {
  let sourceDir: string;
  let targetDir: string;
  let i18nFile: string;
  let i18nTarget: string;

  // For the i18n test we need a separate source with the i18n file.
  let i18nSourceDir: string;

  it('imports episodes, roleplays, games, and i18n correctly', () => {
    sourceDir = mkdtempSync(join(tmpdir(), 'sprint-l2-src-'));
    targetDir = mkdtempSync(join(tmpdir(), 'sprint-l2-out-'));
    i18nSourceDir = mkdtempSync(join(tmpdir(), 'sprint-l2-i18n-'));
    buildFixture(sourceDir);

    // The i18n test uses a separate source because the episode source
    // doesn't have src/lib/i18n.ts.
    buildFixture(i18nSourceDir);
    i18nFile = join(i18nSourceDir, 'src', 'lib', 'i18n.ts');
    i18nTarget = mkdtempSync(join(tmpdir(), 'sprint-l2-msgs-'));

    // Episodes.
    const eReport = importEpisodes({ source: sourceDir, target: targetDir });
    expect(eReport.arcs).toBe(2);
    expect(eReport.episodes).toBe(5);

    // Episode files exist with frontmatter.
    const epFile = join(targetDir, 'english', 'arcs', '01-aterrizaje', 'welcome.md');
    expect(existsSync(epFile)).toBe(true);
    const content = readFileSync(epFile, 'utf8');
    expect(content).toContain('id: ep-aterrizaje-01');
    expect(content).toContain('level: A1');
    expect(content).toContain('# Episode 1.1: welcome');

    // Arc metadata.
    const arcFile = join(targetDir, 'english', 'arcs', '01-aterrizaje', 'arc.json');
    expect(existsSync(arcFile)).toBe(true);
    const arc = JSON.parse(readFileSync(arcFile, 'utf8')) as { slug: string; order: number };
    expect(arc.slug).toBe('01-aterrizaje');
    expect(arc.order).toBe(0);

    // Roleplays.
    const rReport = importRoleplays({ source: sourceDir, target: targetDir });
    expect(rReport.copied).toBe(2);
    expect(rReport.skipped).toBe(1); // the broken.json

    // Games.
    const gReport = importGames({ source: sourceDir, target: targetDir });
    expect(gReport.copied).toBe(2);
    // 1 placeholder (word-match) added even though source has no data for it.
    expect(gReport.placeholders).toBe(1);
    expect(existsSync(join(targetDir, 'english', 'games', 'word-match.json'))).toBe(true);

    // i18n.
    const iReport = importI18n({ source: i18nFile, target: i18nTarget });
    expect(iReport.locales).toBe(10);
    const en = JSON.parse(readFileSync(join(i18nTarget, 'en.json'), 'utf8')) as {
      common: { appName: string; loading: string };
    };
    expect(en.common.appName).toBe('Sprint L2');
    expect(en.common.loading).toBe('Loading...');
    const es = JSON.parse(readFileSync(join(i18nTarget, 'es.json'), 'utf8')) as {
      common: { loading: string; back: string };
    };
    expect(es.common.loading).toBe('Cargando...');
    expect(es.common.back).toBe('Atrás');
  });

  it('is idempotent: running the roleplay import twice does not duplicate', () => {
    const r1 = importRoleplays({ source: sourceDir, target: targetDir });
    expect(r1.copied).toBe(2);
    const r2 = importRoleplays({ source: sourceDir, target: targetDir });
    expect(r2.copied).toBe(2);
    // The broken roleplay is skipped both times — that's fine, the
    // behaviour is deterministic and the target files are unchanged.
    expect(r2.skipped).toBe(1);
  });

  it('exports the documented Sprint L2 v0.4 counts', () => {
    expect(EXPECTED_COUNTS.episodes).toBe(30);
    expect(EXPECTED_COUNTS.arcs).toBe(6);
    expect(EXPECTED_COUNTS.roleplays).toBe(18);
    expect(EXPECTED_COUNTS.gamesWithData).toBe(4);
    expect(EXPECTED_COUNTS.gamesTotal).toBe(5);
    expect(EXPECTED_COUNTS.vocab).toBe(805);
    expect(EXPECTED_COUNTS.locales).toBe(10);
  });
});

afterAll(() => {
  // best-effort cleanup
});
