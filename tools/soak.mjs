// Real wall-clock WebSocket/checkpoint endurance test. Never uses a player's microphone.
import { createRequire } from "node:module";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { io } from "socket.io-client";
const { createGameServer } = createRequire(import.meta.url)(
  "../dist/runtime.cjs",
);
const minutes = Number(process.argv[2] ?? 30);
assert.ok(minutes >= 1 && minutes <= 60);
const started = Date.now(),
  dataDir = await mkdtemp(path.join(os.tmpdir(), "mind-mosaic-soak-"));
let game,
  port,
  restarts = 0,
  reconnects = 0,
  departures = 0,
  matches = 0,
  commands = 0,
  errors = 0;
const latency = [],
  groups = [],
  allSockets = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function connect() {
  const s = io(`http://127.0.0.1:${port}`, {
    autoConnect: false,
    forceNew: true,
    transports: ["websocket"],
    reconnection: false,
  });
  allSockets.push(s);
  await new Promise((resolve, reject) => {
    s.once("connect", resolve);
    s.once("connect_error", reject);
    s.connect();
  });
  return s;
}
async function send(s, event, data = {}) {
  const before = performance.now();
  const r = await new Promise((resolve, reject) =>
    s.timeout(5000).emit(event, data, (e, r) => (e ? reject(e) : resolve(r))),
  );
  commands++;
  latency.push(performance.now() - before);
  assert.ok(r.ok, `${event}: ${r.error}`);
  return r;
}
const base = {
  difficulty: "insane",
  rounds: 4,
  packId: "general",
  classroom: false,
  target: 70,
  readingLight: false,
  chat: true,
  voice: false,
};
async function startServer() {
  game = await createGameServer({ dataDir });
  port = await game.listen(0, "127.0.0.1");
}
async function resume(group, i) {
  group.clients[i] = await connect();
  await send(group.clients[i], "resume", group.sessions[i]);
  reconnects++;
}
async function begin(group) {
  const room = game.rooms.get(group.code);
  await Promise.all(
    group.clients.map((s) => send(s, "ready", { ready: true })),
  );
  await send(
    group.clients[group.sessions.findIndex((s) => s.id === room.hostId)],
    "start",
  );
}
try {
  await startServer();
  for (const mode of ["rally", "frenzy", "team"]) {
    const clients = await Promise.all(Array.from({ length: 8 }, connect));
    const host = await send(clients[0], "create", {
      name: "Host " + mode,
      settings: { ...base, mode },
    });
    const sessions = [
      host,
      ...(await Promise.all(
        clients
          .slice(1)
          .map((s, i) =>
            send(s, "join", { code: host.code, name: "Player " + (i + 2) }),
          ),
      )),
    ];
    const group = {
      mode,
      code: host.code,
      clients,
      sessions,
      lastInjection: 0,
      lastDeparture: 0,
      lastRound: "",
    };
    groups.push(group);
    await begin(group);
  }
  let nextRestart = started + 5 * 60_000,
    nextReport = started + 60_000;
  while (Date.now() - started < minutes * 60_000) {
    if (Date.now() >= nextRestart) {
      groups.forEach((g) => g.clients.forEach((s) => s.disconnect()));
      await sleep(150);
      await game.close();
      await startServer();
      for (const group of groups)
        for (let i = 0; i < 8; i++) await resume(group, i);
      restarts++;
      nextRestart += 5 * 60_000;
    }
    for (const group of groups) {
      const room = game.rooms.get(group.code);
      assert.ok(room);
      assert.equal(
        new Set(room.history.map((h) => h.round.id)).size,
        room.history.length,
        "No double-scored rounds",
      );
      if (room.deadline !== null)
        assert.ok(
          Date.now() < room.deadline + 4000,
          `Stalled deadline: ${group.mode}/${room.phase}`,
        );
      if (
        Date.now() - group.lastInjection > 60_000 &&
        ["study", "answer", "private"].includes(room.phase)
      ) {
        group.lastInjection = Date.now();
        group.clients[7].disconnect();
        await sleep(120);
        await resume(group, 7);
        continue;
      }
      if (
        Date.now() - group.lastDeparture > 120_000 &&
        ["study", "answer", "private"].includes(room.phase)
      ) {
        group.lastDeparture = Date.now();
        await send(group.clients[6], "leave");
        departures++;
        group.sessions[6] = await send(group.clients[6], "join", {
          code: group.code,
          name: "Returning player",
        });
        assert.equal(room.member(group.sessions[6].id).role, "spectator");
        continue;
      }
      if (room.phase === "answer" || room.phase === "private") {
        for (let i = 0; i < 8; i++) {
          const state = room.view(group.sessions[i].id, Date.now());
          if (
            state.role !== "player" ||
            state.locked ||
            !state.questions.length
          )
            continue;
          const answers = Object.fromEntries(
            state.questions.map((q) => [
              q.id,
              room.round.questions.find((k) => k.id === q.id).correct,
            ]),
          );
          await send(group.clients[i], "answer", { answers });
          if (!["answer", "private"].includes(room.phase)) break;
        }
      } else if (room.phase === "discuss") {
        const captain =
          group.clients[
            group.sessions.findIndex((s) => s.id === room.captain())
          ];
        assert.ok(captain);
        for (const q of room.round.questions)
          await send(captain, "board", {
            questionId: q.id,
            optionId: q.correct,
          });
        await send(captain, "lock");
      } else if (room.phase === "finished") {
        matches++;
        const host =
          group.clients[group.sessions.findIndex((s) => s.id === room.hostId)];
        await send(host, "rematch");
        await begin(group);
      } else if (room.phase === "paused") {
        // Resume events above recover unfinished rounds; a pause that persists is a test failure.
        assert.ok(
          Date.now() - room.phaseStart < 5000,
          `Stalled recovery: ${group.mode}`,
        );
      }
    }
    if (Date.now() >= nextReport) {
      console.log(
        JSON.stringify({
          minutes: +((Date.now() - started) / 60000).toFixed(1),
          matches,
          commands,
          restarts,
          reconnects,
          departures,
          rssMb: Math.round(process.memoryUsage().rss / 1048576),
        }),
      );
      nextReport += 60_000;
    }
    await sleep(250);
  }
  latency.sort((a, b) => a - b);
  const report = {
    passed: true,
    version: "0.2.0",
    test: "Real wall-clock timers; 24 WebSocket bots in three eight-player rooms; checkpoint restoration, temporary disconnects, explicit leaves/rejoins and rematches",
    durationMinutes: +((Date.now() - started) / 60000).toFixed(2),
    matches,
    commands,
    restarts,
    reconnects,
    departures,
    errors,
    rssMb: Math.round(process.memoryUsage().rss / 1048576),
    acknowledgementMs: {
      p50: +latency[Math.floor(latency.length * 0.5)].toFixed(2),
      p95: +latency[Math.floor(latency.length * 0.95)].toFixed(2),
      maximum: +latency.at(-1).toFixed(2),
    },
    limitations:
      "Single Windows host and synthetic local clients. Does not verify WAN latency, real microphones, phone browsers, human pacing or fun.",
  };
  await mkdir("docs/validation", { recursive: true });
  await writeFile(
    "docs/validation/soak-0.2.0.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  errors++;
  console.error(e.message);
  process.exitCode = 1;
} finally {
  allSockets.forEach((s) => s.disconnect());
  await game?.close();
  if (
    path.dirname(dataDir) === os.tmpdir() &&
    path.basename(dataDir).startsWith("mind-mosaic-soak-")
  )
    await rm(dataDir, { recursive: true, force: true });
}
