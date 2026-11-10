import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { currents, scenes, stages } from './art';
import { DailyRank } from './DailyRank';
import { addDays, calendarEvents, content, dateKey, dateLabel, readDay, shortDate, tierColors, tiers, type Profile } from './domain';
import { ResidentSymbol } from './ResidentCard';
import { ctxFor, labelOf, OUTER, SEASON, STAGES } from './scoring';
import { Meter, SeaGlobe } from './TideCharts';
import { Button, C, Card, Chip, Chips, S, Section, Tile } from './ui';
import { findQuestion, nextTideChange, ownResident, revisitQuestion, type Reflection, type SavedQuestion } from './voyage';

type Reading = ReturnType<typeof readDay>;

export function Today({ today, profile, goMyth, openCalendar, create, openName, ranks, onSave, questions, reflections, openQuestion, openChart, openQuestions, openHomecoming }: {
  today: Date; profile: Profile | null; goMyth: () => void; openCalendar: (date: Date, mode: 'current' | 'stage') => void;
  create: () => void; openName: () => void; ranks: (date: Date) => void; onSave: (day: string) => void;
  questions: SavedQuestion[]; reflections: Reflection[]; openQuestion: (id: string) => void;
  openChart: () => void; openQuestions: () => void; openHomecoming: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [showReasons, setShowReasons] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const date = addDays(today, offset);
  const reading = profile && readDay(date, profile);
  const c = reading?.context ?? ctxFor(date);
  const events = calendarEvents(date, profile);
  const resident = profile && ownResident(profile);
  const previous = offset === 0 && revisitQuestion(events, today, questions, reflections);
  const question = previous && findQuestion(previous.id);
  const next = nextTideChange(today);
  const isNewMoon = events.some(event => event.includes('新月'));
  const isFullMoon = events.some(event => event.includes('満月'));

  function selectDay(next: number) {
    setOffset(next);
    setShareMessage('');
  }

  async function share() {
    if (!reading) return;
    const message = ['潮環占い｜' + dateLabel(c), labelOf(reading.row.t) + '　' + reading.row.rank + '位／160種 · ' + reading.outlook.title,
      reading.outlook.line, '今日の一手　' + reading.outlook.action].join('\n');
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: message });
        else if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          setShareMessage('潮札の文章をコピーしました。');
        } else setShareMessage(message);
      } else await Share.share({ message });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareMessage(message);
    }
  }

  return <View style={S.stack}>
    <View style={styles.hero}>
      <Text style={[S.kicker, styles.center]}>{offset === 0 ? '今日の海' : shortDate(c) + 'の海'}</Text>
      <Text accessibilityRole="header" style={[S.title, styles.center]}>{resident?.band ?? 'いま、どんな海にいるか'}</Text>
      {resident && <Text style={[S.body, styles.center]}>{resident.subtitle}</Text>}
      <Text style={[S.body, styles.center]}>{dateLabel(c)}</Text>
      <Text style={[S.tiny, styles.center]}>{OUTER[c.outer].n}　／　{STAGES[c.stage].n}　／　{c.moon}</Text>
      {reading && <DailyRank reading={reading} isToday={offset === 0} onPress={() => ranks(date)} />}
      {!reading && <>
        <Text style={[S.body, styles.center, styles.prologue]}>
          年の海流、四か月の海況、今日の月。生年月日と名前から導いた名札を三つの海に重ね、いまの運勢を読みます。
        </Text>
        <Button onPress={create}>自分の海を占う　›</Button>
        <Button quiet onPress={openQuestions}>名前を入れずに問いを読む</Button>
      </>}
    </View>
    <View style={S.between}>
      <Chip onPress={() => selectDay(offset - 1)}>‹ 前の日</Chip>
      <Chip active={offset === 0} onPress={() => selectDay(0)}>今日</Chip>
      <Chip onPress={() => selectDay(offset + 1)}>次の日 ›</Chip>
    </View>
    {!!events.length && <Chips>{events.map(event => <Chip key={event}>{event}</Chip>)}</Chips>}
    {question && previous && <Card>
      <Text style={S.kicker}>{previous.title}</Text>
      <Text style={S.h3}>{question.question}</Text>
      <Button quiet onPress={() => openQuestion(question.id)}>問いを読み直す</Button>
    </Card>}
    {offset === 0 && events.includes('私の出航日') && (!previous || !previous.title.startsWith('出航日')) && <Card>
      <Text style={S.h3}>私の出航日</Text>
      <Text style={S.body}>この一年で見え方が変わった出来事を、一つ思い出してみましょう。</Text>
      <Button quiet onPress={openChart}>一年の海を振り返る</Button>
    </Card>}
    {offset === 0 && events.some(event => event.includes('潮替わり')) && <Card>
      <Text style={S.h3}>潮替わり · {STAGES[c.stage].n}</Text>
      <Text style={S.body}>{STAGES[c.stage].d}。この四か月の初めに、いま気になることを一つ選んでみましょう。</Text>
      <Button quiet onPress={openQuestions}>新しい問いを選ぶ</Button>
    </Card>}
    {offset === 0 && events.includes('帰郷の年') && <Card>
      <Text style={S.h3}>帰郷の年</Text>
      <Text style={S.body}>{c.Y - 12}年と同じ海流が巡っています。</Text>
      <Button quiet onPress={openHomecoming}>{(c.Y - 12) + '年の海と記録を見る'}</Button>
    </Card>}
    {reading && profile && <>
      <Card>
        <Text style={S.kicker}>今日の一手</Text>
        <Text style={S.h2}>{reading.outlook.action}</Text>
        {profile.minus && reading.row.rank > 80 && <Text style={S.body}>「−」の名札は向かい風を受けやすい読みです。今いる場所を守ることも、一つの舵の切り方です。</Text>}
        <Chips>
          <Chip onPress={() => onSave(dateKey(date))}>航海帳に記す</Chip>
          <Chip onPress={() => { void share(); }}>鑑定を共有</Chip>
        </Chips>
        {!!shareMessage && <Text selectable accessibilityLiveRegion="polite" style={S.tiny}>{shareMessage}</Text>}
      </Card>
      <Card>
        <Text style={S.kicker}>今日のひと言</Text>
        <Text style={S.h2}>{reading.outlook.line}</Text>
        <Text style={S.body}>{reading.outlook.detail}</Text>
      </Card>
      <Card>
        <Text style={S.kicker}>年・四か月・今日</Text>
        <Text style={S.h2}>三つの海を重ねて読む</Text>
        <View style={S.row}>
          {([
            [c.Y + '年', OUTER[c.outer].th, reading.layers.year],
            [Math.floor((c.MO - 1) / 4) * 4 + 1 + '〜' + (Math.floor((c.MO - 1) / 4) * 4 + 4) + '月', STAGES[c.stage].n, reading.layers.block],
            [shortDate(c), c.moon, reading.layers.day],
          ] as const).map(([when, theme, level]) => <View key={when} style={[styles.layer, { borderTopColor: tierColors[level] }]}>
            <Text style={S.tiny}>{when}</Text>
            <Text style={[S.h3, { color: tierColors[level] }]}>{tiers[level]}</Text>
            <Text style={S.tiny}>{theme}</Text>
          </View>)}
        </View>
        <Text style={S.body}>{reading.layers.text}</Text>
        <Text style={S.tiny}>海流 {c.outer + 1}／12　·　海況 {Math.floor(c.stage / 3) + 1}年目／4年</Text>
        <Text style={S.tiny}>次の潮替わり　{dateKey(next.date)} ／ あと{next.days}日</Text>
        <Button quiet onPress={openChart}>人生の海図を見る</Button>
      </Card>
      <Section title="これからの七日" note="日付を選ぶと、その日の鑑定に切り替わります。" />
      <View style={styles.week}>
        {Array.from({ length: 7 }, (_, index) => {
          const next = readDay(addDays(today, index), profile);
          return <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: offset === index }}
            onPress={() => selectDay(index)} style={[styles.weekDay, offset === index && { borderColor: C.gold }]}>
            <Text style={S.tiny}>{next.context.MO}/{next.context.DA}</Text>
            <Text style={[S.tiny, { color: next.outlook.color }]}>{next.outlook.title}</Text>
          </Pressable>;
        })}
      </View>
      <Button quiet onPress={() => setShowReasons(!showReasons)}>{showReasons ? '鑑定の根拠を閉じる　−' : '鑑定の根拠を読む　＋'}</Button>
      {showReasons && <ReadingReasons reading={reading} />}
      <Pressable accessibilityRole="button" onPress={openName} style={[S.card, S.row, { padding: 10 }]}>
        {resident && <ResidentSymbol entry={resident} profile={profile} size={58} />}
        <View style={{ flex: 1, padding: 8 }}>
          <Text style={S.kicker}>潮札を読む</Text><Text style={S.h3}>{resident?.band}</Text><Text style={S.tiny}>{resident?.subtitle}</Text>
        </View>
        <Text style={[S.h3, { paddingRight: 15 }]}>›</Text>
      </Pressable>
    </>}
    {!reading && <Button quiet onPress={() => ranks(date)}>この日の160名札の順位を見る</Button>}
    <Section title="いまの海" />
    <View style={S.row}>
      <Tile source={currents[c.outer]} subtitle="今年の海流" title={OUTER[c.outer].n} onPress={() => openCalendar(date, 'current')} />
      <Tile source={stages[c.stage]} subtitle="四か月の海況" title={STAGES[c.stage].n} onPress={() => openCalendar(date, 'stage')} />
    </View>
    <Card>
      <Text style={S.kicker}>月と潮</Text><Text style={S.h3}>{c.moon}　·　{c.phaseTide}</Text>
      <SeaGlobe context={c} />
      <Text style={S.body}>日本時間の正午の天文値　月齢 {c.age.toFixed(1)} ／ 地球から約 {Math.round(c.dist).toLocaleString('ja-JP')} km（{c.tide}）</Text>
      {(isNewMoon || isFullMoon) && <Text style={S.body}>月を読む日 · {isNewMoon ? '新月を、これから始めたいことを一つ選ぶ節目として眺めてみましょう。' : '満月を、いま手元にあるものを確かめる節目として眺めてみましょう。'}</Text>}
    </Card>
    <View style={S.row}><Tile source={scenes[0]} subtitle="潮環神話" title="見られなかった海" onPress={goMyth} /></View>
  </View>;
}

function ReadingReasons({ reading }: { reading: Reading }) {
  const { context: c, row, personal, personalRank, force } = reading;
  const { p, t } = row;
  const season = SEASON[t.mod];
  const factors = [
    { title: '海況の基礎点', score: p.base, note: STAGES[c.stage].d },
    { title: '季節 × 月の形', score: p.moon, note: season.n + 'は' + season.moon + 'に力が出ます。今日の月は「' + c.moon + '」。深さが得意な月相を少しずらします。' },
    { title: '深さ × 月の距離', score: p.depth, note: '今日の月は約' + (c.dist / 10000).toFixed(1) + '万km。深い名札は近い月、浅い名札は遠い月の潮に乗りやすくなります。' },
    { title: '季節の拠点 × 海況', score: p.aff, note: season.n + 'の拠点は「' + STAGES[season.home].n + '」。いまの海況から' + p.ring + '段階離れています。' },
    { title: '季節 × 年の海流', score: p.comp, note: OUTER[c.outer].n + 'は' + OUTER[c.outer].t + '。' + (t.minus ? '「−」の名札では風向きが反転します。' : '暖流は春・夏に、寒流は秋・冬に追い風となります。') },
    ...(t.minus ? [{ title: '「−」の向かい風', score: p.hw, note: '向かい風体質にかかる補正です。' }] : []),
    ...(t.A ? [{ title: 'A（渦）× 月の距離', score: p.vor, note: '月が近いほど、渦の力が強く表れます。' }] : []),
    { title: '名札の日の海', score: p.day, note: '12日で一巡する波。今日の名札の波は「' + STAGES[p.dpos].n + '」。' },
  ];

  return <Card>
    <Text style={S.h2}>二つの力と、点数の内訳</Text>
    <Meter title="自分が進む" value={force.go} caption={force.go >= .5 ? '好機' : '控えめ'} />
    <Meter title="周りを変える" value={force.change} color="#a8c4f0" caption={force.change >= .5 ? '届きやすい' : '控えめ'} />
    {factors.map(({ title, score, note }) => <View key={title} style={styles.factor}>
      <View style={S.between}><Text style={S.h3}>{title}</Text><Text style={[S.tiny, { color: score < 0 ? '#efb2b0' : C.gold }]}>{score > 0 ? '+' : ''}{score.toFixed(1)}点</Text></View>
      <Text style={S.body}>{note}</Text>
    </View>)}
    <Text style={S.h3}>名札 {row.score.toFixed(1)}点　／　全体平均 {reading.mean.toFixed(1)}点</Text>
    <Text style={S.body}>あなた個人の日の海は「{STAGES[personal.pos].n}」。誕生日と総画数から読んだ補正{personal.delta >= 0 ? '+' : ''}{personal.delta.toFixed(1)}点{personal.ret ? '（帰郷の年の加点を含む）' : ''}{t.A ? 'と、Aの渦による振れ幅' : ''}を重ねると、{personalRank}位相当です。</Text>
  </Card>;
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, borderColor: '#4c5271', borderRadius: 20, padding: 17, gap: 7, backgroundColor: '#141e37' },
  center: { textAlign: 'center' },
  prologue: { alignSelf: 'center', maxWidth: 365, paddingBottom: 6 },
  layer: { flex: 1, minWidth: 0, gap: 4, borderTopWidth: 2, padding: 7, backgroundColor: '#111b32', borderRadius: 6 },
  week: { flexDirection: 'row', gap: 4 },
  weekDay: { flex: 1, minWidth: 0, paddingVertical: 7, alignItems: 'center', gap: 3, borderRadius: 7, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
  factor: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, gap: 3 },
});
