// 相性タブ。自分と相手を読み合わせて、恋愛・結婚・仕事・友情の相性を出す。
// 相手の選び方は二通りあり、どちらも同じ画面で並んでいる。
//   ・名前と生年月日で選ぶ … 占いと同じ入力。深さの数値・「−」「A」・生まれ年の十二支・生まれた日の月・名前の五行まで使う。
//   ・タイプで選ぶ         … 16タイプから選ぶ。季節と深さの帯だけで読む。
// どちらも、自分の側は占いの結果（名札の数値）をそのまま使う。
import { Premium } from './Premium';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { residentArt } from './art';
import { CompatRitual } from './CompatRitual';
import { PartnerForm } from './PartnerForm';
import { AREAS, DEPTH_NAMES, SEASON_NAMES, compat, levelOf, rankAll, seasonOfResident, sideOfProfile, sideOfType, type Compat as CompatResult, type Side } from './pairing';
import { makeProfile, tierColors, tiers, type Inputs, type Profile } from './domain';
import { periodCompat, type PeriodId, type PeriodReading } from './pairingPeriod';
import type { Person } from './People';
import { labelOf, SEASON } from './scoring';
import { Button, C, Chip, Chips, Heading, S, Section, tapFx } from './ui';
import { Image } from './web/image';
import residents from './residents.json';

const seasonColor = (index: number) => SEASON[(index + 1) % 4].col;
const stars = (count: number) => '★'.repeat(count) + '☆'.repeat(5 - count);
const signed = (value: number) => (value >= 0 ? '+' : '−') + Math.abs(value).toFixed(1);

type Target = { kind: 'type'; index: number } | { kind: 'person'; profile: Profile };
const sideOfTarget = (target: Target): Side => target.kind === 'type' ? sideOfType(target.index) : sideOfProfile(target.profile);

/** 16タイプの選択盤。行が季節、列が深さ。 */
function TypeGrid({ value, own, onPick }: { value: number | null; own?: number | null; onPick: (index: number) => void }) {
  return <View style={styles.grid}>
    <View style={styles.gridHead}>
      <View style={styles.gridSide} />
      {DEPTH_NAMES.map(name => <Text key={name} style={styles.gridDepth}>{name}</Text>)}
    </View>
    {SEASON_NAMES.map((season, s) => <View key={season} style={styles.gridRow}>
      <Text style={[styles.gridSide, { color: seasonColor(s) }]}>{season}</Text>
      {[0, 1, 2, 3].map(d => {
        const index = s * 4 + d;
        const picked = value === index;
        return <Pressable key={index} {...tapFx} accessibilityRole="button" accessibilityLabel={residents[index].band} accessibilityState={{ selected: picked }}
          onPress={() => onPick(index)}
          style={({ pressed }) => [styles.cell, { borderColor: picked ? seasonColor(s) : C.line, backgroundColor: picked ? seasonColor(s) + '26' : C.panel }, pressed && { opacity: .7 }]}>
          <Image source={residentArt[index]} accessible={false} style={styles.cellImg} />
          {own === index && <Text style={styles.cellMark}>自分</Text>}
        </Pressable>;
      })}
    </View>)}
  </View>;
}

function Face({ side, caption }: { side: Side; caption: string }) {
  return <View style={styles.face}>
    <View style={[styles.faceCircle, { borderColor: seasonColor(side.season) }]}>
      <Image source={residentArt[side.index]} accessible={false} style={{ width: '100%', height: '100%' }} />
    </View>
    <Text style={styles.faceBand}>{residents[side.index].band}</Text>
    <Text style={S.tiny}>{caption}</Text>
  </View>;
}

function Bar({ value, color }: { value: number; color: string }) {
  return <View style={styles.barTrack}><View style={[styles.barFill, { width: value + '%', backgroundColor: color }]} /></View>;
}

/** 二人の今日・今月・今年。点数と二人の段階は見せて、読みと内訳は有料にする。 */
function PeriodPanel({ periods, partnerName, onPickPerson }: { periods: PeriodReading[] | null; partnerName: string; onPickPerson: () => void }) {
  const [id, setId] = useState<PeriodId>('day');
  if (!periods) return <View style={[S.card, S.pad]}>
    <Text style={S.kicker}>二人の今日・今月・今年</Text>
    <Text style={S.body}>いまは「タイプ」だけで読んでいるので、今日・今月・今年の相性は出せません。二人それぞれの、その期間の運勢を重ねて読むには、相手の生年月日と名前が要るためです。</Text>
    <Text style={S.tiny}>名前と生年月日を使うと、このほかにも、深さの数値・「−」「A」・生まれ年の十二支・生まれた日の月・名前の五行を入れた、細かい内訳まで読めます。</Text>
    <Button onPress={onPickPerson}>名前と生年月日で読み直す　›</Button>
  </View>;
  const p = periods.find(entry => entry.id === id) ?? periods[0];
  return <View style={[S.card, S.pad]}>
    <Text style={S.kicker}>二人の今日・今月・今年</Text>
    <Chips>{periods.map(entry => <Chip key={entry.id} active={entry.id === p.id} onPress={() => setId(entry.id)}>{entry.label}</Chip>)}</Chips>
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text style={S.tiny}>{p.when}</Text>
      <Text style={[styles.total, { color: C.gold }]}>{p.score}<Text style={styles.totalUnit}> / 100</Text></Text>
      <Text style={[S.h3, { color: C.gold }]}>{stars(p.level.stars)}　{p.level.name}</Text>
      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[['あなた', p.tiers[0]], [partnerName, p.tiers[1]]].map(([who, tier]) => <Text key={String(who)} style={S.tiny}>
          {who}：<Text style={{ color: tierColors[tier as number], fontWeight: '900' }}>{tiers[tier as number]}</Text></Text>)}
      </View>
    </View>
    <Premium id="compatPeriod" lines={9}><View style={S.stack}>
      <Text style={S.body}>{p.text}</Text>
      <Text style={S.kicker}>点数の内訳</Text>
      {p.terms.map(term => <View key={term.label} style={styles.term}>
        <View style={S.between}><Text style={S.h3}>{term.label}</Text><Text style={[S.tiny, { color: C.gold }]}>{term.label === '二人の相性の総合点' ? term.points : signed(term.points)}</Text></View>
        <Text style={S.tiny}>{term.note}</Text>
      </View>)}
    </View></Premium>
  </View>;
}

function PairResult({ result, periods, partnerName, onPickPerson }: { result: CompatResult; periods: PeriodReading[] | null; partnerName: string; onPickPerson: () => void }) {
  const { first, second, a, b } = result;
  return <View style={S.stack}>
    <View style={[S.card, S.pad, { alignItems: 'center', gap: 12 }]}>
      <View style={styles.faces}>
        <Face side={a} caption={a.detail ? a.detail.name + 'さん' : first.subtitle} />
        <Text style={styles.times}>×</Text>
        <Face side={b} caption={b.detail ? b.detail.name + 'さん' : second.subtitle} />
      </View>
      <Text style={S.kicker}>{result.season.relation}</Text>
      <Text accessibilityRole="header" style={[S.h2, { textAlign: 'center' }]}>{result.season.title}</Text>
      <Text style={[styles.total, { color: C.gold }]}>{result.total}<Text style={styles.totalUnit}> / 100</Text></Text>
      <Text style={[S.h3, { color: C.gold }]}>{stars(result.level.stars)}　{result.level.name}</Text>
      <Text style={S.body}>{result.season.essence}</Text>
      {result.sameType && <Text style={S.tiny}>同じタイプ同士です。似ているところと、似すぎて重なるところの両方が出ます。</Text>}
    </View>

    <Premium id="compatDetail" lines={4}><View style={[S.card, S.pad]}>
      <Text style={S.kicker}>深さの組み合わせ　{a.num.toFixed(1)} × {b.num.toFixed(1)}（差 {result.diff.toFixed(1)}）</Text>
      <Text style={S.h3}>{result.depth.title}</Text>
      <Text style={S.body}>{result.depth.text}</Text>
    </View></Premium>

    {result.areas.map(area => <View key={area.id} style={[S.card, S.pad, { borderColor: area.color + '66' }]}>
      <View style={S.between}>
        <Text style={[S.kicker, { color: area.color }]}>{area.glyph}　{area.label}の相性</Text>
        <Text style={[S.tiny, { color: area.color }]}>{area.score}　{area.level.name}</Text>
      </View>
      <Bar value={area.score} color={area.color} />
      <Premium id="compatAreaText" compact lines={3}><Text style={S.body}>{area.text}</Text></Premium>
    </View>)}

    <PeriodPanel periods={periods} partnerName={partnerName} onPickPerson={onPickPerson} />

    <Premium id="compatDetail" lines={16}><View style={S.stack}>

    <View style={[S.card, S.pad]}>
      <Text style={S.kicker}>点数の内訳（基準点に足した点数）</Text>
      <Text style={S.tiny}>基準点は季節の組み合わせから。恋愛 {result.season.base[0]}・結婚 {result.season.base[1]}・仕事 {result.season.base[2]}・友情 {result.season.base[3]}。ここに、下の項目を足しています。</Text>
      {result.terms.map(term => <View key={term.id} style={styles.term}>
        <Text style={S.h3}>{term.label}</Text>
        <Text style={S.body}>{term.note}</Text>
        <Text style={S.tiny}>{AREAS.map(area => area.label + ' ' + signed(term.points[area.id])).join('　／　')}</Text>
      </View>)}
      {!result.detailed && <Text style={S.tiny}>相手を「タイプ」だけで選んだので、深さ（タイプの中央値）以外は入れていません。名前と生年月日で選ぶと、「−」「A」・生まれ年の十二支・生まれた日の月・名前の五行も加わり、同じタイプの相手でも結果が変わります。</Text>}
    </View>

    <View style={[S.card, S.pad]}>
      <Text style={S.kicker}>二人の読み</Text>
      <Text style={S.body}>{first.band}（{first.subtitle}）は、「{first.summary}」人。{second.band}（{second.subtitle}）は、「{second.summary}」人です。</Text>
      <Text style={S.h3}>気をつけたいこと</Text>
      <Text style={S.body}>二人の影が重なると、{first.shadow.replace(/。$/, '')}ことと、{second.shadow.replace(/。$/, '')}ことが同時に起こります。どちらかが気づいたら、責めずに「いま、これが出てるかも」と言葉にしてみてください。</Text>
      <Text style={S.h3}>二人で話してみたい問い</Text>
      <Text style={S.body}>・{first.question}</Text>
      <Text style={S.body}>・{second.question}</Text>
      <Text style={S.h3}>二人の一手</Text>
      <Text style={S.body}>{result.season.tip}</Text>
    </View>
    </View></Premium>
    <Text style={S.tiny}>相性の良し悪しを決めるものではなく、会話のきっかけです。点数が低くても、違いを知っていれば関係は育てられます。</Text>
  </View>;
}

/** 相性は、占いをしたあとにだけ開く。「あなた」は、占いの結果の名札にそのまま対応する。選ぶのは相手だけ。 */
export function Compat({ profile, people, create, today }: { profile: Profile | null; people: Person[]; create: () => void; today: Date }) {
  const [mode, setMode] = useState<'person' | 'type'>('person');
  const [target, setTarget] = useState<Target | null>(null);
  const [ritual, setRitual] = useState<CompatResult | null>(null);   // 儀式の最中の二人
  const [read, setRead] = useState<CompatResult | null>(null);       // 儀式を終えて、結果を出している二人
  const own = profile ? sideOfProfile(profile) : null;

  const begin = (next: Target) => {
    if (!own) return;
    setTarget(next);
    setRead(null);
    setRitual(compat(own, sideOfTarget(next)));
  };
  const finishRitual = () => {
    if (ritual) setRead(ritual);
    setRitual(null);
    // 結果の見出しまで、ゆっくり降りていく。
    setTimeout(() => document.getElementById('pair-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  const choose = (next: Target) => { setTarget(next); setRead(null); };
  const switchMode = (next: 'person' | 'type') => { setMode(next); setTarget(null); setRead(null); };
  const submitPartner = (inputs: Inputs) => begin({ kind: 'person', profile: makeProfile(inputs) });

  const periods = useMemo(() => read && profile && target?.kind === 'person' ? periodCompat(read, profile, target.profile, today) : null, [read, profile, target, today]);
  const ranking = own ? rankAll(own) : [];
  const friends = people.filter(person => person.inputs.name !== profile?.name).map(person => ({ person, profile: makeProfile(person.inputs) }));

  // 占いをする前は、相性は開けない。
  if (!profile || !own) return <View style={S.stack}>
    <Heading tag="COMPATIBILITY" title="二人の相性" body="相性は、あなたの海を占ってからひらけます。占いの結果の名札が、そのまま「あなた」になります。" />
    <View style={[S.card, S.pad, { alignItems: 'center', gap: 12 }]}>
      <Text style={styles.lockMark}>✦</Text>
      <Text style={S.h3}>まず、あなたの海を占いましょう</Text>
      <Text style={[S.body, { textAlign: 'center' }]}>生年月日と下の名前から、あなたの名札が決まります。占いのあとに、ここで相手を選ぶと、二人の相性を読めます。</Text>
      <Button onPress={create}>占ってみる　›</Button>
    </View>
  </View>;

  const typeTarget = target?.kind === 'type' ? target.index : null;
  const friendTarget = target?.kind === 'person' ? target.profile : null;
  return <View style={S.stack}>
    <Heading tag="COMPATIBILITY" title="二人の相性" body="相手は、名前と生年月日でも、16タイプからでも選べます。名前と生年月日で選ぶと、深さの数値や「−」「A」、生まれ年や生まれた日の月まで使って、二人だけの点数を出します。" />

    <View style={[S.card, S.pad, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
      <View style={[styles.faceCircle, { borderColor: seasonColor(own.season) }]}><Image source={residentArt[own.index]} accessible={false} style={{ width: '100%', height: '100%' }} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={S.kicker}>あなたの名札　{labelOf(profile.t)}</Text>
        <Text style={S.h3}>{residents[own.index].band}</Text>
        <Text style={S.tiny}>{residents[own.index].subtitle}　·　深さ {profile.t.num.toFixed(1)}</Text>
      </View>
    </View>

    <View nativeID="partner-pick"><Section title="相手の選び方" note="名前と生年月日で選ぶと、今日・今月・今年の相性と、細かい内訳まで読めます。タイプだけで選ぶと、季節と深さの帯で読みます。" /></View>
    <Chips>
      <Chip active={mode === 'person'} onPress={() => switchMode('person')}>名前と生年月日で選ぶ</Chip>
      <Chip active={mode === 'type'} onPress={() => switchMode('type')}>16タイプから選ぶ</Chip>
    </Chips>

    {mode === 'person' && <View style={S.stack}>
      {!!friends.length && <>
        <Text style={S.tiny}>保存した人から選ぶ</Text>
        <Chips>
          {friends.map(({ person, profile: friend }) => <Chip key={person.id} active={friendTarget?.name === friend.name && friendTarget.Y === friend.Y && friendTarget.M === friend.M && friendTarget.D === friend.D} onPress={() => choose({ kind: 'person', profile: friend })}>{'🙂 ' + person.inputs.name}</Chip>)}
        </Chips>
        {friendTarget && !read && <Button onPress={() => begin({ kind: 'person', profile: friendTarget })}>この二人の相性を読む　✦</Button>}
        <Text style={S.tiny}>または、新しく入力する</Text>
      </>}
      <PartnerForm onSubmit={submitPartner} />
    </View>}

    {mode === 'type' && <View style={S.stack}>
      <Text style={S.tiny}>季節と深さの帯だけで読みます。数値まで使うなら、名前と生年月日で選んでください。</Text>
      <TypeGrid value={typeTarget} own={own.index} onPick={index => choose({ kind: 'type', index })} />
      {typeTarget !== null && !read && <Button onPress={() => begin({ kind: 'type', index: typeTarget })}>この二人の相性を読む　✦</Button>}
      {typeTarget === null && <Text style={S.tiny}>相手のタイプを選ぶと、読みをひらけます。</Text>}
    </View>}

    {read && <View nativeID="pair-result"><PairResult result={read} periods={periods} partnerName={target?.kind === 'person' ? target.profile.name + 'さん' : ''}
      onPickPerson={() => { switchMode('person'); setTimeout(() => document.getElementById('partner-pick')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); }} /></View>}
    {ritual && <CompatRitual result={ritual} onDone={finishRitual} />}

    {read && <View style={S.stack}>
      <Section title={residents[own.index].band + 'から見た、全タイプとの相性'} note="あなたの名札の数値と、各タイプの深さの帯で読んだ総合点の高い順。タップすると、その相手との読みが開きます。" />
      <View style={[S.card, { padding: 6 }]}>
        {ranking.map(({ index, total }, rank) => <Pressable key={index} {...tapFx} accessibilityRole="button" onPress={() => { setMode('type'); begin({ kind: 'type', index }); }}
          style={({ pressed }) => [styles.rankRow, typeTarget === index && { backgroundColor: seasonColor(seasonOfResident(index)) + '1f' }, pressed && { opacity: .7 }]}>
          <Text style={styles.rankNo}>{rank + 1}</Text>
          <View style={[styles.rankImg, { borderColor: seasonColor(seasonOfResident(index)) }]}><Image source={residentArt[index]} accessible={false} style={{ width: '100%', height: '100%' }} /></View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.rankBand} numberOfLines={1}>{residents[index].band}</Text>
            <Bar value={total} color={seasonColor(seasonOfResident(index))} />
          </View>
          <View style={{ alignItems: 'flex-end', minWidth: 64 }}>
            <Text style={styles.rankScore}>{total}</Text>
            <Text style={S.tiny}>{levelOf(total).name}</Text>
          </View>
        </Pressable>)}
      </View>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  grid: { gap: 6 },
  gridHead: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  gridRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  gridSide: { width: 26, textAlign: 'center', fontSize: 15, fontWeight: '900', color: C.muted },
  gridDepth: { flex: 1, textAlign: 'center', color: C.muted, fontSize: 12, fontWeight: '700' },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 14, borderWidth: 1.5, overflow: 'hidden', padding: 3 },
  cellImg: { width: '100%', height: '100%' } as never,
  cellMark: { position: 'absolute', right: 2, bottom: 1, fontSize: 10, fontWeight: '900', color: C.gold },
  faces: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  face: { alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  faceCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, overflow: 'hidden', backgroundColor: '#e9eef9' },
  faceBand: { color: C.ink, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  times: { color: C.gold, fontSize: 26, fontWeight: '900' },
  total: { fontSize: 52, lineHeight: 60, fontWeight: '900' },
  totalUnit: { fontSize: 16, color: C.muted, fontWeight: '700' },
  lockMark: { color: C.gold, fontSize: 34, lineHeight: 40 },
  term: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, gap: 3 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.08)', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14 },
  rankNo: { width: 20, textAlign: 'center', color: C.muted, fontSize: 14, fontWeight: '800' },
  rankImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, overflow: 'hidden', backgroundColor: '#e9eef9' },
  rankBand: { color: C.ink, fontSize: 15, fontWeight: '800' },
  rankScore: { color: C.ink, fontSize: 20, fontWeight: '900' },
});
