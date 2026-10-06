# Mind Mosaic v0.1.0: playable local core

Historical milestone record. For the current update, see [v0.2.0 validation](VALIDATION_0.2.0.md) and the repository README.

The user approved the design and requested the working core first, for local testing before polish. This milestone delivers the game loop, local multiplayer, GitHub source, and a Windows portable download. It does not claim the complete contest launch or a guaranteed judging score.

## Included

- Six-character room codes, names, readiness, 2–8 player seats, facilitator/shared display roles, late spectators, rematches, and unscored solo practice.
- Recall Rally, Focus Frenzy, and Team Mosaic. Four/six/ten rounds; scene, ordered-symbol, studied-fact, and attention tasks; private fragments, clue cards, votes, rotating captain, and team board.
- Server-owned timing/scoring, shared tie wins, team targets, classroom progression, reduced motion, optional sounds, and symbol-based attention variant.
- Source links, science explanations, personal/team reveals, scoreboards, and final memory mosaics.
- Seven starter collections: General Play and six institution-specific packs. **132 cards across presets**, with suitable facts reused across schools. CWRU 101 has 24; the other six collections have 18 each. The approved full launch library remains outstanding.
- Manual custom editor, local saving, JSON import/export, validation, and a frozen pack during a match.
- Local browser play, invitation QR/address, atomic checkpoints, fresh reconnect snapshots, host transfer, pause/restart, session revocation, and a Windows portable app with its own runtime.

## Validation completed

- Type checking and production browser/server/runtime builds pass.
- **36 automated cases pass**: full matches for each mode at every count from 2 through 8, scoring/ties, private visibility, future-prompt secrecy, captain/host restrictions, late/duplicate submissions, checkpoints/restores, disconnects, host transfer, removed sessions, custom pack constraints, and real WebSocket join/reconnect/rematch.
- [Burst smoke report](validation/load-smoke.json): **10 rooms / 80 simultaneously connected WebSocket clients**, complete four-round matches, disk checkpoints, reconnects and rematches. An accelerated clock on one Windows machine establishes a local burst baseline; WAN capacity, a 30-minute soak, and real eight-person fun/voice validation remain untested.
- The Windows portable executable successfully starts its bundled server and serves the frontend. Its background self-test verifies fallback to another available port when 4173 is occupied. Authenticode status is **NotSigned**. See [portable verification](validation/portable-smoke.json).
- Browser testing completed a four-round two-tab match: creation/join/readiness, study and recall, 100-point correct credit and zero for missing choices, reveals, host-driven progression, and final winner/mosaic. No captured browser errors or warnings. [Screenshot](validation/screenshots/final-mosaic.jpg).
- The browser’s viewport override did not change the observed 728px viewport. Narrow phone layouts remain to be tested on real devices or a browser with working viewport emulation.

## Playtest priorities

Start with a four-round General Play match, two devices, Standard challenge. Then try Team Mosaic and CWRU COGS 101. Observe:

1. Can everyone join and understand their next action without explanation?
2. Are study and recall timers comfortable on a phone?
3. Do the different round families feel meaningfully different?
4. Does Team Mosaic lead to useful conversation? Can the captain assemble the board quickly?
5. Do players want another match? Where does attention drop?

Track confusion and waiting time before adding more features. A syllabus supplied by the user can refine the CWRU 101 content.

## Still required for the final contest release

- Human playtests with eight players/different phones; measured WAN latency, network loss, and a longer soak test.
- Expand/review the approved 224-item course library, improve course-specific explanations and distractors, and align CWRU 101 with authorized syllabus material when supplied.
- Optional creator-only BYOK AI drafting with source review/cost consent, and optional online voice with secure-context, permission, phase, and failure handling.
- Public hosting, capacity/cost verification, cross-device browser QA, and accessibility polish driven by playtests.
- Final contest demo and submission evidence. Windows code signing is not configured.

## Operations

The source server stores checkpoints in `.data` by default; the portable app uses its Electron user-data directory. Custom packs use browser local storage. Core play, starter packs, and manual authoring work offline on a local network. Voice and AI are not implemented in this milestone.

Close the portable window to stop its server. For the source server started during development, stop its terminal or the process recorded in `artifacts/local/server.pid`. Never publish `.data`, local logs, or browser session credentials.
