import type {
  ContentPack,
  Family,
  Option,
  QuestionKey,
  Round,
  Settings,
  Study,
  Tile,
} from "../shared/types";
import {
  FAMILY_NAMES,
  DIFFICULTIES,
  normalizeDifficulty,
} from "../shared/types";
import { SOURCES } from "./content";
export const OBJECTS = [
  "leaf",
  "mug",
  "key",
  "book",
  "apple",
  "star",
  "lamp",
  "flower",
  "clock",
  "umbrella",
  "moon",
  "fish",
  "bell",
  "boat",
  "bird",
  "pencil",
];
export class Random {
  constructor(private seed: number) {}
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(n: number) {
    return Math.floor(this.next() * n);
  }
  shuffle<T>(a: readonly T[]): T[] {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
}
function choices(
  rng: Random,
  answer: string,
  others: string[],
  icons = false,
): { options: Option[]; correct: string } {
  const labels = rng.shuffle([
    answer,
    ...rng
      .shuffle([...new Set(others.filter((x) => x !== answer))])
      .slice(0, 3),
  ]);
  const options = labels.map((label, i) => ({
    id: String(i),
    label,
    ...(icons ? { icon: label } : {}),
  }));
  return { options, correct: String(labels.indexOf(answer)) };
}
export function multiplier(s: Settings) {
  return DIFFICULTIES[normalizeDifficulty(s.difficulty)].time;
}
export function duration(s: Settings, seconds: number) {
  return Math.ceil(seconds * multiplier(s)) * 1000;
}
export function scoreAnswer(correct: boolean, elapsedMs: number, s: Settings) {
  return correct
    ? 100 +
        (s.mode === "frenzy"
          ? Math.max(
              0,
              25 -
                5 * Math.floor(Math.max(0, elapsedMs) / 1000 / multiplier(s)),
            )
          : 0)
    : 0;
}
export function playlist(s: Settings, rng: Random): Family[] {
  const mid: Family = s.mode === "frenzy" ? "focus" : "sequence";
  const repeats = s.rounds === 4 ? 1 : s.rounds === 6 ? 2 : 3;
  const result: Family[] = [];
  for (let i = 0; i < repeats; i++) result.push("scene", mid, "facts");
  if (s.rounds !== 6) result.push(s.mode === "frenzy" ? "scene" : "focus");
  else if (s.mode !== "frenzy")
    result[result.lastIndexOf("sequence")] = "focus";
  return rng.shuffle(result);
}
export function generateRounds(
  s: Settings,
  pack: ContentPack,
  seed: number,
  practice = false,
  familiesOverride?: Family[],
): Round[] {
  const rng = new Random(seed),
    families =
      familiesOverride ??
      (practice ? (["scene"] as Family[]) : playlist(s, rng));
  const needed = families.filter((x) => x === "facts").length * 6;
  if (pack.facts.length < needed)
    throw new Error(
      `This match needs ${needed} different fact cards. Add content, broaden your pack, or choose four rounds.`,
    );
  const pool = rng.shuffle(pack.facts);
  let factCursor = 0,
    sequenceCount = 0;
  return families.map((family, roundIndex) => {
    const id = `r${roundIndex}-${seed}`,
      load = DIFFICULTIES[normalizeDifficulty(s.difficulty)].load;
    let study: Study | undefined,
      questions: QuestionKey[] = [],
      condition = "Scene recall",
      explanation = "",
      source = SOURCES.visual as string;
    const q = (
      i: number,
      text: string,
      answer: string,
      alternatives: string[],
      factIndex: number,
      icons = false,
    ) => ({
      id: `${id}-q${i}`,
      text,
      ...choices(rng, answer, alternatives, icons),
      factIndex,
    });
    if (family === "scene" || family === "sequence") {
      const objects = rng.shuffle(OBJECTS).slice(0, load),
        positions =
          family === "scene"
            ? rng.shuffle([...Array(9).keys()]).slice(0, load)
            : [...Array(load).keys()];
      const tiles: Tile[] = objects.map((icon, i) => ({
        id: `t${i}`,
        icon,
        label: icon,
        position: positions[i],
      }));
      const grouped = family === "sequence" && sequenceCount++ % 2 === 0;
      study = {
        kind: family,
        tiles,
        total: family === "scene" ? 9 : load,
        grouped,
      };
      questions = Array.from({ length: 6 }, (_, i) => {
        const index = i % load,
          tile = tiles[index];
        if (family === "scene" && i % 2)
          return q(
            i,
            `Which shelf spot held the ${tile.label}?`,
            String(tile.position + 1),
            [...Array(9)].map((_, n) => String(n + 1)),
            index,
          );
        return q(
          i,
          family === "scene"
            ? `What was in shelf spot ${tile.position + 1}?`
            : i < load
              ? `Which symbol was number ${index + 1}?`
              : index === 0
                ? "Which symbol opened the parade?"
                : `Which symbol was number ${index + 1}?`,
          tile.icon,
          OBJECTS,
          index,
          true,
        );
      });
      if (family === "sequence") {
        condition = grouped ? "Grouped sequence" : "Ungrouped sequence";
        source = SOURCES.chunking;
        explanation =
          "You remembered both symbols and their order. Grouping can offer a useful structure for remembering. Your counts describe this session; they do not establish a fixed memory capacity or prove a grouping effect.";
      } else
        explanation =
          "A scene asks you to bind objects to locations. Visual working-memory research studies limits under particular conditions. This playful task differs from the original experiment, and your score is not a measure of intelligence.";
    } else if (family === "facts") {
      const facts = pool.slice(factCursor, factCursor + 6);
      factCursor += 6;
      study = {
        kind: "facts",
        total: 6,
        cards: facts.map((f, index) => ({
          index,
          cue: f.cue,
          answer: f.answer,
        })),
      };
      questions = facts.map((f, i) => ({
        ...q(i, f.cue, f.answer, f.alternatives, i),
        source: f.source,
        explanation: f.explanation,
      }));
      condition = "Studied facts";
      source = facts[0].source;
      explanation =
        pack.id === "general"
          ? "These field notes are fictional. The challenge is to remember the relationships you just studied, then retrieve them after the cards disappear."
          : "The cards introduced these relationships before testing recall. This is introductory practice, not a complete course or a test of prior expertise. Course packs are topic-aligned starters; instructor syllabi may differ.";
    } else {
      condition = s.readingLight ? "Arrow positions" : "Stroop color words";
      source = s.readingLight ? SOURCES.spatial : SOURCES.stroop;
      const colors = ["Red", "Blue", "Green", "Gold"],
        congruent = rng.shuffle([true, true, true, false, false, false]);
      const arrowPositions = rng.shuffle([
        "left",
        "left",
        "left",
        "right",
        "right",
        "right",
      ] as const);
      questions = congruent.map((match, i) => {
        const color = colors[rng.int(4)],
          word = match
            ? color
            : rng.shuffle(colors.filter((x) => x !== color))[0];
        const question = q(
          i,
          s.readingLight
            ? "Which side is the arrow on?"
            : "What is the ink color?",
          s.readingLight
            ? arrowPositions[i] === "left"
              ? "Left"
              : "Right"
            : color,
          s.readingLight ? ["Left", "Right"] : colors,
          i,
        );
        return {
          ...question,
          ...(s.readingLight
            ? {
                options: [
                  { id: "left", label: "Left" },
                  { id: "right", label: "Right" },
                ],
                correct: arrowPositions[i],
              }
            : {}),
          stimulus: s.readingLight
            ? {
                word: "",
                color: "#21695e",
                symbol: (arrowPositions[i] === "left") === match ? "←" : "→",
                position: arrowPositions[i],
              }
            : { word: word.toUpperCase(), color },
        };
      });
      explanation = s.readingLight
        ? "You selected the arrow's location while ignoring the direction it pointed. Spatial cues can conflict. This is a playful adaptation, not a standard Simon or Stroop experiment; small samples do not establish an interference effect."
        : "Word meaning can compete with naming ink color. This button-based game is inspired by Stroop research, rather than an exact replication. Small counts and network delays limit what response-time differences can tell us.";
    }
    if (s.mode === "team" && family !== "focus") {
      condition = "Shared fragments";
      explanation +=
        " Sharing can recover missing information, but a group can also spread mistakes. Private exposure and team exposure differ here, so they are not equivalent tests.";
    }
    const instruction =
      family === "focus"
        ? s.readingLight
          ? "Choose the side where the arrow is. Ignore where it points."
          : "Choose the ink color. Word meaning is a distractor."
        : s.mode === "team"
          ? "Remember your fragment. Everyone has part of the picture."
          : family === "scene"
            ? "Remember the objects and their shelf spots."
            : family === "sequence"
              ? "Remember the symbols in order."
              : "Study these six relationships. You will recall them without the cards.";
    return {
      id,
      family,
      title: FAMILY_NAMES[family],
      instruction,
      study,
      questions,
      condition,
      explanation,
      source,
    };
  });
}
export function publicQuestion(q: QuestionKey) {
  const { correct, factIndex, source, explanation, ...safe } = q;
  return safe;
}
export function exposure(round: Round, playerIndex: number, players: number) {
  const total = round.study?.cards?.length ?? round.study?.tiles?.length ?? 6;
  return [...Array(total).keys()].filter(
    (i) => i % players === playerIndex || i === playerIndex % total,
  );
}
