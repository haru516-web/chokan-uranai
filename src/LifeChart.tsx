import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, C, Card, Chip, Chips, Heading, S } from './ui';
import { categories, findQuestion, questions, type Reflection } from './voyage';

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
      <Text style={S.tiny}>記録はこの端末に保存されます。</Text>
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

const styles = StyleSheet.create({
  year: { width: 94, minHeight: 82, padding: 9, gap: 3 },
  selected: { borderColor: C.gold, backgroundColor: C.raised },
  band: { flexDirection: 'row', gap: 2, marginTop: 4 },
  stripe: { flex: 1, height: 4, borderRadius: 2 },
  field: { minHeight: 86, textAlignVertical: 'top' },
});
