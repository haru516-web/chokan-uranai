import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Inputs } from './domain';
import { Button, C, Card, Chip, Chips, S } from './ui';

// 自分＋友人など、複数の人を切り替えて占えるようにする。
export type Person = { id: number; inputs: Inputs; me: boolean; saved: boolean };

export function PersonSwitcher({ people, activeId, onSwitch, onAdd, onManage }: {
  people: Person[]; activeId: number | null; onSwitch: (id: number) => void; onAdd: () => void; onManage: () => void;
}) {
  return <View style={{ gap: 6 }}>
    <Text style={S.tiny}>占う人</Text>
    <Chips>
      {people.map(person => <Chip key={person.id} active={person.id === activeId} onPress={() => onSwitch(person.id)}>
        {(person.me ? '👤 ' : '🙂 ') + person.inputs.name + (person.me ? '（自分）' : '')}
      </Chip>)}
      <Chip onPress={onAdd}>＋ 別の人を占う</Chip>
      <Chip onPress={onManage}>⚙ 管理・削除</Chip>
    </Chips>
  </View>;
}

export function PeopleManager({ people, activeId, select, remove, add, resetAll }: {
  people: Person[]; activeId: number | null; select: (id: number) => void; remove: (id: number) => void; add: () => void; resetAll: () => void;
}) {
  const [confirm, setConfirm] = useState<number | 'all' | null>(null);
  return <View style={S.stack}>
    <Text style={S.body}>入力した情報は、この端末の中にだけ保存されます。いつでも消せます。</Text>
    {people.length === 0 && <Card><Text style={S.body}>まだ誰も登録されていません。</Text></Card>}
    {people.map(person => <Card key={person.id}>
      <View style={S.between}>
        <Text style={S.h3}>{person.me ? '👤 ' : '🙂 '}{person.inputs.name}</Text>
        {person.id === activeId && <Chip active>表示中</Chip>}
      </View>
      <Text style={S.tiny}>{person.inputs.birth.replace('-', '年').replace('-', '月') + '日'}生まれ　·　{person.saved ? '端末に保存中' : 'このページを閉じると消えます'}</Text>
      {confirm === person.id
        ? <View style={S.stack}>
          <Text style={S.body}>「{person.inputs.name}」の情報を削除しますか？</Text>
          <Chips><Chip onPress={() => setConfirm(null)}>やめる</Chip><Chip active onPress={() => { remove(person.id); setConfirm(null); }}>削除する</Chip></Chips>
        </View>
        : <Chips>
          {person.id !== activeId && <Chip onPress={() => select(person.id)}>この人を表示</Chip>}
          <Chip onPress={() => setConfirm(person.id)}>削除</Chip>
        </Chips>}
    </Card>)}
    <Button onPress={add}>＋ 別の人を占う</Button>
    <Card>
      <Text style={S.h3}>すべてのデータをリセット</Text>
      <Text style={S.body}>登録した人、記録、診断の結果、お気に入りをすべて消して、最初の状態に戻します。元には戻せません。</Text>
      {confirm === 'all'
        ? <Chips><Chip onPress={() => setConfirm(null)}>やめる</Chip><Chip active onPress={() => { resetAll(); setConfirm(null); }}>すべて削除する</Chip></Chips>
        : <Button quiet onPress={() => setConfirm('all')}>リセットする</Button>}
    </Card>
    <Text style={[S.tiny, { color: C.muted }]}>※ 他の人の生年月日・名前は、その人の了承を得て入力してください。</Text>
  </View>;
}
