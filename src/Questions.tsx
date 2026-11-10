import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { harbor } from './art';
import { readDay, tierColors, tiers, type Profile } from './domain';
import { ResidentSymbol, TideMarks } from './ResidentCard';
import { OUTER, STAGES } from './scoring';
import { Button, C, Card, Chip, Chips, Heading, S, Section } from './ui';
import { categories, featuredQuestions, findQuestion, ownResident, questions, residentLens, type Question } from './voyage';

export function QuestionSea({ open, create }: { open: (id: string) => void; create?: () => void }) {
  const [browse, setBrowse] = useState(false);
  const [category, setCategory] = useState(categories[0].id);
  const recommended = featuredQuestions.map(id => findQuestion(id)!);
  const entries = browse ? questions.filter(question => question.category === category) : recommended;

  return <View style={S.stack}>
    <View style={[S.card, styles.hero]}>
      <Image source={harbor} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
      <View style={[StyleSheet.absoluteFill, styles.shade]} />
      <Heading tag="問いの海" title="最近、言葉にならないことはありませんか。" body="あなたに近い問いを、一つ選んでください。" />
      <Text style={S.tiny}>名前や生年月日を入れずに読めます。</Text>
    </View>
    {create && <Button quiet onPress={create}>先に自分の海を占う</Button>}
    <Section title={browse ? 'すべての問い' : 'おすすめの6問'} />
    {browse && <Chips>{categories.map(item =>
      <Chip key={item.id} active={category === item.id} onPress={() => setCategory(item.id)}>{item.name}</Chip>,
    )}</Chips>}
    {entries.map(question => <Pressable key={question.id} accessibilityRole="button" onPress={() => open(question.id)}
      style={({ pressed }) => [S.card, S.pad, pressed && { opacity: .7 }]}>
      <View style={S.between}>
        <Text style={S.kicker}>{question.id}　{categories.find(item => item.id === question.category)?.name}</Text>
        <Text style={S.tiny} aria-hidden>↗</Text>
      </View>
      <Text style={S.h3}>{question.question}</Text>
    </Pressable>)}
    <Button quiet onPress={() => setBrowse(!browse)}>{browse ? 'おすすめの問いに戻る' : 'ほかの問いを見る'}</Button>
  </View>;
}

export function PersonalQuestionReading({ question, profile }: { question: Question; profile: Profile }) {
  const entry = ownResident(profile);
  return <Card>
    <Text style={S.kicker}>あなたの海から、もう一つ</Text>
    <View style={S.row}>
      <ResidentSymbol entry={entry} profile={profile} size={57} />
      <View style={{ flex: 1 }}>
        <Text style={S.h2}>{entry.band}</Text>
        <Text style={S.body}>{entry.subtitle}</Text>
      </View>
    </View>
    <Text style={S.h3}>{entry.summary}</Text>
    <Text style={styles.prose}>{residentLens(profile, question)}</Text>
    <TideMarks profile={profile} />
    <Text style={S.tiny}>あなたの占いタイプから、この問いを別の角度で考えるヒントです。</Text>
  </Card>;
}

export function SelectedQuestionReading({ question, profile }: {
  question: Question; profile: Profile;
}) {
  return <>
    <Section title="選んだ問いを、私の海で読む" />
    <Card>
      <Text style={S.h3}>{question.question}</Text>
      <Text style={S.tiny}>みんなに共通する読み</Text>
      <Text style={S.body}>{question.title}</Text>
    </Card>
    <PersonalQuestionReading question={question} profile={profile} />
  </>;
}

export function QuestionAnswer({ question, profile, today, personal, saved, toggle, readOwn, browse, history, showToday }: {
  question: Question; profile: Profile | null; today: Date; personal: boolean; saved: boolean; toggle: () => void;
  readOwn: () => void; browse: () => void; history: () => void; showToday: () => void;
}) {
  const [reaction, setReaction] = useState<'near' | 'different' | null>(null);
  const reading = personal && profile ? readDay(today, profile) : null;

  return <View style={S.stack}>
    <Heading tag={personal ? '同じ問い、違う海' : '問いの海　' + question.id} title={question.question}
      body={personal ? '問いは同じでも、見える海は変わる。' : undefined} />
    <Card>
      <Text style={S.kicker}>みんなに共通する読み</Text>
      <Text style={S.h2}>{question.title}</Text>
      {!personal && <Text style={styles.prose} selectable>{question.answer}</Text>}
    </Card>
    {personal && reading && profile ? <>
      <PersonalQuestionReading question={question} profile={profile} />
      <Card>
        <Text style={S.h2}>いまの海を重ねる</Text>
        <Text style={[S.body, { color: tierColors[reading.layers.year] }]}>{reading.context.Y}年の海流　{OUTER[reading.context.outer].n} ／ {tiers[reading.layers.year]}</Text>
        <Text style={[S.body, { color: tierColors[reading.layers.block] }]}>四か月の海況　{STAGES[reading.context.stage].n} ／ {tiers[reading.layers.block]}</Text>
        <Text style={[S.body, { color: reading.outlook.color }]}>今日の潮　{reading.context.moon} ／ {reading.outlook.title}</Text>
        <Text style={S.body}>{reading.layers.text}</Text>
      </Card>
      <Section title="その悩みが強かったのは、いつ頃でしたか？" />
      <Button onPress={history}>あの頃の海と比べる</Button>
      <Button quiet onPress={showToday}>今日の海を見る</Button>
    </> : <>
      <Card>
        <Text style={S.kicker}>もう一つの問い</Text>
        <Text style={S.h3}>{question.followUp}</Text>
        <Text style={S.kicker}>今日の一手 · 試せること</Text>
        <Text style={S.body}>{question.action}</Text>
      </Card>
      <Button onPress={readOwn}>この問いを、私の海で読む</Button>
    </>}
    <Card>
      <Chips>
        {!personal && <>
          <Chip active={reaction === 'near'} onPress={() => setReaction(reaction === 'near' ? null : 'near')}>これは近い</Chip>
          <Chip active={reaction === 'different'} onPress={() => setReaction(reaction === 'different' ? null : 'different')}>少し違う</Chip>
        </>}
        <Chip active={saved} onPress={toggle}>{saved ? '今日の保存を取り消す' : '残しておく'}</Chip>
      </Chips>
      <Text style={S.tiny}>{reaction === 'different' ? 'しっくりくる別の問いも選べます。' : '「残しておく」を選ぶと、今日の日付と問いがこの端末の航海帳に残ります。'}</Text>
    </Card>
    <Button quiet onPress={browse}>別の問いを見る</Button>
  </View>;
}

const styles = StyleSheet.create({
  hero: { padding: 24, gap: 9, minHeight: 182, justifyContent: 'center' },
  shade: { backgroundColor: '#0d1828ce' },
  prose: { color: C.ink, fontSize: 16, lineHeight: 29 },
});
