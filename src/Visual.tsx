// 画面に感情の起伏をつくる演出部品（ふわっと登場／きらきら／ゲージ／2軸マップ）。
// web 専用の CSS アニメーション（RN-web の animationKeyframes）を使う。
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { C, display as displayFont } from './ui';
import type { ImeSegment } from './kana';

const anim = (style: object) => style as unknown as ViewStyle;
/** CSS 側（styles.css）で定義したアニメーションを data 属性で当てる。 */
export const fx = (name: string, delay = 0) => ({ dataSet: { fx: name, d: delay } }) as object;


/** ふわっと弾んで登場する。 */
export type RevealKind = 'pop' | 'slam' | 'up' | 'fade';
/** 時間差で姿を現す。instant なら演出なしで即表示。 */
export function Reveal({ children, kind = 'pop', delay = 0, style, instant }: {
  children: ReactNode; kind?: RevealKind; delay?: number; style?: StyleProp<ViewStyle>; instant?: boolean;
}) {
  return <View {...(instant ? {} : fx(kind))} style={[instant ? null : anim({ animationDelay: delay + 'ms' }), style]}>{children}</View>;
}

/** ふわっと弾んで登場する。 */
export function Pop({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  return <Reveal kind="pop" delay={delay} style={style}>{children}</Reveal>;
}

/** ゆらゆら浮かぶ。 */
export function Float({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View {...fx('float')} style={style}>{children}</View>;
}

// 文字と重ならないよう、星は左右の余白にだけ置く。
const stars = [
  { l: '2%', t: '8%', d: 0, s: 14 }, { l: '93%', t: '6%', d: 400, s: 18 }, { l: '94%', t: '36%', d: 900, s: 12 },
  { l: '3%', t: '42%', d: 300, s: 12 }, { l: '93%', t: '62%', d: 1200, s: 14 }, { l: '2%', t: '70%', d: 700, s: 16 },
];
/** 背景にまたたく星。祝いたい場面（凱風・診断結果）に。 */
export function Sparkles({ color = C.gold }: { color?: string }) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {stars.map((star, index) => <Text key={index} {...fx('twinkle', Math.round(star.d / 300))}
      style={{ position: 'absolute', left: star.l as never, top: star.t as never, fontSize: star.s, color }}>✦</Text>)}
  </View>;
}

/** 色つきのやわらかい背景（ヒーローカード用）。 */
export const glow = (color: string) => anim({
  backgroundImage: `linear-gradient(155deg, ${color}38 0%, #141e37 58%)`,
  boxShadow: `0 0 36px ${color}26`,
});

const tierNames = ['凱風', '順風', '凪', '荒波', '轟沈'];
const tierCols = ['#efd393', '#b6dfc4', '#c1d2ef', '#ff5a4d', '#e0245e'];
/** 5段階を並べ、いまの段階だけ大きく強調する。 */
export function TierStrip({ level }: { level: number }) {
  return <View style={{ flexDirection: 'row', gap: 5, alignItems: 'flex-end' }} accessible accessibilityLabel={'今日は5段階中、' + tierNames[level]}>
    {tierNames.map((name, index) => {
      const active = index === level;
      return <View key={name} style={{ flex: active ? 2.4 : 1, gap: 4, alignItems: 'center' }}>
        <Text style={{ fontSize: active ? 32 : 12, lineHeight: active ? 48 : 16, paddingTop: active ? 4 : 0, marginBottom: active ? 4 : 0, fontWeight: active ? '400' : '800', color: active ? tierCols[index] : '#6c7896', fontFamily: active ? displayFont : undefined }}>{name}</Text>
        <View style={{ height: active ? 12 : 7, alignSelf: 'stretch', borderRadius: 6, backgroundColor: tierCols[index], opacity: active ? 1 : 0.3 }} />
      </View>;
    })}
  </View>;
}

/** 確定の瞬間、中心から星がはじけ飛ぶ。 */
export function Burst({ color }: { color: string }) {
  return <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }}>
    {Array.from({ length: 12 }, (_, i) => <Text key={i} {...({ dataSet: { fx: 'burst', i } } as object)} style={{ position: 'absolute', marginLeft: -9, marginTop: -11, fontSize: 18, color }}>✦</Text>)}
    <View {...fx('ring')} style={{ position: 'absolute', width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: 30, borderWidth: 3, borderColor: color }} />
  </View>;
}

/** 枠の内側がゆっくり脈打つように光る（注意が必要な日用）。 */
export function GlowPulse({ color, radius = 25 }: { color: string; radius?: number }) {
  return <View pointerEvents="none" {...fx('pulse')} style={[StyleSheet.absoluteFill, anim({ borderRadius: radius, boxShadow: `inset 0 0 38px 4px ${color}aa` })]} />;
}

/** 1文字ずつ打ち出す。レイアウトは最初から全文ぶんを確保して揺れないようにする。 */
export function TypeText({ text, delay = 0, speed = 30, instant, style }: {
  text: string; delay?: number; speed?: number; instant?: boolean; style?: StyleProp<import('react-native').TextStyle>;
}) {
  const [count, setCount] = useState(instant ? text.length : 0);
  useEffect(() => {
    if (instant) { setCount(text.length); return; }
    setCount(0);
    let index = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    const starter = setTimeout(() => {
      timer = setInterval(() => {
        index += 1;
        setCount(index);
        if (index >= text.length && timer) clearInterval(timer);
      }, speed);
    }, delay);
    return () => { clearTimeout(starter); if (timer) clearInterval(timer); };
  }, [text, delay, speed, instant]);
  return <Text style={style} accessibilityLabel={text}>
    <Text>{text.slice(0, count)}</Text><Text style={{ opacity: 0 }}>{text.slice(count)}</Text>
  </Text>;
}

// 段階ごとの海の表情。荒れるほど波が高く・速く・尖り、白波が立つ。
// cycles は 400 ユニット（画面の半分）に入る波の数。端が継ぎ目なく繋がるよう整数にしてある。
const SEAS = [
  { height: 70, amp: 6, cycles: 2, speeds: [18, 26], layers: 2, sharp: 0, heave: 0, foam: false, op: 0.3 },     // 凱風：ゆったり
  { height: 80, amp: 10, cycles: 2, speeds: [13, 19], layers: 2, sharp: 0.1, heave: 0, foam: false, op: 0.32 }, // 順風：軽やか
  { height: 56, amp: 3, cycles: 1, speeds: [24, 34], layers: 2, sharp: 0, heave: 0, foam: false, op: 0.26 },    // 凪：ほぼ平ら
  { height: 150, amp: 28, cycles: 3, speeds: [6, 9, 12], layers: 3, sharp: 0.45, heave: 3.2, foam: true, op: 0.42 },   // 荒波：高く尖る・白波
  { height: 220, amp: 42, cycles: 4, speeds: [4.4, 6.6, 9], layers: 3, sharp: 0.7, heave: 2.2, foam: true, op: 0.5 }, // 轟沈：うねり狂う
];

function wavePath(amp: number, cycles: number, phase: number, sharp: number, base: number, height: number, closed = true) {
  const points: string[] = [];
  for (let x = 0; x <= 800; x += 8) {
    const theta = 2 * Math.PI * cycles * x / 400 + phase;
    // 2倍波を重ねると、波頭が尖って谷が広い「荒れた波」の形になる
    const y = base - amp * (Math.sin(theta) + sharp * Math.sin(2 * theta + 0.9));
    points.push((x === 0 ? 'M' : 'L') + x + ' ' + y.toFixed(1));
  }
  return points.join(' ') + (closed ? ' L800 ' + height + ' L0 ' + height + ' Z' : '');
}

/** 下から寄せる波。段階に応じて高さ・速さ・形が変わり、荒波以上では白波が立ち、全体が上下にうねる。 */
export function Waves({ color, level }: { color: string; level: number }) {
  const sea = SEAS[level];
  const h = sea.height;
  const unit = 100; // viewBox の高さ
  return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, overflow: 'hidden', borderBottomLeftRadius: 25, borderBottomRightRadius: 25, opacity: sea.op + 0.1 }}>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, ...(sea.heave ? { animation: `fx-heave ${sea.heave}s ease-in-out infinite` } : {}) }}>
      {Array.from({ length: sea.layers }, (_, layer) => {
        const front = layer === sea.layers - 1;
        const amp = sea.amp * (1 - layer * 0.22) * (unit / h) * (h / 100);
        const base = unit * (0.32 + layer * 0.2);
        return <div key={layer} style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height: h, animation: `fx-wave ${sea.speeds[layer]}s linear infinite ${layer % 2 ? 'reverse' : 'normal'}` }}>
          <svg viewBox={`0 0 800 ${unit}`} preserveAspectRatio="none" width="100%" height={h}>
            <path d={wavePath(amp, sea.cycles, layer * 1.7, sea.sharp, base, unit)} fill={color} opacity={0.5 + layer * 0.18} />
            {sea.foam && front && <path d={wavePath(amp, sea.cycles, layer * 1.7, sea.sharp, base, unit, false)} fill="none" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" opacity=".85" />}
          </svg>
        </div>;
      })}
    </div>
  </View>;
}

const TYPE_MS = 48;      // 1文字打つ間隔
const CONVERT_MS = 280;  // 打ち終えてから変換キーを押すまで
const COMMIT_MS = 90;    // そのまま確定する（かな→同じ表記）

type ImeEvent = { done: number; composing: string; gap: number; flash: boolean };
function imeEvents(segments: ImeSegment[]) {
  const events: ImeEvent[] = [];
  segments.forEach(([kana, text], index) => {
    for (let k = 1; k <= kana.length; k++) events.push({ done: index, composing: kana.slice(0, k), gap: TYPE_MS, flash: false });
    events.push({ done: index + 1, composing: '', gap: kana === text ? COMMIT_MS : CONVERT_MS, flash: kana !== text });
  });
  events.push({ done: segments.length, composing: '', gap: 380, flash: false }); // 最後の変換の強調を消す
  return events;
}
/** IME で打って変換していく所要時間(ms)。後続の表示タイミングの計算用。 */
export function imeDuration(segments: ImeSegment[]) {
  return imeEvents(segments).reduce((sum, event) => sum + event.gap, 0) + 400;
}

/**
 * キーボードでひらがなを打ち（下線つき）、変換キーで漢字に変わっていく表示。
 * 最初から全文ぶんの場所を確保するので、レイアウトは揺れない。
 */
export function ImeText({ segments, delay = 0, instant, style }: {
  segments: ImeSegment[]; delay?: number; instant?: boolean; style?: StyleProp<import('react-native').TextStyle>;
}) {
  const full = segments.map(segment => segment[1]).join('');
  const [view, setView] = useState<ImeEvent | null>(instant ? { done: segments.length, composing: '', gap: 0, flash: false } : null);
  useEffect(() => {
    if (instant) { setView({ done: segments.length, composing: '', gap: 0, flash: false }); return; }
    setView(null);
    const events = imeEvents(segments);
    let index = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      setView(events[index]);
      index += 1;
      if (index < events.length) timer = setTimeout(step, events[index].gap);
    };
    timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
  }, [segments, delay, instant]);

  const doneSegments = view ? segments.slice(0, view.done) : [];
  const lastIndex = doneSegments.length - 1;
  const committedBefore = doneSegments.slice(0, view?.flash ? lastIndex : doneSegments.length).map(segment => segment[1]).join('');
  const flashText = view?.flash && lastIndex >= 0 ? doneSegments[lastIndex][1] : '';
  return <View accessible accessibilityLabel={full}>
    <Text style={[style, { opacity: 0 }]}>{full}</Text>
    <Text style={[style, StyleSheet.absoluteFill]}>
      <Text>{committedBefore}</Text>
      {!!flashText && <Text style={{ color: C.gold }}>{flashText}</Text>}
      {!!view?.composing && <Text style={{ textDecorationLine: 'underline', backgroundColor: 'rgba(234,204,140,.22)' }}>{view.composing}</Text>}
    </Text>
  </View>;
}
