// 今日・今月・今年の相性。二人それぞれの「その期間の運勢」（今日の占いと同じ計算）を並べて読む。乱数もハッシュも使わない。
//   点 ＝ 二人の相性の総合点 ＋ 海の高さ ＋ 歩調 ＋ 五行
//   海の高さ … 二人の位置（0＝最も向かい風、1＝最も追い風）の平均。0.5を基準に、±10点の幅。
//               位置は、今日なら160名札の中の順位、今月・今年ならその名札の周期（720か月・60年）の中の順位。
//   歩調     … 二人の位置の差。同じ高さなら＋1.5、差が最大なら−4.5。
//   五行     … その期間の五行と、二人それぞれの五行との関係点（同気1.2／相生・流出0.6／調整・相剋−0.25）の平均。典型の0.6を基準にする。
// 名前と生年月日から読む二人だけに出す（タイプだけでは、その人の名札の数値が決まらないため）。
import { cycleFor, readDay, tiers, type Profile } from './domain';
import { clampScore, levelOf, round1, type Compat } from './pairing';
import { blockScoreOf, FIVE_PHASES, yearScoreOf } from './scoring';

export type PeriodId = 'day' | 'month' | 'year';
export type PeriodReading = {
  id: PeriodId; label: string; when: string; score: number; level: ReturnType<typeof levelOf>;
  /** 二人（自分・相手）のその期間の段階（0凱風〜4轟沈）と、位置（0〜1）。 */
  tiers: [number, number]; positions: [number, number];
  text: string;
  terms: { label: string; note: string; points: number }[];
};

/** 大きい順に並べた点数の中で、この点数がどれだけ上にあるか。1が最も追い風、0が最も向かい風。 */
const percentile = (score: number, sortedDesc: number[]) =>
  sortedDesc.filter(value => value < score - 1e-9).length / (sortedDesc.length - 1);
const topPercent = (position: number) => Math.max(1, Math.round((1 - position) * 100));

type PeriodSide = { name: string; tier: number; position: number };
const isUp = (tier: number) => tier <= 1;
const isDown = (tier: number) => tier >= 3;

/** 二人の段階の組み合わせから、その期間の読みを組み立てる。 */
function togetherText(unit: string, a: PeriodSide, b: PeriodSide) {
  const [high, low] = a.position >= b.position ? [a, b] : [b, a];
  const tierName = (side: PeriodSide) => tiers[side.tier];
  if (isUp(a.tier) && isUp(b.tier)) {
    return '二人とも追い風の側です。同じ方向へ進みやすく、一緒に動いたことが実を結びやすい' + unit + 'です。二人で何かを始めるなら、この' + unit + 'のうちに。';
  }
  if (isDown(a.tier) && isDown(b.tier)) {
    return '二人とも向かい風の側です。お互いに余裕が少なくなりやすい' + unit + 'なので、大きな話は急がず、会う約束も軽めにして、休める形を選びましょう。';
  }
  if (isUp(high.tier) && isDown(low.tier)) {
    return high.name + 'は追い風（' + tierName(high) + '）、' + low.name + 'は向かい風（' + tierName(low) + '）と、二人の流れがずれています。追い風の側が支える形で動くと、向かい風の側が楽になります。';
  }
  if (isUp(high.tier)) {
    return high.name + 'は追い風（' + tierName(high) + '）、' + low.name + 'は' + tierName(low) + 'と、片方が先に動ける' + unit + 'です。追い風の側が一歩目を出すと、もう片方もつられて動きやすくなります。';
  }
  if (isDown(low.tier)) {
    return high.name + 'は' + tierName(high) + '、' + low.name + 'は向かい風（' + tierName(low) + '）です。穏やかな側が受け止める役になると、向かい風の側が休めます。';
  }
  return '二人とも凪で、大きな波はありません。落ち着いて話せる' + unit + 'です。いつもの約束を丁寧に重ねるのが向いています。';
}

type DayReading = ReturnType<typeof readDay>;

/** 今年の干支（上の字＝年干、下の字＝年支）の五行と、二人それぞれとの関係。上下が同じときは、まとめて書く。 */
function yearElementText(c: DayReading['context'], ra: DayReading, rb: DayReading, partner: string, element: (index: number) => string) {
  const a = ra.fivePhase, b = rb.fivePhase;
  const same = c.yearElement === c.yearBranchElement && a.yearRelation.kind === a.yearBranchRelation.kind && b.yearRelation.kind === b.yearBranchRelation.kind;
  if (same) {
    return '今年の干支「' + c.yearPillar + '」は、上も下も五行が「' + element(c.yearElement) + '」。あなたとは「' + a.yearRelation.kind + '」、' + partner + 'とは「' + b.yearRelation.kind + '」です。';
  }
  return '今年の干支「' + c.yearPillar + '」は、上の字が五行「' + element(c.yearElement) + '」、下の字が五行「' + element(c.yearBranchElement) + '」。あなたとは上が「'
    + a.yearRelation.kind + '」・下が「' + a.yearBranchRelation.kind + '」、' + partner + 'とは上が「' + b.yearRelation.kind + '」・下が「' + b.yearBranchRelation.kind + '」です。';
}

export function periodCompat(base: Compat, me: Profile, other: Profile, today: Date): PeriodReading[] {
  const ra = readDay(today, me);
  const rb = readDay(today, other);
  const c = ra.context;
  const names = ['あなた', other.name + 'さん'];
  const element = (index: number) => FIVE_PHASES[index].name;

  const yearScores = [yearScoreOf(c.solarYear, me.t).score, yearScoreOf(c.solarYear, other.t).score];
  const blockScores = [blockScoreOf(c.solarYear, c.solarMonth, me.t).score, blockScoreOf(c.solarYear, c.solarMonth, other.t).score];
  const cycles = [cycleFor(me.t), cycleFor(other.t)];
  const blockPos: [number, number] = [percentile(blockScores[0], cycles[0].blocks), percentile(blockScores[1], cycles[1].blocks)];
  const yearPos: [number, number] = [percentile(yearScores[0], cycles[0].years), percentile(yearScores[1], cycles[1].years)];
  const dayPos: [number, number] = [1 - (ra.row.rank - 1) / 159, 1 - (rb.row.rank - 1) / 159];

  const defs = [
    {
      id: 'day' as const, label: '今日', unit: '日', when: c.MO + '月' + c.DA + '日',
      tiers: [ra.layers.day, rb.layers.day] as [number, number], positions: dayPos,
      rankNote: ['160名札の中で' + ra.row.rank + '位', '160名札の中で' + rb.row.rank + '位'],
      scores: [ra.fivePhase.dayRelation.score, rb.fivePhase.dayRelation.score],
      element: '今日の日柱「' + c.dayPillar + '」の五行は「' + element(c.dayElement) + '」。あなたとは「' + ra.fivePhase.dayRelation.kind + '」、'
        + names[1] + 'とは「' + rb.fivePhase.dayRelation.kind + '」です。',
    },
    {
      id: 'month' as const, label: '今月', unit: '月', when: c.solarMonthTerm + 'からの月',
      tiers: [ra.layers.block, rb.layers.block] as [number, number], positions: blockPos,
      rankNote: ['720か月の中で上位' + topPercent(blockPos[0]) + '％', '720か月の中で上位' + topPercent(blockPos[1]) + '％'],
      scores: [ra.fivePhase.monthRelation.score, rb.fivePhase.monthRelation.score],
      element: 'この月の五行は「' + element(c.monthElement) + '」。あなたとは「' + ra.fivePhase.monthRelation.kind + '」、'
        + names[1] + 'とは「' + rb.fivePhase.monthRelation.kind + '」です。',
    },
    {
      id: 'year' as const, label: '今年', unit: '年', when: c.yearPillar + '年',
      tiers: [ra.layers.year, rb.layers.year] as [number, number], positions: yearPos,
      rankNote: ['60年の中で上位' + topPercent(yearPos[0]) + '％', '60年の中で上位' + topPercent(yearPos[1]) + '％'],
      scores: [(ra.fivePhase.yearRelation.score + ra.fivePhase.yearBranchRelation.score) / 2, (rb.fivePhase.yearRelation.score + rb.fivePhase.yearBranchRelation.score) / 2],
      element: yearElementText(c, ra, rb, names[1], element),
    },
  ];

  return defs.map(def => {
    const [pa, pb] = def.positions;
    const gap = Math.abs(pa - pb);
    const height = round1(((pa + pb) / 2 - 0.5) * 20);
    const step = round1(1.5 - gap * 6);
    const relation = round1(((def.scores[0] + def.scores[1]) / 2 - 0.6) * 4);
    const score = clampScore(base.total + height + step + relation);
    const sides: [PeriodSide, PeriodSide] = [
      { name: names[0], tier: def.tiers[0], position: pa }, { name: names[1], tier: def.tiers[1], position: pb },
    ];
    return {
      id: def.id, label: def.label, when: def.when, score, level: levelOf(score), tiers: def.tiers, positions: def.positions,
      text: togetherText(def.unit, sides[0], sides[1]) + def.element,
      terms: [
        { label: '二人の相性の総合点', note: '二人の生まれ持った相性（上のカード）の総合点です。ここを土台に、' + def.label + 'の流れを足し引きします。', points: base.total },
        { label: '二人の海の高さ', note: 'あなたは' + def.rankNote[0] + '（' + tiers[def.tiers[0]] + '）、' + names[1] + 'は' + def.rankNote[1] + '（' + tiers[def.tiers[1]] + '）。二人の位置の平均で、追い風ほど上がります。', points: height },
        { label: '歩調', note: '二人の位置の差は' + Math.round(gap * 100) + '％。差が小さいほど、同じ流れで動けます。', points: step },
        { label: def.label + 'の五行', note: def.element, points: relation },
      ],
    };
  });
}
