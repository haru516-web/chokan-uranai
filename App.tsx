import { useEffect } from 'react';
import { Linking, Share, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import DomApp from './src/DomApp';
import { buy, manage, restore, startBilling, useBilling } from './src/billing';

async function onHaptic(kind: string) {
  if (kind === 'selection') await Haptics.selectionAsync();
  else if (kind === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (kind === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** 規約などの外部ページは、アプリの WebView ではなく Safari で開く。 */
async function onOpenUrl(url: string) {
  if (/^(https|mailto):/.test(url)) await Linking.openURL(url);
}

/** 画像（PNG の data URL）を共有シートで渡す（写真に保存・SNS など）。 */
async function onShareImage(dataUrl: string) {
  if (dataUrl.startsWith('data:image/')) await Share.share({ url: dataUrl });
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
        onShareImage={onShareImage}
        billing={billing}
        onBuy={buy}
        onRestore={restore}
        onManage={manage}
        dom={{ style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never', bounces: false, overScrollMode: 'never', automaticallyAdjustContentInsets: false }}
      />
    </View>
  );
}
