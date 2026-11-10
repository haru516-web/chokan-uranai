import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Polygon, Polyline, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { cycleFor, cycleTier, tiers, type Profile } from './domain';
import { blockScoreOf, labelOf, OUTER, STAGES, yearScoreOf, type SeaContext } from './scoring';
import { C, S } from './ui';

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

export function SeaGlobe({ context }: { context: SeaContext }) {
  const gradient = 'sea' + useId().replace(/[^a-z0-9]/gi, '');
  const points = spokes.map(i => point(i % 2 ? 104 : 86, i * 30));
  return <View accessible accessibilityRole="image" accessibilityLabel={OUTER[context.outer].n + '、海況 ' + STAGES[context.stage].n} style={styles.globe}>
    <Svg width="100%" height="100%" viewBox="22 22 256 256">
      <Defs><RadialGradient id={gradient} cx="36%" cy="30%" r="75%">
        <Stop offset="0" stopColor="#6388ce" />
        <Stop offset=".55" stopColor="#2e4d97" />
        <Stop offset="1" stopColor="#101e4a" />
      </RadialGradient></Defs>
      <Circle cx={center} cy={center} r="72" fill={'url(#' + gradient + ')'} stroke="#8096d2" strokeWidth=".55" />
      {[38, 57, 116, 123].map(radius => <Circle key={radius} cx={center} cy={center} r={radius} stroke="#afc2ed" strokeOpacity={radius > 100 ? .38 : .16} strokeWidth=".7" strokeDasharray="1.5 3" fill="none" />)}
      {[0, 90, 180, 270].map(angle => {
        const [x, y] = point(123, angle);
        return <Line key={angle} x1={center} y1={center} x2={x} y2={y} stroke="#aabbe3" strokeWidth=".5" strokeOpacity=".35" />;
      })}
      <Polyline points={[...points, points[0]].map(p => p.join(',')).join(' ')} fill="none" stroke="#d2def7" strokeOpacity=".66" strokeWidth=".85" />
      {spokes.map(i => {
        const [x, y] = point(116, i * 30);
        const [sx, sy] = points[i];
        return <G key={i}>
          <Circle cx={x} cy={y} r={i === context.outer ? 5.2 : 2} fill={i === context.outer ? C.gold : '#7790bf'} />
          {i === context.outer && <Circle cx={x} cy={y} r="8.5" stroke={C.gold} strokeWidth=".8" fill="none" />}
          <Circle cx={sx} cy={sy} r={i === context.stage ? 3.8 : 1.7} fill="#e1ebff" />
          {i === context.stage && <Circle cx={sx} cy={sy} r="8" stroke="#e1ebff" strokeWidth=".8" fill="none" />}
        </G>;
      })}
      <Path d="M150 135 L153 147 L165 150 L153 153 L150 165 L147 153 L135 150 L147 147 Z" fill="#e8d29a" />
    </Svg>
  </View>;
}

const paper = ['#f0db9f', '#d8d5ae', '#b8bec7', '#827367', '#59475b'];

export function TideWheel({ context, profile, onMonth, onYear }: {
  context: SeaContext; profile: Profile | null; onMonth: (month: number) => void; onYear: (year: number) => void;
}) {
  const cycle = profile && cycleFor(profile.t);
  const year = context.Y;
  const block = Math.floor((context.MO - 1) / 4);
  const years = spokes.map(i => year + (i <= 5 ? i : i - 12));
  const yearTier = profile && cycle ? cycleTier(yearScoreOf(year, profile.t).score, cycle.years) : null;

  return <View style={styles.wheel}>
    <Svg width="100%" height="100%" viewBox="0 0 300 300">
      <Circle cx={center} cy={center} r="148" stroke="#8b7449" strokeWidth=".7" fill="#10172b" />
      {years.map((entry, i) => {
        const slot = (context.outer + entry - year + 12) % 12;
        const tier = profile && cycle ? cycleTier(yearScoreOf(entry, profile.t).score, cycle.years) : 2;
        const [x, y] = point(124, i * 30);
        return <G key={entry} onPress={() => onYear(entry)}>
          <Path d={wedge(108, 145, i * 30 - 14.8, i * 30 + 14.8)} fill={paper[tier]} stroke={i === 0 ? '#fbe2a4' : '#1b1a23'} strokeWidth={i === 0 ? 2 : .6} />
          <SvgText x={x} y={y} textAnchor="middle" fontSize="11.5" fontWeight="700" fill={tier < 3 ? '#151925' : '#fff4dc'}>{OUTER[slot].n.replace('の海流', '')}</SvgText>
          <SvgText x={x} y={y + 12} textAnchor="middle" fontSize="8" fill={tier < 3 ? '#151925' : '#fff4dc'}>{entry}</SvgText>
        </G>;
      })}
      {[0, 1, 2].map(i => {
        const stage = (context.stage - block + i + 12) % 12;
        const tier = profile && cycle ? cycleTier(blockScoreOf(year, i, profile.t).score, cycle.blocks) : 2;
        const [x, y] = point(77, i * 120 + 45);
        return <G key={i} onPress={() => onMonth(i * 4 + 1)}>
          <Path d={wedge(61, 91, i * 120 - 14.7, i * 120 + 104.7)} fill={paper[tier]} stroke={i === block ? C.gold : '#181c30'} strokeWidth={i === block ? 1.5 : .6} />
          <SvgText x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={tier < 3 ? '#161827' : '#fff4dc'}>{STAGES[stage].n}</SvgText>
        </G>;
      })}
      {spokes.map(i => {
        const [x, y] = point(99, i * 30);
        return <G key={i} onPress={() => onMonth(i + 1)}>
          <Path d={wedge(92, 105, i * 30 - 14.7, i * 30 + 14.7)} fill={context.MO === i + 1 ? '#eac98b' : '#272c42'} />
          <SvgText x={x} y={y + 3} textAnchor="middle" fontSize="9" fill={context.MO === i + 1 ? '#181a22' : '#e0dbc9'}>{i + 1}月</SvgText>
        </G>;
      })}
      <Circle cx={center} cy={center} r="57" fill="#10172b" stroke="#a48a59" strokeWidth=".7" />
      <Circle cx={center} cy={center} r="52" fill="none" stroke="#594b39" strokeWidth=".6" />
      <Polygon points="150,10 145,2 155,2" fill="#f5d899" />
      <SvgText x={center} y="128" fill="#dfc38d" textAnchor="middle" fontSize="10">{profile ? labelOf(profile.t) : '潮環の輪'}</SvgText>
      <SvgText x={center} y="151" fill="#f8efd9" textAnchor="middle" fontSize="16" fontWeight="700">{year}年{context.MO}月</SvgText>
      <SvgText x={center} y="171" fill="#e8cc93" textAnchor="middle" fontSize="10">{yearTier === null ? OUTER[context.outer].n : '年の運勢 · ' + tiers[yearTier]}</SvgText>
    </Svg>
  </View>;
}

export function Meter({ title, value, color = C.gold, caption }: { title: string; value: number; color?: string; caption?: string }) {
  return <View style={styles.meter}>
    <View style={S.between}><Text style={S.body}>{title}</Text>{caption && <Text style={[S.tiny, { color }]}>{caption}</Text>}</View>
    <View style={styles.track}><View style={{ width: (Math.max(0, Math.min(1, value)) * 100) + '%', height: '100%', backgroundColor: color }} /></View>
  </View>;
}

const styles = StyleSheet.create({
  globe: { width: '100%', maxWidth: 228, aspectRatio: 1, alignSelf: 'center' },
  wheel: { width: '100%', maxWidth: 490, aspectRatio: 1, alignSelf: 'center' },
  meter: { gap: 4, paddingVertical: 3 },
  track: { height: 4, backgroundColor: '#35415b', borderRadius: 2, overflow: 'hidden' },
});
