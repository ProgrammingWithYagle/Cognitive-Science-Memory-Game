import { expect, it } from "vitest";
import { TokenVerifier } from "livekit-server-sdk";
import {
  VoiceService,
  readVoiceConfig,
  type VoiceAdmin,
} from "../src/server/voice";
import { Room } from "../src/server/room";
import { DEFAULT_SETTINGS } from "../src/shared/types";
const config = {
  url: "ws://localhost:7880",
  apiKey: "testkey",
  apiSecret: "test-secret-with-at-least-32-chars-123",
};
function setup() {
  const room = new Room("ABC234", 0);
  const a = room.add("Host", "player", 0),
    b = room.add("Guest", "player", 1);
  room.setSettings(a.id, { ...DEFAULT_SETTINGS, voice: true });
  return { room, a, b };
}
it("issues short room-scoped listen-only tokens and gates publishing on live phase and host mute", async () => {
  const updates: { id: string; publish: boolean }[] = [],
    removed: string[] = [];
  const admin: VoiceAdmin = {
    updateParticipant: async (_r, id, o) => {
      updates.push({ id, publish: o.permission.canPublish });
    },
    removeParticipant: async (_r, id) => {
      removed.push(id);
    },
  };
  const voice = new VoiceService(config, admin);
  const { room, a, b } = setup();
  try {
    const joined = await voice.join(room, b.id);
    const claims = await new TokenVerifier(
      config.apiKey,
      config.apiSecret,
    ).verify(joined.token);
    expect(claims.video?.room).toBe(room.voiceRoomId);
    expect(claims.video?.canPublish).toBe(false);
    expect(claims.video?.canPublishData).toBe(false);
    expect(claims.sub).toBe(b.id);
    expect(JSON.stringify(joined)).not.toContain(config.apiSecret);
    await voice.ready(room, b.id);
    expect(updates.at(-1)?.publish).toBe(true);
    for (const phase of ["countdown", "study", "answer", "private"] as const) {
      room.phase = phase;
      await voice.sync(room);
      expect(updates.at(-1)?.publish).toBe(false);
      expect(voice.info(room, b.id).speakingAllowed).toBe(false);
    }
    room.phase = "discuss";
    await voice.sync(room);
    expect(updates.at(-1)?.publish).toBe(true);
    room.voiceMuted = [b.id];
    await voice.sync(room);
    expect(updates.at(-1)?.publish).toBe(false);
    expect(voice.info(room, b.id).hostMuted).toBe(true);
    room.leave(b.id, 5);
    await voice.sync(room);
    expect(removed).toContain(b.id);
    await expect(voice.join(room, b.id)).rejects.toThrow(/active/);
    expect(voice.info(room, a.id).available).toBe(true);
  } finally {
    await voice.close();
  }
});
it("batches eight permission updates and coalesces phase changes while the SFU responds", async () => {
  const { room, a } = setup();
  for (let i = 2; i < 8; i++) room.add("Player " + i, "player", i);
  let release: () => void = () => {},
    active = 0,
    maximum = 0;
  const blocked = new Promise<void>((resolve) => (release = resolve));
  const states: boolean[] = [];
  const admin: VoiceAdmin = {
    updateParticipant: async (_r, _id, o) => {
      active++;
      maximum = Math.max(maximum, active);
      states.push(o.permission.canPublish);
      await blocked;
      active--;
    },
    removeParticipant: async () => {},
  };
  const voice = new VoiceService(config, admin);
  try {
    await Promise.all(room.members.map((p) => voice.join(room, p.id)));
    await voice.sync(room);
    expect(states).toEqual([]);
    const first = Promise.all(room.members.map((p) => voice.ready(room, p.id)));
    await new Promise((resolve) => setTimeout(resolve, 0));
    room.phase = "study";
    const second = voice.sync(room);
    release();
    await Promise.all([first, second]);
    expect(maximum).toBe(8);
    expect(states.slice(-8).every((s) => s === false)).toBe(true);
    expect(voice.info(room, a.id).speakingAllowed).toBe(false);
  } finally {
    release();
    await voice.close();
  }
});
it("voice failure leaves gameplay usable and configuration rejects insecure public URLs", async () => {
  const { room, a } = setup();
  const voice = new VoiceService(config, {
    updateParticipant: async () => {
      throw new Error("Unavailable");
    },
    removeParticipant: async () => {},
  });
  try {
    await voice.join(room, a.id);
    await voice.ready(room, a.id);
    expect(voice.info(room, a.id).unavailableReason).toContain("keep playing");
    room.members.forEach((p) => (p.ready = true));
    room.start(a.id, 10);
    expect(room.phase).toBe("countdown");
  } finally {
    await voice.close();
  }
  expect(
    readVoiceConfig({
      LIVEKIT_URL: "ws://public.example",
      LIVEKIT_API_KEY: "key",
      LIVEKIT_API_SECRET: "secret",
    }),
  ).toBeUndefined();
  expect(
    readVoiceConfig({
      LIVEKIT_URL: "wss://voice.example",
      LIVEKIT_API_KEY: "key",
      LIVEKIT_API_SECRET: "secret",
    }),
  ).toEqual({ url: "wss://voice.example", apiKey: "key", apiSecret: "secret" });
  expect(new VoiceService().available).toBe(false);
});
