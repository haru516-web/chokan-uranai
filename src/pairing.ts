// 相性の設計。二人を「側（Side）」として受け取り、数値から点を出す。乱数もハッシュも使わない。
// 側の作り方は二通りで、同じ規則で読む。
//   名前と生年月日から … 季節・深さの数値・「−」「A」・生まれ年の十二支・生まれた日の月相・名前の五行、すべてを使う。
//   タイプだけから     … 季節と、深さ（タイプの中央値）だけを使う。ほかは相手の情報がないので入れない。
// 各分野の点＝季節の組み合わせの基準点＋各項目の補正（0.1点単位で足し、最後に四捨五入）。
// 同じ二人なら、どちらから見ても必ず同じ結果になる（順序に依存しない）。
import compatText from './compatText.json';
import residents from './residents.json';
import type { Profile } from './domain';
import { ctxFor, relationOf } from './scoring';

export const AREAS = [
  { id: 'love', label: '恋愛', color: '#f0a8c0', glyph: '♡' },
  { id: 'marriage', label: '結婚', color: '#c9b6ef', glyph: '❖' },
  { id: 'work', label: '仕事', color: '#eacc8c', glyph: '⚓' },
  { id: 'friend', label: '友情', color: '#b6dfc4', glyph: '☘' },
] as const;
export type AreaId = typeof AREAS[number]['id'];

export const DEPTH_NAMES = ['浅瀬', '沿岸', '沖合', '深海'] as const;
export const SEASON_NAMES = ['春', '夏', '秋', '冬'] as const;

/** 住人番号（0〜15）→ 季節（0春 1夏 2秋 3冬）と深さ（0浅瀬〜3深海）。 */
export const seasonOfResident = (index: number) => index >> 2;
export const depthOfResident = (index: number) => index & 3;

/** 深さの差（0〜3。数値の差1.5が1段）が、分野ごとの点数に与える補正。間は直線でつなぐ。 */
const DEPTH_ADJUST: Record<AreaId, number[]> = {
  love: [6, 3, -2, -6],
  marriage: [8, 4, -2, -8],
  work: [-3, 5, 4, -3],
  friend: [4, 4, 0, -4],
};
const DEPTH_STEP = 1.5;
/** タイプだけを選んだときの、深さの帯ごとの代表値（その帯に入る名札の深さの平均）。 */
const BAND_DEPTH = [1.5, 2.75, 3.75, 5];

const clamp = (value: number) => Math.max(40, Math.min(98, Math.round(value)));
export { clamp as clampScore, round1 };

export const LEVELS = [
  { min: 86, name: 'ぴったり', stars: 5 },
  { min: 76, name: 'とても良い', stars: 4 },
  { min: 66, name: '良い', stars: 3 },
  { min: 56, name: 'おだやか', stars: 2 },
  { min: 0, name: '育てる相性', stars: 1 },
] as const;
export const levelOf = (score: number) => LEVELS.find(level => score >= level.min)!;

export type Side = {
  /** 住人番号（0〜15）。絵と文章の表示に使う。 */
  index: number;
  /** 季節（0春 1夏 2秋 3冬）。 */
  season: number;
  /** 深さの数値（1.0〜5.5）。 */
  num: number;
  /** 名前と生年月日から作った側だけが持つ、細かい情報。 */
  detail: null | { minus: boolean; A: boolean; birthBranch: number; birthPhase: number; nameElement: number; total: number; name: string };
};

export function sideOfType(index: number): Side {
  return { index, season: seasonOfResident(index), num: BAND_DEPTH[depthOfResident(index)], detail: null };
}

/** 総画数の一の位を五行にする（1・2＝木、3・4＝火、5・6＝土、7・8＝金、9・0＝水）。姓名判断で使われる対応。 */
const nameElementOf = (total: number) => [4, 0, 0, 1, 1, 2, 2, 3, 3, 4][total % 10];

export function sideOfProfile(profile: Profile): Side {
  const born = ctxFor(new Date(Date.UTC(profile.Y, profile.M - 1, profile.D)));
  const depth = profile.t.ni < 3 ? 0 : profile.t.ni < 5 ? 1 : profile.t.ni < 7 ? 2 : 3;
  const season = (profile.t.mod + 3) % 4;
  return {
    index: season * 4 + depth, season, num: profile.t.num,
    detail: { minus: profile.t.minus, A: profile.t.A, birthBranch: born.yearBranchIndex, birthPhase: born.ph, nameElement: nameElementOf(profile.total), total: profile.total, name: profile.name },
  };
}

type SeasonText = typeof compatText.seasons[keyof typeof compatText.seasons];
const seasonKey = (a: number, b: number) => Math.min(a, b) + '-' + Math.max(a, b);

export type Term = { id: string; label: string; note: string; points: Record<AreaId, number> };
const zero = (): Record<AreaId, number> => ({ love: 0, marriage: 0, work: 0, friend: 0 });
const weighted = (value: number, weights: Record<AreaId, number>) => ({
  love: value * weights.love, marriage: value * weights.marriage, work: value * weights.work, friend: value * weights.friend,
});
const round1 = (value: number) => Math.round(value * 10) / 10;

const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ELEMENT_NAMES = ['木', '火', '土', '金', '水'];

/** 生まれ年の十二支どうしの関係。 */
function branchRelation(a: number, b: number) {
  const gap = (a - b + 12) % 12;
  if (a === b) return { kind: '同じ干支', points: 2 };
  if ((a + b) % 12 === 1) return { kind: '六合（結びつく組み合わせ）', points: 5 };
  if (gap === 4 || gap === 8) return { kind: '三合（同じ流れをつくる組み合わせ）', points: 4 };
  if (gap === 6) return { kind: '冲（向かい合ってぶつかる組み合わせ）', points: -5 };
  return { kind: '特別な関係なし', points: 0 };
}

function termsOf(a: Side, b: Side): Term[] {
  const terms: Term[] = [];

  // 深さ：数値の差を、分野ごとの補正表の上で直線補間する。
  const diff = Math.abs(a.num - b.num);
  const position = Math.min(3, diff / DEPTH_STEP);
  const low = Math.floor(position), high = Math.min(3, low + 1), t = position - low;
  const depth = zero();
  for (const area of AREAS) depth[area.id] = round1(DEPTH_ADJUST[area.id][low] * (1 - t) + DEPTH_ADJUST[area.id][high] * t);
  terms.push({
    id: 'depth', label: '深さの差',
    note: '深さの数値 ' + a.num.toFixed(1) + ' と ' + b.num.toFixed(1) + '（差 ' + diff.toFixed(1) + '）' + (a.detail && b.detail ? '。名前の画数から出した値です。' : '。タイプを選んだ側は、その深さの帯の中央値です。'),
    points: depth,
  });

  if (!a.detail || !b.detail) return terms;
  const x = a.detail, y = b.detail;

  const minus = (x.minus ? 1 : 0) + (y.minus ? 1 : 0);
  terms.push({
    id: 'minus', label: '「−」の向かい風',
    note: minus === 0 ? '二人とも「−」ではありません。' : minus === 1 ? '片方が「−」です。向かい風を受ける側を、もう一人が支える形になります。' : '二人とも「−」です。同じ向かい風を知っている二人で、友情と恋愛は分かり合いやすい一方、暮らしの安定には工夫が要ります。',
    points: {
      love: minus * -1.5 + (minus === 2 ? 1 : 0), marriage: minus * -2, work: minus * -1, friend: minus * -1 + (minus === 2 ? 2 : 0),
    },
  });

  const vortex = (x.A ? 1 : 0) + (y.A ? 1 : 0);
  terms.push({
    id: 'vortex', label: 'Aの渦',
    note: vortex === 0 ? '二人ともAではありません。' : vortex === 1 ? '片方がAです。振れ幅の大きい人と、落ち着いている人の組み合わせです。' : '二人ともAです。勢いは共鳴して大きくなりますが、安定は意識して作る必要があります。',
    points: vortex === 0 ? zero() : vortex === 1 ? { love: 1, marriage: -1, work: 1, friend: 0 } : { love: 2, marriage: -3, work: 2, friend: 1 },
  });

  const relation = branchRelation(x.birthBranch, y.birthBranch);
  terms.push({
    id: 'branch', label: '生まれ年の十二支',
    note: BRANCH_NAMES[x.birthBranch] + 'と' + BRANCH_NAMES[y.birthBranch] + '。' + relation.kind + '。',
    points: weighted(relation.points, { love: 1, marriage: 1.2, work: 0.6, friend: 0.8 }),
  });

  // 生まれた日の月相の開き。同じ形（0°）と向かい合う形（180°）は同調と補完で＋、直角（90°）は緊張で−。
  let phase = Math.abs(x.birthPhase - y.birthPhase) % 360;
  if (phase > 180) phase = 360 - phase;
  const harmony = Math.cos(phase * 2 * Math.PI / 180);
  terms.push({
    id: 'moon', label: '生まれた日の月',
    note: '月の満ち欠けの開きは約' + Math.round(phase) + '度。' + (harmony > 0.5 ? '似た形か向かい合う形で、同調と補完が働きます。' : harmony < -0.5 ? '直角に近い形で、少し緊張が生まれます。' : '近くも遠くもない、ほどよい距離です。'),
    points: weighted(harmony, { love: 1.5, marriage: 1, work: 0.5, friend: 1 }),
  });

  // 名前の五行どうしの関係。五行は二つ選ぶと必ず「相生の隣」か「相剋の隣」か「同じ」のどれかになるので、
  // 双方向の関係点の平均（同気1.2／相生と流出0.6／調整と相剋−0.25）を使う。
  const mutual = (relationOf(x.nameElement, y.nameElement).score + relationOf(y.nameElement, x.nameElement).score) / 2;
  terms.push({
    id: 'name', label: '名前の五行',
    note: '総画数 ' + x.total + '画（' + ELEMENT_NAMES[x.nameElement] + '）と ' + y.total + '画（' + ELEMENT_NAMES[y.nameElement] + '）。'
      + (x.nameElement === y.nameElement ? '同じ五行で、働きが重なります。' : mutual > 0 ? '相生の関係で、互いを育てやすい組み合わせです。' : '相剋の関係で、違いを調整しながら進む組み合わせです。'),
    points: weighted(mutual, { love: 2, marriage: 2, work: 1.5, friend: 1.5 }),
  });
  return terms;
}

export function compat(a: Side, b: Side) {
  const season = (compatText.seasons as Record<string, SeasonText>)[seasonKey(a.season, b.season)];
  const diff = Math.abs(a.num - b.num);
  const depthIndex = Math.min(3, Math.round(diff / DEPTH_STEP));
  const terms = termsOf(a, b);
  const areas = AREAS.map((area, i) => {
    const score = clamp(season.base[i] + terms.reduce((sum, term) => sum + term.points[area.id], 0));
    return { ...area, score, level: levelOf(score), text: season[area.id] };
  });
  const total = Math.round(areas.reduce((sum, area) => sum + area.score, 0) / areas.length);
  return {
    season, depth: compatText.depths[depthIndex], depthIndex, diff, a, b, terms, areas, total, level: levelOf(total),
    first: residents[a.index], second: residents[b.index], sameType: a.index === b.index,
    detailed: !!(a.detail && b.detail),
  };
}
export type Compat = ReturnType<typeof compat>;

/** 自分から見た、16タイプ全員との総合点（高い順）。 */
export function rankAll(own: Side) {
  return residents.map((_, index) => ({ index, total: compat(own, sideOfType(index)).total }))
    .sort((x, y) => y.total - x.total || x.index - y.index);
}
