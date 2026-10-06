// Eight real WebRTC clients with synthesized PCM; no device microphone is opened.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { io } from "socket.io-client";
import {
  Room,
  RoomEvent,
  AudioSource,
  AudioFrame,
  AudioStream,
  LocalAudioTrack,
  TrackPublishOptions,
  TrackSource,
  dispose,
} from "@livekit/rtc-node";
import { RoomServiceClient } from "livekit-server-sdk";
const { createGameServer } = createRequire(import.meta.url)(
  "../dist/runtime.cjs",
);
const voice = {
  url: "ws://127.0.0.1:7880",
  apiKey: "devkey",
  apiSecret: "secret",
};
const admin = new RoomServiceClient(
  "http://127.0.0.1:7880",
  voice.apiKey,
  voice.apiSecret,
);
let time = Date.now();
const game = await createGameServer({ voice, timers: false, now: () => time });
const port = await game.listen(0, "127.0.0.1"),
  sockets = [],
  audioRooms = [],
  sources = [],
  tracks = [],
  readers = [];
const frames = Array(8).fill(0),
  nonzero = Array(8).fill(0);
let report;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function bounded(task, label, ms = 10000) {
  let timer;
  try {
    return await Promise.race([
      task,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("Timed out: " + label)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function eventually(predicate, label) {
  for (let i = 0; i < 60; i++) {
    if (await predicate()) return;
    await pause(100);
  }
  throw new Error("Timed out: " + label);
}
async function send(s, event, data = {}) {
  const receipt = await new Promise((resolve, reject) =>
    s.timeout(7000).emit(event, data, (e, r) => (e ? reject(e) : resolve(r))),
  );
  assert.ok(receipt.ok, `${event}: ${receipt.error}`);
  return receipt;
}
try {
  for (let i = 0; i < 8; i++) {
    const s = io(`http://127.0.0.1:${port}`, {
      autoConnect: false,
      forceNew: true,
      transports: ["websocket"],
    });
    sockets.push(s);
    await new Promise((resolve, reject) => {
      s.once("connect", resolve);
      s.once("connect_error", reject);
      s.connect();
    });
  }
  const settings = {
    mode: "rally",
    difficulty: "normal",
    rounds: 4,
    packId: "general",
    classroom: false,
    target: 70,
    readingLight: false,
    chat: true,
    voice: true,
  };
  const host = await send(sockets[0], "create", {
    name: "Voice host",
    settings,
  });
  const sessions = [
    host,
    ...(await Promise.all(
      sockets
        .slice(1)
        .map((s, i) =>
          send(s, "join", { code: host.code, name: "Voice " + (i + 2) }),
        ),
    )),
  ];
  const room = game.rooms.get(host.code);
  for (let i = 0; i < 8; i++) {
    const rtc = new Room();
    audioRooms.push(rtc);
    rtc.on(RoomEvent.TrackSubscribed, (track) => {
      const reader = new AudioStream(track, 48000, 1).getReader();
      readers.push(reader);
      void (async () => {
        try {
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            frames[i]++;
            if (next.value.data.some((v) => Math.abs(v) > 50)) nonzero[i]++;
          }
        } catch {}
      })();
    });
    const receipt = await send(sockets[i], "voice-join");
    await bounded(rtc.connect(receipt.voice.url, receipt.voice.token, {
      autoSubscribe: true,
    }), "voice connect " + i);
    await send(sockets[i], "voice-ready");
  }
  await eventually(async () => {
    const p = await admin.listParticipants(room.voiceRoomId);
    return p.length === 8 && p.every((p) => p.permission?.canPublish);
  }, "all eight publishing grants");
  console.log("Eight voice participants connected and authorized.");
  for (let i = 0; i < 8; i++) {
    const source = new AudioSource(48000, 1, 200);
    sources.push(source);
    const track = LocalAudioTrack.createAudioTrack("synthetic-" + i, source);
    tracks.push(track);
    const options = new TrackPublishOptions();
    options.source = TrackSource.SOURCE_MICROPHONE;
    await bounded(audioRooms[i].localParticipant.publishTrack(track, options), "publish " + i);
  }
  console.log("Eight synthetic microphone tracks published.");
  await pause(500);
  for (let frame = 0; frame < 150; frame++) {
    await bounded(Promise.all(
      sources.map((source, i) => {
        const data = new Int16Array(960);
        for (let n = 0; n < 960; n++)
          data[n] = Math.round(
            4000 *
              Math.sin(
                (2 * Math.PI * (220 + i * 40) * (frame * 960 + n)) / 48000,
              ),
          );
        return source.captureFrame(new AudioFrame(data, 48000, 1, 960));
      }),
    ), "capture frame " + frame, 3000);
    await pause(20);
  }
  await eventually(
    () => nonzero.every((n) => n > 0),
    "all eight received audible synthesized frames",
  );
  console.log("All eight participants received generated audio.");
  await send(sockets[0], "voice-mute", { id: sessions[7].id, muted: true });
  await eventually(
    async () =>
      !(await admin.getParticipant(room.voiceRoomId, sessions[7].id)).permission
        ?.canPublish,
    "host mute",
  );
  console.log("Host mute applied.");
  await Promise.all(
    sockets.slice(1).map((s) => send(s, "ready", { ready: true })),
  );
  await send(sockets[0], "start");
  await eventually(
    async () =>
      (await admin.listParticipants(room.voiceRoomId)).every(
        (p) => !p.permission?.canPublish,
      ),
    "quiet countdown",
  );
  console.log("Quiet phase permissions applied.");
  time = room.deadline;
  await game.tick();
  assert.equal(room.phase, room.round.family === "focus" ? "answer" : "study");
  assert.ok(
    (await admin.listParticipants(room.voiceRoomId)).every(
      (p) => !p.permission?.canPublish,
    ),
  );
  await send(sockets[7], "leave");
  await eventually(
    async () => (await admin.listParticipants(room.voiceRoomId)).length === 7,
    "departure removes voice participant",
  );
  report = {
    passed: true,
    version: "0.2.0",
    checkedAt: new Date().toISOString(),
    livekitServer: "1.13.7",
    participants: 8,
    generatedAudioSeconds: 3,
    receivedFrames: frames,
    nonzeroFrames: nonzero,
    verified: [
      "eight clients join through game-authenticated tokens",
      "all eight receive synthesized audio",
      "host microphone mute",
      "server publishing disabled during countdown/study/answer",
      "leaving game removes SFU participant",
    ],
    limitations:
      "Local SFU and native WebRTC clients with synthesized PCM. Human microphones, browser permissions, phone audio and WAN/TURN behavior remain untested.",
  };
} finally {
  // Release synthetic source handles before the native room shutdown waits on them.
  await bounded(Promise.allSettled(tracks.map((t) => t.close())), "track cleanup");
  await bounded(Promise.allSettled(sources.map((s) => s.close())), "source cleanup");
  await bounded(Promise.allSettled(readers.map((r) => r.cancel())), "reader cleanup");
  console.log("Voice stream readers closed.");
  for (let i = 0; i < audioRooms.length; i++) {
    console.log("Closing voice connection " + (i + 1));
    await bounded(audioRooms[i].disconnect(), "disconnect " + (i + 1));
  }
  console.log("Voice connections closed.");
  sockets.forEach((s) => s.disconnect());
  await game.close();
  console.log("Voice game server closed.");
  await dispose();
  console.log("Voice test resources released.");
}
report.cleanupCompleted = true;
await mkdir("docs/validation", { recursive: true });
await writeFile(
  "docs/validation/voice-0.2.0.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
