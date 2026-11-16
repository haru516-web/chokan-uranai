const DAY = 86_400_000;
const JST = 9 * 3_600_000;
const RADIANS = Math.PI / 180;

export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const FIVE_PHASES = [
  { name: '木', action: '芽吹き・つながり' },
  { name: '火', action: '展開・表現' },
  { name: '土', action: '受け止め・調整' },
  { name: '金', action: '実り・選別' },
  { name: '水', action: '蓄え・変化' },
];

export const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '啓蟄', '春分', '清明', '穀雨',
  '立夏', '小満', '芒種', '夏至', '小暑', '大暑', '立秋', '処暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
];

export const SOLAR_MONTH_TERMS = [
  '立春', '啓蟄', '清明', '立夏', '芒種', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
];

export const BRANCH_ELEMENTS = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const MONTH_TERM_INDICES = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0];

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function norm(degrees) {
  return mod(degrees, 360);
}

function sunLongitude(milliseconds) {
  const julianDay = milliseconds / DAY + 2440587.5;
  const centuries = (julianDay - 2451545) / 36525;
  const meanLongitude = 280.46646 + 36000.76983 * centuries;
  const meanAnomaly = 357.52911 + 35999.05029 * centuries;
  const sin = angle => Math.sin(angle * RADIANS);
  const equationOfCenter = 1.914602 * sin(meanAnomaly) +
    0.019993 * sin(2 * meanAnomaly) + 0.000289 * sin(3 * meanAnomaly);
  return norm(meanLongitude + equationOfCenter);
}

function signedAngle(degrees) {
  const angle = norm(degrees);
  return angle > 180 ? angle - 360 : angle;
}

function julianDayNumber(year, month, day) {
  const shift = Math.floor((14 - month) / 12);
  const adjustedYear = year + 4800 - shift;
  const adjustedMonth = month + 12 * shift - 3;
  return day + Math.floor((153 * adjustedMonth + 2) / 5) + 365 * adjustedYear +
    Math.floor(adjustedYear / 4) - Math.floor(adjustedYear / 100) + Math.floor(adjustedYear / 400) - 32045;
}

function solarTermInstant(gregorianYear, termIndex) {
  const target = norm(285 + termIndex * 15);
  const guess = Date.UTC(gregorianYear, 0, 5, 3) + termIndex * (365.2422 / 24) * DAY;
  const offset = milliseconds => signedAngle(sunLongitude(milliseconds) - target);
  let span = 4 * DAY;
  let low = guess - span;
  let high = guess + span;
  while ((offset(low) > 0 || offset(high) < 0) && span < 16 * DAY) {
    span += 2 * DAY;
    low = guess - span;
    high = guess + span;
  }

  for (let index = 0; index < 42; index++) {
    const middle = (low + high) / 2;
    if (offset(middle) < 0) low = middle;
    else high = middle;
  }
  return high;
}

function calendarDateAtJstNoon(milliseconds) {
  const jst = new Date(milliseconds + JST);
  const dayAdjustment = jst.getUTCHours() >= 12 ? 1 : 0;
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + dayAdjustment));
}

export function solarCalendarFor(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const atJstNoon = Date.UTC(year, month - 1, day, 3);
  const longitude = sunLongitude(atJstNoon);
  const solarTermIndex = Math.floor(norm(longitude - 285) / 15);
  const solarMonth = Math.floor(norm(longitude - 315) / 30);
  // 海況は節月を前半・後半に分けた24段階。太陽の黄経を15度ごとに区切る（立春が0）。
  const solarStage = Math.floor(norm(longitude - 315) / 15);
  const beforeRisshun = (month === 1 || month === 2) && longitude < 315;
  const solarYear = year - Number(beforeRisshun);
  const yearStemIndex = mod(solarYear - 4, 10);
  const yearBranchIndex = mod(solarYear - 4, 12);
  const monthBranchIndex = mod(solarMonth + 2, 12);
  const dayCycleIndex = mod(julianDayNumber(year, month, day) + 49, 60);
  const dayStemIndex = dayCycleIndex % 10;
  const dayBranchIndex = dayCycleIndex % 12;
  const yearElement = Math.floor(yearStemIndex / 2);
  const yearBranchElement = BRANCH_ELEMENTS[yearBranchIndex];
  const dayElement = Math.floor(dayStemIndex / 2);

  return {
    longitude,
    solarYear,
    yearStemIndex,
    yearBranchIndex,
    yearStem: STEMS[yearStemIndex],
    yearBranch: BRANCHES[yearBranchIndex],
    yearPillar: STEMS[yearStemIndex] + BRANCHES[yearBranchIndex],
    yearElement,
    yearBranchElement,
    yearPolarity: yearStemIndex % 2 === 0 ? '陽' : '陰',
    solarTermIndex,
    solarTerm: SOLAR_TERMS[solarTermIndex],
    solarMonth,
    solarStage,
    solarMonthTerm: SOLAR_MONTH_TERMS[solarMonth],
    monthBranchIndex,
    monthBranch: BRANCHES[monthBranchIndex],
    monthElement: BRANCH_ELEMENTS[monthBranchIndex],
    monthPolarity: monthBranchIndex % 2 === 0 ? '陽' : '陰',
    dayCycleIndex,
    dayStemIndex,
    dayBranchIndex,
    dayStem: STEMS[dayStemIndex],
    dayBranch: BRANCHES[dayBranchIndex],
    dayPillar: STEMS[dayStemIndex] + BRANCHES[dayBranchIndex],
    dayElement,
    dayPolarity: dayStemIndex % 2 === 0 ? '陽' : '陰',
  };
}

export function solarMonthStartDate(solarYear, solarMonth) {
  const month = mod(solarMonth, 12);
  const gregorianYear = month === 11 ? solarYear + 1 : solarYear;
  const termIndex = MONTH_TERM_INDICES[month];
  return calendarDateAtJstNoon(solarTermInstant(gregorianYear, termIndex));
}

/** 24段階の海況のはじまりの日（日本時間の正午ごろ）。stage は 0〜23、solarYear は立春で替わる年。 */
export function solarStageStartDate(solarYear, stage) {
  const s = mod(stage, 24);
  const gregorianYear = s >= 22 ? solarYear + 1 : solarYear;
  const termIndex = (2 + s) % 24;
  return calendarDateAtJstNoon(solarTermInstant(gregorianYear, termIndex));
}
