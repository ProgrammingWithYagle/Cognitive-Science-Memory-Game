// Public-preview acceptance test: real game clock, eight synthetic players.
// Creates only its own disposable room. Never records room/session credentials.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { io } from "socket.io-client";

const target = new URL(process.argv[2]);
assert.equal(target.protocol, "https:");
assert.ok(target.hostname.endsWith(".onrender.com"));
const origin = target.origin;
const health = await fetch(origin + "/api/health", {
  redirect: "error",
  signal: AbortSignal.timeout(90000),
}).then((r) => r.json());
assert.ok(health.ok);
assert.equal(health.version, "0.2.0");
const clients = [], sessions = [], states = [], latencies = [];
const answered = new Set(), families = new Set();
let departed = false, resumed = false;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function request(client, event, data = {}) {
  const before = performance.now();
  const receipt = await new Promise((resolve, reject) =>
    client.timeout(15000).emit(event, data, (error, value) =>
      error ? reject(error) : resolve(value),
    ),
  );
  latencies.push(performance.now() - before);
  return receipt;
}
async function send(client, event, data = {}) {
  const receipt = await request(client, event, data);
  assert.ok(receipt.ok, event + ": " + receipt.error);
  return receipt;
}
async function connect(index) {
  const client = io(origin, {
    autoConnect: false, forceNew: true, reconnection: false,
    transports: ["websocket"],
  });
  clients[index] = client;
  client.on("state", (state) => { states[index] = state; });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Preview socket timed out")), 15000);
    client.once("connect", () => { clearTimeout(timer); resolve(); });
    client.once("connect_error", (error) => { clearTimeout(timer); reject(error); });
    client.connect();
  });
  return client;
}
const started = performance.now();
try {
  await Promise.all(Array.from({ length: 8 }, (_, i) => connect(i)));
  sessions.push(await send(clients[0], "create", {
    name: "Preview test host",
    settings: { mode: "rally", difficulty: "insane", rounds: 4,
      packId: "general", classroom: false, target: 70,
      readingLight: false, chat: false, voice: false },
  }));
  sessions.push(...await Promise.all(clients.slice(1).map((client, i) =>
    send(client, "join", { code: sessions[0].code, name: "Preview test " + (i + 2) }),
  )));
  assert.equal(states[0].players.filter((p) => p.connected).length, 8);
  await Promise.all(clients.slice(1).map((client) => send(client, "ready", { ready: true })));
  await send(clients[0], "start");
  console.log("Eight preview players connected; match started.");
  while (states[0].phase !== "finished") {
    assert.ok(performance.now() - started < 180000, "Public match failed to finish within three minutes");
    const state = states[0];
    if (state.family) families.add(state.family);
    if (state.phase === "answer" && !answered.has(state.roundIndex)) {
      answered.add(state.roundIndex);
      if (!departed) {
        await send(clients[7], "leave");
        assert.equal((await request(clients[7], "resume", sessions[7])).ok, false);
        await send(clients[7], "join", { code: sessions[0].code, name: "Returned guest" });
        assert.equal(states[7].role, "spectator");
        departed = true;
        console.log("Leave and revoked-session checks passed; returning guest is a spectator.");
      }
      await Promise.all(clients.slice(0, 7).map((client, i) =>
        send(client, "answer", { answers: Object.fromEntries(
          states[i].questions.map((q) => [q.id, q.options[0].id]),
        ) }),
      ));
    }
    if (state.phase === "reveal" && !resumed) {
      clients[6].disconnect();
      await connect(6);
      await send(clients[6], "resume", sessions[6]);
      resumed = true;
      console.log("Interrupted preview connection resumed.");
    }
    await pause(150);
  }
  assert.ok(departed && resumed);
  assert.equal(states[0].final.roundsCompleted, 4);
  assert.equal(answered.size, 4);
  latencies.sort((a, b) => a - b);
  const report = {
    passed: true, version: health.version, checkedAt: new Date().toISOString(),
    url: origin, initialPlayers: 8, roundsCompleted: 4,
    families: [...families], departureAndReturn: true,
    revokedSessionRejected: true, connectionResume: true,
    elapsedSeconds: +( (performance.now() - started) / 1000 ).toFixed(2),
    acknowledgementMs: { p50: +latencies[Math.floor(latencies.length * .5)].toFixed(2),
      p95: +latencies[Math.floor(latencies.length * .95)].toFixed(2),
      maximum: +latencies.at(-1).toFixed(2) },
    limitations: "Eight synthetic clients from one Windows machine to the public Render preview. Does not verify human enjoyment, real phones, microphone audio or multiple independent networks.",
  };
  await mkdir("docs/validation", { recursive: true });
  await writeFile("docs/validation/online-0.2.0.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  await Promise.allSettled(clients.filter((client) => client.connected).map((client) => request(client, "leave")));
  clients.forEach((client) => client.disconnect());
}
