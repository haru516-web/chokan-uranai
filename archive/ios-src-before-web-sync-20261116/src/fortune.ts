// 占い結果の「詳しい運勢」。分野別の星、海のようす、ラッキー項目、明日の潮を、
// その日の点数の内訳から決める（同じ人・同じ日なら必ず同じ結果）。
import { addDays, calendarEvents, readDay, tiers, type Profile } from './domain';
import { FIVE_PHASES, SEASON, STAGES, stageFor } from './scoring';

type Reading = ReturnType<typeof readDay>;

/** 整数から、ばらつきのある整数をつくる。 */
export function hash(value: number) {
  let x = (value | 0) + 0x6d2b79f5;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0);
}
const clamp = (value: number) => Math.max(0, Math.min(1, value));

// 海のようす（段階ごとに3通り）
const SEA = [
  ['南から、めでたい風が吹き抜ける朝です。帆を広げれば、広げただけ進みます。', '風も潮も、あなたの船の後ろから押しています。今日は海があなたの側にいます。', '年に何度もない、満ちきった潮です。ためらう時間がいちばんもったいない日。'],
  ['帆を張れば、ちゃんと進む海です。特別な準備はいりません。', '波は軽く、風は背中から。いつもの一歩が、少し遠くまで届きます。', '沖まで見通せる、気持ちのいい潮です。予定どおりに進めて大丈夫。'],
  ['鏡のように静かな海です。進むも休むも、あなたの速度で決められます。', '大きな波はありません。手元を整えるのに、ちょうどいい静けさです。', '風は弱く、潮もゆるやか。急がない用事から片づけると、一日がきれいに収まります。'],
  ['白波が立ちはじめています。遠出はやめて、岸の近くを進みましょう。', '風向きが定まらない海です。予定を一つ軽くしておくと、揺れても慌てずに済みます。', 'うねりが高い日です。大きな決断は、波が収まってからで間に合います。'],
  ['海は大荒れです。船を港につなぎ、今あるものを守りましょう。', '嵐の日に出航する船はありません。今日は休むことが、いちばんの仕事です。', '波が甲板を洗う日です。無理に進まず、明日の潮を待ってください。'],
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

// 五行ごとの色（木・火・土・金・水）と方角
const COLORS = [
  [{ name: '若草色', hex: '#9bd17a' }, { name: '青緑', hex: '#4fb7a0' }, { name: '萌黄色', hex: '#b9d36c' }],
  [{ name: '朱色', hex: '#f0704f' }, { name: '珊瑚色', hex: '#f59a8a' }, { name: '茜色', hex: '#c9434f' }],
  [{ name: '山吹色', hex: '#f2b93f' }, { name: '砂色', hex: '#d9c39a' }, { name: '琥珀色', hex: '#c98a3a' }],
  [{ name: '白銀', hex: '#dfe6f0' }, { name: '真珠色', hex: '#f3ecdf' }, { name: '淡い金', hex: '#e8d49a' }],
  [{ name: '藍色', hex: '#3c5f9f' }, { name: '群青', hex: '#5670d8' }, { name: '夜の紺', hex: '#2c3a6e' }],
];
/** 五行ごとの色を一列に並べたもの（木→火→土→金→水の順）。ラッキーカラー演出の「天体」に使う。 */
export const COLOR_LIST = COLORS.flat();
const DIRECTIONS = ['東', '南', '南西', '西', '北'];
const ITEMS = ['貝殻のような白いボタン', '青いペン', '温かいお茶', '窓ぎわの席', '古い写真', '小さな鍵', 'ハンカチ', '手書きのメモ', '柑橘の香り', '丸い石',
  '銀色のスプーン', '読みかけの本', '塩むすび', '傘', '腕時計', '観葉植物', '封筒', '靴ひも', 'ガラスのコップ', '飴玉',
  '階段', '切手', '白いシャツ', '木の机', '風の通る道', '湯気の立つ汁物', '音のしない時計', '栞', '波の音', '月の見える窓'];
const TIMES = ['夜明け前（4〜6時）', '朝いちばん（6〜8時）', '午前（9〜11時）', '正午ごろ（11〜13時）', '昼下がり（13〜15時）', '夕方前（15〜17時）', '日の入りごろ（17〜19時）', '宵の口（19〜21時）', '夜更け（21〜23時）'];

export type Fortune = ReturnType<typeof fortuneFor>;

export function fortuneFor(reading: Reading, profile: Profile) {
  const { row, force, context } = reading;
  const seed = context.seed * 31 + row.t.key * 7;
  const base = 1 - (row.rank - 1) / 159;
  const parts = [
    force.go,
    force.change * 0.6 + clamp((row.p.moon + 2) / 4) * 0.4,
    clamp((row.p.comp + 2) / 4) * 0.5 + clamp((row.p.base - 1) / 9) * 0.5,
    1 - Math.abs(force.go - force.change) * 0.6,
  ];
  const areas = AREAS.map((area, index) => {
    const jitter = (hash(seed + index * 101) % 1000) / 1000 - 0.5;
    const value = clamp(base * 0.55 + parts[index] * 0.35 + jitter * 0.3 + 0.05);
    const stars = 1 + Math.round(value * 4);
    const pool = area.texts[stars - 1];
    return { id: area.id, label: area.label, icon: area.icon, color: area.color, stars, text: pool[hash(seed + index * 13 + 5) % pool.length] };
  });
  const best = [...areas].sort((a, b) => b.stars - a.stars)[0];

  const own = SEASON[profile.t.mod].element;
  // 自分の五行を生み出す五行（相生）を中心に、日の五行と自分の五行から選ぶ
  const element = [(own + 4) % 5, context.dayElement, own][hash(seed + 3) % 3];
  const palette = COLORS[element];
  const lucky = {
    color: palette[hash(seed + 11) % palette.length],
    element: FIVE_PHASES[element].name,
    direction: DIRECTIONS[element],
    item: ITEMS[hash(seed + 17) % ITEMS.length],
    time: TIMES[hash(seed + 23) % TIMES.length],
    number: 1 + hash(seed + 29) % 9,
  };
  const level = reading.layers.day;
  return { areas, best, lucky, level, sea: SEA[level][hash(seed + 41) % SEA[level].length] };
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
