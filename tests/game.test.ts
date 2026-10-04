import { describe, expect, it } from 'vitest';
import { Room } from '../src/server/room';
import { PACKS } from '../src/server/content';
import { exposure, generateRounds, Random, scoreAnswer } from '../src/server/rounds';
import { packSchema, settingsSchema } from '../src/server/server';
import type { Mode, Settings } from '../src/shared/types';
import { DEFAULT_SETTINGS } from '../src/shared/types';
function room(mode: Mode, count = 2) { const r = new Room('ABC234', 1000); for (let i = 0; i < count; i++) { const p = r.add(`Player ${i + 1}`, 'player', 1000 + i); p.ready = true; } r.setSettings(r.hostId, { ...DEFAULT_SETTINGS, mode, rounds: 4 }); r.members.forEach(p => p.ready = true); r.start(r.hostId, 1100); return r; }
function deadline(r: Room) { expect(r.deadline).not.toBeNull(); r.tick(r.deadline!); }
function play(r: Room) {
  let steps = 0;
  while (r.phase !== 'finished' && steps++ < 200) {
    if (r.phase === 'answer') {
      const questions = r.settings.mode === 'frenzy' ? [r.round.questions[r.currentQuestion]] : r.round.questions;
      for (const p of r.players) r.answer(p.id, Object.fromEntries(questions.map(q => [q.id, q.correct])), r.phaseStart + 100);
      if (r.phase === 'answer') deadline(r);
    } else if (r.phase === 'private') {
      for (const p of r.players) { const shown = r.view(p.id, r.phaseStart).questions; const allowed = r.round.questions.filter(q => shown.some(s => s.id === q.id)); r.answer(p.id, Object.fromEntries(allowed.map(q => [q.id, q.correct])), r.phaseStart + 100); }
    } else if (r.phase === 'discuss') { const captain = r.captain()!; for (const q of r.round.questions) r.board(captain, q.id, q.correct); r.lock(captain, r.phaseStart + 100); }
    else deadline(r);
  }
  expect(r.phase).toBe('finished');
}
describe('complete matches', () => {
  for (const mode of ['rally', 'frenzy', 'team'] as Mode[]) for (let count = 2; count <= 8; count++) it(`${mode}: ${count} players finish with correct, unduplicated scores`, () => {
    const r = room(mode, count); play(r); expect(r.history).toHaveLength(4);
    if (mode === 'team') { expect(r.teamCorrect).toBe(24); expect(r.teamScore).toBe(2400); expect(r.view(r.hostId, 9999).final?.teamWin).toBe(true); }
    else { for (const p of r.players) { expect(p.correct).toBe(24); expect(p.score).toBe(mode === 'frenzy' ? 3000 : 2400); } expect(r.view(r.hostId, 9999).final?.winners).toHaveLength(count); }
    expect(r.view(r.hostId, 9999).final?.mosaic).toHaveLength(24);
  });
});
describe('fair scoring and visibility', () => {
  it('rejects late, invalid, and repeated submissions without extra points', () => {
    const r = room('frenzy'); while (r.phase !== 'answer') deadline(r);
    const q = r.round.questions[0], id = r.hostId, start = r.phaseStart;
    r.answer(id, { [q.id]: q.correct }, start + 100); const points = r.records[id].points[q.id];
    r.answer(id, { [q.id]: q.correct }, start + 200); expect(r.records[id].points[q.id]).toBe(points);
    expect(() => r.answer(r.players[1].id, { [q.id]: 'impossible' }, start + 200)).toThrow();
    expect(() => r.answer(r.players[1].id, { [q.id]: q.correct }, r.deadline!)).toThrow(/closed/);
    deadline(r); expect(() => r.answer(r.players[1].id, { [q.id]: q.correct }, r.phaseStart)).toThrow(/belongs/);
  });
  it('missing answers score zero and speed uses broad normalized bands', () => {
    const r = room('rally'); while (r.phase !== 'answer') deadline(r); for (const p of r.players) r.answer(p.id, {}, r.phaseStart + 1); expect(r.players.every(p => p.score === 0)).toBe(true);
    expect(scoreAnswer(true, 999, { ...DEFAULT_SETTINGS, mode: 'frenzy' })).toBe(125);
    expect(scoreAnswer(true, 1000, { ...DEFAULT_SETTINGS, mode: 'frenzy' })).toBe(120);
    expect(scoreAnswer(true, 5000, { ...DEFAULT_SETTINGS, mode: 'frenzy' })).toBe(100);
    expect(scoreAnswer(false, 100, { ...DEFAULT_SETTINGS, mode: 'frenzy' })).toBe(0);
    expect(scoreAnswer(true, 1499, { ...DEFAULT_SETTINGS, mode: 'frenzy', difficulty: 'guided' })).toBe(125);
  });
  it('never sends answer keys, future fast prompts, or private fragments to a display', () => {
    const r = room('team', 8), display = r.add('Display', 'display', 1200); r.roundIndex = r.rounds.findIndex(q => q.family === 'scene'); r.beginRound(2000); deadline(r);
    expect(r.phase).toBe('study'); expect(r.view(display.id, r.phaseStart).study).toBeUndefined();
    const union = new Set<string>(); for (const p of r.players) { const s = r.view(p.id, r.phaseStart); expect(s.study?.tiles?.length).toBeGreaterThan(0); for (const t of s.study?.tiles ?? []) union.add(t.id); expect(s.questions).toEqual([]); }
    expect(union.size).toBe(r.round.study!.tiles!.length); deadline(r);
    for (const p of r.players) for (const q of r.view(p.id, r.phaseStart).questions) { expect(q).not.toHaveProperty('correct'); expect(q).not.toHaveProperty('factIndex'); expect(q).not.toHaveProperty('explanation'); }
    const f = room('frenzy'); while (f.phase !== 'answer') deadline(f); expect(f.view(f.hostId, f.phaseStart).questions).toHaveLength(1);
  });
  it('cooperative fragments cover every target at all supported player counts', () => {
    for (const difficulty of ['guided', 'standard', 'challenge'] as const) for (let count = 2; count <= 8; count++) {
      const s = { ...DEFAULT_SETTINGS, difficulty, mode: 'team' as const }; const rounds = generateRounds(s, PACKS[0], 123);
      for (const round of rounds) { const union = new Set<number>(); for (let i = 0; i < count; i++) { const seen = exposure(round, i, count); expect(seen.length).toBeGreaterThan(0); seen.forEach(n => union.add(n)); } expect(union.size).toBe(round.study?.tiles?.length ?? 6); }
    }
  });
  it('only the captain can fill the team board and only the host changes settings', () => {
    const r = room('team'); expect(() => r.setSettings(r.players[1].id, DEFAULT_SETTINGS)).toThrow(/host/); expect(() => r.setSettings(r.hostId, DEFAULT_SETTINGS)).toThrow(/fixed/);
    while (r.phase !== 'discuss') deadline(r); const q = r.round.questions[0], other = r.players.find(p => p.id !== r.captain())!;
    expect(() => r.board(other.id, q.id, q.correct)).toThrow(/captain/); expect(() => r.lock(r.captain()!, r.phaseStart)).toThrow(/six/);
  });
});
describe('room lifecycle', () => {
  it('revokes removed sessions and immediately transfers a departing lobby host', () => {
    const r = new Room('ABC234', 1000), host = r.add('Host', 'player', 1000), guest = r.add('Guest', 'player', 1001);
    r.leave(host.id, 1002); expect(r.hostId).toBe(guest.id); expect(() => r.authenticate(host.id, host.token)).toThrow(/expired/);
    r.start(guest.id, 1003, true); r.leave(guest.id, 1004); expect(() => r.authenticate(guest.id, '')).toThrow(/expired/);
  });
  it('pauses cooperative play when a fragment owner leaves, even with two remaining players', () => {
    const r = room('team', 3); deadline(r); const missing = r.players[2]; r.disconnect(missing.id, r.phaseStart + 1);
    expect(r.phase).toBe('paused'); expect(() => r.next(r.hostId, r.phaseStart + 2)).toThrow(/reconnect/);
    r.connect(missing.id, r.phaseStart + 3); r.next(r.hostId, r.phaseStart + 4); expect(r.phase).toBe('countdown');
  });
  it('restarts a fact round without repeating completed or future fact cards', () => {
    const r = room('rally'); r.rounds = generateRounds({ ...r.settings, rounds: 10 }, PACKS[0], 45); r.roundIndex = r.rounds.findIndex(x => x.family === 'facts');
    const reserved = r.rounds.filter((_, i) => i !== r.roundIndex).filter(x => x.family === 'facts').flatMap(x => x.questions.map(q => q.text));
    const oldId = r.round.id; r.pause('Restart test', 2000); r.next(r.hostId, 2001);
    expect(r.round.id).not.toBe(oldId); expect(r.round.family).toBe('facts'); expect(r.round.questions.some(q => reserved.includes(q.text))).toBe(false);
  });
  it('preserves completed scores through disconnect, host transfer, and restart', () => {
    const r = room('rally'); while (r.phase !== 'answer') deadline(r); for (const p of r.players) r.answer(p.id, Object.fromEntries(r.round.questions.map(q => [q.id, q.correct])), r.phaseStart + 100);
    expect(r.players[0].score).toBe(600); deadline(r); const original = r.hostId, now = r.phaseStart;
    r.disconnect(original, now + 1); expect(r.phase).toBe('paused'); r.tick(now + 15002); expect(r.hostId).not.toBe(original);
    const restored = Room.restore(r.serialize(), now + 16000); expect(restored.players[0].score).toBe(600); expect(restored.phase).toBe('paused');
    for (const p of restored.players) restored.connect(p.id, now + 16000); restored.next(restored.hostId, now + 16001); expect(restored.phase).toBe('countdown'); expect(restored.players[0].score).toBe(600); expect(restored.history).toHaveLength(1);
  });
  it('requires two real players for scored play, supports unscored practice and late spectators', () => {
    const r = new Room('ABC234', 1000); const host = r.add('Host', 'player', 1000); expect(() => r.start(host.id, 1100)).toThrow(/two/);
    r.start(host.id, 1100, true); expect(r.add('Late arrival', 'player', 1200).role).toBe('spectator'); play(r); expect(host.score).toBe(0);
    r.lobby(host.id, 2000); expect(r.phase).toBe('lobby'); expect(r.members.find(p => p.name === 'Late arrival')?.role).toBe('player');
  });
  it('rejects ninth seats and incorrect session tokens', () => { const r = room('rally', 8); r.pause('Return to lobby', 4900); r.lobby(r.hostId, 5000); expect(() => r.add('Ninth', 'player', 5100)).toThrow(/full/); expect(() => r.authenticate(r.hostId, 'bad')).toThrow(/expired/); expect(r.authenticate(r.hostId, r.member(r.hostId).token).id).toBe(r.hostId); });
});
describe('curated and custom packs', () => {
  it('validates every starter pack and schedules distinct facts', () => {
    for (const p of PACKS) { expect(packSchema.safeParse(p).success).toBe(true); const rounds = generateRounds({ ...DEFAULT_SETTINGS, packId: p.id, rounds: 10 }, p, 77); const cues = rounds.filter(r => r.family === 'facts').flatMap(r => r.study!.cards!.map(c => c.cue)); expect(cues.length).toBe(18); expect(new Set(cues).size).toBe(18); }
  });
  it('rejects ambiguous answers, invalid settings, and undersized match content', () => {
    const p = structuredClone(PACKS[0]); p.facts[0].alternatives[0] = p.facts[0].answer.toUpperCase(); expect(packSchema.safeParse(p).success).toBe(false);
    expect(settingsSchema.safeParse({ ...DEFAULT_SETTINGS, rounds: 99 }).success).toBe(false);
    expect(() => generateRounds(DEFAULT_SETTINGS, { ...PACKS[0], facts: PACKS[0].facts.slice(0, 6) }, 44)).toThrow(/12/);
  });
  it('retains the correct number of round families at every match length', () => { for (const rounds of [4, 6, 10] as const) { const list = generateRounds({ ...DEFAULT_SETTINGS, rounds }, PACKS[0], 19); expect(list.length).toBe(rounds); expect(list.filter(r => r.family === 'facts').length).toBe(rounds === 4 ? 1 : rounds === 6 ? 2 : 3); } expect(new Random(123).shuffle([1, 2, 3])).toHaveLength(3); });
});
