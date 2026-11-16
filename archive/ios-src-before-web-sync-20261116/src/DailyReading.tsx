import { StyleSheet, Text, View } from 'react-native';
import { shortDate, tierColors, tiers, type readDay } from './domain';
import { FIVE_PHASES, OUTER, STAGES, stageFor } from './scoring';
import { Gloss } from './Glossary';
import { Card, C, display, S } from './ui';
import { useInView } from './FortuneDetail';
import type { ReactNode } from 'react';

type ReadingCardProps = { reading: ReturnType<typeof readDay>; isToday?: boolean; children?: ReactNode };

export function DailyAdvice({ reading, isToday = true, children }: ReadingCardProps) {
  const { row, outlook } = reading;
  const day = isToday ? '今日' : 'この日';
  return <Card>
    <Text accessibilityRole="header" style={S.kicker}>{day}のひと言</Text>
    <Text style={S.h2}>{outlook.line}</Text>
    <Text style={S.body}>{outlook.detail}</Text>
    <View style={styles.action}>
      <Text accessibilityRole="header" style={S.kicker}>{day}の一手</Text>
      <Text style={S.h2}>{outlook.action}</Text>
      {row.t.minus && row.rank > 80 && <Text style={S.body}>「−」の名札は向かい風を受けやすい読みです。今いる場所を守ることも、一つの舵の切り方です。</Text>}
      {children}
    </View>
  </Card>;
}

const asStyle = (style: object) => style as never;
const pale = ['#fff3cf', '#e2f6ea', '#e3ecff', '#ffdcc6', '#ffd0dc'];

/** 年・月・日それぞれの「海の調子」。段階の色に染まったカードで、5つのメーターが左から満ちていく。 */
function LayerCard({ scope, when, level, theme, index, seen, now }: { scope: string; when: string; level: number; theme: string; index: number; seen: boolean; now?: boolean }) {
  const color = tierColors[level];
  const lit = 5 - level; // 凱風=5つ点灯 … 轟沈=1つ
  const delay = index * 220;
  return <View {...(seen ? ({ dataSet: { gd: 'pop' } } as object) : {})}
    style={[styles.layer, asStyle({
      borderColor: color + (now ? 'cc' : '77'), opacity: seen ? 1 : 0, animationDelay: delay + 'ms',
      backgroundImage: `linear-gradient(165deg, ${color}40 0%, ${color}12 46%, #0f1830 100%)`,
      boxShadow: `0 0 ${now ? 26 : 16}px ${color}${now ? '55' : '2e'}, inset 0 1px 0 ${color}55`,
    })]}>
    <View style={styles.layerHead}>
      <View style={[styles.scopeBadge, { backgroundColor: color + '2a', borderColor: color + '99' }]}><Text style={[styles.scopeText, { color }]}>{scope}</Text></View>
      <Text numberOfLines={1} style={styles.when}>{when}</Text>
    </View>
    <Text style={[styles.tier, { color: pale[level], textShadowColor: color + "aa", textShadowRadius: 5 } as never]}>{tiers[level]}</Text>
    <View style={styles.pips}>
      {Array.from({ length: 5 }, (_, i) => <View key={i} style={styles.pipBase}>
        {i < lit && <View {...(seen ? ({ dataSet: { fx: 'fill' } } as object) : {})}
          style={[styles.pip, asStyle({ backgroundColor: color, boxShadow: `0 0 8px ${color}`, animationDelay: delay + 350 + i * 110 + 'ms', opacity: seen ? 1 : 0 })]} />}
      </View>)}
    </View>
    <Text numberOfLines={1} style={styles.theme}>{theme}</Text>
    {now && <View style={[styles.nowDot, { backgroundColor: color }]} />}
  </View>;
}

export function LayeredReading({ reading, isToday = true, children }: ReadingCardProps) {
  const { context, layers, fivePhase } = reading;
  const [ref, seen] = useInView<HTMLDivElement>();
  const phase = (i: number) => FIVE_PHASES[i].name;
  const chips: [string, string][] = [
    ['季節型', phase(fivePhase.personal)],
    ['年干', phase(fivePhase.year) + '（' + fivePhase.yearRelation.kind + '）'],
    ['年支', phase(fivePhase.yearBranch) + '（' + fivePhase.yearBranchRelation.kind + '）'],
    ['月', phase(fivePhase.month) + '（' + fivePhase.monthRelation.kind + '）'],
    ['日', phase(fivePhase.day) + '（' + fivePhase.dayRelation.kind + '）'],
  ];
  const layerList = [
    { scope: '年', when: context.yearPillar + '年', theme: OUTER[context.outer].th, level: layers.year },
    { scope: '月', when: isToday ? '今月' : 'この月', theme: STAGES[stageFor(context, reading.row.t)].n, level: layers.block },
    { scope: '日', when: shortDate(context), theme: context.dayPillar + ' · ' + context.moon, level: layers.day },
  ];
  return <Card>
    <Text style={S.kicker}>年・月・{isToday ? '今日' : 'この日'}</Text>
    <Text accessibilityRole="header" style={S.h2}>三つの海を重ねて読む</Text>
    <View ref={ref as never} style={styles.layerRow}>
      {layerList.map((l, i) => <View key={l.scope} style={{ flex: 1, flexDirection: 'row', alignItems: 'stretch', minWidth: 0 }}>
        <LayerCard {...l} index={i} seen={seen} now={i === 2} />
        {i < 2 && <View style={styles.link}><Text style={[styles.linkMark, asStyle({ opacity: seen ? 1 : 0, transition: 'opacity .4s ease-out ' + (i * 220 + 500) + 'ms' })]}>›</Text></View>}
      </View>)}
    </View>
    <View style={styles.chipRow}>
      {chips.map(([label, value]) => <View key={label} style={styles.chip}><Text style={styles.chipLabel}>{label}</Text><Text style={styles.chipValue}>{value}</Text></View>)}
    </View>
    <Gloss style={S.body}>{layers.text}</Gloss>
    {children}
  </Card>;
}

const styles = StyleSheet.create({
  action: { gap: 8, paddingTop: 12, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#41516e' },
  layerRow: { flexDirection: 'row', alignItems: 'stretch', marginHorizontal: -2 },
  layer: { flex: 1, minWidth: 0, gap: 6, paddingVertical: 10, paddingHorizontal: 8, borderWidth: 1, borderRadius: 16, backgroundColor: '#0f1830', alignItems: 'center', overflow: 'hidden' },
  layerHead: { alignItems: 'center', gap: 4, width: '100%' },
  scopeBadge: { minWidth: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  scopeText: { fontSize: 13, fontWeight: '900' },
  when: { color: C.muted, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  tier: { fontSize: 24, lineHeight: 32, fontFamily: display, textAlign: 'center' },
  pips: { flexDirection: 'row', gap: 3 },
  pipBase: { width: 11, height: 5, borderRadius: 3, backgroundColor: '#2a3552' },
  pip: { width: 11, height: 5, borderRadius: 3 },
  theme: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '800', opacity: .9, textAlign: 'center' },
  nowDot: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },
  link: { width: 14, alignItems: 'center', justifyContent: 'center' },
  linkMark: { color: C.gold, fontSize: 22, fontWeight: '900' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 12, backgroundColor: '#16213b', borderWidth: 1, borderColor: '#34425f' },
  chipLabel: { color: C.muted, fontSize: 11, fontWeight: '700' },
  chipValue: { color: C.ink, fontSize: 12, fontWeight: '800' },
});
