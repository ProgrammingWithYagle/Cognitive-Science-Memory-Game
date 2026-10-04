export type Mode = 'rally' | 'frenzy' | 'team';
export type Difficulty = 'guided' | 'standard' | 'challenge';
export type Phase = 'lobby' | 'countdown' | 'study' | 'answer' | 'private' | 'discuss' | 'reveal' | 'finished' | 'paused';
export type Family = 'scene' | 'sequence' | 'facts' | 'focus';
export type Role = 'player' | 'facilitator' | 'display' | 'spectator';
export interface Settings {
  mode: Mode; difficulty: Difficulty; rounds: 4 | 6 | 10; packId: string;
  classroom: boolean; target: 60 | 70 | 85; readingLight: boolean; chat: boolean;
}
export const DEFAULT_SETTINGS: Settings = { mode: 'rally', difficulty: 'standard', rounds: 6, packId: 'general', classroom: false, target: 70, readingLight: false, chat: true };
export const MODE_NAMES: Record<Mode, string> = { rally: 'Recall Rally', frenzy: 'Focus Frenzy', team: 'Team Mosaic' };
export const FAMILY_NAMES: Record<Family, string> = { scene: 'Snapshot', sequence: 'Pattern parade', facts: 'Little lessons', focus: 'Focus clash' };
export interface Fact { id: string; cue: string; answer: string; alternatives: string[]; explanation: string; source: string; }
export interface ContentPack { version: 1; id: string; name: string; school: string; course: string; description: string; catalogue?: string; facts: Fact[]; custom?: boolean; }
export type PackInfo = Omit<ContentPack, 'facts'> & { count: number };
export interface Tile { id: string; icon: string; label: string; position: number; }
export interface Study { kind: 'scene' | 'sequence' | 'facts'; tiles?: Tile[]; cards?: { index: number; cue: string; answer: string }[]; grouped?: boolean; total: number; }
export interface Option { id: string; label: string; icon?: string; }
export interface Question { id: string; text: string; options: Option[]; stimulus?: { word: string; color: string; symbol?: string; position?: 'left' | 'right' }; }
export interface QuestionKey extends Question { correct: string; factIndex: number; source?: string; explanation?: string; }
export interface Round { id: string; family: Family; title: string; instruction: string; condition: string; study?: Study; questions: QuestionKey[]; explanation: string; source: string; }
export interface PlayerPublic { id: string; name: string; role: Role; connected: boolean; ready: boolean; score: number; correct: number; color: number; submitted: boolean; }
export interface AnswerResult { question: Question; correct: string; yours?: string; points: number; correctCount: number; attempts: number; source?: string; explanation?: string; }
export interface RoundResult { answers: AnswerResult[]; explanation: string; source: string; condition: string; recalledFacts: number; teamRecovered: number; }
export interface Snapshot {
  code: string; revision: number; serverTime: number; hostId: string; settings: Settings; phase: Phase;
  phaseStart: number; deadline: number | null; roundIndex: number; players: PlayerPublic[];
  roundCount: number; practice: boolean;
  selfId: string; role: Role; isHost: boolean; title: string; instruction: string; family?: Family;
  condition?: string; study?: Study; questions: Question[]; currentQuestion: number; locked: boolean;
  captainId?: string; teamBoard: Record<string, string>; proposals: Proposal[];
  result?: RoundResult; teamScore: number; teamCorrect: number; goal: number;
  chat: ChatMessage[]; packName: string; pauseReason?: string; final?: { winners: string[]; teamWin: boolean; roundsCompleted: number; mosaic: { text: string; correct: boolean; count: number; total: number }[]; comparisons: { condition: string; correct: number; total: number }[] };
}
export interface Proposal { playerId: string; questionId: string; optionId: string; }
export interface ChatMessage { id: string; name: string; text: string; }
export interface Receipt { ok: boolean; error?: string; code?: string; id?: string; token?: string; }
export interface Session { code: string; id: string; token: string; }
