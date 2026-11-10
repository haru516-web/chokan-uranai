import { Text } from 'react-native';
import { content, type Profile } from './domain';
import readingText from './reading-text.json';
import { TideMarks } from './ResidentCard';
import { labelOf, SEASON, STAGES } from './scoring';
import { Meter } from './TideCharts';
import { Card, Chip, Chips, S, Section } from './ui';
import { ownResident, residents } from './voyage';

const seasonOrder = [1, 2, 3, 0];

export function BornSea({ profile }: { profile: Profile }) {
  const resident = ownResident(profile);
  const { t } = profile;
  return <Card>
    <Text accessibilityRole="header" style={S.kicker}>生まれ持った海</Text>
    <Text style={S.h2}>{resident.hook}</Text>
    <Text style={S.body}>{resident.inner}</Text>
    <Text style={S.tiny}>あなたの名札　{labelOf(t)}</Text>
    {(t.minus || t.A) && <Chips>
      {t.minus && <Chip>− 向かい風</Chip>}
      {t.A && <Chip>A 渦</Chip>}
    </Chips>}
  </Card>;
}

export function TypeTraits({ entry }: { entry: typeof residents[number] }) {
  const traits = [
    ['人間関係', entry.relation],
    ['長所が裏返る瞬間', entry.shadow],
    ['ひとつの問い', entry.question],
    ['試せること', entry.action],
  ];
  return <>{traits.map(([title, text]) => <Card key={title}><Text style={S.h3}>{title}</Text><Text style={S.body}>{text}</Text></Card>)}</>;
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
      <Text style={S.body}>拠点の海況は「{STAGES[season.home].n}」。{season.moon}に力が出やすく、正反対の季節は「{SEASON[(t.mod + 2) % 4].n}」です。</Text>
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
