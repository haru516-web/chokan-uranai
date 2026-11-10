import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { gods, harbor } from './art';
import { type Inputs, unknownChars, validate } from './domain';
import { Button, C, Card, Chip, Heading, S } from './ui';

const dateFields = [
  { label: '年', example: '1998', length: 4 },
  { label: '月', example: '04', length: 2 },
  { label: '日', example: '12', length: 2 },
];

export function ProfileForm({ initial, persist, onSubmit, title, submitLabel }: {
  initial: Inputs; persist?: boolean; onSubmit: (inputs: Inputs, remember: boolean) => void; title?: string; submitLabel?: string;
}) {
  const [parts, setParts] = useState(() => {
    const [year = '', month = '', day = ''] = initial.birth.split('-');
    return [year, month, day];
  });
  const [name, setName] = useState(initial.name);
  const [manual, setManual] = useState(initial.manual);
  const [remember, setRemember] = useState(!!persist);
  const [error, setError] = useState('');

  function submit() {
    const birth = parts.map((part, index) => part.padStart(dateFields[index].length, '0')).join('-');
    const inputs = { birth, name, manual: Object.fromEntries(unknownChars(name).map(char => [char, manual[char]])) };
    const message = validate(inputs);
    setError(message);
    if (!message) onSubmit(inputs, remember);
  }

  return <View style={[S.stack, styles.form]}>
    <View style={[S.card, styles.hero]}>
      <Image source={harbor} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="bottom" accessible={false} />
      <View style={[StyleSheet.absoluteFill, styles.shade]} />
      <View style={styles.intro}>
        <Heading tag="YOUR TIDE CARD" title={title ?? '潮札をつくる'} />
        <Text style={[S.body, styles.introText]}>生年月日と下の名前から、変わらない名札と今の海を重ねます。</Text>
      </View>
      <Image source={gods[4]} style={styles.guide} contentFit="contain" accessible={false} />
    </View>
    <Card>
      <Text style={S.h3}>生年月日</Text>
      <View style={styles.dateRow}>
        {dateFields.map(({ label, example, length }, index) => (
          <View key={label} style={[styles.datePart, index === 0 && styles.year]}>
            <Text style={S.tiny}>{label}</Text>
            <TextInput
              accessibilityLabel={'生年月日の' + label}
              placeholder={example}
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={length}
              value={parts[index]}
              onChangeText={text => setParts(previous => previous.map((part, i) =>
                i === index ? text.normalize('NFKC').replace(/[^0-9]/g, '') : part
              ))}
              style={[S.field, styles.dateInput]}
            />
          </View>
        ))}
      </View>
      <Text style={[S.h3, styles.nameLabel]}>下の名前</Text>
      <TextInput accessibilityLabel="下の名前" placeholder="例　汐里" placeholderTextColor={C.muted} value={name}
        maxLength={60} onChangeText={setName} autoCorrect={false} autoCapitalize="none" style={S.field} />
      <Text style={S.tiny}>普段使う漢字・かな・アルファベットの表記で入力してください。</Text>
      <Text style={S.tiny}>「高」と「髙」など、異体字は普段の表記で入力してください。辞書にない文字は画数を指定できます。</Text>
      {unknownChars(name).map(char => <View key={char} style={S.between}>
        <Text style={S.body}>{char} の画数</Text>
        <TextInput accessibilityLabel={char + 'の画数'} placeholder="画数" placeholderTextColor={C.muted}
          keyboardType="number-pad" maxLength={2} value={manual[char] ?? ''}
          onChangeText={value => setManual(previous => ({ ...previous, [char]: value.normalize('NFKC').replace(/[^0-9]/g, '') }))}
          style={[S.field, { width: 96 }]} />
      </View>)}
      {persist !== undefined && <><View style={S.row}><Chip active={remember} onPress={() => setRemember(!remember)}>{remember ? '端末に保存する ✓' : '端末に保存する'}</Chip></View>
      <Text style={S.tiny}>保存は任意です。入力内容はこの端末内で使います。</Text></>}
      {!!error && <Text accessibilityRole="alert" style={[S.body, { color: C.error }]}>{error}</Text>}
      <Button onPress={submit}>{submitLabel ?? '私の潮札をひらく'}</Button>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  form: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 6 },
  shade: { backgroundColor: '#071c28bf' },
  intro: { flex: 1, minWidth: 0, gap: 5 },
  introText: { color: C.ink },
  guide: { width: '29%', maxWidth: 108, aspectRatio: 1 },
  dateRow: { flexDirection: 'row', gap: 8 },
  datePart: { flex: 1, minWidth: 0, gap: 3 },
  year: { flex: 1.5 },
  dateInput: { width: '100%', minWidth: 0, paddingHorizontal: 5, textAlign: 'center' },
  nameLabel: { marginTop: 6 },
});
