// 有料の場所を、無料版で隠す枠。無料か有料かは plan.ts が持つ（公開ではサーバーの確認結果、手元の開発では切り替え）。
// 有料にする場所は PREMIUM_SECTIONS に名前を足し、画面側で <Premium id="名前"> で包む。
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { requestUpgrade } from './entitlement';
import { usePlan, type Plan } from './plan';
import { C, ui } from './ui';
import { uiIcon } from './art';
import { Image } from './web/image';

export { usePlan, type Plan } from './plan';

/** 有料版でだけ読める場所の名前。ここに無い名前の <Premium> は、無料版でもそのまま見える。 */
export const PREMIUM_SECTIONS: string[] = [
  'areaText',  // 今日タブ・二「分野別の運勢」の文（星と点数は無料）
  'breakdown', // 今日タブ・一「今日、あなたの海に効いていること」の内訳
  'layers',    // 今日タブ・三「年・月・日」の読みの文（輪の絵は無料）
  'lucky',     // 今日タブ・四「ラッキー」の方角・時間・もの・数字（色は無料）
  'tomorrow',  // 今日タブ・終「予告」（明日の潮）
  'compatAreaText', // 相性タブ・4つの相性の文（ラベルと点数とバーは無料）
  'lifeFuture',     // 人生タブ・未来の読み（次の追い風、これから1年の月、来年以降の年と今年の先の月）
  'compatPeriod',   // 相性タブ・二人の今日・今月・今年の読みと内訳（点数と二人の段階は無料）
  'compatDetail',   // 相性タブ・深さの組み合わせ、点数の内訳、二人の読み
];

export const isLocked = (id: string, plan: Plan) => plan === 'free' && PREMIUM_SECTIONS.includes(id);

/** 無料版で、文字の代わりに置く、ぼかした帯の幅。本物の文字は、画面（DOM）に出さない。 */
const BAR_WIDTHS = ['100%', '94%', '98%', '88%', '96%', '72%'];

/** 有料の場所。無料版では、中身を画面に出さず、ぼかした帯と鍵の案内に置き換える。 */
export function Premium({ id, children, label = '有料版で読めます', compact, when = true, lines = 4 }: { id: string; children: ReactNode; label?: string; compact?: boolean; when?: boolean; lines?: number }) {
  const plan = usePlan();
  const locked = when && isLocked(id, plan);
  if (!locked) return <>{children}</>;
  return <Pressable accessibilityRole="button" accessibilityLabel="有料版のご案内を開く" onPress={requestUpgrade} style={styles.wrap}>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ gap: compact ? 7 : 11, paddingVertical: compact ? 4 : 14, paddingHorizontal: compact ? 0 : 14, opacity: 0.8, filter: 'blur(3px)', userSelect: 'none' } as unknown as ViewStyle}>
      {Array.from({ length: lines }, (_, index) => <View key={index} style={[styles.bar, { width: BAR_WIDTHS[index % BAR_WIDTHS.length] } as ViewStyle]} />)}
    </View>
    <View style={styles.badge} pointerEvents="none"><Text {...ui('quiet')} style={[styles.badgeText, compact && { fontSize: 12, paddingHorizontal: 10, paddingVertical: 5 }]}>{uiIcon('icon-lock') ? <Image source={uiIcon('icon-lock')!} style={{ width: 14, height: 14, display: 'inline-block', marginRight: 6, verticalAlign: 'middle' } as never} contentFit="contain" accessible={false} /> : '🔒 '}{compact ? '有料版' : label}</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  bar: { height: 13, borderRadius: 7, backgroundColor: 'rgba(186,198,221,.22)' },
  wrap: { position: 'relative', overflow: 'hidden', borderRadius: 18 },
  badge: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: C.ink, fontSize: 15, fontWeight: '900', backgroundColor: 'rgba(16,23,42,.82)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, overflow: 'hidden' },
});
