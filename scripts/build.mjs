import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function createIcon(size) {
  const rows = Buffer.alloc((size * 4 + 1) * size);
  const radius = size * 0.22;
  for (let y = 0; y < size; y += 1) {
    rows[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const px = (x + 0.5) / size;
      const py = (y + 0.5) / size;
      const cornerX = Math.max(radius - (x + 0.5), 0, x + 0.5 - (size - radius));
      const cornerY = Math.max(radius - (y + 0.5), 0, y + 0.5 - (size - radius));
      const inside = Math.hypot(cornerX, cornerY) <= radius;
      let color = inside ? [23, 23, 21, 255] : [0, 0, 0, 0];
      const circle = Math.hypot(px - 0.42, py - 0.4) < 0.2;
      const vx = 0.74 - 0.45;
      const vy = 0.74 - 0.45;
      const t = Math.max(0, Math.min(1, ((px - 0.45) * vx + (py - 0.45) * vy) / (vx * vx + vy * vy)));
      const tail = Math.hypot(px - (0.45 + t * vx), py - (0.45 + t * vy)) < 0.09 * (1 - t * 0.45);
      if (inside && (circle || tail)) color = [230, 93, 62, 255];
      if (inside && Math.hypot(px - 0.38, py - 0.34) < 0.055) color = [248, 245, 237, 255];
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      rows.set(color, offset);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const root = process.cwd();
const temp = path.join(root, 'dist', 'onboarding-build');
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await viteBuild({ configFile: path.join(root, 'vite.config.ts') });

for (const browser of ['chrome', 'firefox']) {
  const out = path.join(root, 'dist', browser);
  await mkdir(out, { recursive: true });
  await cp(temp, out, { recursive: true });
  await mkdir(path.join(out, 'icons'), { recursive: true });
  for (const size of [16, 32, 48, 128]) await writeFile(path.join(out, 'icons', `icon-${size}.png`), createIcon(size));
  await esbuild({
    entryPoints: [path.join(root, 'src/content/index.tsx')],
    outfile: path.join(out, 'content.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome109', 'firefox115'],
    minify: true,
    sourcemap: false,
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  await esbuild({
    entryPoints: [path.join(root, 'src/background/index.ts')],
    outfile: path.join(out, 'background.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome109', 'firefox115'],
    minify: true,
    sourcemap: false,
  });
  const base = JSON.parse(await readFile(path.join(root, 'src/manifest/base.json'), 'utf8'));
  base.background = browser === 'chrome'
    ? { service_worker: 'background.js' }
    : { scripts: ['background.js'] };
  if (browser === 'firefox') {
    base.browser_specific_settings = {
      gecko: {
        id: 'drawme@local',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
    };
  }
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(base, null, 2));
}
await rm(temp, { recursive: true, force: true });

// Keep the browser-specific packages while also making `dist` directly
// loadable in Chrome, since Chrome's picker commonly lands on that folder.
const chromeOut = path.join(root, 'dist', 'chrome');
for (const entry of await readdir(chromeOut)) {
  await cp(path.join(chromeOut, entry), path.join(root, 'dist', entry), { recursive: true });
}
