import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
const require = createRequire(import.meta.url);
const { createGameServer } = require('../dist/runtime.cjs');
let time = 10000;
const checkpointDir = await mkdtemp(path.join(os.tmpdir(), 'mind-mosaic-load-'));
const game = await createGameServer({ now: () => time, timers: false, dataDir: checkpointDir });
const port = await game.listen(0, '127.0.0.1'), url = `http://127.0.0.1:${port}`;
const sockets = [], rooms = [], latencies = [];
const settings = { mode: 'rally', difficulty: 'standard', rounds: 4, packId: 'general', classroom: false, target: 70, readingLight: false, chat: true };
async function connect() { const s = io(url, { autoConnect: false, forceNew: true, transports: ['websocket'] }); sockets.push(s); await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); s.connect(); }); return s; }
async function send(s, event, data = {}) { const before = performance.now(); const result = await new Promise((resolve, reject) => s.timeout(10000).emit(event, data, (error, r) => error ? reject(error) : resolve(r))); latencies.push(performance.now() - before); assert.equal(result.ok, true, `${event}: ${result.error}`); return result; }
const started = performance.now();
try {
  for (let index = 0; index < 10; index++) {
    const clients = await Promise.all(Array.from({ length: 8 }, connect));
    const mode = ['rally', 'frenzy', 'team'][index % 3];
    const host = await send(clients[0], 'create', { name: `Host ${index + 1}`, settings: { ...settings, mode } });
    const sessions = [host, ...await Promise.all(clients.slice(1).map((s, i) => send(s, 'join', { code: host.code, name: `Player ${i + 2}` })))];
    await Promise.all(clients.slice(1).map(s => send(s, 'ready', { ready: true })));
    rooms.push({ clients, sessions, room: game.rooms.get(host.code), mode });
  }
  assert.equal(game.io.sockets.sockets.size, 80);
  for (const group of rooms) {
    const { clients, room, mode, sessions } = group;
    await send(clients[0], 'start'); let steps = 0;
    while (room.phase !== 'finished' && steps++ < 200) {
      if (room.phase === 'answer' || room.phase === 'private') {
        time = room.phaseStart + 100;
        await Promise.all(clients.map((s, i) => { const visible = room.view(sessions[i].id, time).questions; const answers = Object.fromEntries(visible.map(q => [q.id, room.round.questions.find(key => key.id === q.id).correct])); return send(s, 'answer', { answers }); }));
        if (room.phase === 'answer') { time = room.deadline; await game.tick(); }
      } else if (room.phase === 'discuss') {
        const captain = clients[sessions.findIndex(s => s.id === room.captain())];
        for (const q of room.round.questions) await send(captain, 'board', { questionId: q.id, optionId: q.correct });
        await send(captain, 'lock');
      } else { time = room.deadline; await game.tick(); }
    }
    assert.equal(room.phase, 'finished'); assert.equal(room.history.length, 4);
    if (mode === 'team') assert.equal(room.teamScore, 2400);
    else for (const p of room.players) assert.equal(p.score, mode === 'frenzy' ? 3000 : 2400);
    const last = sessions[7]; clients[7].disconnect();
    const resumed = await connect(); await send(resumed, 'resume', { code: last.code, id: last.id, token: last.token });
    assert.equal(room.member(last.id).connected, true);
    await send(clients[0], 'rematch'); assert.equal(room.phase, 'lobby'); assert.ok(room.players.every(p => p.score === 0));
  }
  latencies.sort((a, b) => a - b);
  const report = { passed: true, test: '10 simultaneous rooms, 8 WebSocket clients each; complete matches, disk checkpoints, reconnects, rematches', activeClients: 80, rooms: 10, matchRounds: 4, commands: latencies.length, elapsedSeconds: +( (performance.now() - started) / 1000).toFixed(2), acknowledgementMs: { median: +latencies[Math.floor(latencies.length * .5)].toFixed(2), p95: +latencies[Math.floor(latencies.length * .95)].toFixed(2), maximum: +latencies.at(-1).toFixed(2) }, limitations: 'One Windows machine, accelerated game clock. This is a burst smoke test, not a 30-minute soak, WAN latency test, or eight-person fun/voice test.' };
  await mkdir('docs/validation', { recursive: true }); await writeFile('docs/validation/load-smoke.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
} finally {
  sockets.forEach(s => s.disconnect()); await game.close();
  // mkdtemp creates this specific test-owned child directory; never remove another path.
  if (path.dirname(checkpointDir) === os.tmpdir() && path.basename(checkpointDir).startsWith('mind-mosaic-load-')) await rm(checkpointDir, { recursive: true, force: true });
}
