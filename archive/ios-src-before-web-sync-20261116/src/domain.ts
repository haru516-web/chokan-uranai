import { analyze, nameChars, strokeOf } from './strokes';
import { NUMS, SEASON, STAGES, stageFor, axes, blockScoreOf, ctxFor, dayTable, fivePhaseRelation, personalFor, yearScoreOf, type SeaContext, type SeaType } from './scoring';
import content from './content.json';
import readingText from './reading-text.json';

const DAY = 86_400_000;
export const jstToday = () => new Date(Math.floor((Date.now() + 9 * 3_600_000) / DAY) * DAY);
export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export const shortDate = (c: SeaContext) => c.MO + '月' + c.DA + '日';
export const dateLabel = (c: SeaContext) => c.Y + '年' + shortDate(c) + '（' + '日月火水木金土'[c.wd] + '）';

export type Inputs = { birth: string; name: string; manual: Record<string, string> };
export const blankInputs: Inputs = { birth: '', name: '', manual: {} };
export const normalizeName = (name: string) => name.trim();
export const unknownChars = (name: string) => [...new Set(nameChars(normalizeName(name)).filter(char => !strokeOf(char)))];

export function validate(inputs: Inputs) {
  const { birth, name, manual } = inputs;
  const date = new Date(birth + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !Number.isFinite(date.getTime()) ||
      dateKey(date) !== birth || birth < '1900-01-01' || date > jstToday()) {
    return '1900年1月1日から今日までの生年月日を入力してください。';
  }
  const chars = nameChars(normalizeName(name));
  if (!chars.length) return '下の名前を入力してください。';
  if (chars.length > 30 || chars.some(char => /[\x00-\x1F\x7F0-9０-９]/.test(char))) {
    return '名前は文字で、30文字以内で入力してください。';
  }
  if (unknownChars(name).some(char => !/^[1-9]\d?$/.test(manual[char] ?? ''))) {
    return '辞書にない文字は、1〜99の画数を入力してください。';
  }
  return '';
}

export function makeProfile(inputs: Inputs) {
  const strokes = nameChars(normalizeName(inputs.name)).map(char => strokeOf(char)?.n ?? Number(inputs.manual[char]));
  const result = analyze(inputs.birth, strokes);
  const birthDate = new Date(inputs.birth + 'T00:00:00Z');
  const birthCalendar = ctxFor(birthDate);
  const ni = NUMS.indexOf(result.num);
  const t: SeaType = {
    mod: result.mod, ni, num: result.num, minus: result.minus, A: result.A,
    key: result.mod * 40 + ni * 4 + Number(result.minus) * 2 + Number(result.A),
  };
  return { ...result, t, name: normalizeName(inputs.name), birthSolarYear: birthCalendar.solarYear,
    birthYearBranchIndex: birthCalendar.yearBranchIndex };
}
export type Profile = ReturnType<typeof makeProfile>;
export function residentIndex(type: SeaType) {
  const depth = type.ni < 3 ? 0 : type.ni < 5 ? 1 : type.ni < 7 ? 2 : 3;
  return ((type.mod + 3) % 4) * 4 + depth;
}

export const tiers = ['凱風', '順風', '凪', '荒波', '轟沈'] as const;
export const tierColors = ['#efd393', '#b6dfc4', '#c1d2ef', '#e3af92', '#e0a5b3'];
type Tier = 0 | 1 | 2 | 3 | 4;

const cycleCache = new Map<number, { years: number[]; blocks: number[] }>();
export function cycleFor(type: SeaType) {
  const cached = cycleCache.get(type.key);
  if (cached) return cached;
  const years: number[] = [];
  const blocks: number[] = [];
  // A full stem-branch cycle is needed now that year scores include both elements.
  for (let year = 1984; year < 2044; year++) {
    years.push(yearScoreOf(year, type).score);
    for (let solarMonth = 0; solarMonth < 12; solarMonth++) blocks.push(blockScoreOf(year, solarMonth, type).score);
  }
  const cycle = { years: years.sort((a, b) => b - a), blocks: blocks.sort((a, b) => b - a) };
  cycleCache.set(type.key, cycle);
  return cycle;
}

export function cycleTier(score: number, sortedScores: number[]): Tier {
  const length = sortedScores.length;
  if (score >= sortedScores[0] - 1e-9) return 0;
  if (score >= sortedScores[Math.round(length * .25) - 1] - 1e-9) return 1;
  if (score <= sortedScores[length - 1] + 1e-9) return 4;
  if (score <= sortedScores[Math.round(length * .75) - 1] + 1e-9) return 3;
  return 2;
}

function layeredReading(year: Tier, block: Tier, day: Tier) {
  let lead: string;
  if (year < 2 && day > 2) lead = '大きな流れは追い風ですが、今日は波が立ちます。長い航路を変える前に、今日の予定を一つ軽くしてみましょう。';
  else if (year > 2 && day < 2) lead = '長い向かい風の中で、今日だけは帆を張りやすい日。足元を整え、手の届く一件から進めましょう。';
  else if (year < 2 && day < 2) lead = '年の海流と今日の潮が、同じ方向へ流れています。後回しにしてきた一手を試す好機です。';
  else if (year > 2 && day > 2) lead = '年の海も今日の潮も荒れています。出航を見合わせ、今あるものを守ることに力を使いましょう。';
  else if (day < 2) lead = '大きな流れは静かでも、今日の潮は動いています。小さな一手を試し、手応えを見てください。';
  else if (day > 2) lead = '今日は大きな決断を急がず、潮が変わるまで見張りに回る日です。';
  else lead = '今日は大きな波が少なく、自分の速度で進めます。年の流れを見ながら、手元を一つ整えましょう。';
  const middle = [
    'この月の海も背中を押しています。', 'この月の海には、まだ追い風があります。',
    'この月の海は穏やかです。', 'この月の海は荒れやすい時期。余力を残しておきましょう。',
    'この月の海はもっとも荒れる時期。長く守りたいものを優先しましょう。',
  ][block];
  return lead + middle;
}

export function readDay(date: Date, profile: Profile) {
  const context = ctxFor(date);
  const table = dayTable(context);
  const row = table.byKey[profile.t.key];
  const personal = personalFor(context, profile, row);
  const raw = row.score + personal.delta;
  const personalScore = profile.A ? table.mean + (raw - table.mean) * 1.5 : raw;
  const personalRank = Math.min(table.rows.length, 1 + table.rows.filter(entry => entry.score > personalScore).length);
  const level: Tier = row.rank <= 16 ? 0 : row.rank <= 56 ? 1 : row.rank <= 104 ? 2 : row.rank <= 144 ? 3 : 4;
  const force = axes(context, row);
  const axis = force.go >= .5 ? (force.change >= .5 ? '11' : '10') : (force.change >= .5 ? '01' : '00');
  const seed = context.seed + row.t.key;
  // 日付と名札から、毎日ばらけるように文言を選ぶ（同じ人・同じ日なら必ず同じ）。
  const pick = (salt: number, length: number) => (Math.imul(seed ^ (seed >>> 13), 0x9e3779b1 + salt * 2) >>> 8) % length;
  const [line, detail] = readingText.MSG[axis][pick(1, readingText.MSG[axis].length)];
  const action = readingText.HAND[axis][pick(7, readingText.HAND[axis].length)].replace(/^今日の一手：/, '');
  const outlook = { title: tiers[level], color: tierColors[level], line, detail, action };
  const cycle = cycleFor(profile.t);
  const year = cycleTier(yearScoreOf(context.solarYear, profile.t).score, cycle.years);
  const block = cycleTier(blockScoreOf(context.solarYear, context.solarMonth, profile.t).score, cycle.blocks);
  const fivePhase = {
    personal: SEASON[profile.t.mod].element,
    year: context.yearElement,
    yearBranch: context.yearBranchElement,
    month: context.monthElement,
    day: context.dayElement,
    yearRelation: fivePhaseRelation(profile.t, context.yearElement),
    yearBranchRelation: fivePhaseRelation(profile.t, context.yearBranchElement),
    monthRelation: fivePhaseRelation(profile.t, context.monthElement),
    dayRelation: fivePhaseRelation(profile.t, context.dayElement),
  };
  return { context, row, personal, personalRank, outlook, force, mean: table.mean,
    fivePhase, layers: { year, block, day: level, text: layeredReading(year, block, level) } };
}

export const lifeFields = [
  ['恋愛・親密さ', '近づきたい気持ちと、理解されたい気持ち。今、どちらを伝えたいですか。'],
  ['友人・家族', '相手が物事を受け止める時間と、自分の時間にどんな違いがありますか。'],
  ['仕事・創作', '今の仕事は、始める・広げる・実らせる・蓄えるのどの段階ですか。'],
  ['お金・暮らし', '潮が荒い時期にも守りたい暮らしの土台は何ですか。'],
  ['心身・休息', '少し負荷を下げるなら、今日どの予定から見直せますか。'],
];

export function calendarEvents(date: Date, profile: Profile | null) {
  const c = ctxFor(date);
  const before = ctxFor(addDays(date, -1));
  const result = [];
  if (before.stage !== c.stage) result.push('潮替わり · ' + STAGES[stageFor(c, profile?.t)].n);
  if (before.solarYear !== c.solarYear) result.push('年の海流替わり · ' + c.yearPillar);
  // Use the day when the phase crosses 0° or 180° since the previous JST noon.
  if (before.ph > c.ph) result.push('月を読む日 · 新月');
  if (before.ph < 180 && c.ph >= 180) result.push('月を読む日 · 満月');
  if (profile && c.MO === profile.M && c.DA === profile.D) result.push('私の出航日');
  if (profile && c.solarYear > profile.birthSolarYear && c.yearBranchIndex === profile.birthYearBranchIndex) result.push('帰郷の年');
  return result;
}

export { content };
