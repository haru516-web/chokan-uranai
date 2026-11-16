import { useRef, useState } from 'react';
import { Image } from './web/image';
import { StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { harbor } from './art';
import { GodAnimation } from './GodAnimation';
import { TermText } from './Glossary';
import { type Inputs, jstToday, unknownChars, validate } from './domain';
import { SEASON } from './scoring';
import { nameChars, strokeOf } from './strokes';
import { Button, C, Card, Chip, Heading, S, ui } from './ui';
import { Float, fx, Sparkles } from './Visual';

const dateFields = [
  { label: '年', example: '1998', length: 4 },
  { label: '月', example: '4', length: 2 },
  { label: '日', example: '12', length: 2 },
];
const asStyle = (style: object) => style as unknown as ViewStyle;

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
  const fields = useRef<({ focus: () => void } | null)[]>([]);

  // 入力しながら、その場で読み取れたことを見せる（季節は生年月日、画数は名前から）。
  const [year, month, day] = parts.map(Number);
  const filled = parts[0].length === 4 && !!parts[1] && !!parts[2];
  const date = new Date(Date.UTC(year, month - 1, day));
  const dateOk = filled && year >= 1900 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && date <= jstToday();
  const fieldOk = [parts[0].length === 4 && year >= 1900 && year <= jstToday().getUTCFullYear(), !!parts[1] && month >= 1 && month <= 12, !!parts[2] && day >= 1 && day <= 31];
  const dateHint = !filled ? '' : dateOk ? '' : month < 1 || month > 12 ? '月は1〜12で入力してください。' : year < 1900 ? '1900年以降の年を入力してください。' : date > jstToday() ? '今日までの日付を入力してください。' : 'その日付は暦にありません。';
  const season = dateOk ? SEASON[(year + month + day) % 4] : null;
  const chars = nameChars(name.trim());
  const unknown = unknownChars(name);
  const strokes = chars.map(char => strokeOf(char)?.n ?? Number(manual[char] || 0));
  const strokesOk = chars.length > 0 && strokes.every(count => count > 0);
  const total = strokes.reduce((sum, count) => sum + count, 0);
  const ready = dateOk && strokesOk;

  function changePart(index: number, text: string) {
    const value = text.normalize('NFKC').replace(/[^0-9]/g, '');
    setParts(previous => previous.map((part, i) => i === index ? value : part));
    setError('');
    // 桁がそろったら、次の欄へ自動で進む（月・日は、2桁目がありえない数字なら1桁で進む）。
    const complete = value.length === dateFields[index].length || (index === 1 && value.length === 1 && Number(value) > 1) || (index === 2 && value.length === 1 && Number(value) > 3);
    if (complete) fields.current[index + 1]?.focus();
  }

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
      <Sparkles />
      <View style={styles.intro}>
        <Heading tag="YOUR TIDE CARD" title={title ?? '潮札をつくる'} />
        <Text style={[S.body, styles.introText]}>入力は2つだけ。生年月日と下の名前から、今日の運勢を読みます。</Text>
      </View>
      <Float style={styles.guide}><GodAnimation forcePlay index={season ? SEASON.indexOf(season) : 4} style={{ width: '100%' }} /></Float>
    </View>
    <Card>
      <View style={S.between}>
        <Text style={S.h3}><Text style={styles.step}>壱　</Text>生年月日</Text>
        <Text style={S.tiny}><TermText id="季節" style={S.tiny} />が決まります</Text>
      </View>
      <View style={styles.dateRow}>
        {dateFields.map(({ label, example, length }, index) => (
          <View key={label} style={[styles.datePart, index === 0 && styles.year]}>
            <Text style={S.tiny}>{label}</Text>
            <TextInput
              ref={(node: unknown) => { fields.current[index] = node as { focus: () => void } | null; }}
              accessibilityLabel={'生年月日の' + label}
              placeholder={example}
              placeholderTextColor="#66728f"
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={length}
              value={parts[index]}
              onChangeText={text => changePart(index, text)}
              {...ui('field', { ok: fieldOk[index] })}
              style={[S.field, styles.dateInput]}
            />
          </View>
        ))}
      </View>
      {!!dateHint && <Text accessibilityRole="alert" style={[S.tiny, { color: C.error }]}>{dateHint}</Text>}
      {season && <View key={season.n} {...fx('pop')} style={[styles.found, asStyle({ borderColor: season.col, backgroundImage: `linear-gradient(100deg, ${season.col}33, transparent)` })]}>
        <Text style={[styles.foundMark, { color: season.col }]}>{season.n}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.foundTitle}>{season.n}の海に生まれた人</Text>
          <Text style={S.tiny}>{season.act}ことに力が出る型です。</Text>
        </View>
      </View>}

      <View style={[S.between, styles.nameLabel]}>
        <Text style={S.h3}><Text style={styles.step}>弐　</Text>下の名前</Text>
        <Text style={S.tiny}>画数で<TermText id="深さ" style={S.tiny} />が決まります</Text>
      </View>
      <TextInput ref={(node: unknown) => { fields.current[3] = node as { focus: () => void } | null; }} accessibilityLabel="下の名前" placeholder="例　汐里" placeholderTextColor="#66728f" value={name}
        maxLength={60} onChangeText={text => { setName(text); setError(''); }} autoCorrect={false} autoCapitalize="none" onSubmitEditing={submit}
        {...ui('field', { ok: strokesOk })} style={S.field} />
      <Text style={S.tiny}>普段使う表記（漢字・かな・アルファベット）でOK。名字は不要です。</Text>
      {unknown.map(char => <View key={char} style={S.between}>
        <Text style={S.body}>「{char}」は辞書にない字です。画数を教えてください</Text>
        <TextInput accessibilityLabel={char + 'の画数'} placeholder="画数" placeholderTextColor="#66728f"
          keyboardType="number-pad" inputMode="numeric" maxLength={2} value={manual[char] ?? ''}
          onChangeText={value => setManual(previous => ({ ...previous, [char]: value.normalize('NFKC').replace(/[^0-9]/g, '') }))}
          {...ui('field')} style={[S.field, { width: 96 }]} />
      </View>)}
      {strokesOk && <View key={chars.join('') + total} {...fx('pop')} style={[styles.found, { borderColor: C.gold }]}>
        <Text style={[styles.foundMark, { color: C.gold }]}>{total}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.foundTitle}>総画数 {total}画</Text>
          <Text style={S.tiny}>{chars.map((char, index) => char + ' ' + strokes[index]).join('　＋　')}</Text>
        </View>
      </View>}

      {persist !== undefined && <><View style={S.row}><Chip active={remember} onPress={() => setRemember(!remember)}>{remember ? '端末に保存する ✓' : '端末に保存する'}</Chip></View>
      <Text style={S.tiny}>保存は任意です。入力内容はこの端末の中だけで使い、どこにも送りません。</Text></>}
      {!!error && <Text accessibilityRole="alert" style={[S.body, { color: C.error }]}>{error}</Text>}
      <View {...(ready ? fx('breathe') : {})}>
        <Button onPress={submit}>{submitLabel ?? (ready ? '海をひらく　✦' : '私の潮札をひらく')}</Button>
      </View>
      {ready && <Text style={[S.tiny, { textAlign: 'center' }]}>準備ができました。あなたの名札と、今日の順位を読みます。</Text>}
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  form: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 6 },
  shade: { backgroundColor: '#071c28bf' },
  intro: { flex: 1, minWidth: 0, gap: 5 },
  introText: { color: C.ink },
  guide: { width: '29%', maxWidth: 108 },
  step: { color: C.gold, fontWeight: '900' },
  dateRow: { flexDirection: 'row', gap: 8 },
  datePart: { flex: 1, minWidth: 0, gap: 3 },
  year: { flex: 1.5 },
  dateInput: { width: '100%', minWidth: 0, paddingHorizontal: 5, textAlign: 'center', fontSize: 20, fontWeight: '800' },
  nameLabel: { marginTop: 10 },
  found: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1.5, backgroundColor: '#111a31' },
  foundMark: { fontSize: 30, lineHeight: 38, fontWeight: '900', minWidth: 44, textAlign: 'center' },
  foundTitle: { color: C.ink, fontSize: 16, lineHeight: 24, fontWeight: '800' },
});
