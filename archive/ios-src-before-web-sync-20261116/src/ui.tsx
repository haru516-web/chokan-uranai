import { Image } from './web/image';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gloss } from './Glossary';

export const C = {
  base: '#10172a', panel: '#1a243c', raised: '#273450', line: '#414e6a',
  ink: '#fbf3e0', muted: '#bac6dd', aqua: '#b6cde8', gold: '#eacc8c',
  dark: '#1b2436', error: '#ffc4ac',
};

export const rounded = Platform.select({ ios: 'Hiragino Maru Gothic ProN', web: '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Yu Gothic UI", sans-serif', default: 'sans-serif' });
export const display = Platform.select({ ios: 'Hiragino Sans', web: '"Dela Gothic One", "Zen Maru Gothic", sans-serif', default: 'sans-serif' });
const serif = rounded;
/** CSS（magic.css）の演出を当てるための data 属性。 */
export const ui = (name: string, extra?: object) => ({ dataSet: { ui: name, ...extra } }) as object;

/** カード型の押せる要素に、浮き上がる・光る手ざわりをつける。 */
export const tapFx = { dataSet: { ui: 'tap' } } as object;

/** 画面幅に応じた段数。スマホ・タブレットは2段、PC（1000px以上）は4段。 */
export function useColumns() {
  const width = useWindowDimensions().width;
  const desktop = width >= 1000;
  return { desktop, cols: desktop ? 4 : 2, item: desktop ? '23.6%' : '48.5%' } as const;
}

export const S = StyleSheet.create({
  body: { color: C.muted, fontSize: 16, lineHeight: 27 },
  title: { color: C.ink, fontSize: 30, lineHeight: 42, fontFamily: serif, fontWeight: '700' },
  h2: { color: C.ink, fontSize: 23, lineHeight: 32, fontFamily: serif, fontWeight: '700' },
  h3: { color: C.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  kicker: { color: C.gold, fontSize: 12, lineHeight: 18, fontWeight: '800', letterSpacing: 2 },
  tiny: { color: C.muted, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 20, overflow: 'hidden',
    // 縁を、やわらかく光らせる。
    ...({ boxShadow: '0 0 0 1px rgba(234, 204, 140, .22), 0 0 24px rgba(234, 204, 140, .22), inset 0 0 18px rgba(234, 204, 140, .08)' } as object) },
  pad: { padding: 17, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  stack: { gap: 13 },
  field: { color: C.ink, backgroundColor: C.base, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 13, fontSize: 16, minHeight: 48 },
});

export function Art({ source, height, label }: { source: string | number; height: number; label?: string }) {
  return <View {...ui('art')} style={{ width: '100%', height, overflow: 'hidden' }}>
    <Image source={source} style={{ width: '100%', height }} contentFit="cover" accessibilityLabel={label} accessible={!!label} />
  </View>;
}

export function Button({ children, onPress, quiet = false, disabled = false }: {
  children: string; onPress: () => void; quiet?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} {...ui(quiet ? 'quiet' : 'gold')}
      style={({ pressed }) => [b.button, quiet && b.quiet, (pressed || disabled) && b.dim]}>
      <Text style={[b.text, quiet && { color: C.aqua }]}>{children}</Text>
    </Pressable>
  );
}

export function Chip({ children, active, onPress }: { children: string; active?: boolean; onPress?: () => void }) {
  const style = [b.chip, active && b.chipActive];
  const text = <Text style={[b.chipText, active && { color: C.dark }]}>{children}</Text>;
  return onPress
    ? <Pressable {...ui('chip')} style={style} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!active }}>{text}</Pressable>
    : <View style={style}>{text}</View>;
}

export function Chips({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>{children}</View>;
}

export function Heading({ tag, title, body }: { tag: string; title: string; body?: string }) {
  return <View style={{ gap: 3 }}><Text style={S.kicker}>{tag}</Text><Text accessibilityRole="header" style={S.title}>{title}</Text>{body && <Gloss style={S.body}>{body}</Gloss>}</View>;
}

export function Section({ title, note }: { title: string; note?: string }) {
  return <View style={{ gap: 3 }}><Text accessibilityRole="header" style={S.h2}>{title}</Text>{note && <Gloss style={S.tiny}>{note}</Gloss>}</View>;
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={[S.card, S.pad]}>{children}</View>;
}

// タップで開閉する見出し。長い説明は閉じておき、気になった人だけが開く。
export function Fold({ title, hint, children, open, onToggle }: {
  title: string; hint?: string; children: ReactNode; open: boolean; onToggle: () => void;
}) {
  return <View style={[S.card, open && { borderColor: C.gold }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}
      style={({ pressed }) => [b.fold, pressed && b.dim]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={S.h3}>{title}</Text>
        {hint && !open && <Text style={S.tiny}>{hint}</Text>}
      </View>
      <Text {...ui('fold-mark', { open })} style={[S.h2, { color: C.gold }]}>{open ? '−' : '＋'}</Text>
    </Pressable>
    {open && <View {...ui('fold-body')} style={b.foldBody}>{children}</View>}
  </View>;
}

// 次に進む先を、行き先が分かる文言で並べる。
export function NextLinks({ items }: { items: { icon?: string; label: string; hint?: string; onPress: () => void }[] }) {
  return <View style={{ gap: 8 }}>
    {items.map(item => <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} {...ui('tap')}
      style={({ pressed }) => [S.card, b.link, pressed && b.dim]}>
      {item.icon && <View style={b.icon}><Text style={{ fontSize: 22 }}>{item.icon}</Text></View>}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={S.h3}>{item.label}</Text>
        {item.hint && <Text style={S.tiny}>{item.hint}</Text>}
      </View>
      <Text style={[S.h2, { color: C.gold }]}>›</Text>
    </Pressable>)}
  </View>;
}

export function Tile({ source, title, subtitle, onPress }: { source: string | number; title: string; subtitle: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} {...ui('tap')} style={({ pressed }) => [S.card, { flex: 1 }, pressed && b.dim]}>
    <Art source={source} height={132} />
    <View style={{ padding: 12, gap: 2 }}><Text style={S.kicker}>{subtitle}</Text><Text style={S.h3}>{title}</Text></View>
  </Pressable>;
}

const b = StyleSheet.create({
  button: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold, borderRadius: 14, borderColor: C.gold, borderWidth: 1 },
  quiet: { backgroundColor: C.panel, borderColor: C.line },
  dim: { opacity: 0.65 },
  fold: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 17, paddingVertical: 14, minHeight: 56 },
  foldBody: { paddingHorizontal: 17, paddingBottom: 17, gap: 10 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#243253' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 17, paddingVertical: 14, minHeight: 60 },
  text: { fontSize: 16, color: C.dark, fontWeight: '800', textAlign: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, minHeight: 42, justifyContent: 'center', borderRadius: 100, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  chipActive: { backgroundColor: C.aqua, borderColor: C.aqua },
  chipText: { fontSize: 14, color: C.muted, fontWeight: '700' },
});


