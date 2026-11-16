// 「今日のひと言・詳細・一手」を、その名札の今日の数値から組み立てる。
// 文章候補を乱数やハッシュで選ぶのではなく、次の数値だけで決まる（同じ名札・同じ日なら必ず同じ）。
//   ・160名札の中での順位の位置（段階の中の上・中・下）
//   ・点数を作る8つの項目それぞれの値（どれが追い風・向かい風か、どれがいちばん効いているか）
//   ・自分が進む力、周りを変える力の細かい値（5段階）
import { SEASON, type RankRow } from './scoring';

export type FactorId = 'base' | 'moon' | 'depth' | 'aff' | 'comp' | 'day' | 'vor' | 'hw';

/** 各項目が取りうる幅の半分（実測の最大値に近い値）。影響の強さを −1〜+1 にそろえるために使う。 */
const SCALE: Record<FactorId, number> = { base: 5, moon: 2, depth: 0.9, aff: 0.8, comp: 1.8, day: 3.5, vor: 0.72, hw: 1.5 };
/** この強さ（絶対値）に満たない項目は「目立たない」として扱う。 */
const MINOR = 0.12;

export const FACTOR_LABELS: Record<FactorId, string> = {
  base: '自分の海の時計', moon: '季節と月の形', depth: '深さと月の距離', aff: '今月の五行',
  comp: '今年の干支の五行', day: '日の波', vor: 'Aの渦と月の距離', hw: '「−」の向かい風',
};

type Phrase = (season: string, moon: string) => string;
const PHRASES: Record<FactorId, { up: Phrase; down: Phrase }> = {
  base: { up: () => '自分の海の時計が上げ潮にある', down: () => '自分の海の時計が引き潮の側にある' },
  moon: { up: (s, m) => s + 'が力を出す' + m + 'に、今日の月が近い', down: (s, m) => s + 'が力を出す' + m + 'から、今日の月が遠い' },
  depth: { up: () => '月の距離が、自分の深さの潮に合っている', down: () => '月の距離が、自分の深さの潮には合いにくい' },
  aff: { up: () => '今月の五行が、自分の型を支えている', down: () => '今月の五行が、自分の型には重い' },
  comp: { up: () => '今年の干支の五行が、自分の型の味方をしている', down: () => '今年の干支の五行が、自分の型に向かい風をかけている' },
  day: { up: () => '今日の日の波が、上り坂にある', down: () => '今日の日の波が、下り坂にある' },
  vor: { up: () => '月が近く、Aの渦の力が高まっている', down: () => '月が遠く、Aの渦の力が静まっている' },
  hw: { up: () => '', down: () => '「−」の向かい風がかかっている' },
};

/** [進む力が強い日(0.5以上), 弱い日] の一手。いちばん効いている項目と、その向きで決まる。 */
const ACTIONS: Record<FactorId, { up: [string, string]; down: [string, string] }> = {
  base: {
    up: ['温めてきた一件を、今日のうちに一つ外へ出す。', '上げ潮のうちに、始めたいことの準備を一つ済ませる。'],
    down: ['新しく広げず、すでに動いている一件を仕上げる。', '引き潮の日。進めるより、持ち物と予定を一つ減らす。'],
  },
  moon: {
    up: ['気になっていることを、月が味方する今日のうちに10分だけ始める。', '月が味方する日。やりたいことを、紙に一行だけ書いておく。'],
    down: ['月の形と呼吸が合わない日。いつもの手順を崩さず、一件だけ進める。', '月の形と呼吸が合わない日。夜は早めに切り上げて、目を休める。'],
  },
  depth: {
    up: ['深く考える必要のある一件に、時間を決めて向き合う。', '月の距離が味方の日。じっくり考えたいことを一つ選んで、寝かせておく。'],
    down: ['潮の合わない日。慣れた手順で、確実に終わる用事から片づける。', '潮の合わない日。大きな判断は置いて、手元の整理だけにする。'],
  },
  aff: {
    up: ['今月の流れが支える日。後回しにしていた約束を一つ果たす。', '今月の流れが支える日。会いたい人に、短い連絡を一通入れる。'],
    down: ['今月の流れが重い日。足りないものを数えず、今あるもので一件仕上げる。', '今月の流れが重い日。頼まれごとを一つ断って、余白をつくる。'],
  },
  comp: {
    up: ['今年の流れが味方の日。今年のうちにやりたいことを、今日一歩進める。', '今年の流れが味方の日。年内にやりたいことを三つまで書き出す。'],
    down: ['今年の流れが重い日。長期の決断は急がず、短い目標を一つだけ決める。', '今年の流れが重い日。結論を急がず、情報を一つだけ集める。'],
  },
  day: {
    up: ['日の波が上り坂。迷っていた一手を、午前のうちに打つ。', '日の波が上り坂。短い用事を三つ、続けて片づける。'],
    down: ['日の波が下り坂。重い用事は明日に回し、軽い用事だけ片づける。', '日の波が下り坂。休憩を意識して入れ、早めに帰る。'],
  },
  vor: {
    up: ['月が近く渦が強まる日。人に声をかけて、動きの輪を一つ広げる。', '月が近く渦が強まる日。勢いで決めず、一晩置いてから返事をする。'],
    down: ['月が遠く渦が静まる日。一人でできる作業に集中する。', '月が遠く渦が静まる日。派手に動かず、整理と記録に使う。'],
  },
  hw: {
    up: ['', ''],
    down: ['向かい風の名札。今日は「守る」ものを一つ決めて、そこだけは譲らない。', '向かい風の名札。無理に漕がず、温かいものを飲んで座る。'],
  },
};

/** 二番目に効いている項目から添える、短い一言。 */
const SIDE: Record<FactorId, { up: string; down: string }> = {
  base: { up: '動き出しは朝のうちに。', down: '予定は詰め込みすぎない。' },
  moon: { up: '夜に、今日の手応えを一行だけメモする。', down: '寝る前に、画面から離れる時間をつくる。' },
  depth: { up: '考えるときは、静かな場所を選ぶ。', down: '深追いせず、30分で区切る。' },
  aff: { up: '人に会う予定があれば、前向きに受ける。', down: 'お金と時間の約束は、慎重に。' },
  comp: { up: '続けてきたことを一つ、記録に残す。', down: '新しい約束は、一つ減らす。' },
  day: { up: '夕方までに、結果を一つ出す。', down: '夕方以降は、予定を入れない。' },
  vor: { up: '返信は、読み返してから送る。', down: '通知を切って、集中する時間をとる。' },
  hw: { up: '', down: '早めに誰かに頼ることも、選択肢に入れる。' },
};

// 順位の段階（凱風〜轟沈）と、その中での位置（上・中・下）ごとの一言。
const TIER_RANGE: [number, number][] = [[1, 16], [17, 56], [57, 104], [105, 144], [145, 160]];
const VERDICT: string[][] = [
  ['160の名札のなかで、今日は最上位の追い風です。', 'ほぼ頂点にいる、強い追い風の日です。', '凱風の日。追い風の端まで、きちんと届いています。'],
  ['順風の上のほう。凱風にかかりそうな、勢いのある日です。', '順風の真ん中。帆を張れば、ちゃんと進みます。', '順風の下のほう。風はありますが、強くはありません。'],
  ['凪のなかでも、順風に近い日。静けさに、追い風が少し混じります。', '凪のど真ん中。風も波も、ほとんどありません。', '凪のなかでも、荒波に近い日。静かですが、油断は禁物です。'],
  ['荒波の入り口。白波は立っていますが、まだ漕げます。', '荒波の真ん中。遠出はせず、岸の近くを進む日です。', '荒波の深いところ。轟沈に近い、強いうねりの日です。'],
  ['轟沈の入り口。荒れは続きますが、底ではありません。', '轟沈の日。船を港につなぐのが、今日の最善手です。', '160の名札のなかで、今日は最も荒れる側にいます。'],
];

/** 順位から、段階の中での位置（0 上 / 1 中 / 2 下）を返す。 */
export function tierPosition(rank: number) {
  const level = TIER_RANGE.findIndex(([, high]) => rank <= high);
  const [low, high] = TIER_RANGE[level < 0 ? 4 : level];
  return { level: Math.max(0, level), sub: Math.min(2, Math.floor((rank - low) / (high - low + 1) * 3)) };
}

const GO = ['自分で前へ進む力は、ほとんど出ない日です。', '自分で進む力は控えめです。', '自分で進む力は、ふつうに出ます。', '自分で進む力は、しっかり出ます。', '自分で進む力は、今日は特に強く出ます。'];
const CHANGE = ['周りを動かすのは難しい日です。', '周りへの働きかけは控えめです。', '頼みごとや提案は、ふつうに届きます。', '頼みごとや提案が、よく届きます。', '人を巻き込む力が、今日は特に強く出ます。'];
const band = (value: number, edges: number[]) => edges.filter(edge => value >= edge).length;
const GO_EDGES = [0.25, 0.42, 0.58, 0.72];
const CHANGE_EDGES = [0.35, 0.5, 0.65, 0.78];

const strength = (impact: number) => {
  const size = Math.abs(impact);
  return size >= 0.7 ? '圧倒的な' : size >= 0.45 ? '大きな' : size >= 0.25 ? 'はっきりした' : 'ささやかな';
};

export type Basis = { id: FactorId; label: string; points: number; impact: number };

export function outlookText(row: RankRow, force: { go: number; change: number }) {
  const { p, t } = row;
  const season = SEASON[t.mod];
  const raw: [FactorId, number][] = [
    ['base', p.base - 5.5], ['moon', p.moon], ['depth', p.depth], ['aff', p.aff], ['comp', p.comp], ['day', p.day],
    ...(t.A ? [['vor', p.vor] as [FactorId, number]] : []),
    ...(t.minus ? [['hw', p.hw] as [FactorId, number]] : []),
  ];
  const basis: Basis[] = raw
    .map(([id, points]) => ({ id, label: FACTOR_LABELS[id], points, impact: Math.max(-1, Math.min(1, points / SCALE[id])) }))
    .filter(item => Math.abs(item.impact) >= MINOR)
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const say = (item: Basis) => PHRASES[item.id][item.impact > 0 ? 'up' : 'down'](season.n, season.moon);
  const ups = basis.filter(item => item.impact > 0);
  const downs = basis.filter(item => item.impact < 0);
  // 「−」の向かい風は毎日同じ強さでかかる固定の補正なので、その日の主役にはしない（ほかに何もないときだけ主役にする）。
  const lead = basis.find(item => item.id !== 'hw') ?? basis[0];
  const second = basis.find(item => item !== lead && Math.abs(item.impact) >= 0.2);
  const { level, sub } = tierPosition(row.rank);

  const line = VERDICT[level][sub] + (lead ? say(lead) + 'のが、' + strength(lead.impact) + (lead.impact > 0 ? '後押し' : '重し') + 'です。' : '');
  const detail = (ups.length ? '追い風になっているのは、' + ups.slice(0, 2).map(say).join('こと、') + 'ことです。' : '目立つ追い風は見当たりません。')
    + (downs.length ? '向かい風になっているのは、' + downs.slice(0, 2).map(say).join('こと、') + 'ことです。' : '目立つ向かい風はありません。')
    + GO[band(force.go, GO_EDGES)] + CHANGE[band(force.change, CHANGE_EDGES)];
  const main = lead ? ACTIONS[lead.id][lead.impact > 0 ? 'up' : 'down'][force.go >= 0.5 ? 0 : 1]
    : force.go >= 0.5 ? '今日は大きな差のない日。いつもの用事を、いつもの順で進める。' : '今日は大きな差のない日。手元を整えて、早めに休む。';
  const action = main + (second ? 'あわせて、' + SIDE[second.id][second.impact > 0 ? 'up' : 'down'] : '');
  return { line, detail, action, basis };
}
