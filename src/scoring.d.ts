export type SeaType = { mod: number; ni: number; num: number; minus: boolean; A: boolean; key: number };
export type SeaContext = {
  Y: number; MO: number; DA: number; K: number; wd: number; age: number;
  ph: number; tide: string; dist: number; phaseTide: string; moon: string;
  stage: number; outer: number; dayIndex: number; seed: number;
};
export type RankRow = {
  t: SeaType; score: number; rank: number;
  p: { base: number; moon: number; depth: number; aff: number; comp: number; ring: number; day: number; dpos: number; vor: number; hw: number };
};
export const NUMS: number[];
export const STAGES: { n: string; d: string }[];
export const OUTER: { n: string; th: string; t: string; d: string }[];
export const SEASON: { n: string; act: string; col: string; moon: string; home: number }[];
export function ctxFor(date: Date): SeaContext;
export function labelOf(type: SeaType): string;
export function dayTable(context: SeaContext): { rows: RankRow[]; byKey: Record<number, RankRow>; mean: number };
export function axes(context: SeaContext, row: RankRow): { go: number; change: number };
export function personalFor(context: SeaContext, profile: { Y: number; M: number; D: number; total: number }, row: RankRow): { pos: number; delta: number; ret: number };
export function blockScoreOf(year: number, block: number, type: SeaType): { st: number; outer: number; score: number };
export function yearScoreOf(year: number, type: SeaType): { outer: number; score: number };
