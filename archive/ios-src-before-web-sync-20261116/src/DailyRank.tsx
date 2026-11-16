import { StyleSheet, Text, View } from 'react-native';
import { type readDay } from './domain';
import { C, S } from './ui';

export function DailyRank({ reading, isToday = true }: {
  reading: ReturnType<typeof readDay>; isToday?: boolean;
}) {
  const { row, outlook } = reading;
  const title = isToday ? '今日の順位' : 'この日の順位';

  return <View accessible accessibilityLabel={`${title}、160名札のうち${row.rank}位、${outlook.title}`}
    style={[S.card, styles.rankCard, { borderColor: outlook.color }]}>
    <Text style={S.kicker}>{title}</Text>
    <View style={styles.result}>
      <Text style={[styles.number, { color: outlook.color }]}>{row.rank}<Text style={S.h3}>位</Text></Text>
      <Text style={S.tiny}>／160名札</Text>
    </View>
    <Text style={[S.h3, { color: outlook.color }]}>{outlook.title}</Text>
  </View>;
}

const styles = StyleSheet.create({
  rankCard: { padding: 12, borderRadius: 14, gap: 2, alignItems: 'center', backgroundColor: C.base },
  result: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flexWrap: 'wrap', columnGap: 4 },
  number: { fontSize: 34, lineHeight: 43, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
