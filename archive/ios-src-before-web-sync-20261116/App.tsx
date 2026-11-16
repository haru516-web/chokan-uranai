import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import DomApp from './src/DomApp';

async function onHaptic(kind: string) {
  if (kind === 'selection') await Haptics.selectionAsync();
  else if (kind === 'warning') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (kind === 'error') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export default function Root() {
  return (
    <View style={{ flex: 1, backgroundColor: '#10172a' }}>
      <StatusBar style="light" />
      <DomApp
        onHaptic={onHaptic}
        dom={{ style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never', bounces: false, overScrollMode: 'never', automaticallyAdjustContentInsets: false }}
      />
    </View>
  );
}
