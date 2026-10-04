# Mind Mosaic

A real-time memory party game for **2–8 players**, joining by room code from their own browsers.

**v0.1.0 is the playable local core.** The match loop and Windows portable app are ready for playtesting. The final contest release will add the larger reviewed content library, online hosting, optional voice, and optional creator-only AI drafting.

## Play locally

Download the Windows portable package from [GitHub Releases](https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game/releases). Extract the ZIP and double-click the portable executable. No separate Node installation is needed. The app starts its own local server and shows an invitation link and QR code.

Other devices use the **network invitation address shown in the lobby**, on the same Wi-Fi/network. `localhost` opens the game only on the hosting computer. Keep the host app open. If Windows asks for network access, allow it for your trusted private network; some school/guest networks isolate devices. The package is currently unsigned.

Create a room, choose a mode, invite a friend, and have everyone ready up. The host starts. You can also try one **unscored practice round** on your own. An optional shared display watches without taking a player seat.

## Three modes

| Mode | Loop | Scoring and finish |
| --- | --- | --- |
| Recall Rally | Study scenes, ordered symbols, and facts; answer privately; reveal together. | 100 per correct answer. Highest total wins; ties share the win. |
| Focus Frenzy | Study scenes/facts and answer timed prompts; also tackle conflicting attention cues. | 100 per correct answer plus a 0–25 speed bonus. Highest total wins; ties share the win. |
| Team Mosaic | Study private fragments, recall privately, share clues, and let a rotating captain confirm six team answers. | 100 per correct team answer. Reach the selected accuracy goal; default 26/36 across six rounds. |

Wrong or unanswered choices score zero. No elimination. Six rounds are the default, with four or ten available. Guided and Challenge settings change memory load and time allowances; speed-bonus time bands scale with those allowances. Classroom mode lets the host advance the reveal manually.

The final mosaic shows this match’s recollections. These activities illustrate cognitive science; they do not measure intelligence or prove an experimental effect.

## Course content and customization

General Play uses fictional field notes. Topic-aligned starters cover CWRU COGS 101, 102, 201, and 202; UCSD COGS 1; and IU COGS-Q 101. CWRU 101 contains 24 cards; each other collection has 18. Presets use public course descriptions and cited introductory material, and are not instructor-approved syllabi.

Content Studio edits cards, saves packs on the creator’s device, and imports/exports versioned JSON. Custom packs need at least 6 cards for four rounds, 12 for six, and 18 for ten. Selected content is shared with the room. No AI subscription or API key is required to play or author manually.

## Run from source

Use Node.js 24+ and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Open **http://localhost:4173**. `pnpm dev` serves the same room system with live frontend updates. `PORT` changes the port; `DATA_DIR` changes the private checkpoint directory. The server listens on all network interfaces for local multiplayer.

```sh
pnpm typecheck
pnpm test
pnpm build
node tools/load-smoke.mjs
```

Windows packaging after a build:

```sh
node node_modules/electron/install.js
pnpm package:win
```

The icon is included; regenerating it uses Pillow and `tools/generate-icon.py`.

## Reliability and privacy

The server owns timers, answer keys, scores, and private fragments. Repeated answers cannot award extra points. Reconnects fetch a fresh snapshot; seats remain reserved for 120 seconds and host control transfers after 15 seconds. Fewer than two connected players pauses a scored match. Team play also pauses when a fragment owner disconnects. Completed scores survive a checkpoint restore; an unfinished round restarts with refreshed content/choices.

Room checkpoints expire after an hour with no connected participants and omit chat history. Local checkpoints contain room session credentials and selected content; they are excluded from Git and releases. Manual packs stay in browser storage until selected for a room. This core has no microphone access, AI calls, telemetry, or accounts.

See [core scope and validation](docs/CORE_BUILD.md), [design plan](docs/CONTEST_GAME_PLAN.md), and [third-party notices](THIRD_PARTY_NOTICES.md). Source and original vector art use the [MIT license](LICENSE).
