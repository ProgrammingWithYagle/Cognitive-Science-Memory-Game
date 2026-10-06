# Mind Mosaic

A real-time memory party game for **2–8 players**, joining by room code from their own browsers.

**v0.2.0 is ready for local playtesting.** It fixes departure/rejoin freezes and adds manual question navigation, five difficulties, visible arrow/Stroop practice, a larger course studio, document imports, optional voice and optional creator-only AI drafting. [Download the Windows portable game](https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game/releases/tag/v0.2.0).

[Play the public preview](https://mind-mosaic-jsjx.onrender.com/). The free service can sleep when idle and lose rooms on restart. An eight-client online match, Leave and reconnect checks passed; human device and microphone playtests remain. Players need no hosting account.

## Play locally

Download the Windows portable package from [GitHub Releases](https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game/releases). Extract the ZIP and double-click the portable executable. No separate Node installation is needed. The app starts its own local server and shows an invitation link and QR code.

Other devices use the **network invitation address shown in the lobby**, on the same Wi-Fi/network. `localhost` opens the game only on the hosting computer. Keep the host app open. If Windows asks for network access, allow it for your trusted private network; some school/guest networks isolate devices. The package is currently unsigned.

Create a room, choose a mode, invite a friend, and have everyone ready up. The host starts. Solo **unscored practice** includes a scene and a **Try Focus clash** shortcut. An optional shared display watches without taking a player seat. Core play and manual authoring work offline.

## Three modes

| Mode | Loop | Scoring and finish |
| --- | --- | --- |
| Recall Rally | Study scenes, symbols and facts; try attention cues; answer privately; reveal together. | 100 per correct answer. Highest total wins; ties share the win. |
| Focus Frenzy | Study scenes/facts and answer timed prompts; also tackle conflicting attention cues. | 100 per correct answer plus a 0–25 speed bonus. Highest total wins; ties share the win. |
| Team Mosaic | Study private fragments or solve attention cues, recall privately, share clues, and let a rotating captain confirm six team answers. | 100 per correct team answer. Reach the selected accuracy goal; default 26/36 across six rounds. |

Wrong or unanswered choices score zero. No elimination. Six rounds are default, with four or ten available. Boards stay on the current question after selection: skip, revisit and revise with tabs or arrows before locking. Focus Frenzy uses separate timed prompts. Classroom mode lets the host advance the reveal manually.

| Difficulty | Scene/sequence load | Study and answer time |
| --- | ---: | ---: |
| Baby | 3 | 2× |
| Easy | 4 | 1.5× |
| Normal | 6 | 1× |
| Hard | 8 | 0.75× |
| Insane | 9 | 0.5× |

Every round retains six decisions. Fast-mode bonus bands scale with time allowances. Old Guided/Standard/Challenge checkpoints map to Easy/Normal/Hard. **Focus Clash appears in every mode**: choose the ink color of a displayed color word, or enable **Arrow positions instead of Stroop color words** and choose the side where the arrow is, ignoring its pointing direction.

The final mosaic shows this match’s recollections. These activities illustrate cognitive science; they do not measure intelligence or prove an experimental effect.

## Course content and customization

The studio lists **121 courses across nine universities**, including all **58 CWRU COGS** catalogue entries. **103 topic starter packs plus General Play** reuse **242 distinct cards**, including the fictional field notes. CWRU COGS 101 has 51 cards. Advanced/custom courses can use your own material. These are shared introductory starters, not complete or instructor-approved syllabi. See [coverage and primary sources](docs/CONTENT_LIBRARY.md).

Import TXT, Markdown, CSV/TSV glossary, DOCX or a text-based PDF; inspect extracted text, make local glossary drafts, or author manually. Evidence-backed drafts require review of every card before saving or playing. Packs save on the creator's device and import/export as versioned JSON. Custom packs need 6/12/18 distinct cards for four/six/ten rounds. Selected content is shared with the room.

Optional **OpenAI drafting** uses the creator's transient API key, explicit text-sharing/cost consent, a bounded request, source-passage checks and required factual review. Players never need a key. It has been tested with a simulated provider, not a paid real-model request. Optional **LiveKit voice** offers listening, hold-to-talk, host mute and quiet private phases. Its media/permissions have been tested with eight synthetic clients, not human microphones.

For a public game address, voice and AI configuration, follow the [online setup guide](docs/ONLINE_SETUP.md), also available from the game's **Online setup** menu. The Windows download does not create accounts or activate paid services; hosted previews are separate. Phones need HTTPS for microphone access. The included Render configuration is a free preview with ephemeral checkpoints; sustained events need an appropriate always-on/persistent hosting choice.

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
node tools/soak.mjs 30
```

Windows packaging after a build:

```sh
node node_modules/electron/install.js
pnpm package:win
```

The icon is included; regenerating it uses Pillow and `tools/generate-icon.py`.

## Reliability and privacy

The server owns timers, answer keys, scores and private fragments. Repeated answers cannot award extra points. Competitive play continues with remaining players after Leave. Team play restarts the unfinished round with redistributed clues; a temporary fragment-owner disconnect waits for reconnection or the 120-second seat expiry, then recovers automatically. Host control transfers immediately on Leave and after 15 seconds when disconnected. Completed scores survive checkpoint restoration; unfinished rounds restart. A returning player after explicit Leave watches until rematch.

Room checkpoints expire after an hour with no connected participants and omit chat history. They contain room session credentials and selected content and are excluded from Git/releases. Manual packs remain in browser storage until selected for a room. API keys are never saved in packs, browser storage, rooms or logs. The game does not record or transcribe voice. AI/provider and voice usage require the creator's configured services.

Validation: **188 tests**, a **30-minute local endurance test**, 80-client burst, eight-client synthetic voice and browser navigation/document checks. [Evidence and remaining checks](docs/VALIDATION_0.2.0.md), [original design plan](docs/CONTEST_GAME_PLAN.md), [third-party notices](THIRD_PARTY_NOTICES.md). Source and original vector art use the [MIT license](LICENSE). Human eight-person fun, different phones, WAN performance and paid AI quality still need playtests.
