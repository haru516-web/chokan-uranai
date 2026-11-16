// ホーム画面ウィジェットに渡す内容を作る（画面や保存には依存しない）。
// 「占って、保存する」にした自分（me）がいるときだけ、タイプのキャラクター入りの内容。いないときは、はじめかたの案内。
// 内容は、無料で読める範囲（日の海況・順位・タイプ名）だけ。有料版の読みの文は、載せない。
import { addDays, dateKey, jstToday, makeProfile, readDay, residentIndex, tierColors, tiers, validate, type Inputs } from './domain';
import { labelOf } from './scoring';
import { ownResident } from './voyage';

export type WidgetDay = { w: string; tier: string; color: string; rank: number };
export type WidgetSaved = {
  kind: 'saved';
  /** 画像の番号（1〜16）。 */
  resident: number;
  name: string;
  label: string;
  band: string;
  subtitle: string;
  date: string;
  today: WidgetDay;
  /** 今日を含む5日分（有料版のときだけ。無料のときは空）。 */
  days: WidgetDay[];
  /** 有料版か。 */
  paid: boolean;
};
export type WidgetEmpty = { kind: 'empty' };
export type WidgetProps = WidgetSaved | WidgetEmpty;
/** 日付（日本時間の0時）ごとの内容。ウィジェットは、アプリを開かなくても、日がわりで切り替わる。 */
export type WidgetEntry = { at: number; props: WidgetProps };

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const JST_MS = 9 * 3_600_000;

type PersonLike = { inputs: Inputs; me: boolean; saved: boolean };

/** ウィジェットに出す人。保存した「自分」だけ（保存しない人の情報は、端末の外には出さない）。 */
export function widgetPerson<T extends PersonLike>(people: T[]): T | null {
  return people.find(person => person.me && person.saved && !validate(person.inputs)) ?? null;
}

function dayOf(date: Date, profile: ReturnType<typeof makeProfile>): WidgetDay {
  const read = readDay(date, profile);
  const level = tiers.indexOf(read.outlook.title as typeof tiers[number]);
  return { w: WEEK[date.getUTCDay()], tier: read.outlook.title, color: tierColors[Math.max(0, level)], rank: read.row.rank };
}

export function savedProps(inputs: Inputs, date: Date, paid: boolean): WidgetSaved {
  const profile = makeProfile(inputs);
  const days = Array.from({ length: 5 }, (_, i) => dayOf(addDays(date, i), profile));
  const entry = ownResident(profile);
  return {
    kind: 'saved',
    resident: residentIndex(profile.t) + 1,
    name: inputs.name?.trim() || '',
    label: labelOf(profile.t),
    band: entry.band,
    subtitle: entry.subtitle,
    date: `${date.getUTCMonth() + 1}/${date.getUTCDate()}`,
    today: days[0],
    // これからの海は、有料版の読み。無料のときは、ウィジェットに渡さない。
    days: paid ? days : [],
    paid,
  };
}

/** 今日から7日分の内容（それぞれ、その日の日本時間0時に切り替わる）。 */
export function widgetEntries(people: PersonLike[], paid: boolean, today: Date = jstToday()): WidgetEntry[] {
  const person = widgetPerson(people);
  const base = new Date(dateKey(today) + 'T00:00:00Z');
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(base, i);
    // 日本時間の0時（= その日のUTC 0時 − 9時間）。今日の分は、すぐ有効にする。
    const at = i === 0 ? Date.now() : date.getTime() - JST_MS;
    return { at, props: person ? savedProps(person.inputs, date, paid) : { kind: 'empty' as const } };
  });
}
