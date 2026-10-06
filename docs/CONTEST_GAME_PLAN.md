# Mind Mosaic: approved game and contest delivery plan

Status: approved for implementation by the user on October 4, 2026. This records the original plan. User-requested v0.2.0 follow-ups add Baby/Easy/Normal/Hard/Insane, manual question navigation, arrow-location answers and attention rounds in every mode, larger course authoring, optional voice and AI. See VALIDATION_0.2.0.md for current scope/evidence. Full contest launch work remains. The calendar is a planning reference, not a waiting requirement.

## 1. Product and contest target

Build a real-time memory party game for 2-8 players. Everyone uses their own phone or laptop, joins with a six-character room code, and needs no account or installation. A host can play or facilitate; an optional shared display does not consume a player seat. Deliver the public browser game, a Windows portable edition, and the complete project in the existing GitHub repository.

The working title is **Mind Mosaic**. The central moment is a reveal that reconstructs a scene from players' recollections: what everyone remembered, where memories differed, and what the team recovered through discussion. Play comes first, followed by a short explanation connected to the experience. The primary audience is college students with or without cognitive-science knowledge; a reading-light preset supports younger and less experienced players.

Aim for level 5 in all four equally weighted contest categories: Execution, Creativity, Usefulness / Value, and Polish & Thoughtfulness. These are targets, not promised judging outcomes. Treat the supplied contest document as the source of entry requirements and rubric; the product decisions below come from our conversation.

The [mission](https://joinhandshake.com/learn/create-a-multiplayer-game-8d7d59b5/) requires a public, reusable room-code game. The official rules specify a title, cover image, description, and project URL. Their deadline is **October 30, 2026, 11:59 PM Pacific**, equivalent to **October 31, 2:59 AM Eastern**. Plan for an October 28 release and an October 29 submission rather than the marketing page's less precise October 31 date.

## 2. Proposed rules, scoring, and settings

### Common match flow

1. Host selects a mode, content pack, difficulty, and match length. Players enter nicknames and see the chosen rules before readying up.
2. Offer a 30-second introduction and one optional, unscored practice round. Start with 2-8 ready players.
3. Play six rounds by default, with four- and ten-round alternatives. Each round contains six scored decisions. Default matches should take roughly 8-12 minutes; classroom pauses can extend them.
4. In memory rounds, study an image, sequence, or set of facts; the material disappears before answering. Course rounds teach the necessary information before testing recall, so prior course knowledge is not required.
5. Keep individual answers private during play. Reveal answers, scores, and a short explanation after the round. The final screen shows the winner or team result, the memory mosaic, and a rematch button.

No elimination, score penalties, or global ability rankings. Incorrect, missing, and late answers earn zero. Competitive submissions lock when sent; team proposals remain editable until the captain locks the board or time expires. Rematches retain the room and settings but use fresh scenes and questions. Do not repeat curated questions within a match.

Initial defaults are Recall Rally, six rounds, Standard difficulty, brief explanations, General Play, and a playing host. The course picker initially highlights CWRU COGS 101. Settings remain fixed during a match. Before starting, validate that the selected content/topics supply enough distinct questions; if they do not, explain how to broaden topics, add content, or shorten the match.

### Three distinct modes

| Mode | Gameplay | Scoring and ending |
| --- | --- | --- |
| **Recall Rally** | Friendly individual play: two scene rounds, two sequence/grouping rounds, and two studied-fact rounds. General Play substitutes everyday facts for course content. | 100 points per correct decision, with no speed bonus. After the selected rounds, the highest total wins; tied players share the win. Default maximum: 3,600 points. |
| **Focus Frenzy** | Fast individual play: two scene-memory rounds, two attention/interference rounds, and two studied-fact rounds. In attention trials, choose the relevant property while ignoring a conflicting cue. | Correct answers earn 100 points plus a 0-25 speed bonus; errors earn zero. Highest total wins after the selected rounds; ties are shared. Default maximum: 4,500 points. |
| **Team Mosaic** | Cooperative play: two split-scene rounds, two shared-sequence rounds, and two split-fact rounds. Players first record their own recollections, then exchange remembered clue cards, vote, and complete a shared six-answer board. A rotating captain confirms the answers. | One team score: 100 points per correct final answer. Default goal is at least 70% correct over the complete match: 26 of 36 decisions. Host can select 60% or 85%; required correct answers are rounded up. Everyone wins or loses together; private recall is unscored. |

Randomize the order of rounds while retaining the stated family counts for six-round matches. Four-round matches contain one round from each family plus one additional scene round; ten-round matches contain three from each family plus one additional scene round. In cooperative play, every player receives a useful fragment, every target fact is available to at least one player, and larger groups receive some overlapping information. Discussion shares remembered answers, not a replay of the original stimuli. Captaincy rotates through connected players in joining order.

### Timing and difficulty

Standard timing: 3-second countdown; 8-second visual study or 30-second course/everyday fact study; 45 seconds for Recall Rally's answer board; six 8-second prompts in Focus Frenzy; 15-second private recall followed by 45-second discussion in Team Mosaic; 12-second brief reveal. Attention trials have instructions and a countdown rather than a study phase. Fact study uses six concise cue/fact pairs, not paragraphs of lecture notes.

Guided difficulty multiplies study and answer/discussion windows by 1.5; Challenge multiplies them by 0.75. Round each duration upward to whole seconds. Visual/sequence load is 4, 6, or 8 objects/symbols for Guided, Standard, or Challenge. All presets retain six scored decisions. Learning depth and reading level are separate settings; picking a higher course number does not change difficulty.

The Standard fast-mode bonus is `max(0, 25 - 5 * floor(t))`, where `t` is seconds from the server's prompt start to receipt of an accepted answer. Normalize `t` by the difficulty time multiplier in the other presets. Use broad second bands rather than millisecond races; the server owns all timing and scoring. Display the speed rule before the match. Classroom presentation changes reveal advancement to a host-controlled next-round button and does not pause competitive answer timers.

### Host and accessibility options

- Mode, 4/6/10 rounds, Guided/Standard/Challenge, General Play or school/course/topic selection, brief or classroom explanations, individual-device or shared-display presentation, and playing host or facilitator.
- Cooperative communication: clue cards and voting always work; optionally add text chat or online voice. Competitive chat is available in the lobby and between rounds; cooperative discussion opens after private recall. Host can mute or remove a participant.
- Support touch, keyboard navigation, visible focus, at least 44-pixel touch targets, readable contrast, larger text, muted sound, and reduced decorative motion. Use symbols alongside colors. A reading-light alternative replaces word/color interference with a clearly labeled symbol-based attention task.
- The shared display shows public timers, boards, results, and explanations. Private study fragments, unrevealed individual answers, and future answer keys remain on the appropriate devices/server.

## 3. Course content, scientific accuracy, and authoring

### Initial content library

Ship General Play plus six school-specific introductory topic packs, labeled with institution, exact course code/title, catalogue year, coverage, sources, and review status. Give **CWRU COGS 101** the strongest content and presentation focus.

| Institution | Course | Pack emphasis |
| --- | --- | --- |
| Case Western Reserve University | COGS 101: Introduction to Cognitive Science | Memory, categorization, language, brain fundamentals, AI, and problem solving. |
| Case Western Reserve University | COGS 102: Introduction to Cognitive Neuroscience | Relationships between cognition and brain processes, plus research methods. |
| Case Western Reserve University | COGS 201: Human Cognition in Evolution and Development | Evolutionary and developmental timescales of cognition. |
| Case Western Reserve University | COGS 202: Cognition and Culture | Cultural practices, variation, commonalities, and their relationships with cognition. |
| UC San Diego | COGS 1: Introduction to Cognitive Science | An introductory survey reflecting this institution's catalogue. |
| Indiana University Bloomington | COGS-Q 101: Introduction to Cognitive Science | Mind, intelligent systems, representations, and interdisciplinary approaches. |

Course identity and broad coverage are verified against [CWRU](https://bulletin.case.edu/course-descriptions/cogs/), [UC San Diego](https://catalog.ucsd.edu/courses/COGS.html), and [Indiana University](https://bulletin.college.indiana.edu/programs/4268/cogsmin). Catalogue descriptions establish topic alignment; scientific claims in the questions require their own sources. These are introductory topic packs, not university-endorsed products or complete replicas of a particular instructor's syllabus.

Minimum launch content: 64 source-checked question items for CWRU COGS 101 and 32 for each of the other five packs, for 224 items. Different schools may reuse suitable scientific facts, but their coverage and explanations must reflect the actual course descriptions. Study material and explanations must account for the different subject matter, rather than simply relabeling one generic pack. The user's syllabus and authorized course materials can refine their COGS 101 pack when provided.

Each item has a learning objective, supported game template, study material, six-decision round grouping or individual prompt membership, answer/distractors, explanation, and source references. Manual editorial checks verify the answers and references before a pack is marked ready. Subjective discussion prompts may appear in classroom explanations but do not receive automatic right/wrong scoring.

### Scientific interpretation

Use primary research to guide the demonstrations, including [visual working memory](https://www.nature.com/articles/36846), [chunking](https://psychclassics.yorku.ca/Miller/), [interference](https://psychclassics.yorku.ca/Stroop/), and [collaborative recall](https://marcuse.faculty.history.ucsb.edu/classes/201/articles/97CollMemWeldonBellingerJnlExpPsych.pdf). Cite the specific study behind an explanation and describe the adaptation. Do not treat these games as exact replications, IQ tests, diagnoses, or proof that a theory is true.

For comparisons, vary one intended condition, balance stimulus difficulty, randomize condition order, and show raw correct counts and sample sizes. Describe observed results from this session without causal or population claims. Cooperative recaps show which facts were remembered privately, shared, and answered correctly; avoid comparing private partial exposure with full team exposure as though they were equivalent tests. Do not assert universal memory-slot limits or that cooperation always improves recall.

### Custom editor and optional AI drafting

- A browser/desktop editor creates schools, courses, topics, study cards, supported scene/sequence templates, explanations, and answer keys. Preview a playable round, save locally, and import/export versioned JSON packs. Use plain text and built-in SVG assets; imported packs cannot execute scripts or supply arbitrary HTML.
- Custom packs remain private to their creator by default. Only a selected, reviewed pack is sent to the game server for that room. Lecture documents and API keys are excluded from GitHub and release packages.
- Optional AI authoring accepts text notes or a PDF up to 10 MB and 25 pages, drafts at most twelve questions per job, and uses the creator's own OpenAI API key. Twelve questions can supply the two studied-fact rounds in a default match. Play and manual authoring need no key or subscription. Paid app plans are outside this release.
- Use the Responses API with `gpt-6.1-sol`, `high` reasoning, and Structured Outputs for draft generation. Development uses the requested GPT-6.1 Sol with Max reasoning. The [model documentation](https://developers.openai.com/api/docs/models/gpt-6.1-sol) supports those reasoning settings. A schema constrains format; it does not establish factual accuracy.
- Every draft must cite a supplied source section/page and a short supporting excerpt. Show the source beside the draft and require explicit human review of the claim, answer, distractors, and explanation before accepting it into playable content. Reject missing/invalid references; keep unverified drafts visibly unfinished.
- Show estimated token cost and the provider/model before an explicit Generate action. Bound output tokens, offer cancellation, show actual usage afterward, and do not silently make further paid attempts. Explain that the selected notes go to OpenAI and that provider retention follows its applicable settings/policies.
- Accept keys only through HTTPS online or the desktop's localhost authoring interface. Hold them transiently for the job; never intentionally persist them in browser storage, files, logs, room snapshots, or analytics. Redact errors and clear references on completion/cancellation. Local-network HTTP clients cannot submit keys. Use bounded asynchronous jobs and a PDF worker so generation does not block multiplayer actions.

The editor and game remain usable if AI drafting is unavailable, declined, over quota, or fails. Validate generated JSON and source references independently; [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) can still contain mistakes.

## 4. Implementation, presentation, and delivery architecture

### Shared game and network design

Use a TypeScript pnpm workspace: React/Vite for semantic HTML and SVG UI, Node.js 24 LTS with Socket.IO v4 for authoritative room state, a pure shared rules engine, and Electron for the Windows portable shell. Bundle all essential assets and fonts locally. Use the same engine, course packs, frontend, and server behavior for public and portable play.

The server generates rounds, validates player/host capabilities, owns deadlines and answer keys, and computes scores. Clients submit actions and render public snapshots plus their own private payloads. Define versioned interfaces for `RoomSettings`, `ContentPack`, `RoomSnapshot`, private player data, idempotent answer/team actions, and asynchronous draft jobs. Separate public spectator/display data from private player data. The host's selected pack is frozen for a running match. No live AI judging or generation is required during play.

Use fresh authoritative snapshots after reconnect, monotonic room revisions, and action IDs to reject duplicates. [Socket.IO recovery](https://socket.io/docs/v4/connection-state-recovery/) is helpful but cannot be assumed to succeed in every disconnect. Reserve a disconnected player's seat for 120 seconds; transfer host control after 15 seconds to the longest-connected remaining player. Late arrivals spectate until the next match. If fewer than two players remain connected, pause and void the current unfinished round; resume with a fresh round when ready. Preserve completed round scores and clearly mark a match incomplete if it cannot continue.

Persist small, atomic per-room JSON snapshots on the server disk, with serialized room actions and acknowledgement after persistence of scored state. Restore completed scores after restart; restart an interrupted round with a fresh seed. Expire rooms after one hour without connected participants. Store only the room/content/state needed for play, and exclude chat history, recordings, raw uploaded documents, and API keys from persisted snapshots. Validate all messages, escape text, and bound uploads, room creation, and chat traffic.

### Online hosting, voice, and portable operation

- Start with one paid Render web service in Ohio, serving the frontend and API, plus a 1 GB persistent disk. Current baseline is approximately **$7.25/month before taxes and usage charges**: $7 compute plus $0.25 storage. Capacity is subject to load testing; recheck fees before purchase. [Render pricing](https://render.com/pricing), [regions](https://render.com/docs/regions), and [WebSockets](https://render.com/docs/websocket) support this choice.
- Use LiveKit Cloud for optional player-to-player voice, with room-specific backend-issued tokens, push-to-talk/self mute, host mute, and phase-based publish permissions. Start with its Build plan: currently 5,000 participant minutes and 100 concurrent connections. Expose a quota warning and gracefully fall back to cards/text when voice is unavailable. There is no audio recording. [LiveKit pricing](https://livekit.com/pricing) and [quotas](https://docs.livekit.io/deploy/admin/quotas-and-limits/).
- Voice is offered in HTTPS online play. Plain LAN HTTP does not meet browser microphone secure-context requirements, so local offline play uses cards/text or in-person conversation. Do not ask players to install certificates. [Microphone requirements](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- Deliver a Windows x64 portable ZIP containing the app and required runtime, with no installer or separate Node installation. It can connect to the public game or host locally while other devices join a displayed LAN URL/QR code and room code. LAN core play, curated packs, explanations, and manual authoring work without internet. Online voice and AI drafting require internet.
- Include local-network diagnostics and instructions for Windows firewall prompts and networks that isolate devices. Document actual package signing status. Do not describe the package as warning-free or digitally signed without verification.

### Visual and interaction design

Combine a playful illustrated lab with a clean modern interface: warm off-white, dark ink, teal/coral accents, consistent original SVG objects, restrained transitions, and a recognizable mosaic motif. Build the logo, objects, diagrams, and cover from this art system. Use bitmap generation only if a specific asset improves the result and passes visual/rights review. Keep asset provenance and licenses for any external material.

Show the mode's essential settings first, with course, classroom, and communication details in contextual controls. Make room-full, expired-room, reconnecting, microphone-denied, and generation-failed states actionable. The result screen should show useful details without humiliating players or implying mental-ability assessment.

## 5. Evidence, acceptance gates, and schedule

### What will support a level-5 entry

| Category (25% each) | Design contribution | Evidence required before claiming completion |
| --- | --- | --- |
| Execution | Complete room-code play across three modes, public browser delivery, offline LAN edition, recovery and rematches. | Meaningful automated rules/network tests, real multi-device matches, published URL checks, and a clean-machine portable run. No unresolved crashes, lost scores, duplicated scores, or private-state leaks. |
| Creativity | Players' differing recollections become a visible memory mosaic; cooperative information sharing and fast interference play provide distinct experiences. | A 60-90-second recording of actual gameplay showing the signature reveal and differences between modes, plus first-time-player feedback about what made the experience distinctive. |
| Usefulness / Value | Fun for college newcomers, source-based course practice, classroom presentation, and reusable custom packs. | At least six first-time testers, including cognitive-science novices and students. At least five complete the tutorial and first round without facilitator rescue and can explain one featured concept; at least four want to replay. Obtain a COGS 101 content review from a course participant/instructor when available, and state the review level honestly. |
| Polish & Thoughtfulness | Coherent art, understandable scoring, accessibility settings, clear errors, and graceful service failures. | Real phone/desktop checks, keyboard and contrast review, difficult network/provider scenarios, useful instructions, and a consistent cover, demo, and submission description. |

These are proposed acceptance thresholds, not results already obtained or official scoring formulas. A failed gate triggers fixes and another relevant check rather than a finished claim.

### Required validation

- All modes at every player count from 2 through 8; both host roles; 4/6/10 rounds; all difficulty presets; general and course content; classroom and shared-display configurations. Verify scoring, zero/late answers, ties, rounded cooperative goals, and captain changes.
- Reconnect before/after submitting, duplicated and delayed messages, host departure, late join, room capacity/expiry, server restart, and fewer-than-two-player interruptions. Inspect client payloads for private clues and unrevealed answer keys.
- Load ten simultaneous eight-player rooms for at least 30 minutes. Require no state divergence or lost/duplicate scores and p95 server action processing below 50 ms. Separately measure network latency on representative connections; do not present server processing time as total internet latency. Include one concurrent AI drafting job in the game responsiveness check.
- Test iPhone Safari, Android Chrome, and desktop Chrome/Edge/Firefox, with desktop Safari when a Mac is available. Use real hardware for microphone, touch, and LAN checks; automation alone does not certify those. Check 320-pixel screens, a large shared display, keyboard use, reduced motion, and muted play. Record missing device coverage.
- Review all curated source links, answer keys, course coverage, and plain-language explanations. Test JSON round trips, invalid imports, oversized/unreadable PDFs, missing source references, and draft-review gating. Test a real provider request when a securely supplied test key is available, plus invalid-key, timeout, quota, and cancellation paths. Inspect logs/storage/packages for secrets.
- Test real eight-person online voice, denied microphone permission, host/self mute, phase restrictions, disconnect, and unavailable/quota-exhausted service. Keep cards and text functional through voice failures.
- Run the portable app from a path containing spaces on a Windows machine without development tools, with internet disconnected, and with at least two LAN client devices. Check asset availability, custom pack save/load/export, network diagnostics, hashes, and included license notices.

### Milestones and release

| Target | Reviewable output |
| --- | --- |
| October 4-10 | Approved rules, room flow, authoritative engine, and playable versions of all three modes. |
| October 11-17 | Course packs, custom editor, learning/settings controls, and the shared memory reveal. |
| October 18-23 | Optional BYOK drafting, online voice, Windows portable packaging, and staging deployment. |
| October 24-27 | Human playtests, content audit, device/network/load checks, fixes, and feature freeze. |
| October 28 | Verified public release, GitHub v1.0.0, downloadable Windows package, and submission materials. |
| October 29 | User submits the prepared entry through their Handshake account, before the official deadline. |

Dates are targets that depend on rules approval, service setup, and testing access. If a required feature or check cannot be completed, report it and resolve scope with the user; do not silently omit it or label an unverified release complete.

Preserve the remote repository's existing main history and MIT license. After approval, work on `codex/mind-mosaic`, use focused commits and pull requests, and attach created PRs to this chat. Add CI for type checks, engine/network tests, and production builds. Publish the finished source and release to [ProgrammingWithYagle/Cognitive-Science-Memory-Game](https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game).

Deliver the public game URL, Windows portable package, SHA-256 hashes, editable/exportable content packs, setup/self-hosting instructions, test results with limitations, source/asset notices, and version notes. Prepare the required title, cover image, description, and URL, plus screenshots and an actual-gameplay demo. Keep the public service available through judging, with December 1 as the initial operational target. Contest submission is performed by the user through their own Handshake account.

Resources needed for implementation: owner access to Render and LiveKit; a securely entered OpenAI key for optional drafting validation; the user's syllabus/authorized COGS 101 notes for closer class alignment; iPhone/Android testing access and college playtesters. Public catalogues support the baseline packs while class materials are pending. Exact fees and account connections will be shown before any paid service is activated.

### Source provenance

The supplied seven-page contest PDF was read and visually inspected at `C:/Users/yigal/OneDrive/Documents/College/Documents/Open AI Contest Official Rules Context.pdf`; the initially mentioned Downloads path was not present. A public copy is available through the mission's [official rules link](https://go.joinhandshake.com/rs/390-ZTF-353/images/%5BAI_Skills_Studio_Challenge%5D_Contest_Official_Rules.pdf?version=0). The rule document supplies contest criteria and dates, not instructions to override the user's requested planning/approval workflow.

Course identities, vendor capabilities, model settings, and price snapshots were checked against the linked primary sources. Recheck changing fees/quotas when provisioning. All product names, rules, timing, numerical acceptance thresholds, and architecture choices in this document are proposed design decisions.
