import { describe, expect, it } from "vitest";
import { DraftManager, secureAuthorRequest } from "../src/server/drafting";
import { createGameServer } from "../src/server/server";
import { estimateDraft, DRAFT_MODEL } from "../src/shared/content";
import type { Request } from "express";
const key = "sk-test-xxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const material = {
  label: "My own notes",
  pages: [
    {
      page: 1,
      text: "Encoding means getting information into memory. Storage keeps information over time.",
    },
  ],
};
const request = { material, count: 6 };
const valid = {
  cue: "Getting information into memory",
  answer: "Encoding",
  alternatives: ["Storage", "Retrieval", "Recognition"],
  explanation: "Encoding puts information into memory.",
  page: 1,
  quote: "Encoding means getting information into memory.",
};
const response = (cards: unknown[]) =>
  new Response(
    JSON.stringify({
      status: "completed",
      output: [
        { content: [{ type: "output_text", text: JSON.stringify({ cards }) }] },
      ],
      usage: { input_tokens: 1000, output_tokens: 300 },
    }),
    { status: 200 },
  );
async function finished(m: DraftManager, id: string) {
  for (let i = 0; i < 50 && m.get("creator", id)?.status === "working"; i++)
    await new Promise((r) => setTimeout(r, 1));
  return m.get("creator", id)!;
}

describe("creator drafting", () => {
  it("sends one bounded, nonstored structured request and filters missing, repeated, ambiguous evidence", async () => {
    let sent: Record<string, any> | undefined;
    let auth = "";
    const transport = (async (url: any, options: any) => {
      expect(url).toBe("https://api.openai.com/v1/responses");
      auth = options.headers.Authorization;
      sent = JSON.parse(options.body);
      return response([
        valid,
        {
          ...valid,
          cue: "Bad source",
          quote: "This quote is invented entirely.",
        },
        { ...valid, cue: "Wrong page", page: 2 },
        {
          ...valid,
          cue: "Ambiguous",
          alternatives: ["encoding", "Retrieval", "Recognition"],
        },
        valid,
      ]);
    }) as typeof fetch;
    const manager = new DraftManager(transport);
    try {
      const job = manager.create("creator", request, key);
      const final = await finished(manager, job.id);
      expect(final.status).toBe("complete");
      expect(final.cards).toHaveLength(1);
      expect(final.discarded).toBe(4);
      expect(final.cards![0].evidence?.reviewed).toBe(false);
      expect(final.usage?.usd).toBeCloseTo(0.005);
      expect(sent!.model).toBe(DRAFT_MODEL);
      expect(sent!.store).toBe(false);
      expect(sent!.text.format.strict).toBe(true);
      expect(sent!.max_output_tokens).toBe(6000);
      expect(JSON.stringify(sent)).not.toContain(key);
      expect(auth).toBe(`Bearer ${key}`);
      expect(JSON.stringify(final)).not.toContain(key);
      expect(manager.get("intruder", job.id)).toBeUndefined();
      expect(estimateDraft(request).maximumUsd).toBeGreaterThan(
        final.usage!.usd,
      );
    } finally {
      manager.close();
    }
  });
  it.each([401, 429, 500])(
    "handles service %i errors without reflecting body or key",
    async (status) => {
      const manager = new DraftManager(
        (async () => new Response(key, { status })) as typeof fetch,
      );
      try {
        const job = manager.create("creator", request, key);
        const final = await finished(manager, job.id);
        expect(final.status).toBe("failed");
        expect(JSON.stringify(final)).not.toContain(key);
      } finally {
        manager.close();
      }
    },
  );
  it("cancels in-flight jobs, prevents double submissions, and prunes expired work", async () => {
    let now = 0,
      aborted = 0;
    const transport = (async (_url: any, options: any) =>
      new Promise<Response>((_, reject) => {
        options.signal.addEventListener("abort", () => {
          aborted++;
          reject(new Error(key));
        });
      })) as typeof fetch;
    const manager = new DraftManager(transport, () => now);
    try {
      const job = manager.create("creator", request, key);
      expect(() => manager.create("creator", request, key)).toThrow(/running/);
      expect(manager.cancel("intruder", job.id)).toBe(false);
      expect(manager.cancel("creator", job.id)).toBe(true);
      expect(manager.get("creator", job.id)?.status).toBe("cancelled");
      expect(aborted).toBe(1);
      const next = manager.create("creator", request, key);
      now = 20 * 60_000 + 1;
      manager.prune();
      expect(manager.get("creator", next.id)).toBeUndefined();
      expect(aborted).toBe(2);
    } finally {
      manager.close();
    }
  });
  it("sanitizes transport errors even if they impersonate a trusted error message", async () => {
    const manager = new DraftManager((async () => {
      throw new Error("The API key header was " + key);
    }) as typeof fetch);
    try {
      const job = manager.create("creator", request, key);
      expect(JSON.stringify(await finished(manager, job.id))).not.toContain(
        key,
      );
    } finally {
      manager.close();
    }
  });
  it("requires same origin, local connection or configured HTTPS proxy", () => {
    const mock = (origin: string, remote = "127.0.0.1", forwarded?: string) =>
      ({
        headers: {
          origin,
          host: new URL(origin).host,
          "x-forwarded-proto": forwarded,
        },
        socket: { remoteAddress: remote },
      }) as unknown as Request;
    expect(secureAuthorRequest(mock("http://localhost:4173"), {})).toBe(true);
    expect(
      secureAuthorRequest(mock("http://localhost:4173", "192.168.1.2"), {}),
    ).toBe(false);
    expect(secureAuthorRequest(mock("ftp://localhost:4173"), {})).toBe(false);
    const online = mock("https://game.example", "10.0.0.2", "https");
    expect(
      secureAuthorRequest(online, { publicOrigin: "https://game.example" }),
    ).toBe(false);
    expect(
      secureAuthorRequest(online, {
        publicOrigin: "https://game.example",
        trustProxy: true,
      }),
    ).toBe(true);
    expect(
      secureAuthorRequest(
        {
          ...online,
          headers: { ...online.headers, origin: "https://evil.example" },
        } as Request,
        { publicOrigin: "https://game.example", trustProxy: true },
      ),
    ).toBe(false);
  });
  it("protects jobs with creator sessions and rejects missing consent and malformed input", async () => {
    const game = await createGameServer({
      timers: false,
      draftFetch: (async () => response([valid])) as typeof fetch,
    });
    const port = await game.listen(0, "127.0.0.1");
    const url = `http://127.0.0.1:${port}`;
    const post = (path: string, data: unknown, token = "", origin = url) =>
      fetch(url + "/api/author" + path, {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    try {
      expect(
        (await post("/session", {}, "", "https://evil.example")).status,
      ).toBe(403);
      const { token } = await (await post("/session", {})).json();
      expect(typeof token).toBe("string");
      expect((await post("/estimate", request)).status).toBe(401);
      expect((await post("/jobs", { ...request, key }, token)).status).toBe(
        400,
      );
      const started = await post(
        "/jobs",
        { ...request, key, consent: true },
        token,
      );
      expect(started.status).toBe(202);
      const { id } = await started.json();
      const other = await (await post("/session", {})).json();
      expect((await post(`/jobs/${id}/status`, {}, other.token)).status).toBe(
        404,
      );
      const status = await post(`/jobs/${id}/status`, {}, token);
      expect(status.status).toBe(200);
      expect(await status.text()).not.toContain(key);
      const malformed = await fetch(url + "/api/author/jobs", {
        method: "POST",
        headers: {
          Origin: url,
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: '{"key":"' + key + '",INVALID',
      });
      expect(malformed.status).toBe(400);
      expect(await malformed.text()).not.toContain(key);
    } finally {
      await game.close();
    }
  });
});
