import { expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createGameServer } from '../src/server/server';
import { DEFAULT_SETTINGS } from '../src/shared/types';
import type { Receipt, Snapshot } from '../src/shared/types';
function request(s: Socket, event: string, payload: unknown = {}): Promise<Receipt> { return new Promise((resolve, reject) => s.timeout(4000).emit(event, payload, (e: Error | null, r: Receipt) => e ? reject(e) : resolve(r))); }
async function client(url: string) { const s = io(url, { forceNew: true, autoConnect: false, transports: ['websocket'] }); await new Promise<void>((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); s.connect(); }); return s; }
it('real Socket.IO clients create, join, synchronize, score, reconnect, and rematch', async () => {
  let time = 10000; const game = await createGameServer({ now: () => time, timers: false }); const port = await game.listen(0, '127.0.0.1'); const url = `http://127.0.0.1:${port}`; const sockets: Socket[] = [];
  try {
    const a = await client(url), b = await client(url); sockets.push(a, b); let sa: Snapshot | undefined, sb: Snapshot | undefined;
    a.on('state', s => sa = s); b.on('state', s => sb = s);
    const host = await request(a, 'create', { name: 'Host', settings: { ...DEFAULT_SETTINGS, rounds: 4 } }); expect(host.ok).toBe(true);
    const guest = await request(b, 'join', { code: host.code, name: 'Friend' }); expect(guest.ok).toBe(true);
    expect((await request(b, 'settings', { settings: DEFAULT_SETTINGS })).ok).toBe(false);
    await request(b, 'ready', { ready: true }); expect((await request(a, 'start')).ok).toBe(true);
    const room = game.rooms.get(host.code!)!;
    while (room.phase !== 'answer') { time = room.deadline!; await game.tick(); }
    const answers = Object.fromEntries(room.round.questions.map(q => [q.id, q.correct]));
    await request(a, 'answer', { answers }); await request(b, 'answer', { answers }); expect(room.phase).toBe('reveal');
    expect(sa?.players.find(p => p.id === host.id)?.score).toBe(600); expect(sb?.players.find(p => p.id === host.id)?.score).toBe(600);
    expect((await fetch(url + '/api/packs').then(r => r.json()))[0]).not.toHaveProperty('facts');
    b.disconnect(); await new Promise(resolve => setTimeout(resolve, 20)); expect(room.member(guest.id!).connected).toBe(false);
    const resumed = await client(url); sockets.push(resumed); expect((await request(resumed, 'resume', { code: guest.code, id: guest.id, token: guest.token })).ok).toBe(true); expect(room.member(guest.id!).score).toBe(600);
    while (String(room.phase) !== 'finished') { time = room.deadline!; await game.tick(); }
    expect((await request(a, 'rematch')).ok).toBe(true); expect(room.phase).toBe('lobby'); expect(room.member(host.id!).score).toBe(0);
  } finally { sockets.forEach(s => s.disconnect()); await game.close(); }
});
