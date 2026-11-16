import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './ui';
import { Image } from './web/image';
import { uiIcon } from './art';

// 画面下のタブバー（iOS 標準の配置）。いまいる場所を強調し、どこに何があるかを一目で示す。
export const mainTabs = [
  { id: 'today', label: '占い', title: '今日の占い', mark: '☾', accent: '#eacc8c' },
  { id: 'tarot', label: 'タロット', title: 'タロット', mark: '✧', accent: '#c9a8f0' },
  { id: 'match', label: '相性', title: '二人の相性', mark: '♡', accent: '#f0a8c0' },
  { id: 'chart', label: '人生', title: '人生の流れ', mark: '◈', accent: '#f0b48f' },
  { id: 'questions', label: '問い', title: '問いの海', mark: '◌', accent: '#a8c4f0' },
  { id: 'atlas', label: '図鑑', title: '住人図鑑', mark: '✦', accent: '#d6a8e8' },
] as const;

export type MainTab = typeof mainTabs[number]['id'];

export function TabBar({ activeTab, onSelect, wide }: {
  seasonIndex: number | null; activeTab: MainTab; onSelect: (tab: MainTab) => void; wide?: boolean;
}) {
  // ヘッダー直下のグローバルナビ。5つを均等に割り、全部が常に見える。現在地は色・光る下線・跳ねる印で示す。
  return <View accessibilityRole="tablist" style={s.top}>
    {mainTabs.map(item => {
      const active = item.id === activeTab;
      return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{ selected: active }} onPress={() => onSelect(item.id)}
        {...({ dataSet: { ui: 'tab', active } } as object)}
        style={({ pressed }) => [s.topTab, { '--accent': item.accent } as object, active && { backgroundColor: item.accent + '14' }, pressed && { opacity: .6 }]}>
        {(() => { const icon = uiIcon('tab-' + item.id + (active ? '-on' : '-off')); return icon
          ? <View {...({ dataSet: { ui: 'tab-mark' } } as object)}><Image source={icon} style={{ width: 26, height: 26 }} contentFit="contain" accessible={false} /></View>
          : <Text {...({ dataSet: { ui: 'tab-mark' } } as object)} style={[s.mark, { color: active ? item.accent : '#6c7896' }]}>{item.mark}</Text>; })()}
        <Text numberOfLines={1} style={[s.topLabel, wide && { fontSize: 14 }, active && { color: item.accent }]}>{wide ? item.title.replace('（航海帳）', '') : item.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', flexGrow: 0, flexShrink: 0, backgroundColor: 'rgba(13,19,36,.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, zIndex: 5 },
  topTab: { flex: 1, minWidth: 0, minHeight: 56, paddingHorizontal: 2, paddingTop: 6, paddingBottom: 4, gap: 2, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 20, lineHeight: 24 },
  topLabel: { fontSize: 10.5, lineHeight: 14, fontWeight: '800', color: C.muted },
});
