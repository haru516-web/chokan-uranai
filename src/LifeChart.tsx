import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { dateKey, tierColors, tiers, type Profile } from './domain';
import { TideMarks } from './ResidentCard';
import { ctxFor, labelOf, OUTER, STAGES } from './scoring';
import { Button, C, Card, Chip, Chips, Heading, S, Section } from './ui';
import { categories, findQuestion, nextTideChange, ownResident, periodFor, questions, type Reflection, type SavedQuestion } from './voyage';

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const blockLabels = ['1〜4月', '5〜8月', '9〜12月'];

export function LifeChart({ today, profile, questionId, initialYear, create, calendar, write, showToday, records, edit }: {
  today: Date; profile: Profile | null; questionId?: string; create: () => void; calendar?: () => void;
  write: (year: number, month: number, questionId?: string) => void; showToday: () => void;
  initialYear?: number; records: Reflection[]; edit: (record: Reflection) => void;
}) {
  const thisYear = today.getUTCFullYear();
  const thisMonth = today.getUTCMonth() + 1;
  const [year, setYear] = useState(initialYear ?? (questionId ? thisYear - 1 : thisYear));
  const [month, setMonth] = useState<number | null>(null);
  const years = Array.from({ length: 13 }, (_, i) => initialYear ? thisYear - 12 + i : thisYear - i);
  const question = findQuestion(questionId);
  const period = profile && periodFor(year, profile.t);
  const currentPeriod = profile && periodFor(thisYear, profile.t);
  const selectedMonth = month ?? 1;
  const context = ctxFor(new Date(Date.UTC(year, selectedMonth - 1, 1)));
  const selectedBlock = Math.floor((selectedMonth - 1) / 4);
  const next = nextTideChange(today);
  const relevant = records.filter(record => record.year === year && (!questionId || record.questionId === questionId));

  function chooseYear(nextYear: number) {
    setYear(nextYear);
    setMonth(null);
  }

  return <View style={S.stack}>
    <Heading tag="人生の海図" title={question ? 'あなたが、その問いを強く感じたのはいつですか。' : '通ってきた海を振り返る'}
      body="過去12年の海流を、年ごとに選んで読めます。年の下の帯は、四か月ごとに変わる海況です。" />
    {question && <Card><Text style={S.kicker}>{question.id}　問いを重ねる</Text><Text style={S.h3}>{question.question}</Text></Card>}
    {!profile && <Card><Text style={S.body}>潮札をつくると、同じ時期をあなたの名札で読めます。</Text><Button quiet onPress={create}>私の潮札をひらく</Button></Card>}
    <View style={S.between}>
      <Text style={S.h3}>年を選ぶ</Text>
      <Chip active={year === thisYear} onPress={() => chooseYear(thisYear)}>今年へ</Chip>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
      {years.map(y => {
        const tide = profile && periodFor(y, profile.t);
        const names = blockLabels.map((_, i) => STAGES[ctxFor(new Date(Date.UTC(y, i * 4, 1))).stage].n);
        return <Pressable key={y} onPress={() => chooseYear(y)} accessibilityRole="button" accessibilityState={{ selected: year === y }}
          accessibilityLabel={`${y}年、${names.join('、')}`} style={[S.card, styles.year, year === y && styles.selected]}>
          <Text style={S.h3}>{y}</Text>
          <Text numberOfLines={1} style={S.tiny}>{OUTER[ctxFor(new Date(Date.UTC(y, 0, 1))).outer].n}</Text>
          <View style={styles.band}>
            {names.map((name, i) => <View key={name} style={[styles.stripe, { backgroundColor: tide ? tierColors[tide.blocks[i].level] : [C.aqua, C.line, C.gold][i] }]} />)}
          </View>
        </Pressable>;
      })}
    </ScrollView>
    <Card>
      <Text style={S.kicker}>{year}年の海流</Text>
      <Text style={S.h2}>{OUTER[context.outer].n}{period ? ' ／ ' + tiers[period.level] : ''}</Text>
      <Text style={S.body}>{OUTER[context.outer].th}の年。{OUTER[context.outer].d}。</Text>
      {blockLabels.map((label, i) => {
        const stage = STAGES[ctxFor(new Date(Date.UTC(year, i * 4, 1))).stage];
        const canSelect = year < thisYear || i * 4 + 1 <= thisMonth;
        return <Chip key={label} active={month !== null && selectedBlock === i} onPress={canSelect ? () => setMonth(i * 4 + 1) : undefined}>
          {label + '　' + stage.n + (period ? ' ／ ' + tiers[period.blocks[i].level] : '')}
        </Chip>;
      })}
      {currentPeriod && year !== thisYear && <Text style={S.tiny}>今は {currentPeriod.current.n} ／ {tiers[currentPeriod.level]}。現在の海況は {currentPeriod.blocks[Math.floor(today.getUTCMonth() / 4)].stage.n} です。</Text>}
    </Card>
    <Card>
      <Text style={S.h3}>その頃の海を読む</Text>
      <Chips>{months.filter(m => year < thisYear || m <= thisMonth).map(m =>
        <Chip key={m} active={month === m} onPress={() => setMonth(m)}>{m + '月'}</Chip>,
      )}</Chips>
      {month !== null && <>
        <Text style={S.h2}>{year}年{month}月 · {STAGES[context.stage].n}</Text>
        <Text style={S.body}>{STAGES[context.stage].d}。</Text>
        {profile && <>
          <Text style={S.body}>この象徴で読み直すなら、{ownResident(profile).band}（名札 {labelOf(profile.t)}）にとって、年の海は「{tiers[period!.level]}」、この四か月は「{tiers[period!.blocks[selectedBlock].level]}」です。</Text>
          <TideMarks profile={profile} />
        </>}
        <Text style={S.tiny}>海流と海況は、当時の出来事を振り返るための創作占いの象徴です。</Text>
        <Button onPress={() => write(year, month, questionId)}>この頃の出来事を記録する</Button>
      </>}
    </Card>
    {!!relevant.length && <>
      <Section title={year + '年の航海帳'} />
      <ReflectionCards records={relevant} edit={edit} />
    </>}
    {calendar && <Button quiet onPress={calendar}>潮環の暦と次の節目を見る</Button>}
    <Text style={S.tiny}>次の潮替わり　{dateKey(next.date)} ／ あと{next.days}日</Text>
    {question && <><Text style={S.body}>問いを解決できなくても、見え方は変わるかもしれません。</Text><Button quiet onPress={showToday}>今日の海へ</Button></>}
  </View>;
}

export function ReflectionEditor({ initial, existing, save, remove }: {
  initial: { year: number; month: number; questionId?: string }; existing?: Reflection;
  save: (value: Omit<Reflection, 'id'>) => void; remove?: () => void;
}) {
  const [event, setEvent] = useState(existing?.event ?? '');
  const [then, setThen] = useState(existing?.then ?? '');
  const [now, setNow] = useState(existing?.now ?? '');
  const [questionId, setQuestionId] = useState(existing ? existing.questionId : initial.questionId ?? null);
  const [category, setCategory] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const question = findQuestion(questionId);
  const { year, month } = initial;

  return <View style={S.stack}>
    <Heading tag={`${year}年${month}月`} title={existing ? 'あの頃の記録を読み直す' : 'あの頃の海を記録する'}
      body="出来事と、当時の自分と今の自分がどう受け取ったかを、分けて残せます。" />
    <Card>
      {([
        ['起きたこと', '例：転職した。', event, setEvent],
        ['当時の受け取り方', 'そのとき、どんなふうに受け止めましたか。', then, setThen],
        ['今の受け取り方', '今は、同じ出来事をどう見ていますか。', now, setNow],
      ] as const).map(([label, placeholder, value, update]) => <View key={label} style={{ gap: 6 }}>
        <Text style={S.h3}>{label}</Text>
        <TextInput multiline accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={C.muted}
          style={[S.field, styles.field]} maxLength={1200} value={value} onChangeText={update} />
      </View>)}
    </Card>
    <Card>
      <Text style={S.h3}>紐づける問い（任意）</Text>
      {question && <Text style={S.body}>{question.id}　{question.question}</Text>}
      <Chips>
        <Chip active={!questionId} onPress={() => { setQuestionId(null); setCategory(undefined); }}>紐づけなし</Chip>
        {categories.map(item => <Chip key={item.id} active={category === item.id} onPress={() => setCategory(item.id)}>{item.name}</Chip>)}
      </Chips>
      {category && questions.filter(item => item.category === category).map(item =>
        <Chip key={item.id} active={questionId === item.id} onPress={() => { setQuestionId(item.id); setCategory(undefined); }}>
          {item.id + '　' + item.question}
        </Chip>,
      )}
      <Text style={S.tiny}>記録はこの端末の航海帳に保存されます。</Text>
      <Button disabled={![event, then, now].some(text => text.trim())}
        onPress={() => save({ year, month, questionId, event: event.trim(), then: then.trim(), now: now.trim() })}>記録を保存</Button>
      {remove && (confirm ? <Chips>
        <Chip onPress={() => setConfirm(false)}>キャンセル</Chip><Chip active onPress={remove}>記録を削除</Chip>
      </Chips> : <Chip onPress={() => setConfirm(true)}>記録を削除する</Chip>)}
    </Card>
  </View>;
}

export function ReflectionCards({ records, edit }: { records: Reflection[]; edit: (record: Reflection) => void }) {
  return <>{records.map(record => <Card key={record.id}>
    <Text style={S.kicker}>{record.year}年{record.month}月{record.questionId ? ' · ' + record.questionId : ''}</Text>
    {([['起きたこと', record.event], ['当時の受け取り方', record.then], ['今の受け取り方', record.now]] as const)
      .filter(([, text]) => text).map(([label, text]) => <View key={label}>
        <Text style={S.h3}>{label}</Text><Text style={S.body} selectable>{text}</Text>
      </View>)}
    <Button quiet onPress={() => edit(record)}>記録を読み直す・編集する</Button>
  </Card>)}</>;
}

export function QuestionTrail({ id, saved, records, reopen, compare, remove, edit }: {
  id: string; saved: SavedQuestion[]; records: Reflection[]; reopen: () => void; compare: () => void;
  remove: (day: string) => void; edit: (record: Reflection) => void;
}) {
  const question = findQuestion(id);
  if (!question) return null;
  const dates = saved.filter(entry => entry.id === id);
  const linked = records.filter(record => record.questionId === id);
  return <View style={S.stack}>
    <Heading tag="同じ問いの航跡" title={question.question} />
    <Button onPress={reopen}>問いをもう一度読む</Button>
    <Button quiet onPress={compare}>あの頃の海と比べる</Button>
    <Section title="この問いを残した日" />
    {dates.length === 0 && <Text style={S.body}>保存した日はまだありません。</Text>}
    {dates.map(entry => <Card key={entry.day}>
      <Text style={S.h3}>{entry.day}</Text>
      <Chip onPress={() => remove(entry.day)}>この日の保存を取り消す</Chip>
    </Card>)}
    <Section title="問いに紐づけた出来事" />
    {linked.length === 0 && <Text style={S.body}>紐づけた出来事はまだありません。</Text>}
    <ReflectionCards records={linked} edit={edit} />
  </View>;
}

const styles = StyleSheet.create({
  year: { width: 94, minHeight: 82, padding: 9, gap: 3 },
  selected: { borderColor: C.gold, backgroundColor: C.raised },
  band: { flexDirection: 'row', gap: 2, marginTop: 4 },
  stripe: { flex: 1, height: 4, borderRadius: 2 },
  field: { minHeight: 86, textAlignVertical: 'top' },
});
