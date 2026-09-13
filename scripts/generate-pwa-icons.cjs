/**
 * Generates the PWA / app icon set from a single SVG source.
 *
 * Why a script: a clean monorepo should not commit binary icon assets to
 * source control. We keep the master artwork as a tiny SVG and render every
 * size we need (favicon, apple touch, PWA icons, maskable) on demand.
 *
 * Output:
 *   apps/web/public/favicon.ico
 *   apps/web/public/favicon-32.png
 *   apps/web/public/apple-touch-icon.png       (180x180)
 *   apps/web/public/icons/icon-192.png         (any purpose)
 *   apps/web/public/icons/icon-512.png         (any purpose)
 *   apps/web/public/icons/icon-maskable-512.png (maskable, with safe area)
 *
 * The "maskable" variant has 20% extra padding around the mark so the OS can
 * crop the icon to a circle / squircle without hiding the glyph.
 *
 * Run with:  node scripts/generate-pwa-icons.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'apps/web/public');
const ICONS = path.join(OUT, 'icons');

// Brand mark — a stylised "A" (Academy) on a deep-blue rounded square.
// Single source of truth: change the SVG here and re-run the script.
const LOGO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e40af"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <path d="M128 384 L256 128 L384 384 M168 312 L344 312"
        fill="none" stroke="#ffffff" stroke-width="36"
        stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="256" cy="416" r="14" fill="#ffffff"/>
</svg>
`.trim();

// Maskable variant: same artwork but with an extra 20% safe-area so the
// adaptive icon mask (iOS / Android) won't crop the glyph.
const LOGO_SVG_MASKABLE = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1e40af"/>
  <g transform="translate(102 102) scale(0.6)">
    <path d="M128 384 L256 128 L384 384 M168 312 L344 312"
          fill="none" stroke="#ffffff" stroke-width="36"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="256" cy="416" r="14" fill="#ffffff"/>
  </g>
</svg>
`.trim();

async function renderPng(svg, outPath, size) {
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`  ✔ ${path.relative(ROOT, outPath)}  (${size}x${size})`);
}

async function renderIco(svg, outPath) {
  // .ico containing two sizes (16, 32) — favicon.ico is what browsers ask for.
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map((size) =>
      sharp(Buffer.from(svg))
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer(),
    ),
  );

  // Minimal ICO container. Each entry: 16-byte ICONDIRENTRY + the PNG bytes.
  const headerSize = 6 + sizes.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(sizes.length, 4); // count

  let offset = headerSize;
  const blobs = [];
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const png = pngs[i];
    const entryOffset = headerSize - sizes.length * 16 + i * 16;
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 0); // width
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1); // height
    header.writeUInt8(0, entryOffset + 2); // colors
    header.writeUInt8(0, entryOffset + 3); // reserved
    header.writeUInt16LE(1, entryOffset + 4); // planes
    header.writeUInt16LE(32, entryOffset + 6); // bpp
    header.writeUInt32LE(png.length, entryOffset + 8); // size
    header.writeUInt32LE(offset, entryOffset + 12); // offset
    blobs.push(png);
    offset += png.length;
  }

  await fs.promises.writeFile(outPath, Buffer.concat([header, ...blobs]));
  console.log(`  ✔ ${path.relative(ROOT, outPath)}  (ico: ${sizes.join(', ')})`);
}

async function main() {
  await fs.promises.mkdir(ICONS, { recursive: true });
  console.log('Generating PWA icons:');

  await renderPng(LOGO_SVG, path.join(OUT, 'apple-touch-icon.png'), 180);
  await renderPng(LOGO_SVG, path.join(OUT, 'favicon-32.png'), 32);
  await renderPng(LOGO_SVG, path.join(ICONS, 'icon-192.png'), 192);
  await renderPng(LOGO_SVG, path.join(ICONS, 'icon-512.png'), 512);
  await renderPng(LOGO_SVG_MASKABLE, path.join(ICONS, 'icon-maskable-512.png'), 512);
  await renderIco(LOGO_SVG, path.join(OUT, 'favicon.ico'));

  console.log('Done.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
