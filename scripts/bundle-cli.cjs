// Bundle src/cli.ts into dist/flash-install.bundle.js using esbuild
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const entry = path.resolve(__dirname, '../src/cli.ts');
const outfile = path.resolve(__dirname, '../dist/flash-install.bundle.js');

esbuild.build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node18'],
  banner: {
    js: '#!/usr/bin/env node',
  },
  sourcemap: false,
  minify: false,
  external: ['react-devtools-core'],
}).then(() => {
  // Make the output file executable
  fs.chmodSync(outfile, 0o755);
  console.log('Bundled CLI to', outfile);
}).catch((err) => {
  console.error('esbuild bundling failed:', err);
  process.exit(1);
}); 