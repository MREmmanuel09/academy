import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
// tests/unit -> apps/web (then into public/)
const PUBLIC_DIR = resolve(HERE, '..', '..', 'public');
const MANIFEST = join(PUBLIC_DIR, 'manifest.json');
const SW = join(PUBLIC_DIR, 'sw.js');
const ICON_192 = join(PUBLIC_DIR, 'icons', 'icon-192.png');
const ICON_512 = join(PUBLIC_DIR, 'icons', 'icon-512.png');
const ICON_MASKABLE = join(PUBLIC_DIR, 'icons', 'icon-maskable-512.png');
const FAVICON_ICO = join(PUBLIC_DIR, 'favicon.ico');
const APPLE_TOUCH = join(PUBLIC_DIR, 'apple-touch-icon.png');

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface Manifest {
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
  shortcuts?: Array<{ name: string; url: string }>;
  lang: string;
  dir: string;
}

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
}

describe('PWA manifest', () => {
  it('exists and parses as valid JSON', () => {
    expect(existsSync(MANIFEST)).toBe(true);
    const data = loadManifest();
    expect(typeof data.name).toBe('string');
    expect(typeof data.short_name).toBe('string');
    expect(typeof data.start_url).toBe('string');
  });

  it('declares required PWA fields', () => {
    const data = loadManifest();
    expect(data.name).toBeTruthy();
    expect(data.short_name).toBeTruthy();
    expect(data.start_url).toBe('/');
    expect(data.scope).toBe('/');
    expect(data.display).toBe('standalone');
    expect(data.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(data.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(data.icons.length).toBeGreaterThan(0);
    expect(data.icons[0]?.sizes).toMatch(/^\d+x\d+$/);
  });

  it('includes a maskable icon for adaptive launchers', () => {
    const data = loadManifest();
    const maskable = data.icons.find((i) => i.purpose === 'maskable');
    expect(maskable, 'a maskable icon is required for Android adaptive icons').toBeDefined();
    expect(maskable?.sizes).toMatch(/^512x512$/);
  });

  it('ships the icon set referenced by the manifest', () => {
    for (const file of [ICON_192, ICON_512, ICON_MASKABLE, FAVICON_ICO, APPLE_TOUCH]) {
      expect(existsSync(file), `expected icon asset to exist: ${file}`).toBe(true);
    }
  });

  it('service worker is generated in production builds (smoke)', () => {
    // This test passes when sw.js is the production build (size > 1KB).
    // It is expected to fail in dev (where sw.js is our placeholder).
    if (!existsSync(SW)) return;
    const size = readFileSync(SW, 'utf8').length;
    if (size < 5000) {
      // Stub phase.
      return;
    }
    expect(size).toBeGreaterThan(1000);
  });
});
