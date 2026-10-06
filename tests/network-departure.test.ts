import { expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createGameServer } from "../src/server/server";
import { DEFAULT_SETTINGS, type Receipt } from "../src/shared/types";
function send(s: Socket, event: string, data: unknown = {}): Promise<Receipt> {
  return new Promise((resolve, reject) =>
    s
      .timeout(4000)
      .emit(event, data, (e: Error | null, r: Receipt) =>
        e ? reject(e) : resolve(r),
      ),
  );
}
async function connect(url: string) {
  const s = io(url, {
    autoConnect: false,
    forceNew: true,
    transports: ["websocket"],
  });
  await new Promise<void>((resolve, reject) => {
    s.once("connect", resolve);
    s.once("connect_error", reject);
    s.connect();
  });
  return s;
}
it.each(["rally", "frenzy", "team"] as const)(
  "%s: eight network clients keep playing after Leave, rejoin and expired-token replay",
  async (mode) => {
    let time = 1000;
    const game = await createGameServer({ now: () => time, timers: false });
    const port = await game.listen(0, "127.0.0.1");
    const sockets: Socket[] = [];
    try {
      for (let i = 0; i < 8; i++)
        sockets.push(await connect(`http://127.0.0.1:${port}`));
      const host = await send(sockets[0], "create", {
        name: "Host",
        settings: { ...DEFAULT_SETTINGS, mode, rounds: 4 },
      });
      const sessions = [
        host,
        ...(await Promise.all(
          sockets
            .slice(1)
            .map((s, i) =>
              send(s, "join", { code: host.code, name: "Player " + i }),
            ),
        )),
      ];
      await Promise.all(
        sockets.slice(1).map((s) => send(s, "ready", { ready: true })),
      );
      expect((await send(sockets[0], "start")).ok).toBe(true);
      const room = game.rooms.get(host.code!)!;
      while (!["answer", "private"].includes(room.phase)) {
        time = room.deadline!;
        await game.tick();
      }
      const retired = sessions[7];
      expect((await send(sockets[7], "leave")).ok).toBe(true);
      expect(room.phase).not.toBe("paused");
      expect(
        (
          await send(sockets[7], "resume", {
            code: retired.code,
            id: retired.id,
            token: retired.token,
          })
        ).ok,
      ).toBe(false);
      const rejoined = await send(sockets[7], "join", {
        code: host.code,
        name: "Returned",
      });
      expect(rejoined.ok).toBe(true);
      expect(room.member(rejoined.id!).role).toBe("spectator");
      expect((await send(sockets[7], "answer", { answers: {} })).ok).toBe(
        false,
      );
      let guard = 0;
      while (String(room.phase) !== "finished" && guard++ < 120) {
        expect(room.deadline).not.toBeNull();
        time = room.deadline!;
        await game.tick();
      }
      expect(room.phase).toBe("finished");
      expect(room.history).toHaveLength(4);
      expect((await send(sockets[0], "rematch")).ok).toBe(true);
      expect(
        room.members.filter((p) => p.role === "player" && p.connected),
      ).toHaveLength(8);
      const ninth = await connect(`http://127.0.0.1:${port}`);
      sockets.push(ninth);
      expect(
        (await send(ninth, "join", { code: host.code, name: "Ninth" })).ok,
      ).toBe(false);
    } finally {
      sockets.forEach((s) => s.disconnect());
      await game.close();
    }
  },
);
