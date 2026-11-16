// 占い結果の下に並ぶ「詳しい運勢」：海のようす、分野別の星、ラッキー項目、明日の潮。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { iconArt, tierArt } from './art';
import { COLOR_LIST, type Fortune, type tomorrowFor } from './fortune';
import { Image } from './web/image';
import { Gloss, useGloss } from './Glossary';
import { Art, C, rounded, S, display } from './ui';
import { fx, Waves } from './Visual';
import { clamp01, easeOutBack, easeOutCubic, useScrollLink } from './useScrollLink';

const asStyle = (style: object) => style as unknown as ViewStyle;
const TIER_COLORS = ['#efd393', '#b6dfc4', '#c1d2ef', '#ff5a4d', '#e0245e'];

/** 画面に入ってきたときに一度だけ true になる。スクロールして見えた瞬間に演出を始めるため。 */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || seen) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setSeen(true); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

/** 見えた瞬間に、ふわっと現れる枠。 */
export function Appear({ children, style, delay = 0 }: { children: ReactNode; style?: ViewStyle | ViewStyle[]; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <View ref={ref as never} {...(seen ? fx('up') : {})} style={[style, asStyle(seen ? { animationDelay: delay + 'ms' } : { opacity: 0 })]}>{children}</View>;
}

/** 空の星が並んでいて、左から一つずつ色で満たされていく。満ちる瞬間に、ポンと弾んで光る。 */
function Stars({ count, color, play, delay }: { count: number; color: string; play: boolean; delay: number }) {
  return <View accessible accessibilityLabel={`5段階中${count}`} style={{ flexDirection: 'row', gap: 2 }}>
    {Array.from({ length: 5 }, (_, index) => {
      const on = index < count;
      return <View key={index}>
        <Text style={[styles.star, { color: '#3a4664' }]}>★</Text>
        {play && on && <Text {...({ dataSet: { fx: 'fill' } } as object)}
          style={[styles.star, { position: 'absolute', left: 0, top: 0, color }, asStyle({ animationDelay: delay + index * 140 + 'ms', textShadow: `0 0 12px ${color}` })]}>★</Text>}
      </View>;
    })}
  </View>;
}

export function FortuneAreas({ fortune, dayWord, hideSea }: { fortune: Fortune; dayWord: string; hideSea?: boolean }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <View ref={ref as never} style={S.stack}>
    {!hideSea && <View style={S.card}>
      {tierArt[fortune.level] && <Art source={tierArt[fortune.level]!} height={140} />}
      <View style={styles.sea}>
        <Text style={S.kicker}>{dayWord}の海のようす</Text>
        <Text style={styles.seaText}>{fortune.sea}</Text>
      </View>
    </View>}
    <View style={styles.grid}>
      {fortune.areas.map((area, index) => <View key={area.id} {...(seen ? fx('pop') : {})}
        style={[S.card, styles.area, asStyle(seen ? { animationDelay: index * 110 + 'ms', borderColor: area.color + '66' } : { opacity: 0 })]}>
        <View style={S.between}>
          <View style={[styles.areaIcon, { backgroundColor: area.color + '26', borderColor: area.color + '88' }]}>{iconArt[area.id] ? <Image source={iconArt[area.id]!} style={{ width: 28, height: 28 }} contentFit="contain" accessible={false} /> : <Text style={{ color: area.color, fontSize: 18, fontWeight: '900' }}>{area.icon}</Text>}</View>
          {area.id === fortune.best.id && <View style={[styles.best, { backgroundColor: area.color }]}><Text style={styles.bestText}>いちばん</Text></View>}
        </View>
        <Text style={S.h3}>{area.label}</Text>
        <Stars count={area.stars} color={area.color} play={seen} delay={300 + index * 110} />
        <Text style={styles.areaText}>{area.text}</Text>
      </View>)}
    </View>
  </View>;
}


/** ラッキーカラーの天体。スクロールで近づくほど回転が進み、止まる頃に今日の色が一番手前へ。戻すと逆回転する。 */
const ORB_W = 196, ORB_H = 156, RX = 78, RY = 30, TILT = -17 * Math.PI / 180, SPIN = 640 * Math.PI / 180;

/** 角度 φ（0 が一番手前）の位置を、傾けた楕円の上の座標と奥行き（1 手前 … -1 奥）にする。 */
function project(phi: number) {
  const x = RX * Math.sin(phi), z = Math.cos(phi), y = RY * z;
  const cos = Math.cos(TILT), sin = Math.sin(TILT);
  return { x: ORB_W / 2 + x * cos - y * sin, y: ORB_H / 2 + x * sin + y * cos, z };
}

function ColorOrrery({ hex, p }: { hex: string; p: number }) {
  const n = COLOR_LIST.length;
  const luckyIndex = Math.max(0, COLOR_LIST.findIndex(color => color.hex === hex));
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const spinP = clamp01(p / 0.8);                 // 0〜0.8 の間に回って減速
  const grow = easeOutBack(clamp01((p - 0.72) / 0.28)); // 最後の 28% で、今日の色が大きくなる
  const glow = clamp01((p - 0.7) / 0.3);

  useEffect(() => {
    const spin = SPIN * (1 - easeOutCubic(spinP));
    COLOR_LIST.forEach((color, i) => {
      const node = nodes.current[i];
      if (!node) return;
      const phi = (i - luckyIndex) * 2 * Math.PI / n + spin;
      const pt = project(phi);
      const depth = (pt.z + 1) / 2; // 0 奥 … 1 手前
      const win = i === luckyIndex;
      const size = (11 + (i % 3) * 3) * (0.5 + 0.5 * depth) * (win ? 1 + grow * 1.5 : 1);
      const settled = win ? 1 : 1 - 0.35 * clamp01(grow);
      node.style.width = node.style.height = size + 'px';
      node.style.left = pt.x - size / 2 + 'px';
      node.style.top = pt.y - size / 2 + 'px';
      node.style.opacity = String((0.35 + 0.65 * depth) * settled);
      node.style.zIndex = String(win && grow > 0.05 ? 50 : Math.round(depth * 20));
      node.style.filter = depth < 0.35 ? 'blur(.7px) brightness(.8)' : 'none';
      node.style.boxShadow = win && grow > 0.05 ? `0 0 ${10 + 22 * clamp01(grow)}px ${color.hex}, inset 0 -4px 7px rgba(0,0,0,.3), inset 0 3px 5px rgba(255,255,255,.5)` : `0 0 ${4 + 6 * depth}px ${color.hex}88, inset 0 -3px 5px rgba(0,0,0,.28), inset 0 2px 3px rgba(255,255,255,.4)`;
    });
  }, [spinP, grow, luckyIndex, n]);

  const dust = Array.from({ length: 12 }, (_, i) => { const pt = project(i * Math.PI / 6 + .3); return { x: pt.x, y: pt.y, o: .15 + .3 * (pt.z + 1) / 2, s: 2 + (i % 2) }; });
  return <div role="img" aria-label="ラッキーカラーの天体" style={{ position: 'relative', width: ORB_W, height: ORB_H, flexShrink: 0, opacity: clamp01(p * 3) }}>
    <div style={{ position: 'absolute', left: ORB_W / 2 - RX, top: ORB_H / 2 - RY, width: RX * 2, height: RY * 2, borderRadius: '50%', border: '1px dashed rgba(234,204,140,.3)', transform: `rotate(${TILT}rad)` }} />
    <div style={{ position: 'absolute', left: ORB_W / 2 - 48, top: ORB_H / 2 - 30, width: 96, height: 60, borderRadius: '50%', opacity: glow, background: `radial-gradient(ellipse, ${hex}99, ${hex}22 60%, transparent 72%)`, transform: `rotate(${TILT}rad) scale(${0.4 + 0.6 * glow})`, filter: 'blur(3px)' }} />
    {dust.map((d, i) => <div key={i} style={{ position: 'absolute', left: d.x - d.s / 2, top: d.y - d.s / 2, width: d.s, height: d.s, borderRadius: d.s, background: '#fbf3e0', opacity: d.o }} />)}
    {COLOR_LIST.map((color, i) => <div key={color.hex} ref={el => { nodes.current[i] = el; }}
      style={{ position: 'absolute', borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #ffffffaa, ${color.hex} 45%, ${color.hex})` }} />)}
  </div>;
}

export function LuckyCard({ fortune, dayWord }: { fortune: Fortune; dayWord: string }) {
  const { lucky } = fortune;
  const open = useGloss();
  const [rowRef, progress] = useScrollLink();
  const nameP = clamp01((progress - 0.72) / 0.28);
  const rows = [
    { label: '方角', value: lucky.direction, mark: '⌖' },
    { label: '時間', value: lucky.time, mark: '◔' },
    { label: 'もの', value: lucky.item, mark: '✧' },
    { label: '数字', value: String(lucky.number), mark: '＃' },
  ];
  return <Appear style={[S.card, styles.lucky]}>
    <View style={S.between}>
      <Text style={S.kicker}>{dayWord}のお守り</Text>
      <Text accessibilityRole="button" onPress={() => open('五行')} style={[S.tiny, styles.link]}>五行「{lucky.element}」から</Text>
    </View>
    <View ref={rowRef as never} style={styles.colorRow}>
      <ColorOrrery hex={lucky.color.hex} p={progress} />
      <View style={{ flex: 1 }}>
        <Text style={S.tiny}>ラッキーカラー</Text>
        <Text style={[styles.colorName, asStyle({ opacity: nameP, transform: `translateX(${(1 - nameP) * -18}px)` })]}>{lucky.color.name}</Text>
      </View>
    </View>
    <View style={styles.luckyGrid}>
      {rows.map(row => <View key={row.label} style={styles.luckyCell}>
        <Text style={styles.luckyMark}>{row.mark}</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.tiny}>{row.label}</Text>
          <Text style={styles.luckyValue}>{row.value}</Text>
        </View>
      </View>)}
    </View>
  </Appear>;
}

export function TomorrowCard({ tomorrow }: { tomorrow: ReturnType<typeof tomorrowFor> }) {
  const open = useGloss();
  const color = TIER_COLORS[tomorrow.level];
  const arrow = tomorrow.trend === 'up' ? '↗' : tomorrow.trend === 'down' ? '↘' : '→';
  const art = tierArt[tomorrow.level];
  return <Appear style={[S.card, styles.tomorrow, asStyle({ borderColor: color + '99', backgroundImage: art
    ? `linear-gradient(180deg, rgba(20,30,55,.55) 0%, #141e37 58%), url(${art})`
    : `linear-gradient(160deg, ${color}2e 0%, #141e37 62%)`, backgroundSize: '100% auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'top center' })]}>
    <Waves color={color} level={Math.min(tomorrow.level, 1)} />
    <View style={S.between}>
      <Text style={S.kicker}>明日の潮　{tomorrow.month}月{tomorrow.day}日（{tomorrow.weekday}）</Text>
      <Text {...fx('float')} style={{ fontSize: 22 }}>🌙</Text>
    </View>
    <View style={styles.tomorrowHead}>
      <Text accessibilityRole="button" accessibilityLabel={tomorrow.tier + 'の説明を開く'} onPress={() => open(tomorrow.tier)}
        style={[styles.tomorrowTier, { color }]}>{tomorrow.tier}</Text>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.trend}><Text {...fx('nudge')} style={{ color }}>{arrow}</Text> {tomorrow.trendText}</Text>
        <Gloss style={S.tiny}>{`${tomorrow.moon}・${tomorrow.phaseTide}　／　海況「${tomorrow.stage}」`}</Gloss>
      </View>
    </View>
    {!!tomorrow.events.length && <Gloss style={[S.tiny, { color: C.gold }]}>{'◆ ' + tomorrow.events.join('　◆ ')}</Gloss>}
    <Text style={styles.tomorrowHint}>{tomorrow.hint}</Text>
    <View style={styles.sealed}>
      <Text style={styles.sealedText}>順位・ひと言・一手は、明日ひらきます</Text>
      <Text style={S.tiny}>日付が変わったら、また海を見に来てください。</Text>
    </View>
  </Appear>;
}

const styles = StyleSheet.create({
  sea: { padding: 16, gap: 6, backgroundColor: '#15213d' },
  seaText: { color: C.ink, fontSize: 17, lineHeight: 29, fontFamily: rounded, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  area: { flexGrow: 1, flexBasis: '46%', minWidth: 128, padding: 14, gap: 6 },
  areaIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  areaText: { color: C.muted, fontSize: 14, lineHeight: 23 },
  best: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9 },
  bestText: { color: C.dark, fontSize: 12, fontWeight: '900' },
  star: { fontSize: 19, lineHeight: 24 },
  lucky: { padding: 16, gap: 12 },
  link: { textDecorationLine: 'underline', textDecorationStyle: 'dotted', color: C.aqua },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  orb: { width: 58, height: 58, borderRadius: 29 },
  stage: { width: 156, height: 156, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  stageLayer: { position: 'absolute', top: 0, left: 0, width: 156, height: 156 },
  orbit: { position: 'absolute', borderRadius: 100, borderWidth: 1, borderColor: 'rgba(234,204,140,.22)', borderStyle: 'dashed' },
  colorName: { color: C.ink, fontSize: 26, lineHeight: 36, fontFamily: rounded, fontWeight: '900' },
  luckyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  luckyCell: { flexGrow: 1, flexBasis: '46%', minWidth: 140, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: '#111a31', borderWidth: 1, borderColor: C.line },
  luckyMark: { color: C.gold, fontSize: 20, width: 24, textAlign: 'center' },
  luckyValue: { color: C.ink, fontSize: 15, lineHeight: 22, fontWeight: '800' },
  tomorrow: { padding: 16, paddingBottom: 26, gap: 10, borderWidth: 1.5 },
  tomorrowHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tomorrowTier: { fontSize: 40, lineHeight: 54, fontFamily: display },
  trend: { color: C.ink, fontSize: 16, lineHeight: 24, fontWeight: '800' },
  tomorrowHint: { color: C.ink, fontSize: 15, lineHeight: 25 },
  sealed: { gap: 2, padding: 12, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#6c7896', backgroundColor: 'rgba(13,19,36,.7)' },
  sealedText: { color: C.ink, fontSize: 15, fontWeight: '800' },
});
