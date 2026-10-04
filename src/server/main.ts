import path from 'node:path';
import { createGameServer } from './server';
async function main() {
  const game = await createGameServer({ dataDir: process.env.DATA_DIR ?? path.resolve('.data'), clientDir: path.join(__dirname, 'client') });
  const port = await game.listen(Number(process.env.PORT ?? 4173));
  console.log(`Mind Mosaic is running at http://localhost:${port}`);
  process.on('SIGINT', () => void game.close().then(() => process.exit(0)));
  process.on('SIGTERM', () => void game.close().then(() => process.exit(0)));
}
void main().catch(e => { console.error(e.message); process.exitCode = 1; });
