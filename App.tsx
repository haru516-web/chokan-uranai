import { useEffect } from 'react';
import { Linking, Platform, Share, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import * as StoreReview from 'expo-store-review';
import * as FileSystem from 'expo-file-system/legacy';
import DomApp from './src/DomApp';
import { updateWidget } from './src/widgetNative';
import { buy, manage, restore, startBilling, useBilling } from './src/billing';

async function onHaptic(kind: string) {
  if (kind === 'selection') await Haptics.selectionAsync();
  else if (kind === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (kind === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** 規約などの外部ページは、アプリの WebView ではなく Safari で開く。 */
async function onOpenUrl(url: string) {
  if (/^(https|mailto|itms-apps):/.test(url)) await Linking.openURL(url);
}

/** 画像（PNG の data URL）を共有シートで渡す（写真に保存・SNS など）。 */
async function onShareImage(dataUrl: string) {
  if (!dataUrl.startsWith('data:image/')) return;
  // 画像の文字列をそのまま渡すと、写真に保存などが出ないことがある。いったん一時ファイルにして、そのファイルを共有する。
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const uri = (FileSystem.cacheDirectory ?? '') + 'chokan-uranai-today.png';
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await Share.share({ url: uri });
}

/** App Store の評価依頼（Apple 標準のダイアログ）。出すかどうかは、画面側が決め、Apple 側も、年に3回までに制限している。 */
async function onRequestReview() {
  // 出せない環境（ブラウザーなど）では、失敗として返し、「依頼した」と記録させない。
  if (!(await StoreReview.hasAction())) throw new Error("review not available");
  await StoreReview.requestReview();
}

export default function Root() {
  const billing = useBilling();
  useEffect(() => { void startBilling(); }, []);
  return (
    <View style={{ flex: 1, backgroundColor: '#10172a' }}>
      <StatusBar style="light" />
      <DomApp
        onHaptic={onHaptic}
        onOpenUrl={onOpenUrl}
        onShareImage={Platform.OS === 'web' ? undefined : onShareImage}
        billing={billing}
        onBuy={buy}
        onRestore={restore}
        onManage={manage}
        onRequestReview={onRequestReview}
        onUpdateWidget={updateWidget}
        dom={{ style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never', bounces: false, overScrollMode: 'never', automaticallyAdjustContentInsets: false }}
      />
    </View>
  );
}
