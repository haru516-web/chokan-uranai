// 占い結果の「詳しい運勢」。分野別の星、海のようす、ラッキー項目、明日の潮を、
// その名札の今日の数値（順位・力・月・五行）だけから決める。乱数もハッシュも使わない
// （同じ名札・同じ日なら必ず同じ結果になるのは、入力が同じだからである）。
import { addDays, calendarEvents, readDay, tiers, type Profile } from './domain';
import { tierPosition } from './dayText';
import { FIVE_PHASES, SEASON, STAGES, relationOf, stageFor } from './scoring';

type Reading = ReturnType<typeof readDay>;

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// 海のようす。段階ごとに3通りで、段階の中の順位の位置（上・中・下）で決まる。上ほど良いほうの文。
const SEA = [
  ['年に何度もない、満ちきった潮です。ためらう時間がいちばんもったいない日。', '風も潮も、あなたの船の後ろから押しています。今日は海があなたの側にいます。', '南から、めでたい風が吹き抜ける朝です。帆を広げれば、広げただけ進みます。'],
  ['沖まで見通せる、気持ちのいい潮です。予定どおりに進めて大丈夫。', '波は軽く、風は背中から。いつもの一歩が、少し遠くまで届きます。', '帆を張れば、ちゃんと進む海です。特別な準備はいりません。'],
  ['大きな波はありません。手元を整えるのに、ちょうどいい静けさです。', '鏡のように静かな海です。進むも休むも、あなたの速度で決められます。', '風は弱く、潮もゆるやか。急がない用事から片づけると、一日がきれいに収まります。'],
  ['白波が立ちはじめています。遠出はやめて、岸の近くを進みましょう。', '風向きが定まらない海です。予定を一つ軽くしておくと、揺れても慌てずに済みます。', 'うねりが高い日です。大きな決断は、波が収まってからで間に合います。'],
  ['波が甲板を洗う日です。無理に進まず、明日の潮を待ってください。', '嵐の日に出航する船はありません。今日は休むことが、いちばんの仕事です。', '海は大荒れです。船を港につなぎ、今あるものを守りましょう。'],
];

type AreaId = 'work' | 'love' | 'money' | 'health';
const AREAS: { id: AreaId; label: string; icon: string; color: string; texts: string[][] }[] = [
  { id: 'work', label: '仕事・学び', icon: '⚓', color: '#eacc8c', texts: [
    ['手を広げず、決まった作業だけを淡々と。新しい提案は別の日に。', '集中が途切れやすい日。締め切りの近いもの一つに絞りましょう。'],
    ['進みは遅めです。確認と見直しに時間を使うと、後で助かります。', '人に聞けば早い場面が増えます。一人で粘りすぎないこと。'],
    ['いつも通りの力が出せます。溜まった用事を順に片づけましょう。', '可もなく不可もなく。地味な作業ほど、今日は手になじみます。'],
    ['頭がよく回る日。少し難しい課題に手をつけるなら今日です。', '評価につながる仕事ができます。見せたいものは今日のうちに。'],
    ['会心の一日。大きな勝負や発表は、今日に寄せてください。', '始めたことが一気に形になります。迷っていた挑戦に踏み出す日。'],
  ] },
  { id: 'love', label: '恋愛・対人', icon: '♡', color: '#f0a8c0', texts: [
    ['言葉がすれ違いやすい日。大事な話は、日を改めたほうが届きます。', '一人の時間が薬になります。無理に合わせず、早めに切り上げて。'],
    ['相手の機嫌を読みすぎないこと。短い挨拶だけで十分です。', '期待しすぎると疲れる日。聞き役に回ると、関係が保てます。'],
    ['穏やかなやり取りができます。日常の「ありがとう」を一つ多く。', '大きな進展はなくても、安心が積み上がる日です。'],
    ['素直な一言がよく響きます。気になる人に、自分から連絡を。', '笑顔が伝染する日。人の集まる場所に顔を出すと良い縁があります。'],
    ['想いがまっすぐ届く日。伝えたかったことを、今日言葉にしてください。', '出会いにも仲直りにも最高の潮。待つより、迎えに行く日です。'],
  ] },
  { id: 'money', label: '金運', icon: '◎', color: '#b6dfc4', texts: [
    ['財布のひもは固く。勢いの買い物は、明日には後悔に変わります。', '思わぬ出費に注意。大きな支払いの判断は先に延ばしましょう。'],
    ['「安いから」で買わないこと。必要なものだけを選ぶ日です。', '貸し借りは控えめに。細かい出費を数えると、無駄が見つかります。'],
    ['収支は穏やか。家計を五分だけ見直すと、小さな発見があります。', '良くも悪くも動きません。欲しいものは、リストに書いて寝かせて。'],
    ['使ったお金が、きちんと満足になって返る日。良いものを一つ。', '小さな得があります。値段より、長く使えるかで選ぶと正解です。'],
    ['お金の流れが開く日。投資や学びへの出費が、後で大きく実ります。', '思いがけない収入や、得な話が舞い込みやすい日。直感を信じて。'],
  ] },
  { id: 'health', label: '健康・休息', icon: '☘', color: '#a8c4f0', texts: [
    ['疲れが表に出やすい日。予定を削ってでも、睡眠を最優先に。', '無理がきかない日です。温かいものを食べて、早く横になりましょう。'],
    ['肩や目に疲れが溜まっています。一時間に一度、席を立って。', '冷えに注意。首・手首・足首を温めると、調子が戻ります。'],
    ['体調は安定しています。軽い散歩が、気分転換にちょうどいい日。', '特に心配はいりません。水を一杯多く飲むだけで十分です。'],
    ['体が軽く動く日。いつもより一駅ぶん歩くと、頭も冴えます。', '回復力が高い日です。先延ばしにしていた運動を、少しだけ。'],
    ['心も体も満ちています。新しい習慣を始めるなら今日が吉日。', '活力があふれる日。体を動かすほど、さらに運が巡ります。'],
  ] },
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
  const base = 1 - (row.rank - 1) / 159;
  const parts = [
    force.go,
    force.change * 0.6 + clamp((row.p.moon + 2) / 4) * 0.4,
    clamp((row.p.comp + 2) / 4) * 0.5 + clamp((row.p.base - 1) / 9) * 0.5,
    // 健康：日の波（体力の上げ下げ）・月の距離と深さ（潮の引き）・進む力と変える力のつり合い。
    clamp(0.5 + row.p.day / 7) * 0.5 + clamp(0.5 + row.p.depth / 1.8) * 0.2 + (1 - Math.abs(force.go - force.change) * 1.6) * 0.3,
  ];
  const areas = AREAS.map((area, index) => {
    // 順位55％＋分野ごとの数値35％。0〜1に伸ばして、0〜100点と星1〜5にする。
    const value = clamp((base * 0.55 + parts[index] * 0.35 - 0.12) / 0.62);
    const scaled = value * 4;
    const stars = 1 + Math.round(scaled);
    // 同じ星の中でも、点数が低いほうの文と高いほうの文を分ける。
    const text = area.texts[stars - 1][scaled >= Math.round(scaled) ? 1 : 0];
    return { id: area.id, label: area.label, icon: area.icon, color: area.color, stars, point: Math.round(value * 100), text };
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
  // 時間：その五行の十二支のうち、自分の「日の波」の位置から先に来る最初の刻。
  const hours = BRANCHES_OF[element];
  const start = reading.personal.pos;
  const hour = hours.map(branch => ({ branch, wait: (branch - start + 12) % 12 })).sort((a, b) => a.wait - b.wait)[0].branch;
  const lucky = {
    color: COLORS[element][depthBand],
    element: FIVE_PHASES[element].name,
    direction: DIRECTIONS[element],
    item: ITEMS[element][level],
    time: BRANCH_TIMES[hour],
    number: NUMBERS[element][force.go >= 0.5 ? 1 : 0],
    reason: '今日の' + FIVE_PHASES[context.dayElement].name + 'と自分の' + FIVE_PHASES[own].name + 'は「' + relation.kind + '」。'
      + (supported ? '支えがある日なので、自分の' + FIVE_PHASES[own].name + 'を保ちます。' : '力を奪われやすい日なので、自分を生む' + FIVE_PHASES[element].name + 'で補います。'),
  };
  const pos = tierPosition(row.rank);
  return { areas, best, lucky, level, sea: SEA[level][pos.sub] };
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
