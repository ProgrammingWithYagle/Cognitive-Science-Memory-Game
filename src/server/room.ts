import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  ContentPack,
  Family,
  Phase,
  PlayerPublic,
  Proposal,
  Role,
  Round,
  RoundResult,
  Settings,
  Snapshot,
  Study,
} from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/types";
import {
  duration,
  exposure,
  generateRounds,
  publicQuestion,
  scoreAnswer,
} from "./rounds";
import { PACKS } from "./content";
interface Member extends PlayerPublic {
  token: string;
  joinedAt: number;
  disconnectedAt: number | null;
}
interface Answers {
  picks: Record<string, string>;
  points: Record<string, number>;
  committed: boolean;
}
interface History {
  round: Round;
  records: Record<string, Answers>;
  team: Record<string, string>;
}
const empty = (): Answers => ({ picks: {}, points: {}, committed: false });
const activePhases: Phase[] = [
  "countdown",
  "study",
  "answer",
  "private",
  "discuss",
];
export class Room {
  voiceRoomId = `mm-${randomUUID()}`;
  voiceMuted: string[] = [];
  code: string;
  revision = 0;
  hostId = "";
  settings: Settings = { ...DEFAULT_SETTINGS };
  phase: Phase = "lobby";
  phaseStart = 0;
  deadline: number | null = null;
  roundIndex = 0;
  currentQuestion = 0;
  members: Member[] = [];
  matchIds: string[] = [];
  rounds: Round[] = [];
  pack: ContentPack = PACKS[0];
  roundPlayerIds: string[] = [];
  records: Record<string, Answers> = {};
  teamBoard: Record<string, string> = {};
  proposals: Proposal[] = [];
  history: History[] = [];
  teamScore = 0;
  teamCorrect = 0;
  practice = false;
  chat: { id: string; name: string; text: string }[] = [];
  pauseReason?: string;
  idleSince: number | null = null;
  constructor(code: string, now = Date.now()) {
    this.code = code;
    this.phaseStart = now;
  }
  change() {
    this.revision++;
  }
  get round() {
    return this.rounds[this.roundIndex];
  }
  get players() {
    return this.members.filter((p) => this.matchIds.includes(p.id));
  }
  get connectedPlayers() {
    return this.players.filter((p) => p.connected && p.role === "player");
  }
  add(name: string, role: Role, now: number) {
    if (
      this.members.filter(
        (p) =>
          p.token &&
          (p.connected ||
            p.disconnectedAt === null ||
            now - p.disconnectedAt < 120000),
      ).length >= 24
    )
      throw new Error("This room has reached its spectator limit.");
    if (role === "player") {
      if (this.phase !== "lobby") role = "spectator";
      else if (this.members.filter((p) => p.role === "player").length >= 8)
        throw new Error(
          "This room is full: eight player seats. You can join as a display.",
        );
    }
    let candidate = name;
    let suffix = 2;
    while (this.members.some((p) => p.name === candidate))
      candidate = `${name.slice(0, 16)} ${suffix++}`;
    const member: Member = {
      id: randomUUID(),
      token: randomBytes(24).toString("hex"),
      name: candidate,
      role,
      connected: true,
      ready: false,
      score: 0,
      correct: 0,
      color: this.members.length % 8,
      submitted: false,
      joinedAt: now,
      disconnectedAt: null,
    };
    this.members.push(member);
    if (!this.hostId) {
      this.hostId = member.id;
      member.ready = role === "player";
    }
    this.idleSince = null;
    this.change();
    return member;
  }
  authenticate(id: string, token: string) {
    const p = this.members.find((m) => m.id === id);
    if (
      !p ||
      p.token.length !== 48 ||
      p.token.length !== token.length ||
      !timingSafeEqual(Buffer.from(p.token), Buffer.from(token))
    )
      throw new Error("Your room session expired. Join again.");
    return p;
  }
  member(id: string) {
    const p = this.members.find((x) => x.id === id);
    if (!p) throw new Error("Join a room first.");
    return p;
  }
  requireHost(id: string) {
    if (id !== this.hostId) throw new Error("Only the host can do that.");
  }
  connect(id: string, now: number) {
    const p = this.member(id);
    p.connected = true;
    p.disconnectedAt = null;
    this.idleSince = null;
    this.recover(now);
    this.change();
  }
  disconnect(id: string, now: number) {
    const p = this.member(id);
    p.connected = false;
    p.disconnectedAt = now;
    if (!this.members.some((m) => m.connected)) this.idleSince = now;
    if (activePhases.includes(this.phase) && !this.connectedPlayers.length)
      this.pause(
        "Waiting for a player to reconnect. The unfinished round restarts automatically.",
        now,
      );
    else if (
      this.settings.mode === "team" &&
      activePhases.includes(this.phase) &&
      this.roundPlayerIds.includes(id)
    )
      this.pause(
        "A fragment owner disconnected. This round restarts automatically on reconnect, or after the reserved seat expires.",
        now,
      );
    this.change();
  }
  leave(id: string, now: number) {
    const p = this.member(id);
    p.token = "";
    p.role = "spectator";
    this.disconnect(id, now);
    if (this.phase === "lobby") {
      this.members = this.members.filter((m) => m.id !== id);
      if (this.hostId === id)
        this.hostId =
          this.members
            .filter((m) => m.connected && m.role !== "display")
            .sort((a, b) => a.joinedAt - b.joinedAt)[0]?.id ?? "";
    }
    if (this.hostId === id)
      this.hostId =
        this.members
          .filter((m) => m.connected && m.role !== "display")
          .sort((a, b) => a.joinedAt - b.joinedAt)[0]?.id ?? "";
    this.recover(now);
    if (
      this.phase === "answer" &&
      this.settings.mode === "rally" &&
      this.connectedPlayers.length &&
      this.connectedPlayers.every((m) => this.records[m.id]?.committed)
    )
      this.advance(now);
    this.change();
  }
  pause(reason: string, now: number) {
    this.pauseReason = reason;
    this.phase = "paused";
    this.phaseStart = now;
    this.deadline = null;
    this.change();
  }
  tick(now: number) {
    const host = this.members.find((p) => p.id === this.hostId);
    if (
      host &&
      !host.connected &&
      host.disconnectedAt !== null &&
      now - host.disconnectedAt >= 15000
    ) {
      const successor = this.members
        .filter(
          (p) =>
            p.connected && (p.role === "player" || p.role === "facilitator"),
        )
        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (successor) {
        this.hostId = successor.id;
        this.change();
      }
    }
    for (const p of this.members)
      if (
        !p.connected &&
        p.disconnectedAt !== null &&
        now - p.disconnectedAt >= 120000 &&
        p.role === "player"
      ) {
        p.role = "spectator";
        this.change();
      }
    const retained = this.members.filter(
      (p) =>
        p.connected ||
        this.matchIds.includes(p.id) ||
        p.disconnectedAt === null ||
        now - p.disconnectedAt < 120000,
    );
    if (retained.length !== this.members.length) {
      this.members = retained;
      this.change();
    }
    this.recover(now);
    if (
      this.phase === "lobby" ||
      this.phase === "finished" ||
      this.phase === "paused"
    )
      return;
    let safety = 0;
    while (this.deadline !== null && now >= this.deadline && safety++ < 200)
      this.advance(this.deadline);
  }
  setPhase(phase: Phase, now: number, ms: number | null) {
    this.phase = phase;
    this.phaseStart = now;
    this.deadline = ms === null ? null : now + ms;
    this.change();
  }
  start(
    id: string,
    now: number,
    practice = false,
    practiceFamily: Family = "scene",
  ) {
    this.requireHost(id);
    if (this.phase !== "lobby")
      throw new Error("Return to the lobby before starting another match.");
    const players = this.members.filter(
      (p) => p.connected && p.role === "player",
    );
    if (players.length < (practice ? 1 : 2))
      throw new Error(
        practice
          ? "The host must take a player seat for practice."
          : "At least two players must join before starting.",
      );
    if (!practice && players.some((p) => !p.ready))
      throw new Error("Wait until every connected player is ready.");
    this.rounds = generateRounds(
      this.settings,
      this.pack,
      randomBytes(4).readUInt32LE(),
      practice,
      practice ? [practiceFamily] : undefined,
    );
    this.matchIds = players.map((p) => p.id);
    this.practice = practice;
    this.history = [];
    this.teamCorrect = 0;
    this.teamScore = 0;
    this.members.forEach((p) => {
      p.score = 0;
      p.correct = 0;
    });
    this.roundIndex = 0;
    this.beginRound(now);
  }
  beginRound(now: number) {
    this.roundPlayerIds = this.connectedPlayers.map((p) => p.id);
    this.records = {};
    this.teamBoard = {};
    this.proposals = [];
    this.currentQuestion = 0;
    this.pauseReason = undefined;
    this.setPhase("countdown", now, 3000);
    if (!this.roundPlayerIds.length)
      this.pause(
        "Waiting for a player to reconnect. Completed scores are saved.",
        now,
      );
  }
  recover(now: number) {
    if (this.phase !== "paused" || !this.connectedPlayers.length) return;
    if (
      this.settings.mode === "team" &&
      this.roundPlayerIds.some((id) => {
        const p = this.members.find((m) => m.id === id);
        return p?.role === "player" && !p.connected;
      })
    )
      return;
    this.restartRound(now);
  }
  advance(now: number) {
    if (this.phase === "countdown") {
      if (this.round.family === "focus") {
        if (this.settings.mode === "team")
          this.setPhase("private", now, duration(this.settings, 15));
        else this.beginAnswer(now);
      } else
        this.setPhase(
          "study",
          now,
          duration(this.settings, this.round.family === "facts" ? 30 : 8),
        );
    } else if (this.phase === "study") {
      if (this.settings.mode === "team")
        this.setPhase("private", now, duration(this.settings, 15));
      else this.beginAnswer(now);
    } else if (this.phase === "private") {
      this.proposals = this.players
        .flatMap((p) =>
          Object.entries(this.records[p.id]?.picks ?? {}).map(
            ([questionId, optionId]) => ({
              playerId: p.id,
              questionId,
              optionId,
            }),
          ),
        )
        .filter((p) => p.optionId !== "");
      this.setPhase("discuss", now, duration(this.settings, 45));
    } else if (
      this.phase === "answer" &&
      this.settings.mode === "frenzy" &&
      this.currentQuestion < 5
    ) {
      this.currentQuestion++;
      this.setPhase("answer", now, duration(this.settings, 8));
    } else if (this.phase === "answer" || this.phase === "discuss")
      this.finishRound(now);
    else if (this.phase === "reveal") this.nextRound(now);
  }
  beginAnswer(now: number) {
    this.setPhase(
      "answer",
      now,
      duration(this.settings, this.settings.mode === "frenzy" ? 8 : 45),
    );
  }
  exposureFor(id: string) {
    const index = this.roundPlayerIds.indexOf(id);
    return index < 0
      ? []
      : exposure(this.round, index, this.roundPlayerIds.length);
  }
  answer(id: string, picks: Record<string, string>, now: number) {
    if (
      !this.matchIds.includes(id) ||
      !this.member(id).connected ||
      this.member(id).role !== "player"
    )
      throw new Error("Only active players can answer.");
    if (this.phase !== "answer" && this.phase !== "private")
      throw new Error("The answer window is closed.");
    if (this.deadline !== null && now >= this.deadline)
      throw new Error("This prompt’s answer window is closed.");
    const record = (this.records[id] ??= empty());
    const fast = this.settings.mode === "frenzy" && this.phase === "answer";
    const allowed = fast
      ? [this.round.questions[this.currentQuestion]]
      : this.phase === "private"
        ? this.round.questions.filter((q) =>
            this.exposureFor(id).includes(q.factIndex),
          )
        : this.round.questions;
    if (
      (fast && Object.hasOwn(record.picks, allowed[0].id)) ||
      (!fast && record.committed)
    )
      return;
    if (
      Object.keys(picks).some((k) => !allowed.some((q) => q.id === k)) ||
      allowed.some(
        (q) =>
          picks[q.id] !== undefined &&
          !q.options.some((o) => o.id === picks[q.id]),
      )
    )
      throw new Error("An answer no longer belongs to this prompt.");
    for (const q of allowed) {
      record.picks[q.id] = picks[q.id] ?? "";
      record.points[q.id] =
        this.phase === "private" || this.practice
          ? 0
          : scoreAnswer(
              record.picks[q.id] === q.correct,
              now - this.phaseStart,
              this.settings,
            );
    }
    if (!fast) record.committed = true;
    this.change();
    if (
      !fast &&
      this.connectedPlayers.every((p) => this.records[p.id]?.committed)
    )
      this.advance(now);
  }
  captain() {
    const active = this.players.filter(
      (p) => p.connected && p.role === "player",
    );
    return active.length
      ? active[this.roundIndex % active.length].id
      : undefined;
  }
  propose(id: string, questionId: string, optionId: string) {
    if (
      this.phase !== "discuss" ||
      !this.matchIds.includes(id) ||
      this.member(id).role !== "player"
    )
      throw new Error("Clues and votes open during team discussion.");
    this.validateChoice(questionId, optionId);
    this.proposals = this.proposals.filter(
      (p) => p.playerId !== id || p.questionId !== questionId,
    );
    this.proposals.push({ playerId: id, questionId, optionId });
    this.change();
  }
  validateChoice(questionId: string, optionId: string) {
    if (
      !this.round.questions
        .find((q) => q.id === questionId)
        ?.options.some((o) => o.id === optionId)
    )
      throw new Error("That choice is not available.");
  }
  board(id: string, questionId: string, optionId: string) {
    if (this.phase !== "discuss" || this.captain() !== id)
      throw new Error("The current captain fills the team board.");
    this.validateChoice(questionId, optionId);
    this.teamBoard[questionId] = optionId;
    this.change();
  }
  lock(id: string, now: number) {
    if (this.phase !== "discuss" || this.captain() !== id)
      throw new Error("The current captain confirms the board.");
    if (Object.keys(this.teamBoard).length < 6)
      throw new Error(
        "Fill all six answers, or let the timer score the partial board.",
      );
    this.finishRound(now);
  }
  finishRound(now: number) {
    if (this.history.some((h) => h.round.id === this.round.id))
      throw new Error("Round already scored.");
    if (this.settings.mode === "team") {
      const correct = this.round.questions.filter(
        (q) => this.teamBoard[q.id] === q.correct,
      ).length;
      this.teamCorrect += correct;
      if (!this.practice) this.teamScore += 100 * correct;
    } else
      for (const p of this.players) {
        const r = this.records[p.id] ?? empty();
        p.score += Object.values(r.points).reduce((a, b) => a + b, 0);
        p.correct += this.round.questions.filter(
          (q) => r.picks[q.id] === q.correct,
        ).length;
      }
    this.history.push({
      round: this.round,
      records: structuredClone(this.records),
      team: { ...this.teamBoard },
    });
    this.setPhase("reveal", now, this.settings.classroom ? null : 12000);
  }
  nextRound(now: number) {
    if (this.roundIndex + 1 >= this.rounds.length)
      this.setPhase("finished", now, null);
    else {
      this.roundIndex++;
      this.beginRound(now);
    }
  }
  next(id: string, now: number) {
    this.requireHost(id);
    if (this.phase === "reveal") this.nextRound(now);
    else if (this.phase === "paused") {
      if (!this.connectedPlayers.length)
        throw new Error("Wait for a player to reconnect.");
      if (
        this.settings.mode === "team" &&
        this.roundPlayerIds.some((id) => {
          const p = this.member(id);
          return p.role === "player" && !p.connected;
        })
      )
        throw new Error(
          "Wait for the fragment owner to reconnect, leave, or expire.",
        );
      this.restartRound(now);
    } else throw new Error("The host can advance after the reveal.");
  }
  restartRound(now: number) {
    const old = this.round;
    const reserved = new Set(
      this.rounds
        .filter((_, i) => i !== this.roundIndex)
        .filter((r) => r.family === "facts")
        .flatMap((r) => r.questions.map((q) => q.text)),
    );
    const available = this.pack.facts.filter((f) => !reserved.has(f.cue));
    const fresh = generateRounds(
      this.settings,
      { ...this.pack, facts: available },
      randomBytes(4).readUInt32LE(),
      false,
      [old.family],
    )[0];
    if (old.family === "sequence" && fresh.study && old.study) {
      fresh.study.grouped = old.study.grouped;
      if (this.settings.mode !== "team") fresh.condition = old.condition;
    }
    this.rounds[this.roundIndex] = fresh;
    this.beginRound(now);
  }
  lobby(id: string, now: number) {
    this.requireHost(id);
    if (this.phase !== "finished" && this.phase !== "paused")
      throw new Error("Finish the match before returning to the lobby.");
    this.phase = "lobby";
    this.phaseStart = now;
    this.deadline = null;
    this.rounds = [];
    this.history = [];
    this.matchIds = [];
    this.practice = false;
    this.records = {};
    this.proposals = [];
    this.teamBoard = {};
    this.chat = [];
    this.teamScore = 0;
    this.teamCorrect = 0;
    let seats = 0;
    for (const p of this.members) {
      if (p.role === "player" || p.role === "spectator")
        p.role = p.connected && seats++ < 8 ? "player" : "spectator";
      p.ready = p.id === id && p.role === "player";
      p.score = 0;
      p.correct = 0;
    }
    this.change();
  }
  setSettings(id: string, settings: Settings, custom?: ContentPack) {
    this.requireHost(id);
    if (this.phase !== "lobby")
      throw new Error("Settings are fixed during a match.");
    const pack =
      custom ??
      PACKS.find((p) => p.id === settings.packId) ??
      (this.pack.id === settings.packId ? this.pack : undefined);
    if (!pack) throw new Error("Choose an available content pack.");
    this.pack = pack;
    this.settings = { ...settings, packId: pack.id };
    this.members
      .filter((p) => p.role === "player" && p.id !== id)
      .forEach((p) => (p.ready = false));
    this.change();
  }
  sendChat(id: string, text: string) {
    const p = this.member(id);
    if (
      !this.settings.chat ||
      !["lobby", "discuss", "reveal", "finished"].includes(this.phase) ||
      p.role === "display"
    )
      throw new Error(
        "Chat opens in the lobby, between rounds, and during team discussion.",
      );
    this.chat.push({ id: randomUUID(), name: p.name, text });
    this.chat = this.chat.slice(-40);
    this.change();
  }
  result(id: string): RoundResult | undefined {
    const h = this.history[this.history.length - 1];
    if (!h || (this.phase !== "reveal" && this.phase !== "finished")) return;
    let recalledFacts = 0,
      teamRecovered = 0;
    const answers = h.round.questions.map((q) => {
      const count = this.players.filter(
        (p) => h.records[p.id]?.picks[q.id] === q.correct,
      ).length;
      if (count) recalledFacts++;
      else if (h.team[q.id] === q.correct) teamRecovered++;
      return {
        question: publicQuestion(q),
        correct: q.correct,
        yours:
          this.settings.mode === "team"
            ? h.team[q.id]
            : h.records[id]?.picks[q.id],
        points:
          this.settings.mode === "team"
            ? h.team[q.id] === q.correct && !this.practice
              ? 100
              : 0
            : (h.records[id]?.points[q.id] ?? 0),
        correctCount: count,
        attempts: this.players.length,
        source: q.source,
        explanation: q.explanation,
      };
    });
    return {
      answers,
      explanation: h.round.explanation,
      source: h.round.source,
      condition: h.round.condition,
      recalledFacts,
      teamRecovered,
    };
  }
  view(id: string, now: number): Snapshot {
    const self = this.member(id),
      round = this.round,
      isPlayer = this.matchIds.includes(id) && self.role === "player";
    let study: Study | undefined;
    if (this.phase === "study" && round?.study) {
      study = structuredClone(round.study);
      if (this.settings.mode === "team") {
        if (!isPlayer) study = undefined;
        else {
          const seen = this.exposureFor(id);
          study.tiles = study.tiles?.filter((_, i) => seen.includes(i));
          study.cards = study.cards?.filter((c) => seen.includes(c.index));
        }
      }
    }
    let qs = round?.questions ?? [];
    if (this.phase === "answer" && this.settings.mode === "frenzy")
      qs = [qs[this.currentQuestion]];
    if (this.phase === "private")
      qs = isPlayer
        ? qs.filter((q) => this.exposureFor(id).includes(q.factIndex))
        : [];
    if (
      !["answer", "private", "discuss", "reveal", "finished"].includes(
        this.phase,
      )
    )
      qs = [];
    const locked =
      this.settings.mode === "frenzy" && this.phase === "answer"
        ? !!round &&
          Object.hasOwn(
            this.records[id]?.picks ?? {},
            round.questions[this.currentQuestion].id,
          )
        : !!this.records[id]?.committed;
    const result: Snapshot = {
      code: this.code,
      revision: this.revision,
      serverTime: now,
      hostId: this.hostId,
      settings: this.settings,
      phase: this.phase,
      phaseStart: this.phaseStart,
      deadline: this.deadline,
      roundIndex: this.roundIndex,
      roundCount: this.rounds.length || this.settings.rounds,
      practice: this.practice,
      players: this.members.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        connected: p.connected,
        ready: p.ready,
        score: p.score,
        correct: p.correct,
        color: p.color,
        submitted:
          this.settings.mode === "frenzy" && this.phase === "answer"
            ? !!round &&
              Object.hasOwn(
                this.records[p.id]?.picks ?? {},
                round.questions[this.currentQuestion].id,
              )
            : !!this.records[p.id]?.committed,
      })),
      selfId: id,
      role: self.role,
      isHost: id === this.hostId,
      title: round?.title ?? "Gather your curious minds",
      instruction:
        round?.instruction ??
        "Choose your mode. Invite a friend. Make a little room for discovery.",
      family: round?.family,
      condition: round?.condition,
      study,
      questions: qs.map(publicQuestion),
      currentQuestion: this.currentQuestion,
      locked,
      captainId: this.phase === "discuss" ? this.captain() : undefined,
      teamBoard:
        this.phase === "discuss" || this.phase === "reveal"
          ? this.teamBoard
          : {},
      proposals: this.phase === "discuss" ? this.proposals : [],
      result: this.result(id),
      teamScore: this.teamScore,
      teamCorrect: this.teamCorrect,
      goal: Math.ceil(
        (this.settings.target / 100) *
          (this.rounds.length || this.settings.rounds) *
          6,
      ),
      chat: this.chat,
      packName: this.pack.name,
      pauseReason: this.pauseReason,
    };
    if (this.phase === "finished") {
      const max = Math.max(0, ...this.players.map((p) => p.score));
      const mosaic = this.history.flatMap((h) =>
        h.round.questions.map((q) => {
          const count = this.players.filter(
            (p) => h.records[p.id]?.picks[q.id] === q.correct,
          ).length;
          return {
            text: q.text,
            correct:
              this.settings.mode === "team"
                ? h.team[q.id] === q.correct
                : h.records[id]?.picks[q.id] === q.correct,
            count,
            total: this.players.length,
          };
        }),
      );
      const comparisons: Record<string, { correct: number; total: number }> =
        {};
      for (const h of this.history)
        for (const q of h.round.questions) {
          const label =
            h.round.family === "focus" && !this.settings.readingLight
              ? q.stimulus?.word === q.stimulus?.color.toUpperCase()
                ? "Matching cues"
                : "Conflicting cues"
              : h.round.condition;
          const counts = (comparisons[label] ??= { correct: 0, total: 0 });
          counts.total++;
          if (
            (this.settings.mode === "team"
              ? h.team[q.id]
              : h.records[id]?.picks[q.id]) === q.correct
          )
            counts.correct++;
        }
      result.final = {
        winners: this.practice
          ? []
          : this.players.filter((p) => p.score === max).map((p) => p.name),
        teamWin: this.teamCorrect >= result.goal,
        roundsCompleted: this.history.length,
        mosaic,
        comparisons: Object.entries(comparisons).map(([condition, n]) => ({
          condition,
          ...n,
        })),
      };
    }
    return result;
  }
  serialize() {
    return JSON.stringify(this, (key, value) => (key === "chat" ? [] : value));
  }
  static restore(text: string, now: number) {
    const data = JSON.parse(text);
    if (
      typeof data.code !== "string" ||
      !/^[A-Z2-9]{6}$/.test(data.code) ||
      !Array.isArray(data.members) ||
      !data.settings
    )
      throw new Error("Invalid room checkpoint.");
    const room = Object.assign(new Room(data.code, now), data) as Room;
    room.roundPlayerIds = data.roundPlayerIds ?? data.matchIds ?? [];
    room.members.forEach((p) => {
      p.connected = false;
      p.disconnectedAt = now;
    });
    room.chat = [];
    room.idleSince = now;
    if (room.phase === "reveal")
      room.setPhase("reveal", now, room.settings.classroom ? null : 12000);
    else if (!["lobby", "finished"].includes(room.phase))
      room.pause(
        "Server restarted. The unfinished round restarts automatically when players rejoin.",
        now,
      );
    room.change();
    return room;
  }
}
