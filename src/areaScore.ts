// 仕事・恋愛・金運・健康の4分野の点数。ひと言（dayText.ts）と、詳しい運勢（fortune.ts）の両方が、同じ計算を使う。
// 順位55％＋分野ごとの数値35％を0〜1に伸ばして、0〜100点と星1〜5にする。乱数は使わない。
import type { RankRow } from './scoring';

export type AreaId = 'work' | 'love' | 'money' | 'health';
export const AREA_IDS: AreaId[] = ['work', 'love', 'money', 'health'];
/** 分野の表示名と色（詳しい運勢のカードと同じ色）。 */
export const AREA_META: Record<AreaId, { label: string; color: string }> = {
  work: { label: '仕事・学び', color: '#eacc8c' },
  love: { label: '恋愛・対人', color: '#f0a8c0' },
  money: { label: '金運', color: '#b6dfc4' },
  health: { label: '健康・休息', color: '#a8c4f0' },
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function areaScores(row: RankRow, force: { go: number; change: number }) {
  const base = 1 - (row.rank - 1) / 159;
  const parts = [
    force.go,
    force.change * 0.6 + clamp((row.p.moon + 2) / 4) * 0.4,
    clamp((row.p.comp + 2) / 4) * 0.5 + clamp((row.p.base - 1) / 9) * 0.5,
    // 健康：日の波（体力の上げ下げ）・月の距離と深さ（潮の引き）・進む力と変える力のつり合い。
    clamp(0.5 + row.p.day / 7) * 0.5 + clamp(0.5 + row.p.depth / 1.8) * 0.2 + (1 - Math.abs(force.go - force.change) * 1.6) * 0.3,
  ];
  return AREA_IDS.map((id, index) => {
    const value = clamp((base * 0.55 + parts[index] * 0.35 - 0.12) / 0.62);
    const scaled = value * 4;
    return { id, value, scaled, stars: 1 + Math.round(scaled), point: Math.round(value * 100) };
  });
}
