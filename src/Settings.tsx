// 設定の画面。ヘッダーの歯車から開く。契約（有料版）の管理・データ・使い方・規約への入口を、ひとつにまとめる。
import { StyleSheet, Text, View } from 'react-native';
import { useAccount } from './entitlement';
import { usePlan } from './plan';
import { CONTACT_EMAIL, nativeBilling, openLink, WRITE_REVIEW_URL } from './web/native';
import { Button, C, Card, Chip, Chips, Heading, S } from './ui';

const dateOf = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

export function Settings({ openUpgrade, openPeople, openLegal }: {
  openUpgrade: () => void; openPeople: () => void; openLegal: (kind: 'terms' | 'privacy' | 'tokushoho') => void;
}) {
  const account = useAccount();
  const plan = usePlan();
  const paid = plan === 'paid' && account.available && account.active;

  return <View style={S.stack}>
    <Heading tag="SETTINGS" title="設定" />

    <Card>
      <Text style={S.kicker}>契約（有料版）</Text>
      {!account.available && <>
        <Text style={S.h3}>すべての読みを、ご利用いただけます</Text>
        <Text style={S.body}>この環境では、有料版の手続きは、いりません。</Text>
      </>}
      {account.available && paid && <>
        <Text style={S.h3}>有料版をご利用中です</Text>
        <Text style={S.body}>
          {account.periodEnd
            ? (account.willRenew ? `次の更新日は、${dateOf(account.periodEnd)}です。` : `解約のお手続き済みです。${dateOf(account.periodEnd)}まで、ご利用いただけます。`)
            : '次の更新日は、管理の画面で確認できます。'}
        </Text>
        <Button onPress={() => { void nativeBilling.manage(); }}>契約の管理・解約</Button>
        <Text style={S.tiny}>解約・プランの変更は、iPhoneの「サブスクリプション」の画面（Appleの管理画面）でできます。</Text>
      </>}
      {account.available && !paid && <>
        <Text style={S.h3}>無料版をご利用中です</Text>
        <Text style={S.body}>有料版にすると、各タブの、さらに詳しい読みをひらけます。</Text>
        <Button onPress={openUpgrade}>{account.price ? `有料版を見る（月額 ${account.price}）` : '有料版を見る'}</Button>
        <Button quiet onPress={() => { void nativeBilling.restore(); }} disabled={account.busy}>購入を復元する</Button>
      </>}
      {!!account.notice && <Text accessibilityLiveRegion="polite" style={[S.tiny, { color: C.gold }]}>{account.notice}</Text>}
      {!!account.error && <Text accessibilityRole="alert" style={[S.tiny, { color: C.error }]}>{account.error}</Text>}
    </Card>

    <Card>
      <Text style={S.kicker}>データ</Text>
      <Text style={S.tiny}>入力した内容は、この端末の中だけに保存されます。</Text>
      <Button quiet onPress={openPeople}>人の管理・データのリセット</Button>
    </Card>

    <Card>
      <Text style={S.kicker}>規約・表記</Text>
      <Chips><Chip onPress={() => openLegal('terms')}>利用規約</Chip><Chip onPress={() => openLegal('privacy')}>プライバシーポリシー</Chip><Chip onPress={() => openLegal('tokushoho')}>特定商取引法に基づく表記</Chip></Chips>
    </Card>

    <Card>
      <Text style={S.kicker}>お問い合わせ</Text>
      <Text style={S.tiny}>ご意見・不具合のご連絡は、こちらのメールアドレスまで。</Text>
      <Chips><Chip onPress={() => openLink('mailto:' + CONTACT_EMAIL)}>{'✉ ' + CONTACT_EMAIL}</Chip><Chip onPress={() => openLink(WRITE_REVIEW_URL)}>★ App Storeで評価する</Chip></Chips>
    </Card>

    <Card>
      <Text style={S.kicker}>潮環占いについて・出典</Text>
      <Text style={S.body}>潮環占いは、四季・名前の画数・暦を使って自分の状況を見つめるための創作占いです。人生の予測や性格を測定する方法としては実証されていません。月相と節気の切り替えは日本時間正午の天文値、日の干支は日本時間の日付を基準にしています。十干・十二支・節気・五行の対応を暦上の参照枠にし、十二支と既存の海流の対応、四季型との五行照合、海況への反映は潮環独自の設計です。十二支の五行は一つに簡略化し、月干や時刻は扱いません。</Text>
      <Text style={S.tiny}>漢字の画数　KANJIDIC2 © EDRDG（CC BY-SA 4.0）　／　月の計算　Jean Meeus『Astronomical Algorithms』</Text>
    </Card>
  </View>;
}

const styles = StyleSheet.create({
  note: { color: C.muted, fontSize: 12, lineHeight: 18 },
});
