import {
  AccessToken,
  RoomServiceClient,
  TrackSource,
} from "livekit-server-sdk";
import type { VoiceInfo } from "../shared/types";
import type { Room } from "./room";

export interface VoiceConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}
export interface VoiceAdmin {
  updateParticipant(
    room: string,
    identity: string,
    options: {
      permission: {
        canPublish: boolean;
        canSubscribe: boolean;
        canPublishData: boolean;
        canPublishSources: TrackSource[];
        canUpdateMetadata: boolean;
      };
    },
  ): Promise<unknown>;
  removeParticipant(
    room: string,
    identity: string,
    options?: { revokeTokenTs: bigint },
  ): Promise<unknown>;
}
export function voiceOpen(room: Room) {
  return ["lobby", "discuss", "reveal", "finished", "paused"].includes(
    room.phase,
  );
}
export function readVoiceConfig(
  env: NodeJS.ProcessEnv,
): VoiceConfig | undefined {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET)
    return undefined;
  try {
    const url = new URL(env.LIVEKIT_URL);
    if (
      url.protocol !== "wss:" &&
      !(
        url.protocol === "ws:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return undefined;
    if (url.username || url.password) return undefined;
    return {
      url: url.toString().replace(/\/$/, ""),
      apiKey: env.LIVEKIT_API_KEY,
      apiSecret: env.LIVEKIT_API_SECRET,
    };
  } catch {
    return undefined;
  }
}
export class VoiceService {
  private joined = new Map<string, Set<string>>();
  private readyIds = new Set<string>();
  private applied = new Map<string, string>();
  private queues = new Map<string, Promise<void>>();
  private syncing = new Map<string, Promise<void>>();
  private dirty = new Set<string>();
  private faults = new Set<string>();
  private admin?: VoiceAdmin;
  constructor(
    private config?: VoiceConfig,
    admin?: VoiceAdmin,
  ) {
    if (config)
      this.admin =
        admin ??
        new RoomServiceClient(
          config.url.replace(/^ws/, "http"),
          config.apiKey,
          config.apiSecret,
          { requestTimeout: 3, failover: false },
        );
  }
  get available() {
    return !!this.config;
  }
  info(room: Room, id: string): VoiceInfo {
    const p = room.member(id);
    return {
      available: this.available,
      enabled: !!room.settings.voice,
      speakingAllowed:
        !!room.settings.voice &&
        voiceOpen(room) &&
        ["player", "facilitator"].includes(p.role) &&
        !room.voiceMuted.includes(id),
      hostMuted: room.voiceMuted.includes(id),
      mutedIds: room.voiceMuted,
      unavailableReason: !this.available
        ? "Voice needs a LiveKit project. See Online setup in the menu."
        : this.faults.has(room.voiceRoomId)
          ? "Voice is reconnecting. You can keep playing with clue cards and text."
          : undefined,
    };
  }
  async join(room: Room, id: string) {
    const p = room.member(id);
    if (!this.config || !room.settings.voice)
      throw new Error("Voice is not enabled for this room.");
    if (!p.connected || !p.token || !["player", "facilitator"].includes(p.role))
      throw new Error(
        "Only active players and the facilitator can join voice.",
      );
    const set = this.joined.get(room.voiceRoomId) ?? new Set<string>();
    set.add(id);
    this.joined.set(room.voiceRoomId, set);
    const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity: id,
      name: p.name,
      ttl: 30,
    });
    // Join tokens never grant microphone publishing. After the SDK connects,
    // voice-ready obtains permissions for the current phase from the game server.
    token.addGrant({
      room: room.voiceRoomId,
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
      canPublishData: false,
      canPublishSources: [TrackSource.MICROPHONE],
      canUpdateOwnMetadata: false,
    });
    return { url: this.config.url, token: await token.toJwt() };
  }
  ready(room: Room, id: string) {
    if (!this.joined.get(room.voiceRoomId)?.has(id))
      throw new Error("Join voice first.");
    this.readyIds.add(`${room.voiceRoomId}:${id}`);
    this.applied.delete(`${room.voiceRoomId}:${id}`);
    return this.sync(room);
  }
  leave(room: Room, id: string) {
    this.joined.get(room.voiceRoomId)?.delete(id);
    this.applied.delete(`${room.voiceRoomId}:${id}`);
    this.readyIds.delete(`${room.voiceRoomId}:${id}`);
    if (!this.admin) return Promise.resolve();
    return this.queue(room, async () => {
      try {
        await this.admin!.removeParticipant(room.voiceRoomId, id, {
          revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)),
        });
      } catch {
        /* A participant already disconnected or the SFU is unavailable. */
      }
    });
  }
  sync(room: Room) {
    if (!this.admin) return Promise.resolve();
    const key = room.voiceRoomId,
      existing = this.syncing.get(key);
    if (existing) {
      this.dirty.add(key);
      return existing;
    }
    const task = this.queue(room, async () => {
      do {
        this.dirty.delete(key);
        const joined = this.joined.get(room.voiceRoomId);
        if (!joined?.size) return;
        let failed = false;
        await Promise.all(
          [...joined].map(async (id) => {
            const p = room.members.find((m) => m.id === id),
              key = `${room.voiceRoomId}:${id}`;
            if (
              !p ||
              !p.connected ||
              !p.token ||
              !room.settings.voice ||
              !["player", "facilitator"].includes(p.role)
            ) {
              joined.delete(id);
              this.applied.delete(key);
              this.readyIds.delete(key);
              try {
                await this.admin!.removeParticipant(room.voiceRoomId, id, {
                  revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)),
                });
              } catch {}
              return;
            }
            if (!this.readyIds.has(key)) return;
            const allow = voiceOpen(room) && !room.voiceMuted.includes(id),
              stamp = String(allow);
            if (this.applied.get(key) === stamp) return;
            try {
              await this.admin!.updateParticipant(room.voiceRoomId, id, {
                permission: {
                  canPublish: allow,
                  canSubscribe: true,
                  canPublishData: false,
                  canPublishSources: [TrackSource.MICROPHONE],
                  canUpdateMetadata: false,
                },
              });
              this.applied.set(key, stamp);
            } catch {
              failed = true;
            }
          }),
        );
        if (failed) this.faults.add(room.voiceRoomId);
        else this.faults.delete(room.voiceRoomId);
      } while (this.dirty.has(key));
    }).finally(() => {
      this.syncing.delete(key);
    });
    this.syncing.set(key, task);
    return task;
  }
  private queue(room: Room, fn: () => Promise<void>) {
    const key = room.voiceRoomId,
      previous = this.queues.get(key) ?? Promise.resolve();
    const task = previous
      .catch(() => {})
      .then(fn)
      .finally(() => {
        if (this.queues.get(key) === task) this.queues.delete(key);
      });
    this.queues.set(key, task);
    return task;
  }
  async close() {
    await Promise.allSettled([...this.queues.values()]);
    this.joined.clear();
    this.applied.clear();
    this.readyIds.clear();
  }
}
