import { expect, it } from "vitest";
import {
  glossaryDrafts,
  pastedMaterial,
  readMaterial,
} from "../src/client/material";
import { packSchema } from "../src/shared/content";
import { PACKS } from "../src/server/content";
const notes = [
  "Encoding: Getting information into memory",
  "Storage: Keeping information over time",
  "Retrieval: Bringing stored information back to mind",
  "Recognition: Identifying something encountered before",
  "Recall: Retrieving without being shown the answer",
  "Chunking: Grouping elements into meaningful units",
].join("\n");
it("imports local glossary text with exact evidence and requires a separate review for every card", async () => {
  const material = await readMaterial(new File([notes], "my-course.txt"));
  const cards = glossaryDrafts(material);
  expect(cards).toHaveLength(6);
  expect(cards.every((c) => !c.evidence!.reviewed)).toBe(true);
  const pack = { ...PACKS[0], facts: cards };
  expect(packSchema.safeParse(pack).success).toBe(false);
  cards.forEach((c) => (c.evidence!.reviewed = true));
  expect(packSchema.safeParse(pack).success).toBe(true);
  expect(JSON.stringify(cards)).not.toContain("sk-");
});
it("reads quoted CSV commas and multiline definitions without altering the supporting passage", () => {
  const text =
    'Term,Definition\nEncoding,"Getting information into memory, including new ideas"\nStorage,Keeping information over time\nRetrieval,Bringing stored information back to mind\nRecognition,"Identifying something\nencountered before"';
  const material = pastedMaterial(text);
  const cards = glossaryDrafts(material);
  expect(cards).toHaveLength(4);
  expect(cards[0].answer).toBe("Encoding");
  expect(cards[0].cue).toContain(", including");
  expect(cards[3].cue).toContain("\n");
  expect(cards.every((c) => text.includes(c.evidence!.quote))).toBe(true);
  expect(() =>
    glossaryDrafts(pastedMaterial('One,"Unclosed quotation here')),
  ).toThrow(/quote/);
});
it("rejects duplicate-only glossaries, unsupported formats, empty or overlarge material", async () => {
  expect(() =>
    glossaryDrafts(
      pastedMaterial(
        "One: A sufficiently long definition\nOne: Another sufficiently long definition",
      ),
    ),
  ).toThrow(/four/);
  expect(() => pastedMaterial("")).toThrow(/readable/);
  expect(() => pastedMaterial("x".repeat(30001))).toThrow(/30,000/);
  expect(() => pastedMaterial(Array(26).fill("text").join("\f"))).toThrow(/25/);
  await expect(
    readMaterial(new File(["content"], "notes.exe")),
  ).rejects.toThrow(/Choose TXT/);
  await expect(
    readMaterial(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.txt")),
  ).rejects.toThrow(/10 MB/);
});
