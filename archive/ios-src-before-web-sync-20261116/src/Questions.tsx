import { useState, type ReactNode } from 'react';
import { Image } from './web/image';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { harbor } from './art';
import { readDay, tierColors, tiers, type Profile } from './domain';
import { Appear, useInView } from './FortuneDetail';
import { GodAnimation } from './GodAnimation';
import { Gloss } from './Glossary';
import { ResidentSymbol, TideMarks } from './ResidentCard';
import { OUTER, STAGES, stageFor } from './scoring';
import { Button, C, Card, Chip, Chips, display, rounded, S, Section, tapFx } from './ui';
import { categories, featuredQuestions, findQuestion, ownResident, questions, residentLens, type Question } from './voyage';
import { Float, fx, Sparkles, TypeText } from './Visual';

const asStyle = (style: object) => style as unknown as ViewStyle;

// 悩みの種類ごとの色と、語りかけてくる神（0冬 1春 2夏 3秋 4はじまり）
const LOOK: Record<string, { color: string; god: number; mark: string; voice: string }> = {
  self: { color: '#a8c4f0', god: 0, mark: '◐', voice: '冬凪' },
  work: { color: '#eacc8c', god: 3, mark: '⚓', voice: '秋津' },
  relation: { color: '#f0a8c0', god: 2, mark: '♡', voice: '夏照' },
  time: { color: '#9fd8c7', god: 1, mark: '⧗', voice: '春霞' },
};
const lookOf = (question: Question) => LOOK[question.category] ?? LOOK.self;

/** 「」でくくられた言葉を、金色の太字で浮かび上がらせる。 */
function Lit({ children, style, color = C.gold }: { children: string; style?: object; color?: string }) {
  const parts = children.split(/(「[^」]+」)/);
  return <Text style={style}>{parts.map((part, i) => part.startsWith('「')
    ? <Text key={i} style={{ color, fontWeight: '900' }}>{part}</Text>
    : <Gloss key={i}>{part}</Gloss>)}</Text>;
}

const sentences = (text: string) => text.split(/(?<=。)/).map(part => part.trim()).filter(Boolean);

/** 神が語りかける吹き出し。 */
function Oracle({ god, name, color, children }: { god: number; name: string; color: string; children: ReactNode }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <View ref={ref as never} style={[styles.oracle, seen ? null : asStyle({ opacity: 0 })]}>
    <View {...(seen ? fx('pop') : {})} style={styles.oracleGod}>
      <Float><GodAnimation forcePlay index={god} style={{ width: 70 }} /></Float>
      <Text style={[styles.oracleName, { color }]}>{name}</Text>
    </View>
    <View {...(seen ? fx('up') : {})} style={[styles.bubble, asStyle({ borderColor: color, animationDelay: '220ms', boxShadow: `0 0 28px ${color}33` })]}>
      <View style={[styles.tail, { borderRightColor: color }]} />
      {children}
    </View>
  </View>;
}

export function QuestionSea({ open, create }: { open: (id: string) => void; create?: () => void }) {
  const [browse, setBrowse] = useState(false);
  const [category, setCategory] = useState(categories[0].id);
  const recommended = featuredQuestions.map(id => findQuestion(id)!);
  const entries = browse ? questions.filter(question => question.category === category) : recommended;

  return <View style={S.stack}>
    <View style={[S.card, styles.hero]}>
      <Image source={harbor} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      <View style={[StyleSheet.absoluteFill, styles.shade]} />
      <Sparkles color="#a8c4f0" />
      <View style={styles.heroRow}>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={S.kicker}>問いの海</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>言葉にならない{'\n'}もやもや、{'\n'}ありませんか。</Text>
          <Text style={S.body}>近い問いを一つ選ぶと、四柱の神が答えます。名前も生年月日もいりません。</Text>
        </View>
        <Float style={{ width: 92 }}><GodAnimation forcePlay index={4} style={{ width: 92 }} /></Float>
      </View>
    </View>
    {create && <Button quiet onPress={create}>先に自分の海を占う</Button>}
    <Text accessibilityRole="header" style={S.h2}>{browse ? 'すべての問い' : 'いま、多くの人が選ぶ6つの問い'}</Text>
    {browse && <Chips>{categories.map(item =>
      <Chip key={item.id} active={category === item.id} onPress={() => setCategory(item.id)}>{LOOK[item.id].mark + ' ' + item.name}</Chip>,
    )}</Chips>}
    {entries.map((question, index) => {
      const look = lookOf(question);
      return <Pressable {...tapFx} key={question.id} accessibilityRole="button" onPress={() => open(question.id)}
        style={({ pressed }) => [styles.qCard, asStyle({ borderColor: look.color + '66', backgroundImage: `linear-gradient(100deg, ${look.color}1f, #1a243c 55%)`, animationDelay: index * 60 + 'ms' }), pressed && { opacity: .7 }]}>
        <View style={[styles.qMark, { backgroundColor: look.color + '22', borderColor: look.color }]}><Text style={{ color: look.color, fontSize: 20, fontWeight: '900' }}>{look.mark}</Text></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[S.kicker, { color: look.color }]}>{categories.find(item => item.id === question.category)?.name}</Text>
          <Text style={styles.qText}>{question.question}</Text>
        </View>
        <Text style={[styles.qArrow, { color: look.color }]}>›</Text>
      </Pressable>;
    })}
    <Button quiet onPress={() => setBrowse(!browse)}>{browse ? 'おすすめの問いに戻る' : 'ほかの問いも見る（全24問）'}</Button>
  </View>;
}

export function PersonalQuestionReading({ question, profile }: { question: Question; profile: Profile }) {
  const entry = ownResident(profile);
  const look = lookOf(question);
  return <Appear style={[S.card, styles.personal, asStyle({ borderColor: look.color })]}>
    <Text style={[S.kicker, { color: look.color }]}>あなたの海から、もう一つ</Text>
    <View style={S.row}>
      <ResidentSymbol entry={entry} profile={profile} size={57} />
      <View style={{ flex: 1 }}>
        <Text style={S.h2}>{entry.band}</Text>
        <Text style={S.body}>{entry.subtitle}</Text>
      </View>
    </View>
    <Text style={styles.pull}>{entry.summary}</Text>
    <Lit style={styles.prose} color={look.color}>{residentLens(profile, question)}</Lit>
    <TideMarks profile={profile} />
  </Appear>;
}

export function SelectedQuestionReading({ question, profile }: { question: Question; profile: Profile }) {
  const look = lookOf(question);
  return <>
    <Section title="選んだ問いを、私の海で読む" />
    <Appear style={[S.card, S.pad, asStyle({ borderColor: look.color + '88' })]}>
      <Text style={styles.qText}>{question.question}</Text>
      <Text style={[styles.oracleLine, { color: look.color }]}>{question.title}</Text>
    </Appear>
    <PersonalQuestionReading question={question} profile={profile} />
  </>;
}

export function QuestionAnswer({ question, profile, today, personal, saved, toggle, readOwn, browse, history, showToday }: {
  question: Question; profile: Profile | null; today: Date; personal: boolean; saved: boolean; toggle: () => void;
  readOwn: () => void; browse: () => void; history: () => void; showToday: () => void;
}) {
  const [reaction, setReaction] = useState<'near' | 'different' | null>(null);
  const [tried, setTried] = useState(false);
  const reading = personal && profile ? readDay(today, profile) : null;
  const look = lookOf(question);
  const lines = sentences(question.answer);
  const empathy = lines.slice(0, Math.min(2, lines.length - 1));
  const middle = lines.slice(empathy.length, -1);
  const core = lines[lines.length - 1];
  const category = categories.find(item => item.id === question.category)?.name;

  return <View style={S.stack}>
    {/* 1. 問い：大きく、色と神で迎える */}
    <View style={[S.card, styles.qHero, asStyle({ borderColor: look.color, backgroundImage: `radial-gradient(circle at 90% 10%, ${look.color}40, transparent 60%), linear-gradient(170deg, #1a243c, #10172a)` })]}>
      <Sparkles color={look.color} />
      <Text style={[S.kicker, { color: look.color }]}>{personal ? '同じ問い、あなたの海で' : look.mark + '　' + category}</Text>
      <Text accessibilityRole="header" style={styles.qHeroText}>{question.question}</Text>
    </View>

    {/* 2. 神のこたえ：一行の神託 */}
    <Oracle god={look.god} name={look.voice} color={look.color}>
      <Text style={S.kicker}>神のこたえ</Text>
      <TypeText text={question.title} delay={500} speed={45} style={[styles.oracleLine, { color: C.ink }]} />
    </Oracle>

    {!personal && <>
      {/* 3. 共感：静かな語り（左に色の線） */}
      <Appear style={[styles.empathy, asStyle({ borderLeftColor: look.color })]}>
        <Text style={[S.kicker, { color: look.color }]}>こんなこと、ありませんか</Text>
        {empathy.map((line, i) => <Lit key={i} style={styles.empathyText} color={look.color}>{line}</Lit>)}
      </Appear>

      {/* 4. 読み：ふつうの文 */}
      {!!middle.length && <Appear style={styles.reading}>
        {middle.map((line, i) => <Lit key={i} style={styles.prose} color={look.color}>{line}</Lit>)}
      </Appear>}

      {/* 5. 核心：大きく、光らせる */}
      <Appear style={[styles.core, asStyle({ borderColor: look.color, boxShadow: `0 0 40px ${look.color}2e` })]}>
        <Text style={[styles.coreMark, { color: look.color }]}>✦</Text>
        <Lit style={styles.coreText} color={look.color}>{core}</Lit>
      </Appear>

      {/* 6. もう一つの問い：自分に向けて */}
      <Appear style={styles.follow}>
        <Text style={[styles.followMark, { color: look.color }]}>？</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={S.kicker}>自分に聞いてみる</Text>
          <Text style={styles.followText}>{question.followUp}</Text>
        </View>
      </Appear>

      {/* 7. 今日の一手：札にして、試したら印をつける */}
      <Appear style={[styles.ticket, tried ? asStyle({ borderColor: look.color, backgroundColor: look.color + '22' }) : {}]}>
        <View style={S.between}>
          <Text style={[S.kicker, { color: C.gold }]}>今日の一手</Text>
          <Text style={S.tiny}>5分でできること</Text>
        </View>
        <Text style={styles.ticketText}>{question.action}</Text>
        <Pressable {...tapFx} accessibilityRole="checkbox" accessibilityState={{ checked: tried }} onPress={() => setTried(!tried)}
          style={[styles.try, tried && { backgroundColor: look.color, borderColor: look.color }]}>
          <Text style={[styles.tryText, tried && { color: C.dark }]}>{tried ? '✓ やってみる、と決めた' : 'やってみる'}</Text>
        </Pressable>
        {tried && <Text {...fx('pop')} style={[S.tiny, { textAlign: 'center' }]}>小さな一手が、潮の向きを変えます。</Text>}
      </Appear>

      <Button onPress={readOwn}>この問いを、私の海で読む　✦</Button>
    </>}

    {personal && reading && profile && <>
      <PersonalQuestionReading question={question} profile={profile} />
      <Appear style={[S.card, S.pad]}>
        <Text style={S.h2}>いまの海を重ねる</Text>
        {([
          ['年の海流', OUTER[reading.context.outer].n, reading.layers.year],
          ['この月の海況', STAGES[stageFor(reading.context, profile.t)].n, reading.layers.block],
          ['今日の潮', reading.context.moon, reading.layers.day],
        ] as const).map(([label, name, level]) => <View key={label} style={styles.layer}>
          <Text style={[styles.layerTier, { color: tierColors[level], borderColor: tierColors[level] }]}>{tiers[level]}</Text>
          <View style={{ flex: 1 }}><Text style={S.tiny}>{label}</Text><Text style={S.h3}>{name}</Text></View>
        </View>)}
        <Gloss style={S.body}>{reading.layers.text}</Gloss>
      </Appear>
      <Section title="その悩みが強かったのは、いつ頃でしたか？" />
      <Button onPress={history}>あの頃の海と比べる</Button>
      <Button quiet onPress={showToday}>今日の海を見る</Button>
    </>}

    <Card>
      <Chips>
        {!personal && <>
          <Chip active={reaction === 'near'} onPress={() => setReaction(reaction === 'near' ? null : 'near')}>これは近い</Chip>
          <Chip active={reaction === 'different'} onPress={() => setReaction(reaction === 'different' ? null : 'different')}>少し違う</Chip>
        </>}
        <Chip active={saved} onPress={toggle}>{saved ? '今日の保存を取り消す' : '残しておく'}</Chip>
      </Chips>
      <Text style={S.tiny}>{reaction === 'different' ? 'しっくりくる別の問いも選べます。' : '「残しておく」を選ぶと、今日の日付と問いがこの端末の記録に残ります。'}</Text>
    </Card>
    <Button quiet onPress={browse}>別の問いを見る</Button>
  </View>;
}

const styles = StyleSheet.create({
  hero: { padding: 20, minHeight: 200, justifyContent: 'center' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { color: C.ink, fontSize: 27, lineHeight: 38, fontFamily: rounded, fontWeight: '900' },
  shade: { backgroundColor: '#0d1828d9' },
  qCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, borderWidth: 1.5, backgroundColor: C.panel },
  qMark: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qText: { color: C.ink, fontSize: 17, lineHeight: 27, fontWeight: '800' },
  qArrow: { fontSize: 26, fontWeight: '700' },
  qHero: { padding: 20, gap: 10, borderWidth: 2 },
  qHeroText: { color: C.ink, fontSize: 24, lineHeight: 37, fontFamily: rounded, fontWeight: '900' },
  oracle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  oracleGod: { width: 76, alignItems: 'center' },
  oracleName: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  bubble: { flex: 1, gap: 6, padding: 16, borderRadius: 22, borderWidth: 1.5, backgroundColor: '#141e37' },
  tail: { position: 'absolute', left: -9, top: '45%', width: 0, height: 0, borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 9, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  oracleLine: { fontSize: 21, lineHeight: 33, fontFamily: rounded, fontWeight: '900' },
  empathy: { gap: 8, paddingLeft: 16, paddingVertical: 6, borderLeftWidth: 3 },
  empathyText: { color: C.muted, fontSize: 16, lineHeight: 30, fontStyle: 'italic' },
  reading: { gap: 10, paddingHorizontal: 4 },
  prose: { color: C.ink, fontSize: 16, lineHeight: 29 },
  core: { alignItems: 'center', gap: 6, padding: 20, borderRadius: 24, borderWidth: 1.5, backgroundColor: '#141e37' },
  coreMark: { fontSize: 22 },
  coreText: { color: C.ink, fontSize: 20, lineHeight: 34, fontFamily: rounded, fontWeight: '900', textAlign: 'center' },
  follow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: '#111a31', borderWidth: 1, borderColor: C.line },
  followMark: { fontSize: 44, lineHeight: 52, fontFamily: display },
  followText: { color: C.ink, fontSize: 18, lineHeight: 28, fontWeight: '800' },
  ticket: { gap: 10, padding: 16, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.gold, backgroundColor: 'rgba(234,204,140,.07)' },
  ticketText: { color: C.ink, fontSize: 19, lineHeight: 29, fontWeight: '900' },
  try: { alignSelf: 'center', paddingHorizontal: 22, minHeight: 44, justifyContent: 'center', borderRadius: 22, borderWidth: 1.5, borderColor: C.gold },
  tryText: { color: C.gold, fontSize: 15, fontWeight: '900' },
  personal: { padding: 17, gap: 10, borderWidth: 1.5 },
  pull: { color: C.ink, fontSize: 19, lineHeight: 30, fontFamily: rounded, fontWeight: '900' },
  layer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line },
  layerTier: { minWidth: 62, textAlign: 'center', paddingVertical: 4, borderRadius: 12, borderWidth: 1.5, fontSize: 16, fontFamily: display },
});
