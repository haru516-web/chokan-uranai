import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './ui';

// ヘッダー直下のグローバルナビ。いまいる場所を強調し、どこに何があるかを一目で示す。
export const mainTabs = [
  { id: 'today', label: '占い', title: '今日の占い', mark: '☾', accent: '#eacc8c' },
  { id: 'tarot', label: 'タロット', title: 'タロット', mark: '✧', accent: '#c9a8f0' },
  { id: 'self', label: '自己診断', title: '自己診断', mark: '◇', accent: '#9fd8c7' },
  { id: 'chart', label: '人生', title: '人生の流れ', mark: '◈', accent: '#f0b48f' },
  { id: 'questions', label: '問い', title: '問いの海', mark: '◌', accent: '#a8c4f0' },
  { id: 'atlas', label: '図鑑', title: '住人図鑑', mark: '✦', accent: '#d6a8e8' },
] as const;

export type MainTab = typeof mainTabs[number]['id'];

export function TabBar({ activeTab, onSelect, wide }: {
  seasonIndex: number | null; activeTab: MainTab; onSelect: (tab: MainTab) => void; wide?: boolean;
}) {
  // ヘッダー直下のグローバルナビ。6つを均等に割り、全部が常に見える。現在地は色・光る下線・跳ねる印で示す。
  return <View accessibilityRole="tablist" style={s.top}>
    {mainTabs.map(item => {
      const active = item.id === activeTab;
      return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{ selected: active }} onPress={() => onSelect(item.id)}
        {...({ dataSet: { ui: 'tab', active } } as object)}
        style={({ pressed }) => [s.topTab, { '--accent': item.accent } as object, active && { backgroundColor: item.accent + '14' }, pressed && { opacity: .6 }]}>
        <Text {...({ dataSet: { ui: 'tab-mark' } } as object)} style={[s.mark, { color: active ? item.accent : '#6c7896' }]}>{item.mark}</Text>
        <Text numberOfLines={1} style={[s.topLabel, wide && { fontSize: 14 }, active && { color: item.accent }]}>{wide ? item.title.replace('（航海帳）', '') : item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', flexGrow: 0, flexShrink: 0, backgroundColor: '#0d1324', borderBottomWidth: 1, borderBottomColor: C.line },
  topTab: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 2, gap: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 15, lineHeight: 18 },
  topLabel: { fontSize: 12.5, lineHeight: 18, fontWeight: '800', color: C.muted },
});
