// 「人生の流れ」タブ。あなたの年ごとの運勢を波の線で見せ、
// 「今年は？」「次の追い風は？」「気をつけたい月は？」に、最初の画面で答える。
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { dateKey, makeProfile, tierColors, tiers, type Profile } from './domain';
import { GodAnimation } from './GodAnimation';
import { Gloss, TermText, useGloss } from './Glossary';
import { useInView } from './FortuneDetail';
import { ReflectionCards } from './LifeChart';
import { ctxFor, labelOf, SEASON } from './scoring';
import { Calendar } from './screens';
import { Button, C, Card, display, NextLinks, rounded, S } from './ui';
import { findQuestion, ownResident, periodFor, type Reflection } from './voyage';
import { Float, fx, Sparkles } from './Visual';

const asStyle = (style: object) => style as unknown as ViewStyle;
const YEAR_TEXT = [
  '何をしても追い風が背中を押す年。始めたいこと・大きな挑戦は、この年に寄せると実りやすい。',
  '流れに乗れる年。準備してきたことを外に出すと、ちゃんと手応えが返ってくる。',
  '大きな波のない年。土台を整え、次の追い風に備えておく年。',
  '波が立ちやすい年。広げるより守る。大きな勝負は、追い風の年まで温存を。',
  'いちばん荒れる年。自分を責めず、休むこと・手放すことを選んでいい年。',
];
const MONTH_TEXT = ['動けば実る月', '追い風の月', 'ふつうの月', '波が立つ月', '守りの月'];
const SPAN_BACK = 6;
const SPAN_AHEAD = 6;

type Year = { year: number; level: number; age: number | null; current: string; theme: string };

function yearsFor(profile: Profile, thisYear: number): Year[] {
  return Array.from({ length: SPAN_BACK + SPAN_AHEAD + 1 }, (_, i) => {
    const year = thisYear - SPAN_BACK + i;
    const period = periodFor(year, profile.t);
    return { year, level: period.level, age: year >= profile.birthSolarYear ? year - profile.birthSolarYear : null, current: period.current.n, theme: period.current.th };
  });
}

/** 今から12か月を順に並べる（月の単位）。 */
function monthsAhead(profile: Profile, today: Date) {
  const c = ctxFor(today);
  return Array.from({ length: 12 }, (_, k) => {
    const solarMonth = (c.solarMonth + k) % 12;
    const year = c.solarYear + Math.floor((c.solarMonth + k) / 12);
    const block = periodFor(year, profile.t).blocks[solarMonth];
    return { year, solarMonth, level: block.level, stage: block.stage.n, month: block.date.getUTCMonth() + 1, now: k === 0 };
  });
}

function smooth(points: [number, number][]) {
  return points.map(([x, y], i) => {
    if (i === 0) return `M${x} ${y}`;
    const [x0, y0] = points[i - 1];
    const mid = (x - x0) / 2;
    return `C${x0 + mid} ${y0} ${x - mid} ${y} ${x} ${y}`;
  }).join(' ');
}

/** 年ごとの運勢を、うねる波の線で描く。今年には神が乗り、点をタップすると年を選べる。 */
function WaveChart({ years, thisYear, selected, onSelect, season, demo }: {
  years: Year[]; thisYear: number; selected: number; onSelect: (year: number) => void; season: number; demo?: boolean;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const W = 360, H = 200, top = 34, step = 30;
  const x = (i: number) => 18 + i * (W - 36) / (years.length - 1);
  const y = (level: number) => top + level * step;
  const points = years.map((entry, i) => [x(i), y(entry.level)] as [number, number]);
  const line = smooth(points);
  const nowIndex = years.findIndex(entry => entry.year === thisYear);
  const [nx, ny] = points[nowIndex];
  return <View ref={ref as never} style={styles.chart}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={'年ごとの運勢の波。' + years.map(entry => entry.year + '年' + tiers[entry.level]).join('、')} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="wave-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#eacc8c" stopOpacity=".35" />
          <stop offset="1" stopColor="#eacc8c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wave-line" x1="0" x2="0" y1={top} y2={top + step * 4} gradientUnits="userSpaceOnUse">
          {tierColors.map((color, i) => <stop key={i} offset={i / 4} stopColor={color} />)}
        </linearGradient>
      </defs>
      {tiers.map((name, i) => <g key={name}>
        <line x1="0" x2={W} y1={y(i)} y2={y(i)} stroke="#2b3753" strokeDasharray="2 5" />
        <text x={W - 2} y={y(i) - 4} fontSize="10" fill={tierColors[i]} textAnchor="end" opacity=".8">{name}</text>
      </g>)}
      <rect x={nx - 14} y="6" width="28" height={H - 30} rx="14" fill="#eacc8c" opacity=".08" />
      {seen && <>
        <path d={line + ` L${points[points.length - 1][0]} ${H - 22} L${points[0][0]} ${H - 22} Z`} fill="url(#wave-fill)" className="wave-area" />
        <path d={line} fill="none" stroke="url(#wave-line)" strokeWidth="3.5" strokeLinecap="round" className="wave-draw" />
        {years.map((entry, i) => {
          const isNow = entry.year === thisYear;
          const isSel = entry.year === selected;
          return <g key={entry.year} className="wave-dot" style={{ animationDelay: 300 + i * 70 + 'ms' }}>
            {isNow && <circle cx={x(i)} cy={y(entry.level)} r="13" fill="none" stroke="#eacc8c" strokeWidth="1.5" className="wave-pulse" />}
            <circle cx={x(i)} cy={y(entry.level)} r={isSel ? 8 : 5.5} fill={tierColors[entry.level]} stroke={isSel ? '#fbf3e0' : '#10172a'} strokeWidth={isSel ? 3 : 2} />
          </g>;
        })}
      </>}
      {years.map((entry, i) => <text key={entry.year} x={x(i)} y={H - 6} fontSize="10" textAnchor="middle"
        fill={entry.year === thisYear ? '#eacc8c' : entry.year === selected ? '#fbf3e0' : '#7f8cab'} fontWeight={entry.year === thisYear || entry.year === selected ? 800 : 400}>
        {entry.year === thisYear ? '今年' : i % 2 === 0 || entry.year === selected ? "'" + String(entry.year).slice(2) : ''}
      </text>)}
      {!demo && years.map((entry, i) => <rect key={'hit' + entry.year} x={x(i) - 13} y="0" width="26" height={H} fill="transparent"
        style={{ cursor: 'pointer' }} onClick={() => onSelect(entry.year)}><title>{entry.year}年</title></rect>)}
    </svg>
    {seen && <View pointerEvents="none" style={[styles.rider, asStyle({ left: (nx / W * 100) + '%', top: (ny / H * 100) + '%' })]}>
      <View {...fx('pop')} style={asStyle({ animationDelay: '900ms' })}><Float><GodAnimation forcePlay index={season} style={{ width: 46 }} /></Float></View>
    </View>}
  </View>;
}

function Answer({ mark, kicker, title, body, color, delay }: { mark: string; kicker: string; title: string; body: string; color: string; delay: number }) {
  return <View {...fx('up')} style={[styles.answer, asStyle({ animationDelay: delay + 'ms', borderColor: color + '88', backgroundImage: `linear-gradient(110deg, ${color}26, transparent 70%)` })]}>
    <Text style={[styles.answerMark, { color }]}>{mark}</Text>
    <View style={{ flex: 1, gap: 1 }}>
      <Text style={[S.kicker, { color }]}>{kicker}</Text>
      <Gloss style={styles.answerTitle}>{title}</Gloss>
      <Gloss style={styles.answerBody}>{body}</Gloss>
    </View>
  </View>;
}

const demoProfile = makeProfile({ birth: '1998-04-12', name: '汐里', manual: {} });

/** 人生の流れタブ内の「運勢の輪」まで、なめらかにスクロールする。 */
export function scrollToLifeCalendar() {
  if (typeof document === 'undefined') return;
  setTimeout(() => document.getElementById('life-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280);
}

export function LifeWave({ today, profile, questionId, initialYear, create, embedCalendar, calendarFocus, write, records, edit, openJournal, showToday }: {
  today: Date; profile: Profile | null; questionId?: string; initialYear?: number; create: () => void;
  embedCalendar?: boolean; calendarFocus?: { date: Date; mode: 'current' | 'stage'; key: number } | null;
  write: (year: number, month: number, questionId?: string) => void; records: Reflection[]; edit: (record: Reflection) => void;
  openJournal?: () => void; showToday: () => void;
}) {
  const open = useGloss();
  const demo = !profile;
  const person = profile ?? demoProfile;
  const c = ctxFor(today);
  const thisYear = c.solarYear;
  const [selected, setSelected] = useState(initialYear ?? (questionId ? thisYear - 1 : thisYear));
  const [month, setMonth] = useState<number | null>(null);
  const years = useMemo(() => yearsFor(person, thisYear), [person, thisYear]);
  const ahead = useMemo(() => monthsAhead(person, today), [person, today]);
  const question = findQuestion(questionId);
  const now = years.find(entry => entry.year === thisYear)!;
  const nextGood = Array.from({ length: 12 }, (_, i) => thisYear + 1 + i).map(year => ({ year, level: periodFor(year, person.t).level })).find(entry => entry.level <= 1);
  const caution = ahead.find(entry => entry.level >= 3 && !entry.now);
  const best = [...ahead].filter(entry => !entry.now).sort((a, b) => a.level - b.level)[0];
  const sel = years.find(entry => entry.year === selected) ?? { year: selected, level: periodFor(selected, person.t).level, age: null, current: periodFor(selected, person.t).current.n, theme: periodFor(selected, person.t).current.th };
  const blocks = periodFor(selected, person.t).blocks;
  const chosen = month ?? (selected === thisYear ? c.solarMonth : null);
  const season = person.t.mod;
  const relevant = records.filter(record => ctxFor(new Date(Date.UTC(record.year, record.month - 1, 15))).solarYear === selected && (!questionId || record.questionId === questionId));
  const resident = ownResident(person);

  function choose(year: number) { setSelected(year); setMonth(null); }

  return <View style={S.stack}>
    <View style={[S.card, styles.hero]}>
      <Sparkles color={SEASON[season].col} />
      <Text style={S.kicker}>人生の流れ</Text>
      <Text accessibilityRole="header" style={styles.heroTitle}>{question ? 'その問いを強く感じたのは、どの年？' : demo ? 'あなたの人生にも、\n潮の満ち引きがある。' : person.name + 'さんの、\n人生の潮回り'}</Text>
      <Gloss style={S.body}>{'年ごとの海流は12年でひと巡りします。あなたの名札と重ねると、追い風の年・荒れる年・気をつけたい月が見えてきます。'}</Gloss>
      {question && <View style={styles.question}><Text style={S.kicker}>{question.id}　問いを重ねる</Text><Text style={S.h3}>{question.question}</Text></View>}
    </View>

    {demo && <View {...fx('pop')} style={styles.demo}>
      <Text style={styles.demoText}>下は見本（1998年4月12日生まれ・汐里さん）です。</Text>
      <Button onPress={create}>自分の波を見る　✦</Button>
    </View>}

    <View style={[S.card, styles.chartCard, demo && { opacity: .78 }]}>
      <View style={S.between}>
        <Text style={S.h3}>{SPAN_BACK}年前から{SPAN_AHEAD}年後まで</Text>
        <Text accessibilityRole="button" onPress={() => open('海流')} style={styles.link}>波の見方</Text>
      </View>
      <WaveChart years={years} thisYear={thisYear} selected={selected} onSelect={choose} season={season} demo={demo} />
      <Text style={S.tiny}>上にいくほど追い風の年。{demo ? '' : '点をタップすると、その年の12か月が開きます。'}</Text>
    </View>

    <Text accessibilityRole="header" style={S.h2}>この波から分かること</Text>
    <Answer mark={tiers[now.level].slice(0, 1)} kicker={thisYear + '年（今年）'} title={'今年は「' + tiers[now.level] + '」の年'}
      body={YEAR_TEXT[now.level]} color={tierColors[now.level]} delay={0} />
    <Answer mark="↗" kicker="次の追い風"
      title={now.level <= 1 && (!nextGood || nextGood.year > thisYear + 1) ? '追い風は、いま吹いています' : nextGood ? nextGood.year + '年（' + (nextGood.year - thisYear) + '年後）' : 'しばらく凪が続きます'}
      body={nextGood ? nextGood.year + '年は「' + tiers[nextGood.level] + '」。大きく動くなら、この年に照準を合わせて準備を。' : '派手な追い風はありませんが、荒れる年もありません。着実さが味方です。'}
      color={tierColors[nextGood?.level ?? 2]} delay={120} />
    {caution && <Answer mark="!" kicker="これから1年で気をつけたい月" title={caution.year + '年' + caution.month + '月ごろ〜'}
      body={'「' + tiers[caution.level] + '」の海況。大きな決断や契約は、この時期を避けるか、余裕を持って。'} color={tierColors[caution.level]} delay={240} />}
    {best && <Answer mark="★" kicker="これから1年でいちばんの月" title={best.year + '年' + best.month + '月ごろ〜'}
      body={'「' + tiers[best.level] + '」の海況。始めたいことの一歩目は、この月に置くと流れに乗れます。'} color={tierColors[best.level]} delay={360} />}

    {!demo && <View key={selected} {...fx('up')} style={[S.card, styles.year, asStyle({ borderColor: tierColors[sel.level] })]}>
      <View style={S.between}>
        <View>
          <Text style={S.kicker}>{selected}年{sel.age !== null ? '　·　' + sel.age + '歳の年' : ''}{selected === thisYear ? '　·　今年' : selected < thisYear ? '　·　過去' : '　·　これから'}</Text>
          <Text style={[styles.yearTier, { color: tierColors[sel.level] }]} accessibilityRole="button" onPress={() => open(tiers[sel.level])}>{tiers[sel.level]}<Text accessible={false} style={{ fontSize: 14, color: '#eacc8c' }}> ⓘ</Text></Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <TermText id="海流" style={S.tiny}>年の海流</TermText>
          <Text style={S.h3}>{sel.current}</Text>
          <Text style={S.tiny}>{sel.theme}の年</Text>
        </View>
      </View>
      <Text style={styles.yearText}>{YEAR_TEXT[sel.level]}</Text>
      <Text style={S.h3}>この年の12か月</Text>
      <View style={styles.months}>
        {blocks.map((block, i) => {
          const active = chosen === i;
          const height = 18 + (4 - block.level) * 9;
          return <View key={i} style={styles.monthCol}>
            <Pressable accessibilityRole="button" accessibilityLabel={(block.date.getUTCMonth() + 1) + '月ごろ ' + tiers[block.level]} onPress={() => setMonth(i)} {...fx('grow-up')}
              style={[styles.monthBar, asStyle({ height, backgroundColor: tierColors[block.level], opacity: active ? 1 : .55, animationDelay: i * 45 + 'ms', boxShadow: active ? `0 0 14px ${tierColors[block.level]}` : 'none' })]} />
            <Text style={[styles.monthLabel, active && { color: C.ink, fontWeight: '900' }]}>{block.date.getUTCMonth() + 1}</Text>
          </View>;
        })}
      </View>
      {chosen !== null && <View key={chosen} {...fx('fade')} style={styles.monthDetail}>
        <Text style={S.kicker}>{blocks[chosen].date.getUTCMonth() + 1}月ごろ〜</Text>
        <Text style={S.h3}><Text style={{ color: tierColors[blocks[chosen].level] }}>{tiers[blocks[chosen].level]}</Text>　{MONTH_TEXT[blocks[chosen].level]}</Text>
        <Gloss style={S.body}>{'海況「' + blocks[chosen].stage.n + '」：' + blocks[chosen].stage.d + '。'}</Gloss>
        {(selected < thisYear || (selected === thisYear && chosen <= c.solarMonth)) &&
          <Button quiet onPress={() => write(blocks[chosen].date.getUTCFullYear(), blocks[chosen].date.getUTCMonth() + 1, questionId)}>この頃の出来事を記録する</Button>}
      </View>}
      <Text style={S.tiny}>{resident.band}（名札 {labelOf(person.t)}）として読んだ流れです。</Text>
    </View>}

    {!!relevant.length && <>
      <Text style={S.h2}>{selected}年の記録</Text>
      <ReflectionCards records={relevant} edit={edit} />
    </>}

    {embedCalendar && <View nativeID="life-calendar" style={S.stack}>
      <Calendar key={calendarFocus?.key ?? 0} today={today} profile={profile} initial={calendarFocus ? { date: calendarFocus.date, mode: calendarFocus.mode } : undefined} />
    </View>}

    <NextLinks items={[
      ...(embedCalendar ? [{ icon: '🗓️', label: '運勢の輪・暦へ', hint: '今日までの海を、日付ごとに読み返す', onPress: scrollToLifeCalendar }] : []),
      { icon: '🌊', label: '今日の占いへ', onPress: showToday },
      ...(openJournal ? [{ icon: '📓', label: '記録・設定', hint: '残した問い・日記・データの管理', onPress: openJournal }] : []),
    ]} />
    <Text style={S.tiny}>次の潮替わり　{dateKey(nextChange(today))}。流れは創作占いの象徴で、未来を約束するものではありません。</Text>
  </View>;
}

function nextChange(today: Date) {
  const current = ctxFor(today).stage;
  for (let d = 1; d <= 35; d++) {
    const date = new Date(today.getTime() + d * 86_400_000);
    if (ctxFor(date).stage !== current) return date;
  }
  return today;
}

const styles = StyleSheet.create({
  hero: { padding: 20, gap: 8, overflow: 'hidden', backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(240,180,143,.28), transparent 60%)' } as object as ViewStyle,
  heroTitle: { color: C.ink, fontSize: 28, lineHeight: 40, fontFamily: rounded, fontWeight: '900' },
  question: { gap: 4, padding: 12, borderRadius: 14, backgroundColor: '#111a31', borderWidth: 1, borderColor: C.line },
  demo: { gap: 8, padding: 14, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.gold, backgroundColor: 'rgba(234,204,140,.08)' },
  demoText: { color: C.ink, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  chartCard: { padding: 14, gap: 6 },
  chart: { position: 'relative', paddingTop: 22 },
  rider: { position: 'absolute', marginLeft: -23, marginTop: -26 },
  link: { color: C.aqua, fontSize: 13, textDecorationLine: 'underline', textDecorationStyle: 'dotted' } as object as ViewStyle,
  answer: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1.5, backgroundColor: '#141e37' },
  answerMark: { width: 46, textAlign: 'center', fontSize: 30, lineHeight: 40, fontFamily: display },
  answerTitle: { color: C.ink, fontSize: 18, lineHeight: 26, fontWeight: '900' },
  answerBody: { color: C.muted, fontSize: 14, lineHeight: 23 },
  year: { padding: 16, gap: 10, borderWidth: 1.5 },
  yearTier: { fontSize: 40, lineHeight: 52, fontFamily: display },
  yearText: { color: C.ink, fontSize: 16, lineHeight: 27, fontFamily: rounded, fontWeight: '700' },
  months: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 82 },
  monthCol: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  monthBar: { width: '100%', borderRadius: 6, transformOrigin: 'bottom' } as object as ViewStyle,
  monthLabel: { color: C.muted, fontSize: 12 },
  monthDetail: { gap: 6, padding: 12, borderRadius: 14, backgroundColor: '#111a31', borderWidth: 1, borderColor: C.line },
});
