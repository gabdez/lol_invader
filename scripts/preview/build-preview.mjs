// Dev-only: builds a browser preview of the UI (dist-preview/) with a mocked Electron bridge.
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

mkdirSync('dist-preview', { recursive: true });
await build({ entryPoints: ['scripts/preview/bridge.ts'], outfile: 'dist-preview/bridge.js', bundle: true, format: 'iife' });
await build({ entryPoints: ['src/renderer/app.ts'], outfile: 'dist-preview/app.js', bundle: true, format: 'iife' });
cpSync('src/renderer/styles.css', 'dist-preview/styles.css');
const html = readFileSync('src/renderer/index.html', 'utf8').replace('<script src="app.js"></script>', '<script src="bridge.js"></script>\n    <script src="app.js"></script>');
writeFileSync('dist-preview/index.html', html);
console.log('Preview built in dist-preview/index.html');
