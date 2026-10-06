import { describe, expect, it } from "vitest";
import { PACKS, COURSES } from "../src/server/content";
import { Room } from "../src/server/room";
import { generateRounds, duration, exposure } from "../src/server/rounds";
import { DEFAULT_SETTINGS, DIFFICULTIES, type Mode } from "../src/shared/types";
import { packSchema } from "../src/shared/content";

describe("attention tasks", () => {
  it("scores arrow location independently of direction, and varies both sides", () => {
    for (let seed = 0; seed < 100; seed++) {
      const round = generateRounds(
        { ...DEFAULT_SETTINGS, readingLight: true },
        PACKS[0],
        seed,
        false,
        ["focus"],
      )[0];
      expect(
        round.questions.filter((q) => q.stimulus?.position === "left"),
      ).toHaveLength(3);
      expect(
        round.questions.filter((q) => q.stimulus?.position === "right"),
      ).toHaveLength(3);
      let conflicting = 0;
      for (const q of round.questions) {
        expect(q.text).toBe("Which side is the arrow on?");
        const correct = q.options.find((o) => o.id === q.correct)!.label;
        expect(correct.toLowerCase()).toBe(q.stimulus!.position);
        if ((correct === "Left") !== (q.stimulus!.symbol === "←"))
          conflicting++;
      }
      expect(conflicting).toBe(3);
    }
  });
  it("Stroop includes three conflicting words and scores ink rather than word", () => {
    for (let seed = 0; seed < 100; seed++) {
      const round = generateRounds(DEFAULT_SETTINGS, PACKS[0], seed, false, [
        "focus",
      ])[0];
      let conflicting = 0;
      for (const q of round.questions) {
        expect(q.options.find((o) => o.id === q.correct)!.label).toBe(
          q.stimulus!.color,
        );
        if (q.stimulus!.word !== q.stimulus!.color.toUpperCase()) conflicting++;
      }
      expect(conflicting).toBe(3);
    }
  });
  it("every mode and match length contains attention, with a solo practice shortcut", () => {
    for (const mode of ["rally", "frenzy", "team"] as Mode[])
      for (const rounds of [4, 6, 10] as const) {
        const r = generateRounds(
          { ...DEFAULT_SETTINGS, mode, rounds },
          PACKS[0],
          42,
        );
        expect(r).toHaveLength(rounds);
        expect(r.some((r) => r.family === "focus")).toBe(true);
        const room = new Room("ABC234", 0);
        const p = room.add("Host", "player", 0);
        room.setSettings(p.id, { ...DEFAULT_SETTINGS, mode });
        room.start(p.id, 1, true, "focus");
        room.tick(room.deadline!);
        expect(room.phase).toBe(mode === "team" ? "private" : "answer");
        expect(room.view(p.id, room.phaseStart).questions.length).toBe(
          mode === "frenzy" ? 1 : 6,
        );
      }
  });
});
describe("difficulty and expanded catalogue", () => {
  it("has five ordered levels, preserves aliases, and gives every team a complete set of fragments", () => {
    let previousTime = Infinity,
      previousLoad = 0;
    for (const difficulty of Object.keys(
      DIFFICULTIES,
    ) as (keyof typeof DIFFICULTIES)[]) {
      const settings = {
        ...DEFAULT_SETTINGS,
        difficulty,
        mode: "team" as const,
      };
      const rounds = generateRounds(settings, PACKS[0], 9);
      const scene = rounds.find((r) => r.family === "scene")!;
      expect(scene.study!.tiles).toHaveLength(DIFFICULTIES[difficulty].load);
      expect(duration(settings, 8)).toBeLessThan(previousTime);
      previousTime = duration(settings, 8);
      expect(scene.study!.tiles!.length).toBeGreaterThan(previousLoad);
      previousLoad = scene.study!.tiles!.length;
      for (let players = 2; players <= 8; players++)
        for (const round of rounds) {
          const seen = Array.from({ length: players }, (_, i) =>
            exposure(round, i, players),
          );
          expect(seen.every((s) => s.length > 0)).toBe(true);
          expect(new Set(seen.flat()).size).toBe(
            round.study?.tiles?.length ?? round.study?.cards?.length ?? 6,
          );
        }
    }
    for (const [alias, value] of [
      ["guided", "easy"],
      ["standard", "normal"],
      ["challenge", "hard"],
    ] as const)
      expect(duration({ ...DEFAULT_SETTINGS, difficulty: alias }, 8)).toBe(
        duration({ ...DEFAULT_SETTINGS, difficulty: value }, 8),
      );
  });
  it("catalogues 58 CWRU entries and nine universities, and validates every playable starter", () => {
    expect(
      COURSES.filter((c) => c.school === "Case Western Reserve University"),
    ).toHaveLength(58);
    expect(new Set(COURSES.map((c) => c.school)).size).toBe(9);
    expect(new Set(COURSES.map((c) => c.id)).size).toBe(COURSES.length);
    expect(COURSES.find((c) => c.id === "cwru101")!.code).toBe("COGS 101");
    for (const pack of PACKS) {
      const parsed = packSchema.safeParse(pack);
      expect(
        parsed.success,
        pack.id + ": " + (parsed.success ? "" : parsed.error.message),
      ).toBe(true);
      expect(pack.facts.length).toBeGreaterThanOrEqual(18);
      for (const mode of ["rally", "frenzy", "team"] as const)
        for (const difficulty of Object.keys(
          DIFFICULTIES,
        ) as (keyof typeof DIFFICULTIES)[]) {
          const rounds = generateRounds(
            { ...DEFAULT_SETTINGS, mode, difficulty, rounds: 10 },
            pack,
            17,
          );
          const cues = rounds
            .filter((r) => r.family === "facts")
            .flatMap((r) => r.questions.map((q) => q.text));
          expect(new Set(cues).size).toBe(18);
        }
    }
    for (const course of COURSES)
      if (course.packId)
        expect(PACKS.some((p) => p.id === course.packId)).toBe(true);
  });
});
