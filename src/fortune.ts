// 占い結果の「詳しい運勢」。分野別の星、海のようす、ラッキー項目、明日の潮を、
// その名札の今日の数値（順位・力・月・五行）だけから決める。乱数もハッシュも使わない
// （同じ名札・同じ日なら必ず同じ結果になるのは、入力が同じだからである）。
import { addDays, calendarEvents, readDay, tiers, type Profile } from './domain';
import { areaScores } from './areaScore';
import { AREA_EXTRA, areaReason } from './fortuneExtra';
import { WORK_TEXTS } from './areaTexts.work';
import { LOVE_TEXTS } from './areaTexts.love';
import { MONEY_TEXTS } from './areaTexts.money';
import { HEALTH_TEXTS } from './areaTexts.health';
import { rotate, tierPosition } from './dayText';
import { FIVE_PHASES, SEASON, STAGES, relationOf, stageFor } from './scoring';

type Reading = ReturnType<typeof readDay>;

// 海のようす。段階ごとに3通りで、段階の中の順位の位置（上・中・下）で決まる。上ほど良いほうの文。
const SEA = [
  ['年に何度もない、満ちきった潮です。ためらう時間がいちばんもったいない日。', '風も潮も、あなたの船の後ろから押しています。今日は海があなたの側にいます。', '南から、めでたい風が吹き抜ける朝です。帆を広げれば、広げただけ進みます。'],
  ['沖まで見通せる、気持ちのいい潮です。予定どおりに進めて大丈夫。', '波は軽く、風は背中から。いつもの一歩が、少し遠くまで届きます。', '帆を張れば、ちゃんと進む海です。特別な準備はいりません。'],
  ['大きな波はありません。手元を整えるのに、ちょうどいい静けさです。', '鏡のように静かな海です。進むも休むも、あなたの速度で決められます。', '風は弱く、潮もゆるやか。急がない用事から片づけると、一日がきれいに収まります。'],
  ['白波が立ちはじめています。遠出はやめて、岸の近くを進みましょう。', '風向きが定まらない海です。予定を一つ軽くしておくと、揺れても慌てずに済みます。', 'うねりが高い日です。大きな決断は、波が収まってからで間に合います。'],
  ['波が甲板を洗う日です。無理に進まず、明日の潮を待ってください。', '嵐の日に出航する船はありません。今日は休むことが、いちばんの仕事です。', '海は大荒れです。船を港につなぎ、今あるものを守りましょう。'],
];

type AreaId = 'work' | 'love' | 'money' | 'health';
const AREAS: { id: AreaId; label: string; icon: string; color: string; texts: string[][][] }[] = [
  { id: 'work', label: '仕事・学び', icon: '⚓', color: '#eacc8c', texts: WORK_TEXTS },
  { id: 'love', label: '恋愛・対人', icon: '♡', color: '#f0a8c0', texts: LOVE_TEXTS },
  { id: 'money', label: '金運', icon: '◎', color: '#b6dfc4', texts: MONEY_TEXTS },
  { id: 'health', label: '健康・休息', icon: '☘', color: '#a8c4f0', texts: HEALTH_TEXTS },
];

// 五行ごとの色（木・火・土・金・水）。浅い（明るい）色から深い色の順に3色。名札の深さの帯で選ぶ。
const COLORS = [
  [{ name: '萌黄色', hex: '#b9d36c' }, { name: '若草色', hex: '#9bd17a' }, { name: '青緑', hex: '#4fb7a0' }],
  [{ name: '珊瑚色', hex: '#f59a8a' }, { name: '朱色', hex: '#f0704f' }, { name: '茜色', hex: '#c9434f' }],
  [{ name: '砂色', hex: '#d9c39a' }, { name: '山吹色', hex: '#f2b93f' }, { name: '琥珀色', hex: '#c98a3a' }],
  [{ name: '真珠色', hex: '#f3ecdf' }, { name: '白銀', hex: '#dfe6f0' }, { name: '淡い金', hex: '#e8d49a' }],
  [{ name: '群青', hex: '#5670d8' }, { name: '藍色', hex: '#3c5f9f' }, { name: '夜の紺', hex: '#2c3a6e' }],
];
/** 五行ごとの色を一列に並べたもの（木→火→土→金→水の順）。ラッキーカラー演出の「天体」に使う。 */
export const COLOR_LIST = COLORS.flat();
const DIRECTIONS = ['東', '南', '南西', '西', '北'];
// 五行ごとの持ち物。今日の段階（凱風→轟沈）に合わせて、外へ出す道具から、守る道具の順に並べてある。
const ITEMS = [
  ['風の通る道', '木の机', '手書きのメモ', '栞', '観葉植物'],
  ['柑橘の香り', '飴玉', '温かいお茶', '湯気の立つ汁物', '窓ぎわの席'],
  ['靴ひも', '階段', '丸い石', '塩むすび', '古い写真'],
  ['小さな鍵', '腕時計', '銀色のスプーン', '白いシャツ', '貝殻のような白いボタン'],
  ['波の音', '青いペン', 'ガラスのコップ', '傘', '月の見える窓'],
];
// 十二支（子〜亥）の刻。五行は暦側の十二支の五行と同じ（寅卯＝木、巳午＝火、申酉＝金、子亥＝水、丑辰未戌＝土）。
const BRANCH_TIMES = ['真夜中（23〜1時・子の刻）', '深夜（1〜3時・丑の刻）', '夜明け前（3〜5時・寅の刻）', '朝いちばん（5〜7時・卯の刻）', '朝（7〜9時・辰の刻）', '午前（9〜11時・巳の刻）',
  '正午ごろ（11〜13時・午の刻）', '昼下がり（13〜15時・未の刻）', '夕方前（15〜17時・申の刻）', '日の入りごろ（17〜19時・酉の刻）', '宵の口（19〜21時・戌の刻）', '夜更け（21〜23時・亥の刻）'];
const BRANCHES_OF = [[2, 3], [5, 6], [1, 4, 7, 10], [8, 9], [0, 11]];
// 河図の数。各五行の「生数」（始まりの数）と「成数」（完成の数）。
const NUMBERS = [[3, 8], [2, 7], [5, 10], [4, 9], [1, 6]];

export type Fortune = ReturnType<typeof fortuneFor>;

export function fortuneFor(reading: Reading, profile: Profile) {
  const { row, force, context } = reading;
  // 日付にタイプの番号を足して文を選ぶ。同じ日・同じ段階でも、タイプが違えば別の文になる。
  const spin = context.dayIndex + profile.t.key * 7;
  const scores = areaScores(row, force);
  const areas = AREAS.map((area, index) => {
    // 点数と星は、ひと言と同じ計算（areaScore.ts）。
    const { scaled, stars, point } = scores[index];
    // 星の中の位置（低い→高い）を4つに分け、それぞれ10種の文から、日付で順に回す。
    // 星1・星5は幅が半分しかないので、その幅に合わせて4つに分ける（そうしないと、半分の文が出なくなる）。
    const from = stars === 1 ? 0 : stars - 1.5, width = stars === 1 || stars === 5 ? 0.5 : 1;
    const sub = Math.max(0, Math.min(3, Math.floor((scaled - from) / width * 4)));
    const text = rotate(area.texts[stars - 1][sub], spin, index);
    const extra = rotate(AREA_EXTRA[area.id][stars - 1], spin, index + 2);
    const reason = areaReason(area.id, row.p, force);
    return { id: area.id, label: area.label, icon: area.icon, color: area.color, stars, point, text, extra, reason };
  });
  const best = areas.reduce((top, area) => area.point > top.point ? area : top, areas[0]);

  // ラッキーカラーの五行：今日の五行が自分の型を支える関係（同気・相生・調整）なら自分の五行、
  // 力を奪う関係（流出・相剋）なら、自分を生む五行（母）で補う。
  const own = SEASON[profile.t.mod].element;
  const relation = profile.t.minus ? relationOf(context.dayElement, own) : relationOf(own, context.dayElement);
  const supported = relation.score > 0;
  const element = supported ? own : (own + 4) % 5;
  const depthBand = profile.t.num <= 2 ? 0 : profile.t.num <= 3.5 ? 1 : 2;
  const level = reading.layers.day;
  // 同じ五行・同じ段階の日が続いても、色の濃さと持ち物が日替わりになるよう、日付で1つずつずらす。
  const shade = (depthBand + spin) % 3;
  const itemIndex = Math.max(0, Math.min(4, level + (spin % 3) - 1));
  // 時間：その五行の十二支のうち、自分の「日の波」の位置から先に来る最初の刻。
  const hours = BRANCHES_OF[element];
  const start = reading.personal.pos;
  const hour = hours.map(branch => ({ branch, wait: (branch - start + 12) % 12 })).sort((a, b) => a.wait - b.wait)[0].branch;
  const lucky = {
    color: COLORS[element][shade],
    element: FIVE_PHASES[element].name,
    direction: DIRECTIONS[element],
    item: ITEMS[element][itemIndex],
    time: BRANCH_TIMES[hour],
    number: NUMBERS[element][force.go >= 0.5 ? 1 : 0],
    reason: '今日の' + FIVE_PHASES[context.dayElement].name + 'と自分の' + FIVE_PHASES[own].name + 'は「' + relation.kind + '」。'
      + (supported ? '支えがある日なので、自分の' + FIVE_PHASES[own].name + 'を保ちます。' : '力を奪われやすい日なので、自分を生む' + FIVE_PHASES[element].name + 'で補います。'),
  };
  const pos = tierPosition(row.rank);
  return { areas, best, lucky, level, sea: rotate(SEA[level], spin, pos.sub) };
}

/** 明日の潮の予告。段階と月・潮・行事までを明かし、順位とひと言は明日のお楽しみにする。 */
export function tomorrowFor(today: Date, profile: Profile, todayRank: number) {
  const date = addDays(today, 1);
  const reading = readDay(date, profile);
  const c = reading.context;
  const diff = todayRank - reading.row.rank; // 正なら明日のほうが順位が上
  const trend = diff >= 12 ? 'up' : diff <= -12 ? 'down' : 'flat';
  const level = reading.layers.day;
  const hint = [
    '大きく動ける一日になりそうです。やりたいことを、今夜のうちに一つ決めておきましょう。',
    '追い風が吹きます。朝のうちに動き出せるよう、準備を一つ済ませておくと良さそうです。',
    '穏やかな海になります。後回しの用事を片づける日に当てると、きれいに収まります。',
    '波が立ちそうです。明日の予定を、今夜のうちに一つ減らしておくと安心です。',
    '荒れ模様です。大事な約束があるなら、無理のない段取りに組み直しておきましょう。',
  ][level];
  return {
    date, level, tier: tiers[level], trend, hint,
    trendText: trend === 'up' ? '上げ潮（今日より追い風）' : trend === 'down' ? '下げ潮（今日より向かい風）' : '潮どまり（今日とほぼ同じ）',
    moon: c.moon, phaseTide: c.phaseTide, stage: STAGES[stageFor(c, profile.t)].n, dayPillar: c.dayPillar,
    events: calendarEvents(date, profile).filter(event => event !== '帰郷の年'),
    month: c.MO, day: c.DA, weekday: '日月火水木金土'[c.wd],
  };
}
