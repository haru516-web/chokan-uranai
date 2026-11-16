import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { currents, iconArt, residentArt, scenes, stages, tierArt } from './art';
import { Image } from './web/image';
import { LayeredReading } from './DailyReading';
import { addDays, calendarEvents, dateKey, dateLabel, readDay, residentIndex, shortDate, tierColors, tiers, type Profile } from './domain';
import { BornSea, NameReadingDetails, TypeTraits } from './NameReading';
import { SelectedQuestionReading } from './Questions';
import { TideFlow } from './ResidentCard';
import { ctxFor, DAY_STAGES, FIVE_PHASES, labelOf, OUTER, SEASON, STAGES, stageFor } from './scoring';
import { Meter, MoonFacts, SeaGlobe } from './TideCharts';
import { GodAnimation } from './GodAnimation';
import { Scene } from './Story';
import { fortuneFor, tomorrowFor } from './fortune';
import { FortuneAreas, LuckyCard, TomorrowCard } from './FortuneDetail';
import { Gloss, GlossHint, TermText, useGloss } from './Glossary';
import { PersonSwitcher, type Person } from './People';
import { ResultPoster } from './ResultPoster';
import { Float, glow, Sparkles } from './Visual';
import { Art, Button, C, Card, Chip, Chips, Fold, NextLinks, S, Tile, display, rounded, useColumns } from './ui';
import { findQuestion, nextTideChange, ownResident, revisitQuestion, type Question, type Reflection, type SavedQuestion } from './voyage';
import { DailyTarot, type SavedTarotDraw } from './DailyTarot';
import { seasonOf } from './tarotDeck';

type Reading = ReturnType<typeof readDay>;
// 結果の演出は、その人・その日の初回だけフル再生。再訪は即表示（「もう一度」で再生できる）。
const seenResults = new Set<string>();
const tierIcons = ['🎣', '⛵', '🌙', '⚡', '🌀'];
type FoldId = 'why' | 'me' | 'layers' | 'flow' | 'moon';

export function Today({ people, activeId, onSwitch, onAdd, onManage, today, profile, goMyth, openCalendar, create, ranks, onSave, questions, reflections, openQuestion, openQuestions, openHomecoming, tarotDraw, tarotLog, onDrawTarot,
  shareTideCard, openJournal, goSelf, openExplanation, startQuiz, selfLast, selectedQuestion }: {
  people: Person[]; activeId: number | null; onSwitch: (id: number) => void; onAdd: () => void; onManage: () => void;
  today: Date; profile: Profile | null; goMyth: () => void; openCalendar: (date: Date, mode: 'current' | 'stage') => void;
  create: () => void; ranks: (date: Date) => void; onSave: (day: string) => void;
  questions: SavedQuestion[]; reflections: Reflection[]; openQuestion: (id: string) => void;
  openQuestions: () => void; openHomecoming: (year: number) => void;
  tarotDraw: SavedTarotDraw | null; tarotLog: SavedTarotDraw[]; onDrawTarot: (cardId: string) => void;
  shareTideCard: () => void; openJournal: () => void; goSelf: () => void; openExplanation: () => void; startQuiz: () => void;
  selfLast: { name: string; mark: string; color: string } | null;
  selectedQuestion?: { question: Question; saved: boolean; toggle: () => void; compare: () => void };
}) {
  const [offset, setOffset] = useState(0);
  const [shareMessage, setShareMessage] = useState('');
  const { desktop } = useColumns();
  const [fold, setFold] = useState<FoldId | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [showName, setShowName] = useState(false);
  const toggle = (id: FoldId) => setFold(current => current === id ? null : id);
  const date = addDays(today, offset);
  const [replay, setReplay] = useState(0);
  const [skipKey, setSkipKey] = useState('');
  const seenKey = activeId + '-' + dateKey(date);
  const playKey = seenKey + '-' + replay;
  const wasSeen = useMemo(() => replay === 0 && seenResults.has(seenKey), [seenKey, replay]);
  useEffect(() => { seenResults.add(seenKey); }, [seenKey]);
  const instant = wasSeen || skipKey === playKey;
  const reading = profile && readDay(date, profile);
  const tarotLevel = profile ? (offset === 0 && reading ? reading.layers.day : readDay(today, profile).layers.day) : null;
  const c = reading?.context ?? ctxFor(date);
  const stageIndex = stageFor(c, profile?.t);
  const events = calendarEvents(date, profile);
  const previous = offset === 0 && revisitQuestion(events, today, questions, reflections);
  const question = previous && findQuestion(previous.id);
  const next = nextTideChange(today);
  const isNewMoon = events.some(event => event.includes('新月'));
  const isFullMoon = events.some(event => event.includes('満月'));
  const isToday = offset === 0;
  const resident = profile && ownResident(profile);
  const currentQuestion = isToday && profile ? selectedQuestion : undefined;
  const revisit = question && previous && question.id !== currentQuestion?.question.id ? question : null;
  const departureDay = isToday && events.includes('私の出航日') && (!previous || !previous.title.startsWith('出航日'));
  const tideChange = isToday && events.some(event => event.includes('潮替わり'));
  const homecoming = isToday && events.includes('帰郷の年');
  const dayWord = isToday ? '今日' : shortDate(c);

  function selectDay(value: number) {
    setOffset(Math.min(0, value));
    setShareMessage('');
    setFold(null);
  }

  async function share() {
    if (!reading) return;
    const message = ['潮環占い｜' + dateLabel(c), (resident ? resident.band + '（' + resident.subtitle + '）名札 ' + labelOf(reading.row.t) : labelOf(reading.row.t)) + '　' + reading.row.rank + '位／160 · ' + reading.outlook.title,
      reading.outlook.line, '今日の一手　' + reading.outlook.action].join('\n');
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) await navigator.share({ text: message });
        else if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          setShareMessage('コピーしました。');
        } else setShareMessage(message);
      } else await Share.share({ message });
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) setShareMessage(message);
    }
  }

  const dayNavigation = <View style={S.between}>
    <Chip onPress={() => selectDay(offset - 1)}>‹ 前の日</Chip>
    <Chip active={offset === 0} onPress={() => selectDay(0)}>今日</Chip>
    <Text style={S.tiny}>明日の潮は、この下に ↓</Text>
  </View>;

  const moonCard = <View style={S.stack}>
    <Text style={S.h3}>{c.moon}　·　{c.phaseTide}</Text>
    <SeaGlobe key={c.Y + "-" + c.MO + "-" + c.DA} context={c} />
    <MoonFacts key={c.Y + "-" + c.MO + "-" + c.DA} context={c} />
    {(isNewMoon || isFullMoon) && <Text style={S.body}>{isNewMoon ? '新月：これから始めたいことを一つ選ぶ節目です。' : '満月：いま手元にあるものを確かめる節目です。'}</Text>}
  </View>;

  /* ---------- はじめての人：目的別の入口 ---------- */
  if (!reading || !profile) return <View style={S.stack}>
    <View style={{ gap: 4 }}>
      <Text style={S.kicker}>生年月日と名前でひらく、あなただけの海</Text>
      <Text accessibilityRole="header" style={styles.welcome}>今日のあなたの海は、{'\n'}凪か、荒波か。</Text>
      <Gloss style={S.body}>潮環占いは、年の海流・月の満ち欠け・あなたの名札を重ねて、今日の運勢を160通りの順位で読む占いです。</Gloss>
      <GlossHint />
    </View>
    <View style={desktop ? { flexDirection: 'row', gap: 13, alignItems: 'stretch' } : S.stack}>
    <Door fill={desktop} color={C.gold} big badge="まずはこれ" kicker="占い" title="今日の運勢を占う" hint="生年月日と名前だけ・30秒" cta="占ってみる" onPress={create}
      art={<Float><GodAnimation forcePlay index={4} style={{ width: 104 }} /></Float>} />
    </View>
    <Fold title="今日の海をのぞく" hint="日付と月だけでわかる、今日の海のようす" open={fold === 'moon'} onToggle={() => toggle('moon')}>
      <Text style={S.tiny}>{c.yearPillar}　／　{OUTER[c.outer].n}　／　{STAGES[stageIndex].n}</Text>
      {moonCard}
    </Fold>
    <Text style={S.tiny}>入力した内容はこの端末の中だけで使います。</Text>
  </View>;

  /* ---------- 結論ファースト ---------- */
  const { outlook, row } = reading;
  // 荒波・轟沈は「注意」を赤で示し、ゆっくり脈打つ光で目を引く。
  const tierColor = ['#efd393', '#b6dfc4', '#c1d2ef', '#ff5a4d', '#e0245e'][reading.layers.day];
  const danger = reading.layers.day >= 3;
  const pulse = (spread: number) => `0 0 0 1px ${tierColor}66, 0 0 ${spread}px ${tierColor}${spread > 40 ? '99' : '55'}`;
  const events2 = events;
  const activePerson = people.find(person => person.id === activeId);
  const fortune = fortuneFor(reading, profile);
  const tomorrow = isToday ? tomorrowFor(today, profile, row.rank) : null;
  const goStrong = reading.force.go >= .5;
  const changeStrong = reading.force.change >= .5;
  return <View style={S.stack}>
    <Pressable accessible={false} onPress={() => setSkipKey(playKey)}>
      <ResultPoster key={playKey + (instant ? 'i' : '')} reading={reading} band={resident?.band} dateText={dateLabel(c)} dayWord={dayWord}
        personName={activePerson && !activePerson.me ? activePerson.inputs.name : undefined} instant={instant} />
    </Pressable>
    <View style={styles.toolbar}>
      <Chip onPress={() => setReplay(value => value + 1)}>▶ もう一度</Chip>
      <Chip onPress={() => { void share(); }}>共有</Chip>
      <Text style={[S.tiny, { flex: 1, textAlign: 'right' }]}>名札や順位をタップで解説</Text>
    </View>
    {!!shareMessage && <Text selectable accessibilityLiveRegion="polite" style={S.tiny}>{shareMessage}</Text>}
    {dayNavigation}
    <PersonSwitcher people={people} activeId={activeId} onSwitch={onSwitch} onAdd={onAdd} onManage={onManage} />

    {(departureDay || tideChange || homecoming || revisit || currentQuestion) && <View style={S.stack}>
      {departureDay && <Card>
        <Text style={[S.kicker, { color: C.gold }]}>✦ 今日だけの知らせ</Text>
        <Text style={S.h3}>今日は、あなたの出航日</Text>
        <Text style={S.body}>この一年で見え方が変わった出来事を、一つ思い出してみましょう。</Text>
      </Card>}
      {tideChange && <Card>
        <Text style={[S.kicker, { color: C.gold }]}>✦ 今日だけの知らせ</Text>
        <Text style={S.h3}>潮替わり · {STAGES[stageIndex].n}</Text>
        <Gloss style={S.body}>{'いまの海況です。いま気になることを一つ選んでみましょう。'}</Gloss>
        <GlossHint />
        <Button quiet onPress={openQuestions}>新しい問いを選ぶ</Button>
      </Card>}
      {homecoming && <Card>
        <TermText id="帰郷の年" style={S.h3} />
        <Gloss style={S.body}>{(c.solarYear - 12) + '年と同じ海流が巡っています。'}</Gloss>
        <Button quiet onPress={() => openHomecoming(c.solarYear - 12)}>{(c.solarYear - 12) + '年の海と記録を見る'}</Button>
      </Card>}
      {revisit && previous && <Card>
        <Text style={S.kicker}>{previous.title}</Text>
        <Text style={S.h3}>{revisit.question}</Text>
        <Button quiet onPress={() => openQuestion(revisit.id)}>問いを読み直す</Button>
      </Card>}
      {currentQuestion && <SelectedQuestionReading question={currentQuestion.question} profile={profile} />}
    </View>}

    {resident && <View key={'type-' + activeId} style={styles.typeSection}>
      <View style={[S.card, glow(SEASON[profile.t.mod].col), styles.typeHero]}>
        <View style={styles.typeTop}>
          <View style={[styles.portrait, { borderColor: SEASON[profile.t.mod].col, backgroundImage: `radial-gradient(circle at 50% 42%, #f4f8ff 0%, ${SEASON[profile.t.mod].col}aa 70%, ${SEASON[profile.t.mod].col}66 100%)` } as object]}>
            <Image source={residentArt[residentIndex(profile.t)]} accessible={false} style={styles.portraitImg} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Text style={[S.kicker, { color: SEASON[profile.t.mod].col }]}>あなたのタイプ　{labelOf(profile.t)}</Text>
            <Text accessibilityRole="header" style={styles.typeTitle}>{resident.band}</Text>
            <Text style={styles.typeSub}>{resident.subtitle}</Text>
          </View>
        </View>
        <Text style={styles.typeHook}>{resident.hook}</Text>
        <Text style={styles.detail}>{resident.inner}</Text>
      </View>
      <TypeTraits entry={resident} />
      <Button quiet onPress={() => setShowName(!showName)}>{showName ? '名札の決まり方を閉じる' : '名札の決まり方を詳しく見る'}</Button>
      {showName && <NameReadingDetails profile={profile} />}
    </View>}

    <View style={styles.bookHead}>
      <Text style={[S.kicker, { color: tierColor }]}>{dateLabel(c)}</Text>
      <Text accessibilityRole="header" style={styles.bookTitle}>{dayWord}の鑑定書</Text>
      <Text style={S.tiny}>ゆっくり下へ。章がひとつずつ、ひらいていきます。</Text>
    </View>

    <View key={'story' + seenKey}>
      <Scene index={0} color={tierColor} kicker={dayWord + 'の海'} title={outlook.title + 'の日'} lead={fortune.sea} next="四つの運勢">
        {tierArt[reading.layers.day] && <View style={[S.card, { borderColor: tierColor + '88' }]}><Art source={tierArt[reading.layers.day]!} height={190} label={outlook.title + 'の海'} /></View>}
        <Text style={styles.detail}>{outlook.detail}</Text>
        <Meter title="自分が進む力" value={reading.force.go} color={tierColor} caption={goStrong ? '強い' : '控えめ'} />
        <Meter title="周りを変える力" value={reading.force.change} color="#a8c4f0" caption={changeStrong ? '強い' : '控えめ'} delay={220} />
        <View style={styles.reason}>
          <TermText id="今日の一手" style={S.kicker}>{dayWord + 'の一手が、これになった理由'}</TermText>
          <Text style={S.body}>{goStrong && changeStrong ? '動くことも、人を巻き込むことも通りやすい日' : goStrong ? '自分のことは進むけれど、人を動かすのは難しい日' : changeStrong ? '自分で進めるより、人に頼るほうがうまくいく日' : '進むよりも、守って休むほうが得をする日'}。だから一手は<Text style={{ color: C.ink, fontWeight: '900' }}>「{outlook.action}」</Text>。</Text>
        </View>
        {!!events.length && <Chips>{events.map(event => <Chip key={event}>{event}</Chip>)}</Chips>}
      </Scene>

      <Scene index={1} color={fortune.best.color} kicker="仕事・恋愛・金運・健康" title={'いちばんは「' + fortune.best.label + '」'} lead={'4つのうち、' + fortune.best.label + 'がいちばん輝く日。★の数で、得意と不得意が分かります。'} next="三つの潮が重なる">
        <FortuneAreas fortune={fortune} dayWord={dayWord} hideSea />
      </Scene>

      <Scene index={2} color={tierColors[reading.layers.year]} kicker="年・月・日" title={'年は' + tiers[reading.layers.year] + '、月は' + tiers[reading.layers.block]} lead={reading.layers.text} next={dayWord + 'のお守り'}>
        <LayeredReading reading={reading} isToday={isToday}>
          <Text style={S.tiny}>次の潮替わり　{dateKey(next.date)} ／ あと{next.days}日</Text>
        </LayeredReading>
        <TideFlow profile={profile} context={c} showCalendar={openCalendar} />
      </Scene>

      <Scene index={3} color={fortune.lucky.color.hex} kicker="ラッキーカラー・方角・時間" title={fortune.lucky.color.name + 'を、身につけて'} lead={'方角は' + fortune.lucky.direction + '、いい時間は' + fortune.lucky.time + '。'} next="月と潮">
        <LuckyCard fortune={fortune} dayWord={dayWord} />
      </Scene>

      <Scene index={4} last={!tomorrow} color="#c1d2ef" kicker={dayWord + 'の月'} title={c.moon + '・' + c.phaseTide} lead={isNewMoon ? '新月。始めたいことを、一つだけ選ぶ夜です。' : isFullMoon ? '満月。いま手元にあるものを、確かめる夜です。' : '月の形と距離が、' + dayWord + 'の潮の強さを決めています。'} next={tomorrow ? '明日の潮' : undefined}>
        {moonCard}
        <Button quiet onPress={() => setShowScore(!showScore)}>{showScore ? '点数の内訳を閉じる' : '順位の計算を、点数の内訳まで見る'}</Button>
        {showScore && <ReadingReasons reading={reading} />}
      </Scene>

      {tomorrow && <Scene index={5} last color={['#efd393', '#b6dfc4', '#c1d2ef', '#ff5a4d', '#e0245e'][tomorrow.level]} kicker="予告" title="明日の潮は……">
        <TomorrowCard tomorrow={tomorrow} />
      </Scene>}
    </View>

    <Text style={S.h2}>次はどうする？</Text>
    <NextLinks items={[
      { icon: '💭', label: '今の気持ちに近い問いを読む', hint: '悩みから選べます', onPress: openQuestions },
      { icon: '📊', label: 'この日の160名札の順位', hint: '全タイプの中での位置', onPress: () => ranks(date) },
      { icon: '🖼️', label: '潮札を画像で共有', onPress: shareTideCard },
    ]} />
    <View style={S.row}>
      <Tile source={currents[c.outer]} subtitle="今年の海流" title={OUTER[c.outer].n} onPress={() => openCalendar(date, 'current')} />
      <Tile source={stages[stageIndex]} subtitle="今の海況" title={STAGES[stageIndex].n} onPress={() => openCalendar(date, 'stage')} />
    </View>
    <View style={S.row}><Tile source={scenes[0]} subtitle="潮環神話" title="見られなかった海" onPress={goMyth} /></View>
  </View>;
}

function Door({ fill, color, big, badge, kicker, title, hint, cta, onPress, art }: {
  fill?: boolean; color: string; big?: boolean; badge?: string; kicker: string; title: string; hint: string; cta: string; onPress: () => void; art: ReactNode;
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} {...({ dataSet: { ui: 'tap' } } as object)} style={({ pressed }) => [styles.door, fill && { flex: 1 }, glow(color), { borderColor: color, minHeight: big ? 210 : 150 }, pressed && { opacity: .8 }]}>
    <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
      {badge && <View style={[styles.badge, { backgroundColor: color }]}><Text style={styles.badgeText}>{badge}</Text></View>}
      <Text style={[S.kicker, { color }]}>{kicker}</Text>
      <Text style={[styles.doorTitle, big && { fontSize: 28, lineHeight: 36 }]}>{title}</Text>
      <Text style={S.body}>{hint}</Text>
      <View {...({ dataSet: { ui: 'gold' } } as object)} style={[styles.cta, { backgroundColor: color }]}><Text style={styles.ctaText}>{cta}　›</Text></View>
    </View>
    {art}
  </Pressable>;
}

function ReadingReasons({ reading }: { reading: Reading }) {
  const { context: c, row, personal, personalRank, force, fivePhase } = reading;
  const { p, t } = row;
  const season = SEASON[t.mod];
  const stageIndex = stageFor(c, t);
  const factors = [
    { title: '自分の海の時計（海況）', score: p.base, note: STAGES[stageIndex].n + '：' + STAGES[stageIndex].d + '。同じ海況でも、いつ来るか・どれだけ効くかは、人ごとに違います。' },
    { title: '季節 × 月の形', score: p.moon, note: season.n + 'は' + season.moon + 'に力が出ます。今日の月は「' + c.moon + '」。深さが得意な月相を少しずらします。' },
    { title: '深さ × 月の距離', score: p.depth, note: '今日の月は約' + (c.dist / 10000).toFixed(1) + '万km。深い名札は近い月、浅い名札は遠い月の潮に乗りやすくなります。' },
    { title: '月の五行 × 季節型', score: p.aff, note: 'この月の月令は' + FIVE_PHASES[fivePhase.month].name + 'で、季節の型との関係は「' + fivePhase.monthRelation.kind + '」です。' },
    { title: '季節 × 年の干支五行', score: p.comp, note: c.yearPillar + '年の年干は' + c.yearPolarity + 'の' + FIVE_PHASES[fivePhase.year].name + '（' + fivePhase.yearRelation.kind + '）、年支は' + FIVE_PHASES[fivePhase.yearBranch].name + '（' + fivePhase.yearBranchRelation.kind + '）。' + (t.minus ? '「−」の名札では関係の向きが反転します。' : '') },
    ...(t.minus ? [{ title: '「−」の向かい風', score: p.hw, note: '向かい風体質にかかる補正です。' }] : []),
    ...(t.A ? [{ title: 'A（渦）× 月の距離', score: p.vor, note: '月が近いほど、渦の力が強く表れます。' }] : []),
    { title: '日の干支 × 名札の波', score: p.day, note: c.dayPillar + '日の日干は' + c.dayPolarity + 'の' + FIVE_PHASES[fivePhase.day].name + '。季節の型との関係は「' + fivePhase.dayRelation.kind + '」で、12の地支をめぐる日の波は「' + STAGES[p.dpos].n + '」です。' },
  ];

  return <View style={S.stack}>
    <Text accessibilityRole="header" style={S.kicker}>鑑定の根拠</Text>
    <Text style={S.h2}>二つの力と、点数の内訳</Text>
    <Meter title="自分が進む" value={force.go} caption={force.go >= .5 ? '好機' : '控えめ'} />
    <Meter title="周りを変える" value={force.change} color="#a8c4f0" caption={force.change >= .5 ? '届きやすい' : '控えめ'} delay={220} />
    {factors.map(({ title, score, note }) => <View key={title} style={styles.factor}>
      <View style={S.between}><Text style={S.h3}>{title}</Text><Text style={[S.tiny, { color: score < 0 ? '#efb2b0' : C.gold }]}>{score > 0 ? '+' : ''}{score.toFixed(1)}点</Text></View>
      <Gloss style={S.body}>{note}</Gloss>
    </View>)}
    <Text style={S.h3}>名札 {row.score.toFixed(1)}点　／　全体平均 {reading.mean.toFixed(1)}点</Text>
    <Text style={S.body}>あなた個人の日の海は「{DAY_STAGES[personal.pos].n}」。誕生日と総画数から読んだ補正{personal.delta >= 0 ? '+' : ''}{personal.delta.toFixed(1)}点{personal.ret ? '（帰郷の年の加点を含む）' : ''}{t.A ? 'と、Aの渦による振れ幅' : ''}を重ねると、{personalRank}位相当です。</Text>
  </View>;
}


const styles = StyleSheet.create({
  door: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 24, padding: 18, overflow: 'hidden' },
  doorTitle: { color: C.ink, fontSize: 22, lineHeight: 30, fontWeight: '800' },
  doorIcon: { fontSize: 64, lineHeight: 76 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: C.dark, fontSize: 12, fontWeight: '800' },
  cta: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14, marginTop: 4 },
  ctaText: { color: C.dark, fontSize: 16, fontWeight: '800' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: '#9fd8c7', backgroundColor: '#12303a' },
  small: { flex: 1, padding: 14, gap: 4, minHeight: 100 },
  smallIcon: { fontSize: 26 },
  hero: { borderWidth: 1, borderColor: '#4c5271', borderRadius: 22, padding: 18, gap: 12, backgroundColor: '#141e37' },
  welcome: { color: C.ink, fontSize: 32, lineHeight: 44, fontWeight: '800' },
  poster: { borderWidth: 3, borderRadius: 28, padding: 18, gap: 10, overflow: 'hidden', backgroundColor: '#141e37' },
  plate: { color: C.ink, fontSize: 58, lineHeight: 66, fontFamily: display, textAlign: 'center' },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  rule: { flex: 1, height: 2, borderRadius: 1, opacity: 0.6 },
  todayLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  tag: { marginTop: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1, backgroundColor: '#0f1830' },
  tagText: { color: C.ink, fontSize: 13, fontWeight: '800' },
  typeName: { color: C.ink, fontSize: 20, lineHeight: 28, textAlign: 'center', fontFamily: rounded, fontWeight: '900' },
  tier: { fontSize: 40, lineHeight: 48, fontFamily: display },
  rankLine: { color: C.muted, fontSize: 18, fontWeight: '800' },
  rankNum: { fontSize: 30, fontWeight: '800' },
  line: { color: C.ink, fontSize: 21, lineHeight: 32, fontFamily: rounded, fontWeight: '700', textAlign: 'center' },
  tierIcon: { fontSize: 34, lineHeight: 42 },
  action: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: '#0f1830', borderWidth: 1, borderColor: C.line },
  actionText: { color: C.ink, fontSize: 19, lineHeight: 28, fontWeight: '800' },
  factor: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, gap: 3 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bookHead: { alignItems: 'center', gap: 2, paddingTop: 14, paddingBottom: 6 },
  bookTitle: { color: C.ink, fontSize: 30, lineHeight: 42, fontFamily: rounded, fontWeight: '900', letterSpacing: 4 },
  detail: { color: C.muted, fontSize: 16, lineHeight: 28 },
  typeSection: { gap: 12 },
  typeHero: { padding: 16, gap: 12 },
  typeTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  portrait: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, overflow: 'hidden', backgroundColor: '#0f1830' },
  portraitImg: { width: '100%', height: '100%' } as never,
  typeTitle: { color: C.ink, fontSize: 26, lineHeight: 34, fontFamily: rounded, fontWeight: '900' },
  typeSub: { color: C.ink, fontSize: 17, lineHeight: 24, fontWeight: '800', opacity: .9 },
  typeHook: { color: C.ink, fontSize: 17, lineHeight: 29, fontFamily: rounded, fontWeight: '700' },
  reason: { gap: 4, padding: 12, borderRadius: 14, backgroundColor: '#111a31', borderWidth: 1, borderColor: C.line },
});
