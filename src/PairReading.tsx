import { useState } from 'react';
import { Text, View } from 'react-native';
import { blankInputs, makeProfile, type Profile } from './domain';
import { ProfileForm } from './ProfileForm';
import { ResidentSymbol } from './ResidentCard';
import { labelOf, SEASON } from './scoring';
import { Button, Card, Heading, S } from './ui';
import { ownResident } from './voyage';

export function PairReading({ profile }: { profile: Profile | null }) {
  const [first, setFirst] = useState(profile);
  const [second, setSecond] = useState<Profile | null>(null);

  if (!first) return <ProfileForm key="first" initial={blankInputs} title="一人目の潮札"
    submitLabel="二人目の入力へ" onSubmit={inputs => setFirst(makeProfile(inputs))} />;
  if (!second) return <ProfileForm key="second" initial={blankInputs} title="二人目の潮札"
    submitLabel="二人の海をみる" onSubmit={inputs => setSecond(makeProfile(inputs))} />;

  const difference = (first.mod - second.mod + 4) % 4;
  const seasonTitle = difference === 0 ? '同じ海を知る二人' : difference === 2 ? '潮目の二人' : '橋渡しの二人';
  const seasonText = difference === 0
    ? '進み方の呼吸が似ています。二人が自然にできることを、一つ見つけてみましょう。'
    : difference === 2
      ? '向かい合う季節です。同じ出来事でも、違う方向から見たときに気づくことがあります。'
      : 'となり合う季節です。一方の当たり前が、もう一方にとって新しい見方になることがあります。';
  const depth = Math.abs(first.t.num - second.t.num);
  return <View style={S.stack}>
    <Heading tag="TWO TIDE CARDS" title="二人の海" body="二人が海を見る向きと、物事を受け止める時間を比べます。" />
    <View style={S.row}>
      {[first, second].map((person, i) => {
        const entry = ownResident(person);
        return <View key={i} style={[S.card, S.pad, { flex: 1, alignItems: 'center' }]}>
          <Text style={S.h3}>{entry.band}</Text>
          <Text style={[S.tiny, { textAlign: 'center' }]}>{entry.subtitle}</Text>
          <ResidentSymbol entry={entry} profile={person} />
          <Text style={S.kicker}>{labelOf(person.t)}</Text>
        </View>;
      })}
    </View>
    <Card><Text style={S.h3}>{seasonTitle}</Text><Text style={S.tiny}>{SEASON[first.mod].n} × {SEASON[second.mod].n}</Text><Text style={S.body}>{seasonText}</Text></Card>
    <Card><Text style={S.h3}>{depth <= 1 ? '近い深さで泳ぐ二人' : '違う深さを持ち寄る二人'}</Text>
      <Text style={S.body}>深さの差は {depth.toFixed(1)}。{depth <= 1 ? '同じ歩幅で進みやすい場面を探してみましょう。' : 'すぐに動く時間と、少し考える時間をどちらも取ってみましょう。'}</Text></Card>
    <Button quiet onPress={() => { setFirst(profile); setSecond(null); }}>入力し直す</Button>
  </View>;
}
