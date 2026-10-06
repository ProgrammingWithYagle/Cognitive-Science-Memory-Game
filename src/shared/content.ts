import { z } from "zod";

export const evidenceSchema = z.object({
  label: z.string().trim().min(1).max(120),
  page: z.number().int().min(1).max(25),
  quote: z.string().trim().min(12).max(400),
  method: z.enum(["notes", "ai"]),
  reviewed: z.boolean(),
});
export const factSchema = z
  .object({
    id: z.string().min(1).max(100),
    cue: z.string().trim().min(1).max(160),
    answer: z.string().trim().min(1).max(80),
    alternatives: z.array(z.string().trim().min(1).max(80)).length(3),
    explanation: z.string().max(500),
    source: z.string().max(500),
    evidence: evidenceSchema.optional(),
  })
  .refine(
    (f) =>
      new Set([f.answer, ...f.alternatives].map((s) => s.toLocaleLowerCase()))
        .size === 4,
    {
      message:
        "Each card needs one correct answer and three different alternatives.",
    },
  );
export const packSchema = z
  .object({
    version: z.literal(1),
    id: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(80),
    school: z.string().max(100),
    course: z.string().max(80),
    description: z.string().max(500),
    catalogue: z.string().max(500).optional(),
    facts: z.array(factSchema).min(6).max(100),
    custom: z.boolean().optional(),
  })
  .refine((p) => new Set(p.facts.map((f) => f.id)).size === p.facts.length, {
    message: "Card IDs must be unique.",
  })
  .refine((p) => p.facts.every((f) => !f.evidence || f.evidence.reviewed), {
    message: "Review every imported or AI-drafted card before playing.",
  });

export interface MaterialPage {
  page: number;
  text: string;
}
export interface Material {
  label: string;
  pages: MaterialPage[];
}
export const materialSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    pages: z
      .array(
        z.object({
          page: z.number().int().min(1).max(25),
          text: z.string().min(1).max(30000),
        }),
      )
      .min(1)
      .max(25),
  })
  .refine((m) => m.pages.reduce((n, p) => n + p.text.length, 0) <= 80000, {
    message: "Select at most 80,000 characters of source material.",
  })
  .refine((m) => new Set(m.pages.map((p) => p.page)).size === m.pages.length, {
    message: "Source page numbers must be unique.",
  });
export const draftRequestSchema = z.object({
  material: materialSchema,
  count: z.number().int().min(6).max(12),
});
export type DraftRequest = z.infer<typeof draftRequestSchema>;
export function normalizedText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

// Conservative token bound: one token per UTF-8 byte plus request framing.
// Prices checked in official model documentation on 2026-10-04; no cache discount assumed.
export const DRAFT_MODEL = "gpt-6.1-sol";
export const DRAFT_OUTPUT_LIMIT = 6000;
export const DRAFT_PRICES = { input: 2, output: 10, checked: "2026-10-04" };
export function estimateDraft(request: DraftRequest) {
  const inputTokenBound =
    new TextEncoder().encode(JSON.stringify(request)).length + 6000;
  return {
    model: DRAFT_MODEL,
    maximumUsd:
      Math.ceil(
        (inputTokenBound * DRAFT_PRICES.input +
          DRAFT_OUTPUT_LIMIT * DRAFT_PRICES.output) /
          10000,
      ) / 100,
    inputTokenBound,
    outputTokenLimit: DRAFT_OUTPUT_LIMIT,
    pricesChecked: DRAFT_PRICES.checked,
  };
}
