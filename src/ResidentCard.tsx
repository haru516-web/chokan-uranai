import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { gods } from './art';
import { readDay, type Profile } from './domain';
import { DailyRank } from './DailyRank';
import { labelOf, SEASON } from './scoring';
import { TideWheel } from './TideCharts';
import { Button, C, Card, Chip, Chips, S } from './ui';
import { headwind, ownResident, residents, vortex } from './voyage';

type Entry = typeof residents[number];

function SymbolLines({ entry, minus, hasVortex }: { entry: Entry; minus?: boolean; hasVortex?: boolean }) {
  const index = Number(entry.id) - 1;
  const season = SEASON[(Math.floor(index / 4) + 1) % 4];
  const layers = index % 4 + 1;
  return <G fill="none" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={40} cy={40} r={38} stroke={C.line} strokeWidth={1} />
    {hasVortex && <Path d="M5 53C-7 17 50-12 73 19c17 23-9 47-30 43" stroke={C.aqua} strokeWidth={1.4} />}
    <Circle cx={40} cy={23} r={4} fill={season.col} />
    {Array.from({ length: layers }, (_, layer) => <Path key={layer} d="M17 0Q28 -7 40 0T63 0"
      transform={`translate(0 ${34 + layer * 8})`} stroke={season.col} strokeWidth={2.4} />)}
    {minus && <Path d="M9 65h23" stroke={C.aqua} strokeWidth={2.4} />}
  </G>;
}

export function ResidentSymbol({ entry, size = 76, profile }: { entry: Entry; size?: number; profile?: Profile }) {
  return <Svg width={size} height={size} viewBox="0 0 80 80" accessible={false}>
    <SymbolLines entry={entry} minus={profile?.t.minus} hasVortex={profile?.t.A} />
  </Svg>;
}

export function TideMarks({ profile }: { profile: Profile }) {
  return <>{profile.t.minus && <><Text style={S.h3}>−　向かい風の印</Text><Text style={S.body}>{headwind}</Text></>}
    {profile.t.A && <><Text style={S.h3}>A　渦の印</Text><Text style={S.body}>{vortex}</Text></>}</>;
}

export function TideCard({ profile, today, showRanks, showCalendar }: {
  profile: Profile; today: Date; showRanks: () => void;
  showCalendar: (date: Date, mode: 'current' | 'stage') => void;
}) {
  const entry = ownResident(profile);
  const season = profile.t.mod;
  const reading = readDay(today, profile);
  const { context } = reading;
  return <View style={[S.card, S.pad, styles.crest]}>
    <Text style={S.kicker}>MY TIDE CARD</Text>
    <Text style={[S.title, styles.center]} accessibilityRole="header">{entry.band}</Text>
    <Text style={[S.body, styles.center]}>{entry.subtitle}</Text>
    <View style={styles.resultRow}>
      <Image source={gods[season]} style={styles.god} contentFit="contain" accessibilityLabel={SEASON[season].n + 'の神'} accessible />
      <View style={styles.rank}><DailyRank reading={reading} onPress={showRanks} /></View>
    </View>
    <View style={styles.flow}>
      <Text style={[S.h2, styles.center]} accessibilityRole="header">運勢の流れ</Text>
      <Text style={[S.tiny, styles.center]}>外側は12年の海流、内側は月と4か月ごとの海況です。</Text>
      <TideWheel context={context} profile={profile}
        onYear={year => showCalendar(new Date(Date.UTC(year, context.MO - 1, 1)), 'current')}
        onMonth={month => showCalendar(new Date(Date.UTC(context.Y, month - 1, 1)), 'stage')} />
      <Button quiet onPress={() => showCalendar(today, 'current')}>運勢の流れを詳しく見る</Button>
    </View>
    <Text style={[S.h3, styles.center]}>{entry.hook}</Text>
    <Text style={[S.tiny, styles.center]}>正確な名札　{labelOf(profile.t)}</Text>
    {(profile.t.minus || profile.t.A) && <Chips>
      {profile.t.minus && <Chip>− 向かい風</Chip>}
      {profile.t.A && <Chip>A 渦</Chip>}
    </Chips>}
  </View>;
}

export function ShareTideCard({ profile }: { profile: Profile }) {
  const entry = ownResident(profile);
  const svg = useRef<Svg>(null);
  const { width } = useWindowDimensions();
  const previewWidth = Math.max(1, Math.min(width - 70, 420));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const hookLines = entry.hook.match(/.{1,20}/gu) ?? [];

  async function share() {
    if (!svg.current || busy) return;
    setBusy(true);
    setStatus('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const data = await new Promise<string>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Image export timed out')), 5000);
        svg.current?.toDataURL(resolve);
      });
      if (!data) throw new Error('Empty image');
      const url = 'data:image/png;base64,' + data;
      if (Platform.OS === 'ios') {
        await Share.share({ url });
      } else if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = url;
        link.download = '潮環占い-潮札.png';
        link.click();
        setStatus('潮札のPNGダウンロードを開始しました。');
      }
    } catch {
      setStatus('画像を作成できませんでした。もう一度お試しください。');
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  return <Card>
    <Text style={S.h2}>私の潮札を画像で共有</Text>
    <Text style={S.body}>共有する画像に入るのは、ここに表示された内容だけです。</Text>
    <View style={{ alignItems: 'center' }}>
      <Svg ref={svg} width={previewWidth} height={previewWidth * 460 / 420} viewBox="0 0 420 460"
        accessibilityLabel={`${entry.band}、${entry.subtitle}。 ${entry.hook}`} accessible>
        <Rect width={420} height={460} rx={22} fill={C.base} />
        <Rect x={15} y={15} width={390} height={430} rx={16} stroke={C.gold} fill="none" />
        <SvgText x={210} y={107} fill={C.ink} fontSize={42} fontWeight="bold" textAnchor="middle">{entry.band}</SvgText>
        <SvgText x={210} y={144} fill={C.gold} fontSize={18} textAnchor="middle">{entry.subtitle}</SvgText>
        <Path d="M16 224Q113 171 209 227T404 221M16 240Q113 187 209 243T404 237" stroke={C.line} fill="none" />
        <G transform="translate(158 172) scale(1.3)"><SymbolLines entry={entry} /></G>
        {hookLines.map((line, i) => <SvgText key={i} x={210} y={318 + 23 * i} fill={C.ink} fontSize={15} textAnchor="middle">{line}</SvgText>)}
        <SvgText x={383} y={418} fill={C.aqua} fontSize={14} textAnchor="end">潮環占い</SvgText>
      </Svg>
    </View>
    <Button disabled={busy} onPress={() => { void share(); }}>
      {busy ? '画像を用意しています…' : Platform.OS === 'web' ? '潮札のPNGを保存' : '潮札の画像を共有'}
    </Button>
    {!!status && <Text style={S.body} accessibilityLiveRegion="polite">{status}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  crest: { alignItems: 'center', paddingVertical: 25, borderColor: '#746344', backgroundColor: '#18243b' },
  center: { textAlign: 'center' },
  resultRow: { ...S.row, width: '100%', maxWidth: 355, marginVertical: 6 },
  god: { width: '43%', maxWidth: 150, aspectRatio: 1 },
  rank: { flex: 1, minWidth: 0 },
  flow: { width: '100%', maxWidth: 420, gap: 8, marginTop: 6, marginBottom: 12 },
});
