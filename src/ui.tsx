import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export const C = {
  base: '#10172a', panel: '#1a243c', raised: '#273450', line: '#414e6a',
  ink: '#fbf3e0', muted: '#bac6dd', aqua: '#b6cde8', gold: '#eacc8c',
  dark: '#1b2436', error: '#ffc4ac',
};

const serif = Platform.select({ ios: 'Hiragino Mincho ProN', web: '"Yu Mincho", "Hiragino Mincho ProN", serif', default: 'serif' });
export const S = StyleSheet.create({
  body: { color: C.muted, fontSize: 14, lineHeight: 24 },
  title: { color: C.ink, fontSize: 30, lineHeight: 42, fontFamily: serif, fontWeight: '700' },
  h2: { color: C.ink, fontSize: 22, lineHeight: 31, fontFamily: serif, fontWeight: '700' },
  h3: { color: C.ink, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  kicker: { color: C.gold, fontSize: 10, lineHeight: 16, fontWeight: '800', letterSpacing: 2 },
  tiny: { color: C.muted, fontSize: 11, lineHeight: 17 },
  card: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  pad: { padding: 17, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stack: { gap: 13 },
  field: { color: C.ink, backgroundColor: C.base, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 13, fontSize: 16, minHeight: 48 },
});

export function Art({ source, height, label }: { source: number; height: number; label?: string }) {
  return <Image source={source} style={{ width: '100%', height }} contentFit="cover" accessibilityLabel={label} accessible={!!label} />;
}

export function Button({ children, onPress, quiet = false, disabled = false }: {
  children: string; onPress: () => void; quiet?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => [b.button, quiet && b.quiet, (pressed || disabled) && b.dim]}>
      <Text style={[b.text, quiet && { color: C.aqua }]}>{children}</Text>
    </Pressable>
  );
}

export function Chip({ children, active, onPress }: { children: string; active?: boolean; onPress?: () => void }) {
  const style = [b.chip, active && b.chipActive];
  const text = <Text style={[b.chipText, active && { color: C.dark }]}>{children}</Text>;
  return onPress
    ? <Pressable style={style} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}>{text}</Pressable>
    : <View style={style}>{text}</View>;
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>{children}</View>;
}

export function Heading({ tag, title, body }: { tag: string; title: string; body?: string }) {
  return <View style={{ gap: 3 }}><Text style={S.kicker}>{tag}</Text><Text accessibilityRole="header" style={S.title}>{title}</Text>{body && <Text style={S.body}>{body}</Text>}</View>;
}

export function Section({ title, note }: { title: string; note?: string }) {
  return <View style={{ gap: 3 }}><Text accessibilityRole="header" style={S.h2}>{title}</Text>{note && <Text style={S.tiny}>{note}</Text>}</View>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={[S.card, S.pad]}>{children}</View>;
}

export function Tile({ source, title, subtitle, onPress }: { source: number; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [S.card, { flex: 1 }, pressed && b.dim]}>
    <Art source={source} height={132} />
    <View style={{ padding: 12, gap: 2 }}><Text style={S.kicker}>{subtitle}</Text><Text style={S.h3}>{title}</Text></View>
  </Pressable>;
}

const b = StyleSheet.create({
  button: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold, borderRadius: 14, borderColor: C.gold, borderWidth: 1 },
  quiet: { backgroundColor: C.panel, borderColor: C.line },
  dim: { opacity: 0.65 },
  text: { fontSize: 14, color: C.dark, fontWeight: '800', textAlign: 'center' },
  chip: { paddingHorizontal: 11, paddingVertical: 8, minHeight: 36, justifyContent: 'center', borderRadius: 100, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  chipActive: { backgroundColor: C.aqua, borderColor: C.aqua },
  chipText: { fontSize: 12, color: C.muted, fontWeight: '700' },
});
