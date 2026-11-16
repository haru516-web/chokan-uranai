// ホーム画面ウィジェットへ、内容を渡す（iPhoneのアプリ側）。
// 画像は、アプリに入っているものを、ウィジェットと共有するフォルダ（App Group）へ写してから、ファイルの場所で渡す。
// 失敗しても、アプリの動きには影響させない（ウィジェットが出ないだけ）。
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { widgetsDirectory } from 'expo-widgets';
import { chokanWidget } from '../widgets/chokanWidget';
import type { WidgetEntry, WidgetProps } from './widgetPayload';

const residentImages: number[] = [
  require('../assets/widget/resident-01.png'), require('../assets/widget/resident-02.png'),
  require('../assets/widget/resident-03.png'), require('../assets/widget/resident-04.png'),
  require('../assets/widget/resident-05.png'), require('../assets/widget/resident-06.png'),
  require('../assets/widget/resident-07.png'), require('../assets/widget/resident-08.png'),
  require('../assets/widget/resident-09.png'), require('../assets/widget/resident-10.png'),
  require('../assets/widget/resident-11.png'), require('../assets/widget/resident-12.png'),
  require('../assets/widget/resident-13.png'), require('../assets/widget/resident-14.png'),
  require('../assets/widget/resident-15.png'), require('../assets/widget/resident-16.png'),
];
const originImage: number = require('../assets/widget/god-origin.png');
const backImage: number = require('../assets/widget/bg-harbor.jpg');

/** 共有フォルダへ画像を写し、そのファイルの場所を返す（すでにあれば、そのまま使う）。 */
async function shared(name: string, module: number): Promise<string | undefined> {
  if (!widgetsDirectory) return undefined;
  const to = widgetsDirectory.replace(/\/?$/, '/') + name;
  try {
    if ((await FileSystem.getInfoAsync(to)).exists) return to;
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    if (!asset.localUri) return undefined;
    await FileSystem.copyAsync({ from: asset.localUri, to });
    return to;
  } catch {
    return undefined;
  }
}

let last = '';

export async function updateWidget(entries: WidgetEntry[]) {
  if (!entries.length) return;
  // 同じ内容は、毎回送り直さない（日が変わったときと、プロフィールを変えたときだけ送る）。
  const key = JSON.stringify(entries.map(entry => entry.props));
  if (key === last) return;
  const needs = new Set<number>();
  entries.forEach(entry => { if (entry.props.kind === 'saved') needs.add(entry.props.resident); });
  const files = new Map<number, string | undefined>();
  for (const index of needs) files.set(index, await shared(`resident-${String(index).padStart(2, '0')}.png`, residentImages[index - 1]));
  const origin = await shared('god-origin.png', originImage);
  const back = (await shared('bg-harbor.jpg', backImage)) ?? '';
  const withImage = (props: WidgetProps) => ({ ...props, back, image: props.kind === 'saved' ? files.get(props.resident) ?? '' : origin ?? '' });
  chokanWidget.updateTimeline(entries.map(entry => ({ date: new Date(entry.at), props: withImage(entry.props) })));
  last = key;
}
