import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GodAnimation } from './GodAnimation';
import { content, residentIndex, type readDay } from './domain';
import { useGloss } from './Glossary';
import { glossary } from './terms';
import readingText from './reading-text.json';
import { labelOf, SEASON } from './scoring';
import { residents } from './voyage';
import { C, display, rounded, S } from './ui';
import { imeSegmentsFor } from './kana';
import { startResultFx } from './resultFx';
import { hexToRgb } from './ritualStorm';
import { Burst, Float, fx, glow, GlowPulse, ImeText, imeDuration, Reveal, Sparkles, TierStrip, TypeText, Waves } from './Visual';

type Reading = ReturnType<typeof readDay>;

// 5段階の色。荒波・轟沈は「注意」を赤で示す。
const COLORS = ['#efd393', '#b6dfc4', '#c1d2ef', '#ff5a4d', '#e0245e'];
const levelOfRank = (rank: number) => rank <= 16 ? 0 : rank <= 56 ? 1 : rank <= 104 ? 2 : rank <= 144 ? 3 : 4;

const INTRO = 1700; // 神様が画面の真ん中から覗いて、離れていくまで
const COUNT_START = 1300 + INTRO;
const COUNT_MS = 2200;
const DONE_AT = COUNT_START + COUNT_MS;

const asStyle = (style: object) => style as unknown as ViewStyle;

/** 確定の瞬間の光景を、画面いっぱいの canvas に描く。数字の位置を追いかけるので、ポスターの外まで光が届く。 */
function ResultFx({ color, level, done, onShake }: { color: string; level: number; done: boolean; onShake: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReturnType<typeof startResultFx> | null>(null);
  const shake = useRef(onShake);
  shake.current = onShake;
  const [alive, setAlive] = useState(true);
  useEffect(() => {
    if (!canvas.current) return;
    const started = startResultFx(canvas.current, {
      anchor: () => {
        const box = document.querySelector('[data-ui="rank"]')?.getBoundingClientRect();
        return box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null;
      },
      chargeAt: COUNT_START / 1000,
      onShake: () => shake.current(),
      onEnd: () => setAlive(false),
    });
    engine.current = started;
    return () => started.stop();
  }, []);
  useEffect(() => {
    if (done) engine.current?.finish(level, hexToRgb(color));
    else engine.current?.setColor(hexToRgb(color));
  }, [done, level, color]);
  return alive ? createPortal(<canvas ref={canvas} className="result-fx" aria-hidden="true" />, document.body) : null;
}

/**
 * 占い結果のポスター。順位を1位から数え上げ、通過する段階の色へ枠・波・数字が変わっていき、
 * 該当順位で止まった瞬間に全体が「確定」の動きをする。
 */
export function ResultPoster({ reading, band, personName, dateText, dayWord, instant }: {
  reading: Reading; band?: string; personName?: string; dateText: string; dayWord: string; instant: boolean;
}) {
  const rank = reading.row.rank;
  const finalLevel = levelOfRank(rank);
  const [value, setValue] = useState(instant ? rank : 1);
  const [done, setDone] = useState(instant);
  const [quake, setQuake] = useState(0);

  useEffect(() => {
    if (instant) { setValue(rank); setDone(true); return; }
    setValue(1);
    setDone(false);
    let frame = 0;
    const start = performance.now() + COUNT_START;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / COUNT_MS));
      setValue(Math.max(1, Math.round(1 + (rank - 1) * (1 - Math.pow(1 - progress, 2.2)))));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [rank, instant]);

  const level = done ? finalLevel : levelOfRank(value);
  const color = COLORS[level];
  const danger = done && finalLevel >= 3;
  const confirm = done && !instant;
  const punch = (delay = 0) => confirm ? { ...fx('punch'), style: asStyle({ animationDelay: delay + 'ms' }) } : {};
  const o = instant ? 0 : INTRO;
  const plate = [...labelOf(reading.row.t)];
  const lineDelay = instant ? 0 : DONE_AT + 500;
  const ime = imeSegmentsFor(reading.outlook.line);
  const typeMs = ime ? imeDuration(ime) : reading.outlook.line.length * 26;
  const actionDelay = lineDelay + typeMs + 200;
  const actionIme = imeSegmentsFor(reading.outlook.action);

  // 見た目は変えずに、名札・タイプ名・順位・段階をタップすると意味がポップで出る（演出が終わってから有効）。
  const explain = useGloss();
  const t = reading.row.t;
  const season = SEASON[t.mod];
  const resident = residents[residentIndex(t)];
  const depthName = ['浅瀬', '沿岸', '沖合', '深海'][residentIndex(t) % 4];
  const explainPlate = () => explain({
    title: labelOf(t), kicker: '名札の読み方', mark: '札', color,
    body: 'この一行に、季節・印・深さが入っています。生年月日と名前から決まり、一生変わりません。',
    rows: [
      { mark: season.n, label: season.n + '＝' + season.act + '力', text: readingText.SEASON_INFO[t.mod].what + '。生年月日で決まります。', color: season.col },
      ...(t.A ? [{ mark: 'A', label: '渦の印', text: '月が近い日ほど、運勢の振れ幅が大きくなります。' }] : []),
      ...(t.minus ? [{ mark: '−', label: '向かい風の印', text: '人の追い風が向かい風になりやすい体質。荒れた海では進みやすい日があります。' }] : []),
      { mark: t.num.toFixed(1), label: '深さ（' + depthName + '）', text: content.depths[t.ni][1] + '。名前の画数で決まります。' },
    ],
    more: '名札は全部で160通り。毎日の順位は、この名札と今日の海の相性で決まります。',
  });
  const explainBand = () => explain({
    title: resident.band, kicker: '占いタイプ（16種類のひとつ）', mark: '型', color: season.col,
    body: resident.subtitle + '。' + resident.summary + '。',
    rows: [
      { mark: season.n, label: '季節', text: season.act + 'ことに力が出ます。', color: season.col },
      { mark: depthName.slice(0, 1), label: '深さ：' + depthName, text: content.depths[t.ni][2] + 'で持ち味が出ます。' },
    ],
    more: 'タイプの詳しい性格や人間関係のヒントは、この下の「自分のタイプと人間関係のヒント」と「図鑑」で読めます。',
  });
  const explainRank = () => explain({
    title: rank + '位 / 160', kicker: dayWord + 'の順位', mark: '位', color,
    body: glossary.順位.body,
    rows: [['凱風', '1〜16位'], ['順風', '17〜56位'], ['凪', '57〜104位'], ['荒波', '105〜144位'], ['轟沈', '145〜160位']].map(([name, range], index) => ({
      mark: name, label: range + (index === finalLevel ? '　← ' + dayWord + 'はここ' : ''), text: glossary[name].body.split('。')[0] + '。', color: COLORS[index],
    })),
    more: glossary.順位.more,
  });
  const explainTier = () => explain({ ...glossary[['凱風', '順風', '凪', '荒波', '轟沈'][finalLevel]], color });

  return <View {...(quake ? fx(quake % 2 ? 'quake' : 'quake2') : confirm ? fx('confirm') : {})} style={[styles.poster, glow(color), asStyle({
    borderColor: color, boxShadow: `0 0 0 1px ${color}66, 0 0 48px ${color}55`, transitionProperty: 'border-color, box-shadow', transitionDuration: '300ms',
  })]}>
    <Waves color={color} level={level} />
    {danger && <GlowPulse color={color} />}
    <Sparkles color={color} />
    {confirm && <Burst color={color} />}
    {!instant && <ResultFx color={color} level={finalLevel} done={done} onShake={() => setQuake(count => count + 1)} />}
    <View style={S.between}>
      <Text style={S.kicker}>{dateText}</Text>
      <Text style={[S.kicker, { color: C.ink, opacity: .7 }]}>潮環占い</Text>
    </View>
    <View style={{ alignItems: 'center', gap: 2 }}>
      {/* 神様の定位置（文字と重ならない専用の場所）。結果が出るときは、近くから覗いて離れ、ここに収まる。 */}
      <View {...(instant ? {} : fx('peek'))} style={{ width: 84, marginBottom: 4 }}>
        <View {...(confirm ? fx('jump') : {})}><Float><GodAnimation forcePlay index={reading.row.t.mod} style={{ width: 84 }} /></Float></View>
      </View>
      {personName && <Text style={S.tiny}>{personName}さんのタイプ</Text>}
      <Pressable disabled={!done} onPress={explainPlate} accessibilityRole="button" accessibilityLabel={labelOf(reading.row.t) + '。タップで名札の読み方'} style={{ flexDirection: 'row' }}>
        {plate.map((char, index) => <Reveal key={index} kind="pop" delay={260 + o + index * 90} instant={instant}>
          <View {...punch(index * 70)}><Text style={styles.plate}>{char}</Text></View>
        </Reveal>)}
      </Pressable>
      <Reveal kind="up" delay={760 + o} instant={instant}><Pressable disabled={!done} onPress={explainBand} accessibilityRole="button" accessibilityLabel={band + '。タップでタイプの説明'}><Text style={styles.typeName}>{band}</Text></Pressable></Reveal>
    </View>
    <Reveal kind="fade" delay={1000 + o} instant={instant}>
      <View style={styles.todayHead}>
        <View style={[styles.rule, { backgroundColor: color }]} />
        <Text style={[styles.todayLabel, { color }]}>{dayWord}の運勢</Text>
        <View style={[styles.rule, { backgroundColor: color }]} />
      </View>
    </Reveal>
    <Reveal kind="fade" delay={1100 + o} instant={instant} style={{ alignItems: 'center' }}>
      <Pressable disabled={!done} onPress={explainRank} accessibilityRole="button"><View {...(confirm ? fx('lock') : {})}>
        <Text accessibilityLabel={`${dayWord}は160タイプ中${rank}位`} style={styles.rankLine}>
          <Text {...({ dataSet: { ui: 'rank' } } as object)} style={[styles.rankNum, { color }, done && asStyle({ textShadow: `0 0 22px ${color}aa` })]}>{value}</Text> 位 / 160
        </Text>
      </View></Pressable>
    </Reveal>
    <Reveal kind="up" delay={1200 + o} instant={instant}>
      <Pressable disabled={!done} onPress={explainTier} accessibilityRole="button"><View {...punch(250)}><TierStrip level={level} /></View></Pressable>
    </Reveal>
    {ime
      ? <ImeText segments={ime} delay={lineDelay} instant={instant} style={styles.line} />
      : <TypeText text={reading.outlook.line} delay={lineDelay} speed={26} instant={instant} style={styles.line} />}
    <Reveal kind="up" delay={actionDelay} instant={instant}>
      <View style={styles.action}>
        <Text style={S.kicker}>{dayWord}の一手</Text>
        {actionIme
          ? <ImeText segments={actionIme} delay={actionDelay + 350} instant={instant} style={styles.actionText} />
          : <Text style={styles.actionText}>{reading.outlook.action}</Text>}
      </View>
    </Reveal>
  </View>;
}

const styles = StyleSheet.create({
  poster: { borderWidth: 3, borderRadius: 28, padding: 18, paddingBottom: 64, gap: 12, backgroundColor: '#141e37' },
  plate: { color: C.ink, fontSize: 58, lineHeight: 66, fontFamily: display, textAlign: 'center' },
  typeName: { color: C.ink, fontSize: 20, lineHeight: 28, textAlign: 'center', fontFamily: rounded, fontWeight: '900' },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  rule: { flex: 1, height: 2, borderRadius: 1, opacity: 0.6 },
  todayLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  rankLine: { color: C.muted, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  rankNum: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  line: { color: C.ink, fontSize: 20, lineHeight: 31, fontFamily: rounded, fontWeight: '700', textAlign: 'center' },
  action: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: 'rgba(15,24,48,.72)', borderWidth: 1, borderColor: C.line },
  actionText: { color: C.ink, fontSize: 19, lineHeight: 28, fontWeight: '800' },
});
