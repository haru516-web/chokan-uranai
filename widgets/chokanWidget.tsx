// ホーム画面ウィジェット「潮環占い」。大きさ（小・中・大）で、内容を変える。背景は、月夜の港の絵。
//   ・占って保存した人 … 自分のタイプのキャラクター、今日の海況、（中・大は）タイプ名
//   ・大の「これからの海」 … 有料版の人だけ。無料の人には、案内の一行を出す
//   ・それ以外 … はじめかたの案内（タップでアプリが開く）
// 画面の部品は、ウィジェットの中で動く（アプリの中の画面とは別の仕組み）。
// Layout の中だけで完結させる（外側の変数や関数は、ウィジェットからは見えない）。
import type { ReactElement } from 'react';
import { createWidget } from 'expo-widgets';
import { HStack, Image, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { aspectRatio, background, clipped, containerBackground, cornerRadius, font, foregroundStyle, frame, lineLimit, padding, resizable, widgetURL } from '@expo/ui/swift-ui/modifiers';

type Day = { w: string; tier: string; color: string; rank: number };
export type ChokanWidgetProps = {
  kind: 'saved' | 'empty';
  image?: string;
  /** 背景の画像のファイルの場所。 */
  back?: string;
  paid?: boolean;
  resident?: number;
  name?: string;
  label?: string;
  band?: string;
  subtitle?: string;
  date?: string;
  today?: Day;
  days?: Day[];
};

const Layout = (props: ChokanWidgetProps, environment: { widgetFamily?: string }) => {
  'widget';
  const family = environment.widgetFamily ?? 'systemSmall';
  const gold = '#EACC8C';
  const ink = '#F3EBD8';
  const muted = '#C3CCE0';
  const base = [containerBackground('#10172A', 'widget'), widgetURL('chokanuranai://')];
  const picture = (uri: string, size: number) => <Image uiImage={uri} modifiers={[resizable(), aspectRatio({ contentMode: 'fit' }), frame({ width: size, height: size })]} />;
  // 背景の絵を、全面に敷く（画像がなければ、濃い青の無地のまま）。
  const wrap = (content: ReactElement) => (
    <ZStack modifiers={base}>
      {props.back ? <Image uiImage={props.back} modifiers={[resizable(), aspectRatio({ contentMode: 'fill' }), frame({ maxWidth: 2000, maxHeight: 2000 }), clipped()]} /> : <Spacer />}
      {content}
    </ZStack>
  );

  if (props.kind !== 'saved' || !props.today) {
    const small = family === 'systemSmall';
    return wrap(
      <VStack spacing={small ? 4 : 6} modifiers={[padding({ all: 12 })]}>
        {props.image ? picture(props.image, small ? 60 : 84) : <Spacer />}
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(gold)]}>潮環占い</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(ink), lineLimit(small ? 3 : 2)]}>
          {small ? '占って保存すると、あなたのキャラクターが出ます' : '占って「保存する」と、あなたのタイプのキャラクターと、今日の海が、ここに出ます'}
        </Text>
      </VStack>
    );
  }

  const today = props.today;
  const days = props.days ?? [];

  if (family === 'systemSmall') {
    return wrap(
      <VStack spacing={2} modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{`${props.date ?? ''} 今日の海`}</Text>
        {props.image ? picture(props.image, 68) : <Spacer />}
        <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(today.color)]}>{today.tier}</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(ink), lineLimit(1)]}>{props.band ?? ''}</Text>
      </VStack>
    );
  }

  if (family === 'systemMedium') {
    return wrap(
      <HStack spacing={14} modifiers={[padding({ all: 12 })]}>
        {props.image ? picture(props.image, 104) : <Spacer />}
        <VStack spacing={3} alignment="leading">
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{`${props.date ?? ''} 今日の海`}</Text>
          <Text modifiers={[font({ size: 30, weight: 'bold' }), foregroundStyle(today.color)]}>{today.tier}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(ink), lineLimit(1)]}>{`${props.label ?? ''}　${props.band ?? ''}`}</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{props.subtitle ?? ''}</Text>
        </VStack>
        <Spacer />
      </HStack>
    );
  }

  // 大（と、iPadの特大）：キャラクター、今日の海。「これからの海」は、有料版の人だけ。
  return wrap(
    <VStack spacing={10} modifiers={[padding({ all: 14 })]}>
      <HStack spacing={14}>
        {props.image ? picture(props.image, 124) : <Spacer />}
        <VStack spacing={3} alignment="leading">
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{`${props.date ?? ''} 今日の海`}</Text>
          <Text modifiers={[font({ size: 34, weight: 'bold' }), foregroundStyle(today.color)]}>{today.tier}</Text>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(ink), lineLimit(1)]}>{`${props.label ?? ''}　${props.band ?? ''}`}</Text>
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted), lineLimit(2)]}>{props.subtitle ?? ''}</Text>
        </VStack>
        <Spacer />
      </HStack>
      <Text modifiers={[font({ size: 11 }), foregroundStyle(gold)]}>これからの海</Text>
      {props.paid && days.length ? (
        <HStack spacing={6}>
          {days.map((day, i) => (
            <VStack key={i} spacing={3} modifiers={[frame({ maxWidth: 1000 }), padding({ vertical: 8 }), background('#10172A'), cornerRadius(10)]}>
              <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{i === 0 ? '今日' : day.w}</Text>
              <Text modifiers={[font({ size: 14, weight: 'bold' }), foregroundStyle(day.color)]}>{day.tier}</Text>
            </VStack>
          ))}
        </HStack>
      ) : (
        <VStack spacing={4} modifiers={[frame({ maxWidth: 1000 }), padding({ all: 12 }), background('#10172A'), cornerRadius(10)]}>
          <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(ink)]}>これからの5日間の海は、有料版で見られます</Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>アプリを開いて、有料版をご確認ください</Text>
        </VStack>
      )}
      <Spacer />
    </VStack>
  );
};

export const chokanWidget = createWidget<ChokanWidgetProps>('ChokanWidget', Layout, { kind: 'empty' });
export default Layout;
