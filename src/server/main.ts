import path from "node:path";
import { createGameServer } from "./server";
import { readVoiceConfig } from "./voice";
async function main() {
  const game = await createGameServer({
    dataDir: process.env.DATA_DIR ?? path.resolve(".data"),
    clientDir: path.join(__dirname, "client"),
    voice: readVoiceConfig(process.env),
    publicOrigin: process.env.PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL,
    trustProxy: process.env.TRUST_PROXY === "1",
  });
  const port = await game.listen(Number(process.env.PORT ?? 4173));
  console.log(`Mind Mosaic is running at http://localhost:${port}`);
  process.on("SIGINT", () => void game.close().then(() => process.exit(0)));
  process.on("SIGTERM", () => void game.close().then(() => process.exit(0)));
}
void main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
