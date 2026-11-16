// 有料版（月額サブスク）のご案内・申込み・復元・管理の画面。支払いは、Apple（App Store）の仕組みで行う。
// 申込みの前に、価格・期間・自動更新・解約の方法を、はっきり見せる（Appleの審査で必須の表示）。
import { StyleSheet, Text, View } from 'react-native';
import { useAccount } from './entitlement';
import { usePlan } from './plan';
import { nativeBilling } from './web/native';
import { Button, C, Card, Chip, Chips, Heading, S } from './ui';

const INCLUDED = [
  ['今日の占い', '分野別の運勢の文、今日の内訳、年・月・日の読み、ラッキーの方角・時間・もの・数字、明日の潮'],
  ['二人の相性', '恋愛・結婚・仕事・友情の相性の文、二人の読み、今日・今月・今年の相性の読みと内訳'],
  ['人生の流れ', '次の追い風、これから1年で気をつけたい月・いちばんの月、来年以降の年と、今年の先の月の読み'],
];

const dateOf = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

export function Upgrade({ openLegal }: { openLegal: (kind: 'terms' | 'privacy' | 'tokushoho') => void }) {
  const account = useAccount();
  const plan = usePlan();
  const paid = plan === 'paid' && account.available && account.active;

  return <View style={S.stack}>
    <Heading tag="PREMIUM" title="有料版" body="占いの、さらに詳しい読みを、ひらきます。基本の占い・タロット・問いの海・住人図鑑は、これまでどおり、登録なしで読めます。" />
    {!!account.notice && <Card><Text accessibilityLiveRegion="polite" style={[S.body, { color: C.gold }]}>{account.notice}</Text></Card>}
    {!!account.error && <Card><Text accessibilityRole="alert" style={[S.body, { color: C.error }]}>{account.error}</Text></Card>}

    {!account.available && <Card>
      <Text style={S.h3}>この環境では、有料版は、いらない状態です</Text>
      <Text style={S.body}>すべての読みを、そのままご利用いただけます。</Text>
    </Card>}

    {account.available && <Card>
      <Text style={S.kicker}>含まれるもの</Text>
      {INCLUDED.map(([title, text]) => <View key={title} style={styles.row}>
        <Text style={S.h3}>{title}</Text>
        <Text style={S.tiny}>{text}</Text>
      </View>)}
    </Card>}

    {account.available && paid && <Card>
      <Text style={S.h3}>有料版をご利用中です</Text>
      <Text style={S.body}>
        {account.periodEnd
          ? (account.willRenew ? `次の更新日は、${dateOf(account.periodEnd)}です。` : `解約のお手続き済みです。${dateOf(account.periodEnd)}まで、ご利用いただけます。`)
          : '次の更新日は、管理の画面で確認できます。'}
      </Text>
      <Button onPress={() => { void nativeBilling.manage(); }}>契約の管理・解約</Button>
      <Text style={S.tiny}>解約・プランの変更は、iPhoneの「サブスクリプション」の画面（Appleの管理画面）でできます。</Text>
    </Card>}

    {account.available && !paid && <Card>
      <Text style={S.kicker}>お申込みの内容（最終確認）</Text>
      <Text style={S.h3}>潮環占い プレミアム（1か月ごとの自動更新）</Text>
      <Text style={styles.price}>{account.price ? `月額 ${account.price}` : '価格を読み込んでいます…'}</Text>
      <View style={styles.rules}>
        <Text style={S.body}>・1か月ごとの自動更新のサブスクリプションです。解約しない限り、毎月、自動で更新・請求されます。</Text>
        <Text style={S.body}>・お支払いは、購入の確定時に、お使いの Apple ID に請求されます。</Text>
        <Text style={S.body}>・現在の期間が終わる24時間前までに解約しない限り、自動で更新されます。更新の料金は、期間が終わる24時間前までに、Apple ID に請求されます。</Text>
        <Text style={S.body}>・解約・管理は、購入のあと、iPhoneの「設定」→ 自分の名前 →「サブスクリプション」で、いつでもできます。</Text>
      </View>
      <Chips>
        <Chip onPress={() => openLegal('terms')}>利用規約</Chip>
        <Chip onPress={() => openLegal('privacy')}>プライバシーポリシー</Chip>
        <Chip onPress={() => openLegal('tokushoho')}>特定商取引法に基づく表記</Chip>
      </Chips>
      <Button onPress={() => { void nativeBilling.buy(); }} disabled={!account.price || account.busy}>
        {account.busy ? '少しお待ちください…' : '申し込む'}
      </Button>
    </Card>}

    {account.available && !paid && <Card>
      <Text style={S.kicker}>すでに有料版の方</Text>
      <Text style={S.tiny}>機種変更や、アプリを入れ直したときは、こちらから、有料版を戻せます。購入した Apple ID でサインインしている必要があります。</Text>
      <Button quiet onPress={() => { void nativeBilling.restore(); }} disabled={account.busy}>購入を復元する</Button>
    </Card>}
  </View>;
}

const styles = StyleSheet.create({
  row: { gap: 2, paddingVertical: 6 },
  price: { color: C.gold, fontSize: 30, lineHeight: 40, fontWeight: '900' },
  rules: { gap: 6 },
});
