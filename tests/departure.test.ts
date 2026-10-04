import { describe, expect, it } from 'vitest';
import { Room } from '../src/server/room';
import { DEFAULT_SETTINGS, type Mode, type Phase } from '../src/shared/types';
function setup(mode: Mode, count: number, phase: Phase) {
  const r = new Room('ABC234', 1000);
  for (let i = 0; i < count; i++) r.add(`Player ${i}`, 'player', 1000 + i);
  r.setSettings(r.hostId, { ...DEFAULT_SETTINGS, mode, rounds: 4 }); r.members.forEach(p => p.ready = true); r.start(r.hostId, 1100);
  let guard = 0; while (r.phase !== phase && guard++ < 20) r.tick(r.deadline!);
  expect(r.phase).toBe(phase); return r;
}
describe('departure regression and boundary transitions', () => {
  for (const mode of ['rally', 'frenzy', 'team'] as Mode[]) for (const count of [2, 3, 8]) for (const phase of (mode === 'team' ? ['countdown', 'study', 'private', 'discuss', 'reveal'] : ['countdown', 'study', 'answer', 'reveal']) as Phase[]) {
    it(`${mode}, ${count} seats, ${phase}: Leave never strands remaining players`, () => {
      const r = setup(mode, count, phase), leaving = r.players.at(-1)!; const now = r.phaseStart + 1;
      r.leave(leaving.id, now); expect(r.phase).not.toBe('paused');
      const rejoined = r.add('Rejoined', 'player', now + 1); expect(rejoined.role).toBe('spectator');
      let guard = 0; while (String(r.phase) !== 'finished' && guard++ < 150) { expect(r.deadline).not.toBeNull(); r.tick(r.deadline!); }
      expect(r.phase).toBe('finished'); expect(r.history).toHaveLength(4);
      expect(() => r.authenticate(leaving.id, '')).toThrow();
    });
  }
  it('a two-player temporary disconnect continues competitive clocks and reconnects to the same seat', () => {
    const r = setup('rally', 2, 'answer'), guest = r.players[1], deadline = r.deadline!;
    r.disconnect(guest.id, r.phaseStart + 1); expect(r.phase).toBe('answer'); expect(r.deadline).toBe(deadline);
    r.connect(guest.id, r.phaseStart + 2); expect(r.connectedPlayers).toHaveLength(2);
  });
  it('host departure immediately transfers controls even during a match', () => {
    const r = setup('rally', 2, 'answer'), host = r.hostId, other = r.players[1];
    r.leave(host, r.phaseStart + 1); expect(r.hostId).toBe(other.id); expect(r.phase).toBe('answer');
  });
  it('a disconnected team fragment owner recovers automatically and preserves completed scores', () => {
    const r = setup('team', 3, 'private'), guest = r.players[2]; r.teamScore = 600; r.teamCorrect = 6;
    r.disconnect(guest.id, r.phaseStart + 1); expect(r.phase).toBe('paused');
    r.connect(guest.id, r.phaseStart + 2); expect(r.phase).toBe('countdown'); expect(r.teamScore).toBe(600);
  });
  it('an expired team seat redistributes every fragment to the remaining players', () => {
    const r = setup('team', 8, 'private'), missing = r.players.slice(1), now = r.phaseStart + 1;
    missing.forEach(p => r.disconnect(p.id, now)); expect(r.phase).toBe('paused');
    r.tick(now + 120000); expect(r.phase).toBe('countdown'); expect(r.roundPlayerIds).toEqual([r.hostId]);
    expect(r.exposureFor(r.hostId)).toHaveLength(r.round.study?.tiles?.length ?? 6);
  });
  it('when everyone disconnects, the first returning player restarts the round automatically', () => {
    const r = setup('rally', 2, 'answer'), now = r.phaseStart + 1;
    r.players.forEach(p => r.disconnect(p.id, now)); expect(r.phase).toBe('paused');
    r.connect(r.hostId, now + 20); expect(r.phase).toBe('countdown');
  });
  it('restoring a completed reveal cannot score that round twice', () => {
    const r = setup('rally', 2, 'answer'); for (const p of r.players) r.answer(p.id, Object.fromEntries(r.round.questions.map(q => [q.id, q.correct])), r.phaseStart + 1);
    expect(r.phase).toBe('reveal'); const restored = Room.restore(r.serialize(), 999000);
    restored.connect(restored.hostId, 999001); expect(restored.phase).toBe('reveal'); expect(restored.member(restored.hostId).score).toBe(600);
    restored.tick(restored.deadline!); expect(restored.roundIndex).toBe(1); expect(restored.history).toHaveLength(1); expect(restored.member(restored.hostId).score).toBe(600);
  });
  it('repeated spectator visits do not consume the room forever', () => {
    const r = setup('rally', 2, 'answer');
    for (let i = 0; i < 100; i++) { const p = r.add(`Visitor ${i}`, 'display', 2000 + i); r.leave(p.id, 2000 + i); }
    expect(() => r.add('New visitor', 'display', 3000)).not.toThrow();
  });
});
