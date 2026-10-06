import {
  materialSchema,
  normalizedText,
  type Material,
} from "../shared/content";
import type { Fact } from "../shared/types";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
export function cardId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `card-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
export function pastedMaterial(
  text: string,
  label = "Pasted course notes",
): Material {
  const pages = text
    .split("\f")
    .map((text, i) => ({ page: i + 1, text: text.trim() }))
    .filter((p) => p.text);
  const parsed = materialSchema.safeParse({ label, pages });
  if (!parsed.success)
    throw new Error(
      "Use readable text within 25 pages, 30,000 characters per page, and 80,000 characters total.",
    );
  return parsed.data;
}
export async function readMaterial(file: File): Promise<Material> {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a document of 10 MB or less.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  const label = file.name.slice(0, 120);
  if (["txt", "md", "csv", "tsv"].includes(ext ?? ""))
    return pastedMaterial(await file.text(), label);
  if (ext === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({
      arrayBuffer: await file.arrayBuffer(),
    });
    return pastedMaterial(result.value, label);
  }
  if (ext === "pdf") {
    const pdf = await import("pdfjs-dist");
    pdf.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    const task = pdf.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      useSystemFonts: true,
    });
    let document;
    try {
      document = await task.promise;
      if (document.numPages > 25)
        throw new Error(
          "This PDF has more than 25 pages. Export the relevant pages first.",
        );
      const pages = [];
      for (let page = 1; page <= document.numPages; page++) {
        const content = await (await document.getPage(page)).getTextContent();
        const text = content.items
          .map((item) =>
            "str" in item
              ? item.str + ("hasEOL" in item && item.hasEOL ? "\n" : " ")
              : "",
          )
          .join("")
          .trim();
        if (text) pages.push({ page, text });
      }
      if (!pages.length)
        throw new Error(
          "This PDF has no readable text. Paste text or use a text-based PDF; scanned pages need OCR first.",
        );
      return materialSchema.parse({ label, pages });
    } finally {
      await task.destroy();
    }
  }
  throw new Error("Choose TXT, Markdown, CSV, TSV, DOCX, or a text-based PDF.");
}
// Parses comma-separated records while preserving each exact source excerpt.
function csvRecords(text: string) {
  const rows: { fields: string[]; raw: string }[] = [];
  let fields: string[] = [],
    field = "",
    quoted = false,
    start = 0;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || !field.trim()) quoted = !quoted;
      else field += c;
    } else if (c === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else if ((c === "\n" && !quoted) || i === text.length) {
      fields.push(field.trim());
      rows.push({ fields, raw: text.slice(start, i).trim() });
      fields = [];
      field = "";
      start = i + 1;
    } else if (c !== "\r") field += c;
  }
  if (quoted)
    throw new Error("A CSV quote is not closed. Check the glossary file.");
  return rows;
}
// Deterministic glossary parsing; no model, network request, or generated facts.
export function glossaryDrafts(material: Material): Fact[] {
  const pairs: {
    term: string;
    definition: string;
    page: number;
    quote: string;
  }[] = [];
  for (const page of material.pages)
    for (const record of csvRecords(page.text)) {
      if (pairs.length >= 100) break;
      const raw = record.raw;
      const line = raw.replace(/^\s*[-*]\s+/, "").trim();
      const match =
        line.match(/^(.{1,80}?)(?:\t|\s*:\s*|\s+—\s+|\s+–\s+)(.{12,160})$/) ??
        (record.fields.length === 2 ? [raw, ...record.fields] : null);
      if (!match || /^(https?|source|reference)$/i.test(match[1])) continue;
      const term = match[1].trim(),
        definition = match[2].trim();
      if (
        !term ||
        term.length > 80 ||
        definition.length < 12 ||
        definition.length > 160 ||
        raw.length > 400 ||
        /^(term|answer)$/i.test(term) ||
        !definition ||
        pairs.some((p) => p.term.toLowerCase() === term.toLowerCase())
      )
        continue;
      pairs.push({
        term,
        definition,
        page: page.page,
        quote: raw.trim().slice(0, 400),
      });
      if (pairs.length >= 100) break;
    }
  if (pairs.length < 4)
    throw new Error(
      "Use at least four glossary lines such as “Encoding: Getting information into memory”. Each definition needs 12–160 characters. You can also author cards manually.",
    );
  return pairs
    .slice(0, 100)
    .map<Fact>((p, i) => ({
      id: cardId(),
      cue: p.definition,
      answer: p.term,
      alternatives: Array.from(
        { length: 3 },
        (_, n) => pairs[(i + n + 1) % pairs.length].term,
      ),
      explanation: p.definition,
      source: `${material.label}, page ${p.page}`,
      evidence: {
        label: material.label,
        page: p.page,
        quote: p.quote,
        method: "notes",
        reviewed: false,
      },
    }))
    .filter((f) =>
      normalizedText(
        material.pages.find((p) => p.page === f.evidence!.page)!.text,
      ).includes(normalizedText(f.evidence!.quote)),
    );
}
