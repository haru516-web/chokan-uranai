import { useEffect, useId, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Polygon, Polyline, RadialGradient, Stop, Text as SvgText } from './web/svg';
import { cycleFor, cycleTier, jstToday, tiers, type Profile } from './domain';
import { blockScoreOf, ctxFor, labelOf, OUTER, personalStage, STAGES, stageFor, yearScoreOf, type SeaContext } from './scoring';
import { C, S } from './ui';
import { clamp01, easeOutCubic, useScrollLink } from './useScrollLink';

const spokes = Array.from({ length: 12 }, (_, index) => index);
const center = 150;

function point(radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180;
  return [center + radius * Math.cos(radians), center + radius * Math.sin(radians)] as const;
}

function wedge(inner: number, outer: number, from: number, to: number) {
  return 'M' + point(outer, from).join(' ') + ' A' + outer + ' ' + outer + ' 0 0 1 ' + point(outer, to).join(' ') +
    ' L' + point(inner, to).join(' ') + ' A' + inner + ' ' + inner + ' 0 0 0 ' + point(inner, from).join(' ') + ' Z';
}

/** 月の満ち欠けの形（0 新月 … 180 満月 … 360）。半径 r の円の中で、光っている部分だけの path を返す。 */
function litPath(ph: number, r: number) {
  const k = Math.cos(ph * Math.PI / 180);
  const rx = (r * Math.abs(k)).toFixed(2);
  return 'M0 ' + -r + ' A' + r + ' ' + r + ' 0 0 1 0 ' + r + ' A' + rx + ' ' + r + ' 0 0 ' + (k > 0 ? 0 : 1) + ' 0 ' + -r + ' Z';
}

const cls = (name: string) => ({ className: name }) as object;
const delayed = (ms: number) => ({ style: { animationDelay: ms + 'ms' } }) as object;

/** スクロール連動。近づくにつれて球が現れ、線が描かれ、月が軌道を回って今日の位置へ。輪はスクロール量に合わせて回る。 */
export function SeaGlobe({ context }: { context: SeaContext }) {
  const gradient = 'sea' + useId().replace(/[^a-z0-9]/gi, '');
  const [ref, p, y] = useScrollLink();
  const q = easeOutCubic(clamp01(p / 0.85));
  const points = spokes.map(i => point(i % 2 ? 104 : 86, i * 30));
  // 月は、軌道の上を「月の形」のまま回ってきて、今日の位置に止まる。地球に近いほど内側を通る。
  const moonR = 88 + Math.max(0, Math.min(1, (context.dist - 356400) / (406700 - 356400))) * 16;
  const draw = clamp01(p / 0.8);
  return <View ref={ref as never} accessible accessibilityRole="image" accessibilityLabel={OUTER[context.outer].n + '、海況 ' + STAGES[context.stage].n + '、月齢 ' + context.age.toFixed(1)}
    style={[styles.globe, { opacity: clamp01(p * 2.2), transform: [{ scale: 0.72 + 0.28 * q }, { rotate: (1 - q) * -14 + 'deg' }] }]}>
    <Svg width="100%" height="100%" viewBox="22 22 256 256">
      <Defs>
        <RadialGradient id={gradient} cx="36%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#6388ce" />
          <Stop offset=".55" stopColor="#2e4d97" />
          <Stop offset="1" stopColor="#101e4a" />
        </RadialGradient>
        <RadialGradient id={gradient + 'm'} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#fffbe8" />
          <Stop offset="1" stopColor="#e9d9a2" />
        </RadialGradient>
      </Defs>
      <G {...cls('sg-sphere')}>
        <Circle cx={center} cy={center} r="72" fill={'url(#' + gradient + ')'} stroke="#8096d2" strokeWidth=".55" />
      </G>
      {[38, 57].map(radius => <Circle key={radius} cx={center} cy={center} r={radius} stroke="#afc2ed" strokeOpacity=".16" strokeWidth=".7" strokeDasharray="1.5 3" fill="none" />)}
      <G transform={'rotate(' + y * 0.08 + ' ' + center + ' ' + center + ')'}><Circle cx={center} cy={center} r="116" stroke="#afc2ed" strokeOpacity=".38" strokeWidth=".7" strokeDasharray="1.5 3" fill="none" /></G>
      <G transform={'rotate(' + -y * 0.12 + ' ' + center + ' ' + center + ')'}><Circle cx={center} cy={center} r="123" stroke="#afc2ed" strokeOpacity=".38" strokeWidth=".7" strokeDasharray="1.5 3" fill="none" /></G>
      {[0, 90, 180, 270].map(angle => {
        const [x, y2] = point(123, angle);
        return <Line key={angle} x1={center} y1={center} x2={x} y2={y2} stroke="#aabbe3" strokeWidth=".5" strokeOpacity={.35 * clamp01(p * 2)} />;
      })}
      <Polyline points={[...points, points[0]].map(pt => pt.join(',')).join(' ')} fill="none" stroke="#d2def7" strokeOpacity=".66" strokeWidth=".85" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
      {spokes.map(i => {
        const [x, y2] = point(116, i * 30);
        const [sx, sy] = points[i];
        const here = i === context.outer, stage = i === Math.floor(context.stage / 2);
        return <G key={i}>
          <Circle cx={x} cy={y2} r={here ? 5.2 : 2} fill={here ? C.gold : '#7790bf'} />
          {here && <Circle cx={x} cy={y2} r="8.5" stroke={C.gold} strokeWidth=".8" fill="none" {...cls('sg-ping')} />}
          <Circle cx={sx} cy={sy} r={stage ? 3.8 : 1.7} fill="#e1ebff" />
          {stage && <Circle cx={sx} cy={sy} r="8" stroke="#e1ebff" strokeWidth=".8" fill="none" {...cls('sg-ping')} {...delayed(900)} />}
        </G>;
      })}
      <G {...cls('sg-star')}><Path d="M150 135 L153 147 L165 150 L153 153 L150 165 L147 153 L135 150 L147 147 Z" fill="#e8d29a" /></G>
      <G transform={'rotate(' + -520 * (1 - q) + ' ' + center + ' ' + center + ')'}>
        <G transform={'rotate(' + context.ph + ' ' + center + ' ' + center + ')'}>
          <G transform={'translate(' + center + ' ' + (center - moonR) + ')'}>
            <Circle r="11" fill="#fff6cf" opacity=".16" {...cls('sg-moon-halo')} />
            <Circle r="6.4" fill="#232d52" stroke="#c9d6f5" strokeWidth=".5" strokeOpacity=".7" />
            <G transform={context.ph > 180 ? 'scale(-1 1)' : undefined}><Path d={litPath(context.ph, 6.4)} fill={'url(#' + gradient + 'm)'} /></G>
          </G>
        </G>
      </G>
    </Svg>
  </View>;
}

/** 月齢と距離。スクロールに合わせて数字が増え、戻すと減る。 */
export function MoonFacts({ context }: { context: SeaContext }) {
  const [ref, p] = useScrollLink();
  const t = easeOutCubic(clamp01(p / 0.85));
  const age = (context.age * t).toFixed(1);
  const dist = Math.round(context.dist * (0.6 + 0.4 * t)).toLocaleString('ja-JP');
  return <Text ref={ref as never} style={[S.body, { opacity: clamp01(p * 2.5) }]}>月齢 {age}／地球から約 {dist} km（{context.tide}）</Text>;
}

// 凱風・順風・凪・荒波・轟沈の色。輪に色を載せて、年・月ごとの調子が一目でわかるようにする。
const paper = ['#f4c86a', '#86d9b4', '#93b7f2', '#ef9d76', '#dc6f8e'];
const rimColor = ['#fff0bd', '#c8f3df', '#d4e3ff', '#ffd2b8', '#ffc0d1'];

/** 輪が見えたらアニメーションを始める。見えるまでは輪を隠しておく。 */
function useInView(enabled: boolean) {
  const ref = useRef<unknown>(null);
  const [seen, setSeen] = useState(!enabled);
  useEffect(() => {
    if (!enabled || seen) return;
    const node = ref.current as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setSeen(true); observer.disconnect(); }
    }, { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, seen]);
  return [ref, seen] as const;
}

type RingStyle = { [key: string]: string | number };

export function TideWheel({ context, profile, onMonth, onStage, onYear, animate = true, pastOnly = false }: {
  context: SeaContext; profile: Profile | null; onMonth: (month: number) => void; onYear: (year: number) => void;
  onStage: (stage: number) => void; animate?: boolean; pastOnly?: boolean;
}) {
  // pastOnly：今日より先の年・月は薄く表示して、押せないようにする。
  const now = pastOnly ? ctxFor(jstToday()) : null;
  const futureYear = (entry: number) => !!now && entry > now.solarYear;
  const futureStage = (stage: number) => !!now && (context.solarYear > now.solarYear || (context.solarYear === now.solarYear && stage > now.stage));
  const futureMonth = (m: number) => !!now && (context.Y > now.Y || (context.Y === now.Y && m > now.MO));
  const dim = (off: boolean) => (off ? { opacity: 0.28 } : undefined);
  const cycle = profile && cycleFor(profile.t);
  const year = context.solarYear;
  const block = context.solarMonth;
  const years = spokes.map(i => year + (i <= 5 ? i : i - 12));
  const yearTier = profile && cycle ? cycleTier(yearScoreOf(year, profile.t).score, cycle.years) : null;
  const [ref, seen] = useInView(animate);
  // 一度演出が終わったら固定する（画面を離れて戻ったときに、輪が回り直さないように）。
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!seen) return;
    const timer = setTimeout(() => setDone(true), 4200);
    return () => clearTimeout(timer);
  }, [seen]);
  // 外側 → 中 → 内側の順に、回って所定の位置に落ち着く（delay / dur は秒）。
  const ring = (from: number, delay: number, dur: number): RingStyle => ({ '--from': from + 'deg', '--over': (from < 0 ? 7 : -7) + 'deg', '--delay': delay + 's', '--dur': dur + 's' });
  const lock = (delay: number, dur: number): RingStyle => ({ '--delay': (delay + dur * 0.9) + 's' });

  return <View ref={ref as never} style={styles.wheel}>
    <Svg className="tide-wheel" data-play={!animate || done ? '2' : seen ? '1' : '0'} width="100%" height="100%" viewBox="0 0 300 300">
      <Defs>
        <RadialGradient id="tide-wheel-glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0.55" stopColor="#f4c86a" stopOpacity="0" />
          <Stop offset="0.8" stopColor="#7fa6ff" stopOpacity="0.16" />
          <Stop offset="1" stopColor="#f4c86a" stopOpacity="0.28" />
        </RadialGradient>
      </Defs>
      <Circle cx={center} cy={center} r="148" stroke="#8b7449" strokeWidth=".7" fill="#10172b" />
      <Circle cx={center} cy={center} r="148" fill="url(#tide-wheel-glow)" />
      {/* 落ち着く先の目印（回っている間も見える）。外から、年・月・海況（24）・中央。 */}
      {[112, 146, 101, 111, 46, 100].map(radius => <Circle key={radius} cx={center} cy={center} r={radius} stroke="#c9b27a" strokeOpacity=".22" strokeWidth=".6" fill="none" strokeDasharray="1.5 3" />)}

      <G className="tide-ring" style={ring(-640, 0.1, 2.0)}>
        {years.map((entry, i) => {
          const slot = (context.outer + entry - year + 12) % 12;
          const tier = profile && cycle ? cycleTier(yearScoreOf(entry, profile.t).score, cycle.years) : 2;
          const [x, y] = point(128, i * 30);
          return <G key={entry} onPress={futureYear(entry) ? undefined : () => onYear(entry)} style={dim(futureYear(entry))}>
            <Path d={wedge(112, 146, i * 30 - 14.8, i * 30 + 14.8)} fill={paper[tier]} stroke={i === 0 ? '#fff2c4' : '#1b1a23'} strokeWidth={i === 0 ? 2.4 : .6} />
            <SvgText x={x} y={y - 1} textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#151925">{OUTER[slot].n.replace('の海流', '')}</SvgText>
            <SvgText x={x} y={y + 11} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#151925">{entry}</SvgText>
          </G>;
        })}
      </G>
      <Circle className="tide-lock" cx={center} cy={center} r="146" stroke="#fff2c4" strokeWidth="2" fill="none" style={lock(0.1, 2.0)} />

      {/* 海況は24段階。節月ごとに前半・後半の2つに分けて、名前を輪に沿って並べる。 */}
      <G className="tide-ring" style={ring(520, 1.0, 1.8)}>
        {Array.from({ length: 24 }, (_, stage) => {
          const month = Math.floor(stage / 2);
          const angle = (month * 30 + (stage % 2 ? 7.5 : -7.5) + 360) % 360;
          const tier = profile && cycle ? cycleTier(blockScoreOf(year, month, profile.t).score, cycle.blocks) : 2;
          const [x, y] = point(73, angle);
          const rotate = angle <= 180 ? angle - 90 : angle + 90;
          const name = STAGES[profile ? personalStage(year, stage, profile.t) : stage].n;
          const on = stage === context.stage;
          return <G key={stage} onPress={futureStage(stage) ? undefined : () => onStage(stage)} style={dim(futureStage(stage))}>
            <Path d={wedge(46, 100, angle - 7.4, angle + 7.4)} fill={paper[tier]} fillOpacity={stage % 2 ? 1 : 0.9} stroke={on ? '#fff2c4' : '#181c30'} strokeWidth={on ? 2 : .6} />
            <SvgText x={0} y={0} transform={`translate(${x} ${y + 3.2}) rotate(${rotate})`} textAnchor="middle" fontSize={name.length > 4 ? 8 : 9.2} fontWeight="800" fill="#12151f">{name}</SvgText>
          </G>;
        })}
      </G>
      <Circle className="tide-lock" cx={center} cy={center} r="100" stroke="#bfe9ff" strokeWidth="1.6" fill="none" style={lock(1.0, 1.8)} />

      <G className="tide-ring" style={ring(-400, 1.9, 1.6)}>
        {spokes.map(i => {
          // 月は、その月に始まる節月の隣に置く（立春は2月、立冬は11月）。1月は小寒の隣になる。
          const slot = (i + 11) % 12;
          const [x, y] = point(106, slot * 30);
          const on = context.MO === i + 1;
          return <G key={i} onPress={futureMonth(i + 1) ? undefined : () => onMonth(i + 1)} style={dim(futureMonth(i + 1))}>
            <Path d={wedge(101, 111, slot * 30 - 14.7, slot * 30 + 14.7)} fill={on ? '#ffd98a' : '#2a3150'} stroke={on ? '#fff2c4' : 'none'} strokeWidth=".8" />
            <SvgText x={x} y={y + 3.2} textAnchor="middle" fontSize="9.5" fontWeight={on ? '800' : '600'} fill={on ? '#181a22' : '#f0ead8'}>{i + 1}月</SvgText>
          </G>;
        })}
      </G>
      <Circle className="tide-lock" cx={center} cy={center} r="111" stroke="#ffd98a" strokeWidth="1.6" fill="none" style={lock(1.9, 1.6)} />

      <G className="tide-center">
        <Circle cx={center} cy={center} r="44" fill="#10172b" stroke="#a48a59" strokeWidth=".8" />
        <SvgText x={center} y="127" fill="#dfc38d" textAnchor="middle" fontSize="9.5">{profile ? labelOf(profile.t) : '潮環の輪'}</SvgText>
        <SvgText x={center} y="148" fill="#f8efd9" textAnchor="middle" fontSize="12.5" fontWeight="800">{context.yearPillar}年 · {context.MO}月</SvgText>
        <SvgText x={center} y="164" fill={yearTier === null ? '#e8cc93' : paper[yearTier]} textAnchor="middle" fontSize="8.5" fontWeight="800">{yearTier === null ? OUTER[context.outer].n : '年の運勢 · ' + tiers[yearTier]}</SvgText>
        <SvgText x={center} y="178" fill="#f3dca4" textAnchor="middle" fontSize="9" fontWeight="700">{STAGES[stageFor(context, profile?.t)].n}</SvgText>
      </G>
      <Polygon className="tide-pointer" points="150,10 145,2 155,2" fill="#f5d899" />
    </Svg>
  </View>;
}

/** 見えた瞬間に、左から該当の位置まで一気に伸びる横線。先端が光り、ラベルは伸び切るころに現れる。 */
export function Meter({ title, value, color = C.gold, caption, delay = 0 }: { title: string; value: number; color?: string; caption?: string; delay?: number }) {
  const [ref, seen] = useInView(true);
  const pct = (Math.max(0, Math.min(1, value)) * 100) + '%';
  const ease = `1.4s cubic-bezier(.16, 1, .3, 1) ${delay}ms`;
  const asStyle = (s: object) => s as never;
  return <View ref={ref as never} style={styles.meter}>
    <View style={S.between}>
      <Text style={S.body}>{title}</Text>
      {caption && <Text style={[S.tiny, { color }, asStyle({ opacity: seen ? 1 : 0, transition: `opacity .5s ease-out ${delay + 900}ms` })]}>{caption}</Text>}
    </View>
    <View style={styles.track}>
      <View style={asStyle({ width: seen ? pct : '0%', height: '100%', borderRadius: 2, backgroundColor: color, transition: 'width ' + ease })} />
      <View style={asStyle({ position: 'absolute', top: -3, left: seen ? pct : '0%', width: 10, height: 10, marginLeft: -5, borderRadius: 5, backgroundColor: color, opacity: seen ? 1 : 0,
        boxShadow: `0 0 10px 2px ${color}cc`, transition: 'left ' + ease + ', opacity .3s ease-out ' + delay + 'ms' })} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  globe: { width: '100%', maxWidth: 228, aspectRatio: 1, alignSelf: 'center' },
  wheel: { width: '100%', maxWidth: 560, aspectRatio: 1, alignSelf: 'center' },
  meter: { gap: 4, paddingVertical: 3 },
  track: { height: 4, backgroundColor: '#35415b', borderRadius: 2 },
});

