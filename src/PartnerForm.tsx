// 相性タブの「名前と生年月日で選ぶ」入力欄。占いの入力と同じ規則（生年月日・下の名前・辞書にない字の画数）で、相手を読む。
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { type Inputs, jstToday, unknownChars, validate } from './domain';
import { nameChars, strokeOf } from './strokes';
import { Button, C, S, ui } from './ui';

const dateFields = [
  { label: '年', example: '1998', length: 4 },
  { label: '月', example: '4', length: 2 },
  { label: '日', example: '12', length: 2 },
];

export function PartnerForm({ onSubmit }: { onSubmit: (inputs: Inputs) => void }) {
  const [parts, setParts] = useState(['', '', '']);
  const [name, setName] = useState('');
  const [manual, setManual] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const fields = useRef<({ focus: () => void } | null)[]>([]);

  const [year, month, day] = parts.map(Number);
  const fieldOk = [parts[0].length === 4 && year >= 1900 && year <= jstToday().getUTCFullYear(), !!parts[1] && month >= 1 && month <= 12, !!parts[2] && day >= 1 && day <= 31];
  const chars = nameChars(name.trim());
  const unknown = unknownChars(name);
  const strokes = chars.map(char => strokeOf(char)?.n ?? Number(manual[char] || 0));
  const strokesOk = chars.length > 0 && strokes.every(count => count > 0);

  function changePart(index: number, text: string) {
    const value = text.normalize('NFKC').replace(/[^0-9]/g, '');
    setParts(previous => previous.map((part, i) => i === index ? value : part));
    setError('');
    const complete = value.length === dateFields[index].length || (index === 1 && value.length === 1 && Number(value) > 1) || (index === 2 && value.length === 1 && Number(value) > 3);
    if (complete) fields.current[index + 1]?.focus();
  }

  function submit() {
    const birth = parts.map((part, index) => part.padStart(dateFields[index].length, '0')).join('-');
    const inputs = { birth, name, manual: Object.fromEntries(unknownChars(name).map(char => [char, manual[char]])) };
    const message = validate(inputs);
    setError(message);
    if (!message) onSubmit(inputs);
  }

  return <View style={S.stack}>
    <Text style={S.h3}>生年月日</Text>
    <View style={styles.dateRow}>
      {dateFields.map(({ label, example, length }, index) => (
        <View key={label} style={[styles.datePart, index === 0 && styles.year]}>
          <Text style={S.tiny}>{label}</Text>
          <TextInput
            ref={(node: unknown) => { fields.current[index] = node as { focus: () => void } | null; }}
            accessibilityLabel={'相手の生年月日の' + label}
            placeholder={example} placeholderTextColor="#66728f" keyboardType="number-pad" inputMode="numeric" maxLength={length}
            value={parts[index]} onChangeText={text => changePart(index, text)}
            {...ui('field', { ok: fieldOk[index] })} style={[S.field, styles.dateInput]} />
        </View>
      ))}
    </View>
    <Text style={S.h3}>下の名前</Text>
    <TextInput ref={(node: unknown) => { fields.current[3] = node as { focus: () => void } | null; }} accessibilityLabel="相手の下の名前"
      placeholder="例　健太" placeholderTextColor="#66728f" value={name} maxLength={60} autoCorrect={false} autoCapitalize="none"
      onChangeText={text => { setName(text); setError(''); }} onSubmitEditing={submit}
      {...ui('field', { ok: strokesOk })} style={S.field} />
    <Text style={S.tiny}>普段使う表記（漢字・かな・アルファベット）でOK。名字は不要です。この端末の中だけで使い、保存はしません。</Text>
    {unknown.map(char => <View key={char} style={S.between}>
      <Text style={S.body}>「{char}」は辞書にない字です。画数を教えてください</Text>
      <TextInput accessibilityLabel={char + 'の画数'} placeholder="画数" placeholderTextColor="#66728f" keyboardType="number-pad" inputMode="numeric" maxLength={2}
        value={manual[char] ?? ''} onChangeText={value => setManual(previous => ({ ...previous, [char]: value.normalize('NFKC').replace(/[^0-9]/g, '') }))}
        {...ui('field')} style={[S.field, { width: 96 }]} />
    </View>)}
    {!!error && <Text accessibilityRole="alert" style={[S.body, { color: C.error }]}>{error}</Text>}
    <Button onPress={submit}>この人との相性を読む　✦</Button>
  </View>;
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', gap: 8 },
  datePart: { flex: 1, minWidth: 0, gap: 3 },
  year: { flex: 1.5 },
  dateInput: { width: '100%', minWidth: 0, paddingHorizontal: 5, textAlign: 'center', fontSize: 20, fontWeight: '800' },
});
