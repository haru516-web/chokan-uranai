import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { iconArt } from './art';
import { Image } from './web/image';
import typeFortunes from './typeFortunes.json';
import { content, type Profile } from './domain';
import readingText from './reading-text.json';
import { TideMarks, TypeBadges } from './ResidentCard';
import { labelOf, SEASON, STAGES } from './scoring';
import { useInView } from './FortuneDetail';
import { Meter } from './TideCharts';
import { Card, S, Section, ui } from './ui';
import { fx } from './Visual';
import { residents } from './voyage';

const seasonOrder = [1, 2, 3, 0];

/** 画面に入った瞬間に、ポンと弾んで現れる枠（今日の「4つの運」の枠と同じ動き）。 */
function Pop({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <View ref={ref as never} {...(seen ? fx('pop') : {})}
    style={(seen ? { animationDelay: delay + 'ms' } : { opacity: 0 }) as unknown as ViewStyle}>{children}</View>;
}

const AREAS = [
  { id: 'love', label: '恋愛運', color: '#f0a8c0', glyph: '♡' },
  { id: 'marriage', label: '結婚運', color: '#c9b6ef', glyph: '❖' },
  { id: 'money', label: '金運', color: '#b6dfc4', glyph: '◎' },
  { id: 'work', label: '仕事運', color: '#eacc8c', glyph: '⚓' },
] as const;

/** タイプ別の恋愛運・結婚運・金運・仕事運。タイプ（住人）ごとに固定の読み。 */
export function TypeFortunes({ entry }: { entry: typeof residents[number] }) {
  const data = (typeFortunes as Record<string, Record<string, string[]>>)[entry.id];
  if (!data) return null;
  return <>
    <Text accessibilityRole="header" style={S.kicker}>{entry.band}の、運のかたち</Text>
    {AREAS.map((area, index) => {
      const [head, text, tip] = data[area.id];
      const icon = (iconArt as Record<string, string | undefined>)[area.id];
      return <Pop key={area.id} delay={index * 60}><View style={[S.card, S.pad, { borderColor: area.color + '66' }]}>
        <View style={styles.head}>
          <View {...ui('icon-frame')} style={[styles.icon, { backgroundColor: area.color + '26', borderColor: area.color + '88' }]}>
            {icon ? <Image source={icon} style={{ width: 28, height: 28 }} contentFit="contain" accessible={false} /> : <Text style={{ color: area.color, fontSize: 18, fontWeight: '900' }}>{area.glyph}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[S.kicker, { color: area.color }]}>{area.label}</Text>
            <Text style={S.h3}>{head}</Text>
          </View>
        </View>
        <Text style={S.body}>{text}</Text>
        <Text style={[S.tiny, { color: area.color }]}>ひとこと　{tip}</Text>
      </View></Pop>;
    })}
  </>;
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

export function TypeTraits({ entry }: { entry: typeof residents[number] }) {
  const traits = [
    ['人間関係', entry.relation],
    ['長所が裏返る瞬間', entry.shadow],
    ['ひとつの問い', entry.question],
    ['試せること', entry.action],
  ];
  return <>{traits.map(([title, text], index) => <Pop key={title} delay={index * 60}><Card><Text style={S.h3}>{title}</Text><Text style={S.body}>{text}</Text></Card></Pop>)}</>;
}

export function NameReadingDetails({ profile }: { profile: Profile }) {
  const { t, Y, M, D, name, total, pc, mc, z, o } = profile;
  const season = SEASON[t.mod];
  const nature = readingText.SEASON_INFO[t.mod];
  const bandIndex = t.num <= 2 ? 0 : t.num <= 3.5 ? 1 : 2;
  const band = readingText.BAND[bandIndex];
  const depth = content.depths[t.ni];
  const spread = (t.num - 3.25) / 2.25;
  const strengths = [1 - 0.1 * Math.abs(spread), .55 + .2 * spread, .3, .55 - .2 * spread];
  return <>
    <Section title="占いタイプと名札の決まり方" note="「冬の深海」などのタイプ名は季節と深さの組み合わせです。名札には、深さの数値と「−」「A」の有無も表れます。" />
    <Card>
      <Text style={S.kicker}>壱　季節</Text>
      <Text style={S.h2}>{season.n}の海 · {nature.act}</Text>
      <Text style={S.body}>{nature.what}。得意なのは{nature.good}。気をつけたいのは{nature.care}です。</Text>
      <Text style={S.body}>あなたの海の時計は、{season.n}の拠点で頂点の「{STAGES[8].n}」を迎え、毎年少しずつ前倒しで進みます。{season.moon}に力が出やすく、正反対の季節は「{SEASON[(t.mod + 2) % 4].n}」です。</Text>
      <Text style={S.tiny}>生年月日　（{Y}＋{M}＋{D}）÷ 4 の余り {t.mod}</Text>
    </Card>
    <Card>
      <Text style={S.kicker}>弐　深さ</Text>
      <Text style={S.h2}>{t.num.toFixed(1)} · {band.n}の帯</Text>
      <Text style={S.body}>{band.t}</Text>
      <Text style={S.body}>{depth[1]}。{depth[2]}で力を出しやすく、{depth[3]}では余白を残しておきましょう。</Text>
      <Meter title="季節の中での深さ" value={(t.num - 1) / 4.5} caption={t.num.toFixed(1)} />
      <Text style={S.tiny}>「{name}」の総画数 {total}画から判定</Text>
    </Card>
    <Card>
      <Text style={S.kicker}>参　向かい風と渦</Text>
      <Text style={S.h2}>{labelOf(t)}</Text>
      <TypeBadges profile={profile} />
      <TideMarks profile={profile} />
      {t.minus && <Text style={S.body}>占術上は向かい風がかかり、暖流・寒流との相性が同じ季節の標準の名札と逆に働きます。</Text>}
      {t.A && <Text style={S.body}>占術上は月の距離に呼応し、個人の読みの振れ幅が大きくなります。</Text>}
      <Text style={S.tiny}>生年月日の桁　プラス {pc}・マイナス {mc}（同数かつ1以上で「−」）</Text>
      <Text style={S.tiny}>生年月日と名前の画数を二進数で数えると、0が{z}個・1が{o}個（同数で「A」）</Text>
    </Card>
    <Card>
      <Text style={S.kicker}>四季の力</Text>
      <Text style={S.h2}>あなたの四つの力</Text>
      <Text style={S.body}>誰もが四つの力を持っています。季節はどの力を使いやすいか、深さは隣り合う季節の力にどれほど近いかを表します。</Text>
      {seasonOrder.map(mod => <Meter key={mod} title={SEASON[mod].act + '力'}
        color={SEASON[mod].col} value={strengths[(mod - t.mod + 4) % 4]} />)}
    </Card>
  </>;
}
