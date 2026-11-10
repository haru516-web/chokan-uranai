import { cycleFor, cycleTier, dateKey, residentIndex, type Profile } from './domain';
import questions from './questions.json';
import residents from './residents.json';
import { blockScoreOf, OUTER, STAGES, yearScoreOf } from './scoring';

export { questions, residents };
export type Question = typeof questions[number];
export type SavedQuestion = { id: string; day: string };
export type Reflection = {
  id: number;
  year: number;
  month: number;
  questionId: string | null;
  event: string;
  then: string;
  now: string;
};

export const categories = [
  { id: 'self', name: '自分を見失うとき' },
  { id: 'work', name: '仕事・創作・実力' },
  { id: 'relation', name: '人との距離' },
  { id: 'time', name: '時間・記憶・変化' },
];
export const featuredQuestions = ['Q01', 'Q04', 'Q08', 'Q14', 'Q16', 'Q20'];
export const findQuestion = (id: string | null | undefined) => questions.find(question => question.id === id);
export const ownResident = (profile: Profile) => residents[residentIndex(profile.t)];
export const headwind = '同じだけ漕いでも、同じ距離を進めるとは限らない。それを自分の怠慢だと決めつけなくていい。あなたには、ほかの人が追い風と呼ぶものが向かい風になり、逆に荒れた海で進みやすいときもある。';
export const vortex = '物事が大きく動くと、あなたも周囲も強く巻き込まれる。誰かを動かす日もあれば、自分が流される日もある。振れ幅は才能の証明でも、欠点の証明でもない。';

const seasonLens = [
  'いまの状況で、無理なく始められることは何でしょう。',
  '一人で考えていたことを、誰かと分かち合うと何が変わりそうですか。',
  'その出来事は、今振り返るとどんな意味を持つでしょう。',
  '変化の中でも、手元に残しておきたいものは何でしょう。',
];
const depthLens = [
  'ここ数日の、具体的な場面を一つ思い出してみましょう。',
  '身近な人とのやり取りから、小さな場面を一つ思い出してみましょう。',
  '似たことが起きた時期を振り返り、繰り返していることを探してみましょう。',
  'そのとき、言葉にしないまま当たり前だと思っていたことに目を向けてみましょう。',
];
export function residentLens(profile: Profile, question: Question) {
  const index = residentIndex(profile.t);
  if (index === 11 && question.id === 'Q01') {
    return '秋の深海の読みでは、目新しい刺激より「この時間が、自分にとってどんな意味だったか」に目を向けます。最近の一週間を、一つの出来事ではなく「忘れたくない小さな感情」で振り返ると、日々の手触りが戻るかもしれません。';
  }
  return depthLens[index % 4] + seasonLens[Math.floor(index / 4)];
}

export function periodFor(year: number, type: Profile['t']) {
  const cycle = cycleFor(type);
  const current = yearScoreOf(year, type);
  return {
    current: OUTER[current.outer],
    level: cycleTier(current.score, cycle.years),
    blocks: [0, 1, 2].map(block => {
      const result = blockScoreOf(year, block, type);
      return { stage: STAGES[result.st], level: cycleTier(result.score, cycle.blocks) };
    }),
  };
}

export function nextTideChange(today: Date) {
  const year = today.getUTCFullYear();
  const nextMonth = (Math.floor(today.getUTCMonth() / 4) + 1) * 4;
  const date = new Date(Date.UTC(year, nextMonth, 1));
  return { date, days: Math.round((date.getTime() - today.getTime()) / 86_400_000) };
}

export function revisitQuestion(events: string[], today: Date, saved: SavedQuestion[], records: Reflection[]) {
  const day = dateKey(today);
  const year = today.getUTCFullYear();
  if (events.includes('私の出航日')) {
    const previous = saved.find(entry => entry.day.startsWith(String(year - 1)));
    if (previous) return { id: previous.id, title: '出航日 · 去年の問い' };
  }
  if (events.some(event => event.includes('潮替わり'))) {
    const from = dateKey(new Date(Date.UTC(year, today.getUTCMonth() - 4, 1)));
    const previous = saved.find(entry => entry.day >= from && entry.day < day);
    if (previous) return { id: previous.id, title: '潮替わり · 前の海況で残した問い' };
  }
  if (events.includes('帰郷の年')) {
    const previous = records.find(entry => entry.year === year - 12 && entry.questionId);
    if (previous?.questionId) return { id: previous.questionId, title: '帰郷の年 · 同じ海流の年の問い' };
    const sameCurrent = saved.find(entry => Number(entry.day.slice(0, 4)) === year - 12);
    if (sameCurrent) return { id: sameCurrent.id, title: '帰郷の年 · 同じ海流の年の問い' };
  }
  return saved[0] && { id: saved[0].id, title: '以前残した問い' };
}
