// 「なぜこの文が出るのか」を、点数の内訳から決める。
// その日の点数は 海の時計(base)・月(moon)・潮(depth)・月の五行(aff)・年の五行(comp)・日の海(day)・特性(vor,hw) の合計。
// 全160タイプの平均からどれだけずれているか（z）が大きい項目ほど、その人のその日を動かした理由。文はその理由から作る。
import { DAY_STAGES, FIVE_PHASES, SEASON, STAGES, fivePhaseRelation, stageFor, type RankRow, type SeaContext } from './scoring';
import {
  DAY_RELATION, DAY_WAVE, ELEMENT_NATURE, MONTH_ACT, MONTH_READ, MOON_ACT, MOON_RESONANCE, MOON_SHAPE, STAGE_TEXT,
  TIDE_ACT, TIDE_DIST, TIDE_EFFECT, TIDE_SHAPE, TRAIT_A, TRAIT_MINUS, YEAR_ACT, YEAR_BRANCH_READ, YEAR_STEM_READ, type Kind,
} from './reasonText';

export type FactorId = 'stage' | 'moon' | 'tide' | 'month' | 'year' | 'day' | 'trait';
export type Factor = {
  id: FactorId; label: string;
  z: number;                      // 全タイプの平均からのずれ（標準偏差の何倍か）。正なら追い風、負なら向かい風
  side: '追い風' | '中立' | '向かい風';
  fact: string;                   // 事実：何がどうなっているか
  read: string;                   // 読み：それが何を意味するか
  act: string;                    // 一手：だから何をするとよいか
};

export const FACTOR_ORDER: FactorId[] = ['stage', 'moon', 'tide', 'month', 'year', 'day', 'trait'];

function zScores(rows: RankRow[], row: RankRow) {
  const keys = ['base', 'moon', 'depth', 'aff', 'comp', 'day'] as const;
  const out: Record<string, number> = {};
  const trait = (r: RankRow) => r.p.vor + r.p.hw;
  const measure = (get: (r: RankRow) => number) => {
    let sum = 0;
    for (const r of rows) sum += get(r);
    const mean = sum / rows.length;
    let variance = 0;
    for (const r of rows) variance += (get(r) - mean) ** 2;
    const sd = Math.sqrt(variance / rows.length) || 1;
    return (get(row) - mean) / sd;
  };
  for (const key of keys) out[key] = measure(r => r.p[key]);
  out.trait = measure(trait);
  return out;
}

const sideOf = (z: number): Factor['side'] => z > .3 ? '追い風' : z < -.3 ? '向かい風' : '中立';
const kindOf = (row: RankRow, element: number) => fivePhaseRelation(row.t, element).kind as Kind;

export function factorsFor(c: SeaContext, row: RankRow, rows: RankRow[]): Factor[] {
  const z = zScores(rows, row);
  const t = row.t;
  const own = SEASON[t.mod].element;
  const stage = stageFor(c, t);
  const monthKind = kindOf(row, c.monthElement);
  const stemKind = kindOf(row, c.yearElement), branchKind = kindOf(row, c.yearBranchElement), dayKind = kindOf(row, c.dayElement);
  const el = (i: number) => FIVE_PHASES[i].name;
  const factors: Factor[] = [
    { id: 'stage', label: '海の時計', z: z.base, side: sideOf(z.base),
      fact: `あなたの海の時計は「${STAGES[stage].n}」`, read: STAGE_TEXT[stage].read, act: STAGE_TEXT[stage].act },
    { id: 'moon', label: '月の形', z: z.moon, side: sideOf(z.moon),
      fact: `今日の月は「${c.moon}」`, read: MOON_SHAPE[c.moon] + MOON_RESONANCE(z.moon),
      act: MOON_ACT[c.moon][z.moon >= -.3 ? 0 : 1] },
    { id: 'tide', label: '潮と引力', z: z.depth, side: sideOf(z.depth),
      fact: `潮は「${c.phaseTide}」、月までの距離は「${c.tide}」`, read: TIDE_SHAPE[c.phaseTide] + TIDE_DIST[c.tide] + TIDE_EFFECT(z.depth),
      act: TIDE_ACT[c.phaseTide] },
    { id: 'month', label: '月の五行', z: z.aff, side: sideOf(z.aff),
      fact: `この月の五行「${el(c.monthElement)}」（${ELEMENT_NATURE[c.monthElement]}）は、あなたの「${el(own)}」に対して「${monthKind}」`,
      read: MONTH_READ[monthKind], act: MONTH_ACT[monthKind] },
    { id: 'year', label: '年の五行', z: z.comp, side: sideOf(z.comp),
      fact: c.yearElement === c.yearBranchElement && stemKind === branchKind
        ? `今年の干支「${c.yearPillar}」は、上も下も五行が「${el(c.yearElement)}」で、あなたの「${el(own)}」とは「${stemKind}」`
        : `今年の干支「${c.yearPillar}」は、上の字が五行「${el(c.yearElement)}」、下の字が五行「${el(c.yearBranchElement)}」で、あなたの「${el(own)}」とは、上が「${stemKind}」、下が「${branchKind}」`,
      read: YEAR_STEM_READ[stemKind] + YEAR_BRANCH_READ[branchKind], act: YEAR_ACT(row.p.comp) },
    { id: 'day', label: '日の海', z: z.day, side: sideOf(z.day),
      fact: `今日の日柱「${c.dayPillar}」は五行「${el(c.dayElement)}」で、あなたとは「${dayKind}」。日の海は「${DAY_STAGES[row.p.dpos].n}」`,
      read: DAY_WAVE[row.p.dpos].read + DAY_RELATION[dayKind], act: DAY_WAVE[row.p.dpos].act },
  ];
  if (t.A || t.minus) {
    const a = t.A ? TRAIT_A(c.tide) : null;
    factors.push({ id: 'trait', label: 'あなたの特性', z: z.trait, side: sideOf(z.trait),
      fact: [t.A ? `あなたは渦（A）のタイプで、月までの距離は「${c.tide}」` : '', t.minus ? 'あなたは「−」のタイプ' : ''].filter(Boolean).join('、'),
      read: [a?.read, t.minus ? TRAIT_MINUS.read : ''].filter(Boolean).join(''),
      act: a ? a.act : TRAIT_MINUS.act });
  }
  return factors;
}

/** 日々動く項目（海の時計・月・潮・日の海・特性）。ひとことと一手は、この中から選ぶ。年・月の五行は背景として補足に回す。 */
const DAILY: FactorId[] = ['stage', 'moon', 'tide', 'day', 'trait'];

/** その日の段階（凱風〜轟沈）に沿う理由を主役にし、次点と、逆向きの理由（あれば）を選ぶ。 */
export function chooseFactors(factors: Factor[], level: number) {
  const sign = level < 2 ? 1 : level > 2 ? -1 : 0;
  const weight = (f: Factor) => sign ? f.z * sign : Math.abs(f.z);
  const order = (a: Factor, b: Factor) => weight(b) - weight(a) || FACTOR_ORDER.indexOf(a.id) - FACTOR_ORDER.indexOf(b.id);
  const sorted = [...factors].sort(order);
  const main = sorted.find(f => DAILY.includes(f.id))!;
  const support = sorted.find(f => f.id !== main.id && DAILY.includes(f.id))!;
  const worst = sign ? [...factors].sort((a, b) => weight(a) - weight(b))[0] : undefined;
  return {
    main, support,
    counter: worst && weight(worst) < -.4 && worst.id !== main.id && worst.id !== support.id ? worst : undefined,
    ranked: sorted,
  };
}
