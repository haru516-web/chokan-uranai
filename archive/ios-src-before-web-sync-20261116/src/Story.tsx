// 占い結果を「章」で読み進める鑑定書。スクロールするだけで、章が一つずつ灯り、次の章をちらりと予告する。
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useInView } from './FortuneDetail';
import { C, display, rounded, S } from './ui';
import { fx } from './Visual';

const asStyle = (style: object) => style as unknown as ViewStyle;
const KANJI = ['序', '二', '三', '四', '五', '六', '七', '八', '終'];

export function Scene({ index, last, kicker, title, lead, color, next, children }: {
  index: number; last?: boolean; kicker: string; title: string; lead?: string; color: string; next?: string; children: ReactNode;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const mark = last ? '終' : KANJI[index] ?? String(index + 1);
  return <View ref={ref as never} style={styles.scene}>
    <View style={styles.rail}>
      <View {...(seen ? fx('pop') : {})} style={[styles.seal, asStyle(seen
        ? { borderColor: color, backgroundColor: color + '22', boxShadow: `0 0 22px ${color}66` }
        : { opacity: 0 })]}>
        <Text style={[styles.sealText, { color }]}>{mark}</Text>
      </View>
      {!last && <View style={[styles.thread, asStyle({ backgroundImage: `linear-gradient(${color}, transparent)` })]} {...(seen ? fx('thread') : {})} />}
    </View>
    <View style={styles.body}>
      <View {...(seen ? fx('up') : {})} style={[styles.head, seen ? null : asStyle({ opacity: 0 })]}>
        <Text style={[S.kicker, { color }]}>{kicker}</Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {lead && <Text style={styles.lead}>{lead}</Text>}
      </View>
      <View {...(seen ? fx('up') : {})} style={[styles.content, asStyle(seen ? { animationDelay: '180ms' } : { opacity: 0 })]}>{children}</View>
      {next && <View {...(seen ? fx('fade') : {})} style={[styles.next, asStyle(seen ? { animationDelay: '600ms' } : { opacity: 0 })]}>
        <Text {...fx('nudge')} style={[styles.nextArrow, { color }]}>↓</Text>
        <Text style={styles.nextText}>つぎは「{next}」</Text>
      </View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  scene: { flexDirection: 'row', gap: 12 },
  rail: { width: 40, alignItems: 'center' },
  seal: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  sealText: { fontSize: 18, lineHeight: 22, fontFamily: display },
  thread: { flex: 1, width: 2, marginTop: 6, borderRadius: 1, transformOrigin: 'top', minHeight: 40 } as object as ViewStyle,
  body: { flex: 1, minWidth: 0, gap: 12, paddingBottom: 28 },
  head: { gap: 4, paddingTop: 6 },
  title: { color: C.ink, fontSize: 24, lineHeight: 34, fontFamily: rounded, fontWeight: '900' },
  lead: { color: C.ink, fontSize: 17, lineHeight: 29, fontFamily: rounded, fontWeight: '700', opacity: .92 },
  content: { gap: 12 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
  nextArrow: { fontSize: 18, fontWeight: '900' },
  nextText: { color: C.muted, fontSize: 14, fontWeight: '700' },
});
