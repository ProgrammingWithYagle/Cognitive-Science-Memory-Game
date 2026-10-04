import { build as viteBuild } from 'vite';
import { build } from 'esbuild';
await viteBuild();
await build({ entryPoints: ['src/server/main.ts'], outfile: 'dist/server.cjs', bundle: true, platform: 'node', target: 'node24', format: 'cjs', sourcemap: true });
await build({ entryPoints: ['src/server/server.ts'], outfile: 'dist/runtime.cjs', bundle: true, platform: 'node', target: 'node24', format: 'cjs' });
console.log('Browser, server, and portable runtime built.');
