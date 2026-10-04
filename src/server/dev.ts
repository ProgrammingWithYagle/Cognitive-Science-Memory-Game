import { createServer } from 'vite';
import path from 'node:path';
import { createGameServer } from './server';
const game = await createGameServer({ dataDir: path.resolve('.data') });
const vite = await createServer({ server: { middlewareMode: true, hmr: { server: game.http } }, appType: 'spa' });
game.app.use(vite.middlewares);
const port = await game.listen(Number(process.env.PORT ?? 4173));
console.log(`Mind Mosaic development: http://localhost:${port}`);
process.on('SIGINT', () => void Promise.all([game.close(), vite.close()]).then(() => process.exit(0)));
