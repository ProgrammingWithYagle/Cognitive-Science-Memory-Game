# Put Mind Mosaic online

You can play locally now. These steps set up your own public browser address; voice is a separate optional service. The Windows download does not create accounts or activate paid services.

A [free game preview is already available](https://mind-mosaic-jsjx.onrender.com/) in your Render **My Workspace**. Players can use it without accounts. The service deploys `codex/mind-mosaic` and has automatic deployment disabled to keep playtests stable; deploy later game updates explicitly in its dashboard. Skip step 1 unless you want another service. LiveKit voice still needs step 2. The free-preview limitations below apply.

## 1. Create a free game preview on Render

1. Open [Render](https://dashboard.render.com/) and sign up with your GitHub account. You complete account creation and any terms acceptance yourself.
2. Choose **New → Web Service**, connect this repository, and select **codex/mind-mosaic** for v0.2.0. After the update is merged, change the branch to **main**.
3. Use **Node**, the **Free** plan, build command `corepack enable && pnpm install --frozen-lockfile && pnpm build`, and start command `node dist/server.cjs`. Keep one instance.
4. Under environment variables, set `NODE_VERSION=24.19.0`, `TRUST_PROXY=1`, and `DATA_DIR=.data`. Set the health check path to `/api/health`. Render supplies the public HTTPS origin automatically. For a custom domain, also set `PUBLIC_URL` to that exact HTTPS origin.
5. Choose **Create Web Service** and wait for it to become live. Open the displayed `https://…onrender.com` address. Make a room and share its invitation link.

Alternatively, the included [render.yaml](../render.yaml) defines the same free preview as a Blueprint. Review the selected plan before confirming creation.

**Free-preview limitation:** free web services sleep after 15 minutes without inbound traffic. Their local files are ephemeral, so a service restart or deployment can lose rooms. Use this for trying the game. For a contest session requiring reliable saved rooms, choose an always-on plan and a persistent disk yourself; mount it at `/var/data` and set `DATA_DIR=/var/data/mind-mosaic`. That is a paid choice, not something the game activates. Keep one game server instance because room state is held in its memory. [Render free-service details](https://render.com/docs/free), [persistent disks](https://render.com/docs/disks).

## 2. Add optional room voice

1. Sign up at [LiveKit Cloud](https://cloud.livekit.io/) and create a project. Review current plan limits and billing before choosing a plan.
2. In your project's settings, find its **WebSocket URL**, **API key**, and **API secret**. Dashboard labels may change; use LiveKit's [project setup guidance](https://docs.livekit.io/intro/basics/connect/).
3. In **Render → your game service → Environment**, add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` with those values. The URL begins `wss://`. Put the secret in Render's environment settings; never paste it into chat, a course pack, or GitHub.
4. Save and redeploy. Create a room, open **Classroom & accessibility**, and enable **Room voice**. Each player opens the room voice panel and chooses **Join voice**. Joining starts listening; **Hold to talk** requests microphone permission.
5. Test with two devices first, then eight. Check headphones, echo, host mute, quiet study/answer phases, leaving/rejoining, and switching away from the page. Text and clue cards remain available when voice fails.

Phones need the public **HTTPS** game address. A plain local-network `http://192.168.…` address can play the game but cannot use the microphone. `http://localhost` is allowed on the hosting computer. The app does not record or transcribe voice. LiveKit carries the media; this version does not implement end-to-end media encryption.

## 3. Use optional AI drafting

No player needs an AI account or key. A creator can instead use the local manual card editor or import a glossary.

1. Open **Content studio → My materials** and paste your own notes or select TXT, Markdown, CSV/TSV, DOCX, or a text-based PDF. Text extraction occurs on your device. Check the preview, especially formulas and reading order.
2. Choose **Make glossary drafts** for a local `Term: Definition` or two-column glossary, or **Draft with AI** for prose. Use text you are allowed to send to an outside service; avoid private student information.
3. For AI, create an [OpenAI API project key](https://platform.openai.com/api-keys), review API billing/limits, and enter the key in the studio. ChatGPT subscriptions and API billing are separate.
4. Review the displayed cost estimate and consent, then choose **Generate draft cards**. Only that action sends the selected text to OpenAI. The fixed model is [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) with high reasoning and a bounded output. Prices were checked October 4, 2026; inspect current pricing before use.
5. Review each draft and its exact source passage, including all three alternatives. Mark each card reviewed, then save/export the pack. Matching a passage does not prove the answer is correct. No generated pack is automatically approved.

Keys and source requests are held only in memory for drafting, never placed in browser storage, room checkpoints, or logs. Your source text and cards are still processed by OpenAI under its API data policies. Cancelling a request already sent can still incur usage. Job results expire after 20 minutes; closing the studio requests cancellation.

## Troubleshooting

- **Voice says it needs a project:** check all three LiveKit environment values and redeploy.
- **Microphone unavailable on a phone:** use HTTPS, allow site microphone access, and verify the device's browser supports WebRTC. Keep text/clue cards available.
- **Room code stops working after a Render restart:** the free plan cannot preserve local room checkpoints reliably. Start a new room or configure the persistent disk option before a sustained event.
- **AI session expired:** close and reopen the studio; the API key is deliberately not saved.
- **PDF has no text:** scanned pages need OCR first. A PDF's visual layout can also change the extracted reading order; inspect the preview or paste corrected notes.
- **Custom pack won't play:** four/six/ten rounds require 6/12/18 different cards. Every imported or AI evidence card must be reviewed.

## Source-run configuration

Copy [.env.example](../.env.example) to `.env`, fill only needed fields, then run `node --env-file=.env dist/server.cjs`. The portable app reads LiveKit settings from its process environment if provided. It does not require them for local play. Keep `.env` and checkpoints out of version control.

`TRUST_PROXY=1` is intended for a server reachable only through its trusted HTTPS reverse proxy. For direct local use, leave it unset. Render's standard domain uses its [automatically supplied external URL](https://render.com/docs/environment-variables); a custom domain must use `PUBLIC_URL`.

Deployment preparation and local tests are complete. Check the release page for any separately hosted preview. Human microphones, different phone browsers, WAN/TURN quality, and a real paid AI request remain separate acceptance checks.
