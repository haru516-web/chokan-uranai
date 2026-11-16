import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, SvgImage, Text as SvgText, type Svg as SvgHandle } from './web/svg';
import { godArt, residentArt } from './art';
import { dateLabel, type readDay, type Profile } from './domain';
import { DailyRank } from './DailyRank';
import { GodAnimation } from './GodAnimation';
import { labelOf, OUTER, SEASON, solarMonthStartDate, solarStageStartDate, STAGES, stageFor } from './scoring';
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

export function TypeBadges({ profile }: { profile: Profile }) {
  return <Chips>
    <Chip>{profile.t.minus ? '− マイナスあり' : '− マイナスなし'}</Chip>
    <Chip>{profile.t.A ? 'A 渦あり' : 'A 渦なし'}</Chip>
  </Chips>;
}

export function TideSummary({ profile, reading, isToday = true, children }: {
  profile: Profile; reading: ReturnType<typeof readDay>;
  isToday?: boolean; children?: ReactNode;
}) {
  const entry = ownResident(profile);
  const season = profile.t.mod;
  const { context } = reading;
  return <View style={[S.card, S.pad, styles.crest]}>
    <Text style={S.kicker}>あなたの名札</Text>
    <Text style={[S.title, styles.center]} accessibilityRole="header">{labelOf(profile.t)}</Text>
    <Text style={[S.h3, styles.center]}>タイプ名　{entry.band}</Text>
    <Text style={[S.body, styles.center]}>{entry.subtitle}</Text>
    <TypeBadges profile={profile} />
    <Text style={[S.tiny, styles.center]}>{dateLabel(context)}</Text>
    <View style={styles.resultRow}>
      <GodAnimation index={season} style={styles.god} label={SEASON[season].n + 'の神'} />
      <View style={styles.rank}><DailyRank reading={reading} isToday={isToday} /></View>
    </View>
    <Text style={[S.tiny, styles.center]}>{context.yearPillar}　／　{OUTER[context.outer].n}　·　{STAGES[stageFor(context, profile.t)].n}　／　{context.moon}</Text>
    {children}
  </View>;
}

export function TideFlow({ profile, context, showCalendar }: {
  profile: Profile; context: ReturnType<typeof readDay>['context'];
  showCalendar: (date: Date, mode: 'current' | 'stage') => void;
}) {
  return <Card>
    <View style={styles.flow}>
      <Text style={[S.h2, styles.center]} accessibilityRole="header">運勢の流れ</Text>
      <Text style={[S.tiny, styles.center]}>外側は十二支で巡る年の海流、内側は月と、約半月ごとの海況です。</Text>
      <TideWheel pastOnly context={context} profile={profile}
        onYear={year => showCalendar(solarMonthStartDate(year, context.solarMonth), 'current')}
        onStage={stage => showCalendar(solarStageStartDate(context.solarYear, stage), 'stage')}
        onMonth={month => showCalendar(new Date(Date.UTC(context.Y, month - 1, 1)), 'stage')} />
    </View>
  </Card>;
}

const godNames = ['冬凪', '春霞', '夏照', '秋津'];

/** 共有画像に埋め込めるよう、画像を data URI にして読み込む（書き出し時は外部の画像を読めないため）。 */
function useDataUri(url: string | undefined) {
  const [uri, setUri] = useState<string>();
  useEffect(() => {
    if (!url) return;
    let live = true;
    fetch(url).then(response => response.blob()).then(blob => new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(blob);
    })).then(data => { if (live) setUri(data); }).catch(() => {});
    return () => { live = false; };
  }, [url]);
  return uri;
}

const stars = [[70, 120, 2], [118, 60, 1.6], [520, 96, 2.2], [545, 170, 1.4], [60, 250, 1.4], [548, 300, 1.8], [84, 700, 1.6], [530, 640, 2], [300, 52, 1.5], [460, 40, 1.3], [150, 168, 1.2]];

export function ShareTideCard({ profile }: { profile: Profile }) {
  const entry = ownResident(profile);
  const svg = useRef<SvgHandle>(null);
  const { width } = useWindowDimensions();
  const previewWidth = Math.max(1, Math.min(width - 70, 420));
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const mod = profile.t.mod;
  const season = SEASON[mod];
  const accent = season.col;
  const godUri = useDataUri(godArt[mod]);
  const residentUri = useDataUri(residentArt[Number(entry.id) - 1]);
  const ready = !!godUri && !!residentUri;
  // 「あり」の印だけ載せる（なしは表示しない）。
  const marks = [profile.t.minus && '− 向かい風の印', profile.t.A && 'A 渦の印'].filter(Boolean).join('　·　');
  const hookLines = (entry.hook.match(/.{1,22}/gu) ?? []).slice(0, 3);

  async function share() {
    if (!svg.current || busy || !ready) return;
    setBusy(true);
    setStatus('');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const data = await new Promise<string>((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Image export timed out')), 8000);
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
    <Text style={S.body}>あなたの季節の神様と、タイプのキャラクターが入ります。共有する画像に入るのは、ここに表示された内容だけです。</Text>
    <View style={{ alignItems: 'center' }}>
      <Svg ref={svg} width={previewWidth} height={previewWidth * 960 / 600} viewBox="0 0 600 960"
        accessibilityLabel={`${labelOf(profile.t)}、タイプ名 ${entry.band}、${entry.subtitle}。${godNames[mod]}の加護。${marks ? marks + '。' : ''}${entry.hook}`} accessible>
        <Defs>
          <LinearGradient id="tide-bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0b1226" />
            <Stop offset="0.55" stopColor="#14203a" />
            <Stop offset="1" stopColor="#0d1830" />
          </LinearGradient>
          <RadialGradient id="tide-glow" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={accent} stopOpacity="0.55" />
            <Stop offset="0.6" stopColor={accent} stopOpacity="0.16" />
            <Stop offset="1" stopColor={accent} stopOpacity="0" />
          </RadialGradient>
          <ClipPath id="tide-clip"><Circle cx={300} cy={338} r={176} /></ClipPath>
        </Defs>
        <Rect width={600} height={960} rx={30} fill="url(#tide-bg)" />
        <Circle cx={300} cy={338} r={270} fill="url(#tide-glow)" />
        {stars.map(([x, y, r], i) => <Circle key={i} cx={x} cy={y} r={r} fill="#fff4d6" opacity={0.75} />)}
        <Rect x={20} y={20} width={560} height={920} rx={24} stroke={C.gold} strokeWidth={2.5} fill="none" />
        <Rect x={32} y={32} width={536} height={896} rx={18} stroke={C.gold} strokeOpacity={0.35} fill="none" />

        <SvgText x={300} y={92} fill={C.gold} fontSize={20} fontWeight="bold" textAnchor="middle" letterSpacing={6}>潮環占い</SvgText>
        <SvgText x={300} y={118} fill={C.muted} fontSize={13} textAnchor="middle" letterSpacing={3}>私の 潮札</SvgText>

        <Circle cx={300} cy={338} r={198} stroke={accent} strokeOpacity={0.55} strokeWidth={1.5} fill="none" />
        <Circle cx={300} cy={338} r={186} stroke={C.gold} strokeWidth={3.5} fill="#0d1324" />
        {residentUri && <SvgImage href={residentUri} x={124} y={162} width={352} height={352} clipPath="url(#tide-clip)" preserveAspectRatio="xMidYMid slice" />}

        <Circle cx={130} cy={502} r={84} fill="#0d1324" fillOpacity={0.92} stroke={accent} strokeWidth={3} />
        <Circle cx={130} cy={502} r={76} fill={accent} fillOpacity={0.14} />
        {godUri && <SvgImage href={godUri} x={48} y={420} width={164} height={164} preserveAspectRatio="xMidYMid meet" />}
        <Rect x={64} y={574} width={132} height={32} rx={16} fill="#0d1324" stroke={accent} strokeWidth={1.5} />
        <SvgText x={130} y={596} fill={accent} fontSize={15} fontWeight="bold" textAnchor="middle">{`${season.n}の神　${godNames[mod]}`}</SvgText>

        <SvgText x={300} y={668} fill={C.ink} fontSize={64} fontWeight="bold" textAnchor="middle">{labelOf(profile.t)}</SvgText>
        <SvgText x={300} y={706} fill={C.gold} fontSize={23} textAnchor="middle" letterSpacing={2}>{entry.band}</SvgText>
        <SvgText x={300} y={752} fill={C.ink} fontSize={32} fontWeight="bold" textAnchor="middle">{entry.subtitle}</SvgText>
        {marks && <SvgText x={300} y={782} fill={C.aqua} fontSize={15} textAnchor="middle">{marks}</SvgText>}
        <Path d="M64 806Q160 784 256 806T448 806T536 800" stroke={accent} strokeOpacity={0.6} strokeWidth={2} fill="none" />
        {hookLines.map((line, i) => <SvgText key={i} x={300} y={842 + 28 * i} fill={C.ink} fontSize={19} textAnchor="middle">{line}</SvgText>)}
        <SvgText x={300} y={918} fill={C.muted} fontSize={13} textAnchor="middle" letterSpacing={2}>あなたの海をひらく　潮環占い</SvgText>
      </Svg>
    </View>
    <Button disabled={busy || !ready} onPress={() => { void share(); }}>
      {busy || !ready ? '画像を用意しています…' : Platform.OS === 'web' ? '潮札のPNGを保存' : '潮札の画像を共有'}
    </Button>
    {!!status && <Text style={S.body} accessibilityLiveRegion="polite">{status}</Text>}
  </Card>;
}

const styles = StyleSheet.create({
  crest: { alignItems: 'center', paddingVertical: 25, borderColor: '#746344', backgroundColor: '#18243b' },
  center: { textAlign: 'center' },
  resultRow: { ...S.row, width: '100%', maxWidth: 355, marginVertical: 6 },
  god: { width: '43%', maxWidth: 150 },
  rank: { flex: 1, minWidth: 0 },
  flow: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 8 },
});


