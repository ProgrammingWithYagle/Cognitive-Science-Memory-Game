import express from "express";
import { createServer as httpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { randomInt } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { z } from "zod";
import { Room } from "./room";
import { PACKS, COURSES, packInfo } from "./content";
import { DEFAULT_SETTINGS } from "../shared/types";
import type { ContentPack, Receipt } from "../shared/types";
import { packSchema } from "../shared/content";
export { packSchema } from "../shared/content";
import { installDraftRoutes, type AuthoringOptions } from "./drafting";
import { VoiceService, type VoiceConfig, type VoiceAdmin } from "./voice";
export { readVoiceConfig } from "./voice";
export const settingsSchema = z.object({
  mode: z.enum(["rally", "frenzy", "team"]),
  difficulty: z.enum([
    "baby",
    "easy",
    "normal",
    "hard",
    "insane",
    "guided",
    "standard",
    "challenge",
  ]),
  rounds: z.union([z.literal(4), z.literal(6), z.literal(10)]),
  packId: z.string().min(1).max(80),
  classroom: z.boolean(),
  target: z.union([z.literal(60), z.literal(70), z.literal(85)]),
  readingLight: z.boolean(),
  chat: z.boolean(),
  voice: z.boolean().optional().default(false),
});
const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[^\u0000-\u001f\u007f]+$/u);
const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z2-9]{6}$/, "Enter the six-character room code.");
interface Options extends AuthoringOptions {
  now?: () => number;
  timers?: boolean;
  dataDir?: string;
  clientDir?: string;
  voice?: VoiceConfig;
  voiceAdmin?: VoiceAdmin;
}
export async function createGameServer(options: Options = {}) {
  const now = options.now ?? Date.now,
    app = express(),
    http = httpServer(app),
    rooms = new Map<string, Room>(),
    bindings = new Map<string, string>();
  const saves = new Map<string, Promise<void>>();
  const voice = new VoiceService(options.voice, options.voiceAdmin);
  if (options.dataDir) {
    await mkdir(options.dataDir, { recursive: true });
    for (const file of await readdir(options.dataDir))
      if (/^[A-Z2-9]{6}\.json$/.test(file)) {
        try {
          const room = Room.restore(
            await readFile(path.join(options.dataDir, file), "utf8"),
            now(),
          );
          rooms.set(room.code, room);
        } catch {
          console.warn("Skipped unreadable room checkpoint:", file);
        }
      }
  }
  const io = new Server(http, {
    serveClient: false,
    maxHttpBufferSize: 300_000,
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (!origin) return callback(null, true);
      try {
        callback(null, new URL(origin).host === req.headers.host);
      } catch {
        callback("Invalid origin", false);
      }
    },
  });
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, version: "0.2.0", rooms: rooms.size }),
  );
  app.get("/api/packs", (_req, res) => res.json(PACKS.map(packInfo)));
  app.get("/api/courses", (_req, res) => res.json(COURSES));
  app.get("/api/info", (_req, res) => {
    const port = (http.address() as { port: number } | null)?.port ?? 4173;
    res.json({
      version: "0.2.0",
      voiceAvailable: voice.available,
      lan: Object.values(os.networkInterfaces())
        .flat()
        .filter((n) => n && !n.internal && n.family === "IPv4")
        .map((n) => `http://${n!.address}:${port}`),
    });
  });
  const drafting = installDraftRoutes(app, options, now);
  if (options.clientDir) {
    app.use(
      express.static(options.clientDir, {
        index: "index.html",
        maxAge: "1h",
        setHeaders: (res, file) => {
          if (file.endsWith(".html"))
            res.setHeader("Cache-Control", "no-store");
        },
      }),
    );
    app.get("/{*path}", (req, res) => {
      if (req.path.startsWith("/api/"))
        res.status(404).json({ error: "Not found" });
      else res.sendFile(path.resolve(options.clientDir!, "index.html"));
    });
  }
  function save(room: Room) {
    if (!options.dataDir) return Promise.resolve();
    const payload = room.serialize(),
      filename = path.join(options.dataDir, `${room.code}.json`);
    const pending = (saves.get(room.code) ?? Promise.resolve())
      .catch(() => {})
      .then(async () => {
        await writeFile(filename + ".tmp", payload, { mode: 0o600 });
        await rename(filename + ".tmp", filename);
      });
    saves.set(room.code, pending);
    return pending;
  }
  function broadcast(room: Room) {
    void voice.sync(room);
    for (const p of room.members) {
      const socket = io.sockets.sockets.get(bindings.get(p.id) ?? "");
      if (socket)
        socket.emit("state", {
          ...room.view(p.id, now()),
          voice: voice.info(room, p.id),
        });
    }
  }
  function bind(socket: Socket, room: Room, id: string) {
    const old = io.sockets.sockets.get(bindings.get(id) ?? "");
    if (old && old.id !== socket.id) {
      old.data.member = undefined;
      old.emit("replaced");
      old.disconnect();
    }
    socket.data.member = { code: room.code, id };
    bindings.set(id, socket.id);
    room.connect(id, now());
  }
  function membership(socket: Socket): { room: Room; id: string } {
    const m = socket.data.member as { code: string; id: string } | undefined;
    const room = m && rooms.get(m.code);
    if (!m || !room || bindings.get(m.id) !== socket.id)
      throw new Error("Join a room first.");
    return { room, id: m.id };
  }
  function newCode() {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code;
    do {
      code = Array.from(
        { length: 6 },
        () => alphabet[randomInt(alphabet.length)],
      ).join("");
    } while (rooms.has(code));
    return code;
  }
  const creations = new Map<string, { count: number; reset: number }>();
  io.on("connection", (socket) => {
    let commands = 0,
      reset = now();
    const handle = (
      event: string,
      action: (raw: unknown) => Promise<Receipt> | Receipt,
    ) =>
      socket.on(event, async (raw: unknown, ack?: (r: Receipt) => void) => {
        try {
          if (now() - reset > 1000) {
            commands = 0;
            reset = now();
          }
          if (++commands > 35)
            throw new Error("Too many actions. Wait a moment and try again.");
          const result = await action(raw);
          if (typeof ack === "function") ack(result);
        } catch (e) {
          const error =
            e instanceof z.ZodError
              ? (e.issues[0]?.message ?? "Check the supplied fields.")
              : e instanceof Error
                ? e.message
                : "The action could not be completed.";
          if (typeof ack === "function") ack({ ok: false, error });
        }
      });
    const mutate = async (action: (room: Room, id: string) => void) => {
      const { room, id } = membership(socket);
      room.tick(now());
      action(room, id);
      await save(room);
      broadcast(room);
      return { ok: true };
    };
    handle("create", async (raw) => {
      if (socket.data.member) throw new Error("Leave your current room first.");
      const input = z
        .object({
          name: nameSchema,
          facilitator: z.boolean().optional(),
          settings: settingsSchema.optional(),
          customPack: packSchema.optional(),
        })
        .parse(raw);
      const ip = socket.handshake.address,
        quota = creations.get(ip);
      if (quota && quota.reset > now() && quota.count >= 12)
        throw new Error(
          "Room creation limit reached. Reuse a room or try again in a minute.",
        );
      if (rooms.size >= 200)
        throw new Error("The server is busy. Try again soon.");
      creations.set(ip, {
        count: quota && quota.reset > now() ? quota.count + 1 : 1,
        reset: quota && quota.reset > now() ? quota.reset : now() + 60000,
      });
      const room = new Room(newCode(), now()),
        p = room.add(
          input.name,
          input.facilitator ? "facilitator" : "player",
          now(),
        );
      room.setSettings(
        p.id,
        input.settings ?? { ...DEFAULT_SETTINGS },
        input.customPack as ContentPack | undefined,
      );
      rooms.set(room.code, room);
      bind(socket, room, p.id);
      await save(room);
      broadcast(room);
      return { ok: true, code: room.code, id: p.id, token: p.token };
    });
    handle("join", async (raw) => {
      if (socket.data.member) throw new Error("Leave your current room first.");
      const input = z
          .object({
            name: nameSchema,
            code: codeSchema,
            display: z.boolean().optional(),
          })
          .parse(raw),
        room = rooms.get(input.code);
      if (!room)
        throw new Error("Room not found. Check the code with your host.");
      room.tick(now());
      const p = room.add(
        input.display ? "Shared display" : input.name,
        input.display ? "display" : "player",
        now(),
      );
      bind(socket, room, p.id);
      await save(room);
      broadcast(room);
      return { ok: true, code: room.code, id: p.id, token: p.token };
    });
    handle("resume", async (raw) => {
      const input = z
          .object({
            code: codeSchema,
            id: z.string().uuid(),
            token: z.string().regex(/^[a-f0-9]{48}$/),
          })
          .parse(raw),
        room = rooms.get(input.code);
      const current = socket.data.member as
        { code: string; id: string } | undefined;
      if (current && (current.code !== input.code || current.id !== input.id))
        throw new Error("Leave your current room first.");
      if (!room)
        throw new Error("This room expired. Create or join another room.");
      room.authenticate(input.id, input.token);
      room.tick(now());
      bind(socket, room, input.id);
      await save(room);
      broadcast(room);
      return { ok: true };
    });
    handle("ready", (raw) => {
      const { ready } = z.object({ ready: z.boolean() }).parse(raw);
      return mutate((room, id) => {
        if (room.phase !== "lobby" || room.member(id).role !== "player")
          throw new Error("Only player seats can ready up in the lobby.");
        room.member(id).ready = ready;
        room.change();
      });
    });
    handle("settings", (raw) => {
      const input = z
        .object({ settings: settingsSchema, customPack: packSchema.optional() })
        .parse(raw);
      return mutate((room, id) =>
        room.setSettings(
          id,
          input.settings,
          input.customPack as ContentPack | undefined,
        ),
      );
    });
    handle("start", (raw) => {
      const { practice, family } = z
        .object({
          practice: z.boolean().optional(),
          family: z.enum(["scene", "sequence", "facts", "focus"]).optional(),
        })
        .parse(raw ?? {});
      return mutate((room, id) => room.start(id, now(), practice, family));
    });
    handle("answer", (raw) => {
      const { answers } = z
        .object({
          answers: z
            .record(z.string().max(100), z.string().max(10))
            .refine((a) => Object.keys(a).length <= 6),
        })
        .parse(raw);
      return mutate((room, id) => room.answer(id, answers, now()));
    });
    handle("propose", (raw) => {
      const p = z
        .object({
          questionId: z.string().max(100),
          optionId: z.string().max(10),
        })
        .parse(raw);
      return mutate((room, id) => room.propose(id, p.questionId, p.optionId));
    });
    handle("board", (raw) => {
      const p = z
        .object({
          questionId: z.string().max(100),
          optionId: z.string().max(10),
        })
        .parse(raw);
      return mutate((room, id) => room.board(id, p.questionId, p.optionId));
    });
    handle("lock", () => mutate((room, id) => room.lock(id, now())));
    handle("next", () => mutate((room, id) => room.next(id, now())));
    handle("rematch", () => mutate((room, id) => room.lobby(id, now())));
    handle("chat", (raw) => {
      const p = z
        .object({ text: z.string().trim().min(1).max(240) })
        .parse(raw);
      return mutate((room, id) => room.sendChat(id, p.text));
    });
    handle("voice-join", async () => {
      const { room, id } = membership(socket);
      return { ok: true, voice: await voice.join(room, id) };
    });
    handle("voice-ready", async () => {
      const { room, id } = membership(socket);
      await voice.ready(room, id);
      broadcast(room);
      return { ok: true };
    });
    handle("voice-leave", async () => {
      const { room, id } = membership(socket);
      await voice.leave(room, id);
      return { ok: true };
    });
    handle("voice-mute", (raw) => {
      const input = z
        .object({ id: z.string().uuid(), muted: z.boolean() })
        .parse(raw);
      return mutate((room, id) => {
        room.requireHost(id);
        room.member(input.id);
        room.voiceMuted = room.voiceMuted.filter((m) => m !== input.id);
        if (input.muted) room.voiceMuted.push(input.id);
        room.change();
      });
    });
    handle("leave", async () => {
      const { room, id } = membership(socket);
      room.leave(id, now());
      void voice.leave(room, id);
      bindings.delete(id);
      socket.data.member = undefined;
      await save(room);
      broadcast(room);
      return { ok: true };
    });
    handle("kick", (raw) => {
      const input = z.object({ id: z.string().max(80) }).parse(raw);
      return mutate((room, id) => {
        room.requireHost(id);
        if (input.id === id)
          throw new Error("Use Leave to leave your own room.");
        room.leave(input.id, now());
        const target = io.sockets.sockets.get(bindings.get(input.id) ?? "");
        bindings.delete(input.id);
        if (target) {
          target.data.member = undefined;
          target.emit("kicked");
          target.disconnect();
        }
      });
    });
    socket.on("disconnect", () => {
      try {
        const { room, id } = membership(socket);
        room.disconnect(id, now());
        bindings.delete(id);
        void save(room)
          .then(() => broadcast(room))
          .catch(() => console.warn("Checkpoint write failed."));
      } catch {
        /* Detached connection. */
      }
    });
  });
  async function tick() {
    for (const room of rooms.values()) {
      const before = room.revision;
      room.tick(now());
      if (room.idleSince !== null && now() - room.idleSince > 3600000) {
        rooms.delete(room.code);
        if (options.dataDir)
          await unlink(path.join(options.dataDir, `${room.code}.json`)).catch(
            () => {},
          );
        continue;
      }
      if (before !== room.revision) {
        await save(room);
        broadcast(room);
      }
    }
    for (const [ip, quota] of creations)
      if (quota.reset < now()) creations.delete(ip);
  }
  let ticking = false;
  const timer =
    options.timers === false
      ? undefined
      : setInterval(() => {
          if (!ticking) {
            ticking = true;
            void tick()
              .catch(() => console.warn("Room update failed."))
              .finally(() => (ticking = false));
          }
        }, 100);
  return {
    app,
    http,
    io,
    rooms,
    tick,
    listen: (port = 4173, host = "0.0.0.0") =>
      new Promise<number>((resolve, reject) => {
        http.once("error", reject);
        http.listen(port, host, () => {
          http.off("error", reject);
          resolve((http.address() as { port: number }).port);
        });
      }),
    close: async () => {
      if (timer) clearInterval(timer);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.allSettled([...saves.values()]);
      drafting.close();
      await voice.close();
    },
  };
}
