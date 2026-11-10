import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { godSheets } from './art';
import { S } from './ui';

const frames = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1];

export function GodAnimation({ index, label, style }: { index: number; label?: string; style: StyleProp<ViewStyle> }) {
  const [step, setStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [playOnRequest, setPlayOnRequest] = useState(false);
  const playing = !reduceMotion || playOnRequest;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setStep(previous => (previous + 1) % frames.length), 170);
    return () => clearInterval(timer);
  }, [playing]);

  const frame = playing ? frames[step] : 0;
  return <View style={style}>
    <View style={styles.clip} accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label}>
      <Image source={godSheets[index]} contentFit="fill" accessible={false} style={[styles.sheet, {
        left: `${-(frame % 4) * 100}%`,
        top: `${-Math.floor(frame / 4) * 100}%`,
      }]} />
    </View>
    {label && reduceMotion && <Pressable accessibilityRole="button"
      accessibilityLabel={label + 'のアニメーションを' + (playOnRequest ? '停止' : '再生')}
      onPress={() => setPlayOnRequest(previous => !previous)} style={styles.motionButton}>
      <Text style={S.tiny}>{playOnRequest ? '動きを止める' : '動きを見る'}</Text>
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  clip: { aspectRatio: 1, overflow: 'hidden' },
  sheet: { position: 'absolute', width: '400%', height: '200%' },
  motionButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
