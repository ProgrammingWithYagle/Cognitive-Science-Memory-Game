import { useEffect, useRef, useState } from "react";
import type { ContentPack, CourseInfo, Fact, PackInfo } from "../shared/types";
import { estimateDraft, packSchema, type Material } from "../shared/content";
import {
  cardId,
  glossaryDrafts,
  pastedMaterial,
  readMaterial,
} from "./material";

const blank = (): Fact => ({
  id: cardId(),
  cue: "",
  answer: "",
  alternatives: ["", "", ""],
  explanation: "",
  source: "",
});
function fresh(course?: CourseInfo): ContentPack {
  return {
    version: 1,
    id: `custom-${cardId()}`,
    name: course ? `${course.code} · My notes`.slice(0, 80) : "My course pack",
    school: course?.school ?? "My collection",
    course: course?.code ?? "",
    catalogue: course?.catalogue,
    description: "A collection of my own study cards.",
    custom: true,
    facts: Array.from({ length: 6 }, blank),
  };
}
type Tab = "library" | "cards" | "material" | "ai";
interface Job {
  id: string;
  status: string;
  cards?: Fact[];
  discarded?: number;
  error?: string;
  usage?: { usd: number; inputTokens: number; outputTokens: number };
}
export function Studio({
  packs,
  builtIn,
  onChoose,
  onSave,
  onDelete,
  onClose,
}: {
  packs: ContentPack[];
  builtIn: PackInfo[];
  onChoose: (id: string) => void;
  onSave: (p: ContentPack) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("library"),
    [pack, setPack] = useState<ContentPack>(() => fresh()),
    [index, setIndex] = useState(0),
    [error, setError] = useState(""),
    [note, setNote] = useState("");
  const [courses, setCourses] = useState<CourseInfo[]>([]),
    [school, setSchool] = useState("Case Western Reserve University"),
    [search, setSearch] = useState("");
  const [material, setMaterial] = useState<Material | null>(null),
    [text, setText] = useState(""),
    [reading, setReading] = useState(false),
    [sourcePage, setSourcePage] = useState(1);
  const [key, setKey] = useState(""),
    [consent, setConsent] = useState(false),
    [count, setCount] = useState(6),
    [job, setJob] = useState<Job | null>(null),
    [draftBusy, setDraftBusy] = useState(false);
  const author = useRef(""),
    pendingJob = useRef(""),
    mounted = useRef(true),
    generation = useRef(0),
    requestAbort = useRef<AbortController | null>(null);
  const fact = pack.facts[index];
  const budget = material ? estimateDraft({ material, count }) : null;
  useEffect(() => {
    mounted.current = true;
    void fetch("/api/courses")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((c) => {
        if (mounted.current) setCourses(c);
      })
      .catch(() => {
        if (mounted.current)
          setError(
            "Course library could not load. You can still author a pack.",
          );
      });
    return () => {
      mounted.current = false;
      generation.current++;
      requestAbort.current?.abort();
      if (pendingJob.current)
        void fetch(`/api/author/jobs/${pendingJob.current}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${author.current}` },
          keepalive: true,
        });
      author.current = "";
    };
  }, []);
  function clearFeedback() {
    setError("");
    setNote("");
  }
  function update(patch: Partial<Fact>) {
    clearFeedback();
    setPack((p) => ({
      ...p,
      facts: p.facts.map((f, i) =>
        i === index
          ? {
              ...f,
              ...patch,
              evidence: f.evidence
                ? { ...f.evidence, reviewed: false }
                : undefined,
            }
          : f,
      ),
    }));
  }
  function addDrafts(cards: Fact[]) {
    const existing = pack.facts.filter((f) => f.cue.trim() || f.answer.trim());
    if (existing.length + cards.length > 100)
      throw new Error(
        "A pack holds at most 100 cards. Remove some cards or start a new pack.",
      );
    setPack((p) => ({ ...p, facts: [...existing, ...cards] }));
    setIndex(existing.length);
    setTab("cards");
    setNote(
      `${cards.length} draft cards added. Review the answer, alternatives, and supporting passage on each card.`,
    );
  }
  function save() {
    clearFeedback();
    const parsed = packSchema.safeParse(pack);
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? "Complete at least six cards.",
      );
      return;
    }
    onSave({ ...parsed.data, custom: true });
    setNote(
      "Saved on this device. Use this pack when you create a room, or export it to share.",
    );
  }
  function download() {
    const parsed = packSchema.safeParse(pack);
    if (!parsed.success) {
      setError("Complete and review your pack before exporting it.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(parsed.data, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pack.course || "mind-mosaic"}-pack.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importPack(file?: File) {
    if (!file) return;
    clearFeedback();
    try {
      if (file.size > 250000)
        throw new Error("Choose a JSON pack smaller than 250 KB.");
      const parsed = packSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error(
          parsed.error.issues[0]?.message ?? "Choose a valid version 1 pack.",
        );
      setPack({
        ...parsed.data,
        id: `custom-${cardId()}`,
        custom: true,
        facts: parsed.data.facts.map((f) => ({
          ...f,
          id: cardId(),
          evidence: f.evidence ? { ...f.evidence, reviewed: false } : undefined,
        })),
      });
      setIndex(0);
      setTab("cards");
      setNote(
        "Imported. Cards with source passages need your review before play.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this pack.");
    }
  }
  async function importMaterial(file?: File) {
    if (!file) return;
    clearFeedback();
    setReading(true);
    try {
      const value = await readMaterial(file);
      if (mounted.current) {
        setMaterial(value);
        setSourcePage(value.pages[0].page);
        setConsent(false);
        setNote(
          "Text extracted on this device. Check the reading order and symbols in the preview.",
        );
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : "The document could not be read.",
        );
    } finally {
      if (mounted.current) setReading(false);
    }
  }
  async function api(
    path: string,
    body?: unknown,
    method = "POST",
    signal?: AbortSignal,
  ): Promise<any> {
    const response = await fetch("/api/author" + path, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(author.current
          ? { Authorization: `Bearer ${author.current}` }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "The studio request could not finish.");
    return data;
  }
  async function draft() {
    if (draftBusy || !material || !key || !consent) return;
    const source = material,
      apiKey = key;
    setKey("");
    setDraftBusy(true);
    clearFeedback();
    setJob(null);
    const mine = ++generation.current;
    const abort = new AbortController();
    requestAbort.current = abort;
    try {
      if (!author.current)
        author.current = (
          await api("/session", {}, "POST", abort.signal)
        ).token;
      const started = await api(
        "/jobs",
        { material: source, count, key: apiKey, consent: true },
        "POST",
        abort.signal,
      );
      pendingJob.current = started.id;
      if (!mounted.current || mine !== generation.current) {
        void api(`/jobs/${started.id}`, undefined, "DELETE");
        return;
      }
      setJob(started);
      let current: Job = started;
      while (
        current.status === "working" &&
        mounted.current &&
        mine === generation.current
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1600));
        if (!mounted.current || mine !== generation.current) break;
        current = await api(
          `/jobs/${started.id}/status`,
          {},
          "POST",
          abort.signal,
        );
        setJob(current);
      }
      if (!mounted.current || mine !== generation.current) return;
      if (current.status === "complete" && current.cards) {
        addDrafts(current.cards);
        setConsent(false);
      } else if (current.error) setError(current.error);
    } catch (e) {
      if (mounted.current && mine === generation.current)
        setError(e instanceof Error ? e.message : "Draft could not finish.");
    } finally {
      if (mine === generation.current) {
        pendingJob.current = "";
        requestAbort.current = null;
        if (mounted.current) setDraftBusy(false);
      }
    }
  }
  async function cancel() {
    generation.current++;
    requestAbort.current?.abort();
    if (pendingJob.current)
      void api(`/jobs/${pendingJob.current}`, undefined, "DELETE").catch(
        () => {},
      );
    pendingJob.current = "";
    setDraftBusy(false);
    setJob(null);
    setConsent(false);
    setNote(
      "Cancelled. A request already sent to OpenAI may still incur usage.",
    );
  }
  const filtered = courses
    .filter(
      (c) =>
        (!school || c.school === school) &&
        `${c.code} ${c.title} ${c.topics.join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .slice(0, 100);
  const complete = pack.facts.filter(
    (f) =>
      !!f.cue &&
      !!f.answer &&
      f.alternatives.every(Boolean) &&
      (!f.evidence || f.evidence.reviewed),
  ).length;
  return (
    <div className="modal-backdrop">
      <section
        className="modal studio studio-expanded"
        role="dialog"
        aria-modal="true"
        aria-label="Content studio"
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close studio"
        >
          ×
        </button>
        <span className="eyebrow">MAKE ROOM FOR WHAT YOU’RE LEARNING</span>
        <h2>Content studio</h2>
        <div className="studio-tabs" role="group" aria-label="Studio sections">
          {(
            [
              ["library", "Course library"],
              ["cards", "My cards"],
              ["material", "My materials"],
              ["ai", "AI drafting"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              aria-pressed={tab === id}
              onClick={() => {
                clearFeedback();
                setTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "library" && (
          <>
            <p className="muted">
              Find your course, try a foundation pack, or add your own notes.
              These starters use shared introductory topics; compare them with
              your syllabus.
            </p>
            <div className="field-grid">
              <label>
                University
                <select
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                >
                  <option value="">All universities</option>
                  {[...new Set(courses.map((c) => c.school))].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Find a course
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Course code, title, or topic"
                />
              </label>
            </div>
            <p className="small muted">
              {courses.length} catalogue entries · course names checked October
              4, 2026. Listings can change.
            </p>
            <div className="course-list">
              {filtered.map((c) => {
                const starter = builtIn.find((p) => p.id === c.packId);
                return (
                  <article className="course-row" key={c.id}>
                    <div>
                      <span className="eyebrow">{c.code}</span>
                      <h3>{c.title}</h3>
                      <p className="muted">{c.school}</p>
                      <span className="pill">
                        {starter
                          ? `${starter.count} starter cards`
                          : "Add your materials"}
                      </span>{" "}
                      <a
                        href={c.catalogue}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="source-link"
                      >
                        Catalogue ↗
                      </a>
                    </div>
                    <div className="button-row">
                      {starter && (
                        <button
                          className="primary"
                          onClick={() => {
                            onChoose(starter.id);
                            onClose();
                          }}
                        >
                          Use starter
                        </button>
                      )}
                      <button
                        className="secondary"
                        onClick={() => {
                          setPack(fresh(c));
                          setIndex(0);
                          setTab("material");
                          clearFeedback();
                        }}
                      >
                        Build my pack
                      </button>
                    </div>
                  </article>
                );
              })}
              {!filtered.length && (
                <p>
                  No listed course matches. Create a pack for any school below.
                </p>
              )}
            </div>
            <button
              className="secondary"
              onClick={() => {
                setPack(fresh());
                setIndex(0);
                setTab("cards");
              }}
            >
              Create any course or collection
            </button>
          </>
        )}
        {tab === "cards" && (
          <>
            <p className="muted">
              {complete} / {pack.facts.length} cards ready. Four rounds need 6
              cards, six rounds need 12, and ten rounds need 18.
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => {
                  setPack(fresh());
                  setIndex(0);
                  clearFeedback();
                }}
              >
                New pack
              </button>
              {packs.length > 0 && (
                <label>
                  Saved packs
                  <select
                    value={packs.some((p) => p.id === pack.id) ? pack.id : ""}
                    onChange={(e) => {
                      const p = packs.find((p) => p.id === e.target.value);
                      if (p) {
                        setPack(p);
                        setIndex(0);
                        clearFeedback();
                      }
                    }}
                  >
                    <option value="" disabled>
                      Choose a saved pack
                    </option>
                    {packs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="field-grid">
              <label>
                Pack title
                <input
                  value={pack.name}
                  maxLength={80}
                  onChange={(e) => setPack({ ...pack, name: e.target.value })}
                />
              </label>
              <label>
                School / collection
                <input
                  value={pack.school}
                  maxLength={100}
                  onChange={(e) => setPack({ ...pack, school: e.target.value })}
                />
              </label>
              <label>
                Course code
                <input
                  value={pack.course}
                  maxLength={80}
                  onChange={(e) => setPack({ ...pack, course: e.target.value })}
                />
              </label>
            </div>
            <div className="studio-card">
              <div className="studio-pagination">
                <button
                  className="small-button"
                  aria-label="Previous card"
                  disabled={index === 0}
                  onClick={() => setIndex((i) => i - 1)}
                >
                  ←
                </button>
                <label className="card-jump">
                  Card
                  <select
                    value={index}
                    onChange={(e) => setIndex(Number(e.target.value))}
                  >
                    {pack.facts.map((f, i) => (
                      <option key={f.id} value={i}>
                        {i + 1} / {pack.facts.length}
                        {f.evidence && !f.evidence.reviewed
                          ? " · needs review"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="small-button"
                  aria-label="Next card"
                  disabled={index >= pack.facts.length - 1}
                  onClick={() => setIndex((i) => i + 1)}
                >
                  →
                </button>
              </div>
              {fact.evidence && (
                <div className="source-evidence">
                  <span className="eyebrow">
                    {fact.evidence.method === "ai"
                      ? "AI DRAFT"
                      : "IMPORTED GLOSSARY"}{" "}
                    · REVIEW REQUIRED
                  </span>
                  <p>
                    <strong>
                      {fact.evidence.label} · page {fact.evidence.page}
                    </strong>
                  </p>
                  <blockquote>{fact.evidence.quote}</blockquote>
                  <p className="small">
                    This passage was found in the source. Check that it supports
                    the answer and that every alternative is incorrect.
                  </p>
                </div>
              )}
              <label>
                Clue or definition
                <input
                  value={fact.cue}
                  maxLength={160}
                  onChange={(e) => update({ cue: e.target.value })}
                />
              </label>
              <label>
                Correct answer
                <input
                  value={fact.answer}
                  maxLength={80}
                  onChange={(e) => update({ answer: e.target.value })}
                />
              </label>
              <div className="field-grid">
                {fact.alternatives.map((a, i) => (
                  <label key={i}>
                    Alternative {i + 1}
                    <input
                      value={a}
                      maxLength={80}
                      onChange={(e) =>
                        update({
                          alternatives: fact.alternatives.map((old, n) =>
                            n === i ? e.target.value : old,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Explanation
                <textarea
                  value={fact.explanation}
                  maxLength={500}
                  onChange={(e) => update({ explanation: e.target.value })}
                />
              </label>
              <label>
                Source URL or reference
                <input
                  value={fact.source}
                  maxLength={500}
                  onChange={(e) => update({ source: e.target.value })}
                />
              </label>
              {fact.evidence && (
                <label className="checkbox-label review-label">
                  <input
                    type="checkbox"
                    checked={fact.evidence.reviewed}
                    onChange={(e) => {
                      setPack((p) => ({
                        ...p,
                        facts: p.facts.map((f, i) =>
                          i === index
                            ? {
                                ...f,
                                evidence: {
                                  ...f.evidence!,
                                  reviewed: e.target.checked,
                                },
                              }
                            : f,
                        ),
                      }));
                      clearFeedback();
                    }}
                  />{" "}
                  I checked this card against the source and reviewed all four
                  choices.
                </label>
              )}
              <div className="button-row">
                <button
                  className="text-button"
                  disabled={pack.facts.length >= 100}
                  onClick={() => {
                    setPack((p) => ({ ...p, facts: [...p.facts, blank()] }));
                    setIndex(pack.facts.length);
                  }}
                >
                  + Add card
                </button>
                <button
                  className="text-button"
                  disabled={pack.facts.length <= 1}
                  onClick={() => {
                    setPack((p) => ({
                      ...p,
                      facts: p.facts.filter((_, i) => i !== index),
                    }));
                    setIndex((i) => Math.max(0, i - 1));
                  }}
                >
                  Remove this card
                </button>
              </div>
            </div>
            <div className="button-row">
              <label
                className="secondary file-button"
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.querySelector("input")?.click();
                  }
                }}
              >
                Import pack
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    void importPack(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <button className="secondary" onClick={download}>
                Export pack
              </button>
              <button className="primary" onClick={save}>
                Save pack
              </button>
              {packs.some((p) => p.id === pack.id) && (
                <button
                  className="text-button"
                  onClick={() => {
                    onDelete(pack.id);
                    setPack(fresh());
                    setIndex(0);
                    setNote("Removed from this device.");
                  }}
                >
                  Delete saved pack
                </button>
              )}
            </div>
          </>
        )}
        {tab === "material" && (
          <>
            <p className="muted">
              For {pack.course || pack.name}. Read notes on this device, then
              choose how to make cards.
            </p>
            <label
              className="secondary file-button"
              tabIndex={0}
              role="button"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.querySelector("input")?.click();
                }
              }}
            >
              {reading ? "Reading document…" : "Choose course material"}
              <input
                type="file"
                disabled={reading || draftBusy}
                accept=".txt,.md,.pdf,.docx,.csv,.tsv"
                onChange={(e) => {
                  void importMaterial(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="small muted">
              TXT, Markdown, CSV/TSV glossary, DOCX, or text-based PDF · 10 MB ·
              25 pages · 80,000 characters. Text extraction happens locally.
              Scanned PDFs need OCR first.
            </p>
            <label>
              Or paste notes
              <textarea
                className="material-input"
                value={text}
                maxLength={80000}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  "Encoding: Getting information into memory\nStorage: Keeping information over time\nRetrieval: Bringing stored information back to mind\nRecognition: Identifying something encountered before"
                }
              />
            </label>
            <button
              className="secondary"
              disabled={!text.trim() || draftBusy}
              onClick={() => {
                clearFeedback();
                try {
                  const m = pastedMaterial(text);
                  setMaterial(m);
                  setSourcePage(m.pages[0].page);
                  setConsent(false);
                  setNote("Notes ready. Check the source preview.");
                } catch {
                  setError(
                    "Use nonempty notes within the 80,000-character limit.",
                  );
                }
              }}
            >
              Use pasted notes
            </button>
            {material && (
              <div className="material-preview">
                <div className="section-heading">
                  <h3>{material.label}</h3>
                  <label>
                    Source page
                    <select
                      value={sourcePage}
                      onChange={(e) => setSourcePage(Number(e.target.value))}
                    >
                      {material.pages.map((p) => (
                        <option key={p.page} value={p.page}>
                          Page {p.page}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <pre>
                  {material.pages.find((p) => p.page === sourcePage)?.text}
                </pre>
                <p className="small">
                  {material.pages.length} text pages ·{" "}
                  {material.pages
                    .reduce((n, p) => n + p.text.length, 0)
                    .toLocaleString()}{" "}
                  characters. Extracted layout and formulas may need correction.
                </p>
                <div className="button-row">
                  <button
                    className="primary"
                    disabled={draftBusy}
                    onClick={() => {
                      clearFeedback();
                      try {
                        addDrafts(glossaryDrafts(material));
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Glossary could not be read.",
                        );
                      }
                    }}
                  >
                    Make glossary drafts
                  </button>
                  <button className="secondary" onClick={() => setTab("ai")}>
                    Draft with AI
                  </button>
                  <button
                    className="text-button"
                    disabled={draftBusy}
                    onClick={() => {
                      setMaterial(null);
                      setText("");
                      setConsent(false);
                      setKey("");
                    }}
                  >
                    Clear source text
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {tab === "ai" && (
          <>
            <p className="muted">
              Optional drafting for the pack creator using an OpenAI API key.
              Players never need a key. Drafting uses GPT-6.1 Sol with high
              reasoning; every card still needs your factual review.
            </p>
            {!material ? (
              <button className="primary" onClick={() => setTab("material")}>
                Add your source material first
              </button>
            ) : (
              <>
                <p>
                  <strong>{material.label}</strong> · {material.pages.length}{" "}
                  selected pages{" "}
                  <button
                    className="text-button"
                    disabled={draftBusy}
                    onClick={() => setTab("material")}
                  >
                    Review text
                  </button>
                </p>
                <label>
                  Draft count
                  <select
                    value={count}
                    disabled={draftBusy}
                    onChange={(e) => {
                      setCount(Number(e.target.value));
                      setConsent(false);
                    }}
                  >
                    <option value="6">6 cards</option>
                    <option value="12">12 cards</option>
                  </select>
                </label>
                <div className="draft-budget">
                  <strong>
                    Request cost bound: ${budget?.maximumUsd.toFixed(2)} USD
                  </strong>
                  <p className="small">
                    Conservative input allowance and a 6,000-token output cap,
                    including reasoning. Standard prices checked{" "}
                    {budget?.pricesChecked}; cached-input discounts are ignored.
                    This is a usage estimate, not a charge guarantee.{" "}
                    <a
                      href="https://developers.openai.com/api/docs/models/gpt-6.1-sol"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Current pricing ↗
                    </a>
                  </p>
                </div>
                <label>
                  OpenAI API key
                  <input
                    type="password"
                    value={key}
                    disabled={draftBusy}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="sk-…"
                    onChange={(e) => setKey(e.target.value)}
                    maxLength={503}
                  />
                </label>
                <p className="small muted">
                  The key is cleared when submitted and kept only in memory
                  while the request runs. It is never saved in a pack, browser
                  storage, or a room. Text is sent to OpenAI only when you
                  choose Generate.{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Create a key ↗
                  </a>
                </p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={draftBusy}
                    onChange={(e) => setConsent(e.target.checked)}
                  />{" "}
                  I’m allowed to use this material and agree to send this
                  selected text to OpenAI for this paid API request.
                </label>
                <div className="button-row">
                  <button
                    className="primary"
                    disabled={
                      !window.isSecureContext || !consent || !key || draftBusy
                    }
                    onClick={() => void draft()}
                  >
                    {draftBusy ? "Drafting…" : "Generate draft cards"}
                  </button>
                  {draftBusy && (
                    <button className="secondary" onClick={() => void cancel()}>
                      Cancel request
                    </button>
                  )}
                </div>
                {!window.isSecureContext && (
                  <p className="inline-error">
                    Open the game with HTTPS or localhost to use an API key.
                  </p>
                )}
              </>
            )}
          </>
        )}
        {job?.usage && (
          <p className="small muted">
            Reported usage: {job.usage.inputTokens.toLocaleString()} input /{" "}
            {job.usage.outputTokens.toLocaleString()} output tokens · estimated
            ${job.usage.usd.toFixed(4)} USD.
          </p>
        )}
        {!!job?.discarded && (
          <p className="small muted">
            {job.discarded} draft cards were discarded because their source or
            format checks failed.
          </p>
        )}
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="studio-note">
            {note}
          </p>
        )}
        <div className="studio-footer">
          <span className="small muted">
            Saved cards stay on this device until used in a room or exported.
          </span>
          <button className="secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </section>
    </div>
  );
}
