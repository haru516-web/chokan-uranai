import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C } from './ui';
import { Image } from './web/image';
import { uiIcon } from './art';

// 画面下のタブバー（iOS 標準の配置）。いまいる場所を強調し、どこに何があるかを一目で示す。
export const mainTabs = [
  { id: 'today', label: '占い', title: '今日の占い', mark: '☾', accent: '#eacc8c' },
  // 今日の鑑定書だけを独立させたタブ。毎日変わる中身を、いちばん手前に置く。
  { id: 'reading', label: '鑑定', title: '今日の鑑定', mark: '✺', accent: '#f2b49a' },
  { id: 'tarot', label: 'タロット', title: 'タロット', mark: '✧', accent: '#c9a8f0' },
  { id: 'match', label: '相性', title: '二人の相性', mark: '♡', accent: '#f0a8c0' },
  { id: 'chart', label: '人生', title: '人生の流れ', mark: '◈', accent: '#f0b48f' },
  // 問いはタブ欄から外した（占い・鑑定の「次はどうする？」から開く）。画面そのものは残してある。
  { id: 'questions', label: '問い', title: '問いの海', mark: '◌', accent: '#a8c4f0', hidden: true },
  { id: 'atlas', label: '図鑑', title: '住人図鑑', mark: '✦', accent: '#d6a8e8' },
] as const;

export type MainTab = typeof mainTabs[number]['id'];

/** タブの印。new＝はじめて（NEW の札）、dot＝今日まだ開いていない（赤い点）。 */
export type TabBadge = 'new' | 'dot';

export function TabBar({ activeTab, onSelect, wide, badges }: {
  seasonIndex: number | null; activeTab: MainTab; onSelect: (tab: MainTab) => void; wide?: boolean;
  badges?: Partial<Record<MainTab, TabBadge>>;
}) {
  // ヘッダー直下のグローバルナビ。6つを均等に割り、全部が常に見える。現在地は色・光る下線・跳ねる印で示す。
  return <View accessibilityRole="tablist" style={s.top}>
    {mainTabs.filter(item => !('hidden' in item && item.hidden)).map(item => {
      const active = item.id === activeTab;
      const badge = active ? undefined : badges?.[item.id];
      return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.title + (badge ? '（今日の分が未読）' : '')} accessibilityState={{ selected: active }} onPress={() => onSelect(item.id)}
        {...({ dataSet: { ui: 'tab', active } } as object)}
        style={({ pressed }) => [s.topTab, { '--accent': item.accent } as object, active && { backgroundColor: item.accent + '14' }, pressed && { opacity: .6 }]}>
        {(() => { const icon = uiIcon('tab-' + item.id + (active ? '-on' : '-off')); return icon
          ? <View {...({ dataSet: { ui: 'tab-mark' } } as object)}><Image source={icon} style={{ width: 34, height: 34 }} contentFit="contain" accessible={false} /></View>
          : <Text {...({ dataSet: { ui: 'tab-mark' } } as object)} style={[s.mark, { color: active ? item.accent : '#6c7896' }]}>{item.mark}</Text>; })()}
        <Text numberOfLines={1} style={[s.topLabel, wide && { fontSize: 14 }, active && { color: item.accent }]}>{wide ? item.title.replace('（航海帳）', '') : item.label}</Text>
        {badge === 'dot' && <View pointerEvents="none" accessible={false} style={s.dot} />}
        {badge === 'new' && <View pointerEvents="none" accessible={false} style={s.newPill}><Text style={s.newText}>NEW</Text></View>}
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', flexGrow: 0, flexShrink: 0, backgroundColor: 'rgba(13,19,36,.94)', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, zIndex: 5 },
  topTab: { flex: 1, minWidth: 0, minHeight: 66, paddingHorizontal: 2, paddingTop: 8, paddingBottom: 6, gap: 3, alignItems: 'center', justifyContent: 'center' },
  mark: { fontSize: 28, lineHeight: 34 },
  // 印はアイコンの右上に重ねる。タップは下のタブに通す（pointerEvents="none"）。
  dot: { position: 'absolute', top: 7, left: '50%', marginLeft: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff5a4d', borderWidth: 2, borderColor: 'rgba(13,19,36,.94)' },
  newPill: { position: 'absolute', top: 4, left: '50%', marginLeft: 4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, backgroundColor: '#ff5a4d', borderWidth: 1.5, borderColor: 'rgba(13,19,36,.94)' },
  newText: { color: '#fff', fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: .5 },
  topLabel: { fontSize: 12.5, lineHeight: 16, fontWeight: '800', color: C.muted },
});
