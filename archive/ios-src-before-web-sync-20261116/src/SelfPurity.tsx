import { useEffect, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from './web/svg';
import { readDay, residentIndex, type Profile } from './domain';
import {
  changedCount, choices, optionColors, sceneIcons, dones, highlights, learns, quadOf, quads, reasons, residentAsk, scenes, tideGuide, wants, whys, wishIdeas,
  type Move, type SelfResult, type SelfState,
} from './self';
import { Button, C, Card, Chip, Chips, S, tapFx } from './ui';
import { Float, glow, Pop, QuadMap, Sparkles } from './Visual';

const GOLD = C.gold;
const AQUA = '#8fb4e8';

async function shareText(message: string, notify: (text: string) => void) {
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) await navigator.share({ text: message });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(message); notify('コピーしました'); }
      else notify(message);
    } else await Share.share({ message });
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) notify(message);
  }
}

// 値が変わるたびに「出現前→出現後」を挟み、CSS transition でふわっと見せる（RN の Animated は使わない）。
function useIn(key: unknown) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    const timer = setTimeout(() => setShown(true), 30);
    return () => clearTimeout(timer);
  }, [key]);
  return shown;
}

function Big({ children, mark, onPress, selected, sub, dot }: { children: string; mark?: string; onPress: () => void; selected?: boolean; sub?: string; dot?: string }) {
  return <Pressable {...tapFx} accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
    style={({ pressed }) => [st.big, selected && st.bigOn, pressed && { opacity: .7, transform: [{ scale: .98 }] }]}>
    {dot && <View style={[st.dotMark, { backgroundColor: selected ? C.dark : dot }]} />}
    {mark && <Text style={st.bigMark}>{mark}</Text>}
    <View style={{ flex: 1 }}>
      <Text style={[st.bigText, selected && { color: C.dark }]}>{children}</Text>
      {sub && <Text style={[S.tiny, selected && { color: C.dark }]}>{sub}</Text>}
    </View>
  </Pressable>;
}

function Bar({ label, value, color, note }: { label: string; value: number; color: string; note?: string }) {
  const shown = useIn(value);
  return <View style={{ gap: 5 }}>
    <View style={S.between}>
      <Text style={S.h3}>{label}</Text>
      <Text style={[st.num, { color }]}>{value}<Text style={S.tiny}> /100</Text></Text>
    </View>
    <View style={st.track}>
      <View style={[st.fill, st.grow, { backgroundColor: color, width: `${shown ? value : 0}%` }]} />
    </View>
    {note && <Text style={S.tiny}>{note}</Text>}
  </View>;
}

function Delta({ now, before }: { now: number; before?: number }) {
  if (before === undefined) return null;
  const d = now - before;
  return <Text style={[S.tiny, { color: d === 0 ? C.muted : d > 0 ? '#b6dfc4' : '#e3af92' }]}>前回より {d > 0 ? '+' : ''}{d}</Text>;
}

/* ---------- ホーム ---------- */

export function SelfHome({ state, profile, today, start, openResult, openWish, saveCheck, saveAfter, goToday }: {
  state: SelfState; profile: Profile | null; today: string; start: () => void; openResult: (id: number) => void;
  openWish: () => void; saveCheck: (reason: number) => void; saveAfter: (id: number, after: NonNullable<Move['after']>) => void;
  goToday: () => void;
}) {
  const last = state.results[0];
  const prev = state.results[1];
  const checkedToday = state.checks.find(check => check.day === today);
  const pending = state.moves.find(move => !move.after && move.choice < 2 && move.day < today);
  const week = state.checks.slice(0, 7);
  const ownCount = week.filter(check => reasons[check.reason].own).length;
  const quad = last && quads[quadOf(last.p, last.s)];

  return <View style={S.stack}>
    <Pressable {...tapFx} accessibilityRole="button" onPress={goToday} style={({ pressed }) => [st.banner, pressed && { opacity: .8 }]}>
      <Text style={{ fontSize: 28 }}>☾</Text>
      <View style={{ flex: 1 }}>
        <Text style={S.kicker}>占い</Text>
        <Text style={S.h3}>今日の運勢を見る</Text>
      </View>
      <Text style={[S.h2, { color: C.gold }]}>›</Text>
    </Pressable>
    {!last && <View style={st.hero}>
      <Text style={S.kicker}>自己診断</Text>
      <Text accessibilityRole="header" style={st.heroTitle}>今の自分は、{'\n'}自分で選べてる？</Text>
      <Text style={S.body}>8つの場面を、直感でタップ。約1分。</Text>
      <Button onPress={start}>はじめる　›</Button>
      <Text style={S.tiny}>名前も生年月日も要りません。正解はありません。</Text>
    </View>}

    {last && quad && <Pressable {...tapFx} accessibilityRole="button" onPress={() => openResult(last.id)} style={({ pressed }) => [S.card, S.pad, pressed && { opacity: .75 }]}>
      <View style={S.between}>
        <Text style={S.kicker}>いまの目安 · {last.day.slice(5).replace('-', '/')}</Text>
        <Text style={S.tiny}>くわしく ›</Text>
      </View>
      <Text style={[st.type, { color: quad.color }]}>{quad.mark}　{quad.name}</Text>
      <Bar label="自己純度" value={last.p} color={GOLD} />
      <Delta now={last.p} before={prev?.p} />
      <Bar label="自我強度" value={last.s} color={AQUA} />
      <Delta now={last.s} before={prev?.s} />
    </Pressable>}
    {last && <Button quiet onPress={start}>もういちど測って、変化を見る</Button>}

    {pending && <FollowUp move={pending} save={after => saveAfter(pending.id, after)} />}

    <Card>
      <Text style={S.kicker}>10秒チェック</Text>
      <Text style={S.h2}>最近選んだもの、どうして選んだ？</Text>
      {checkedToday
        ? <Text style={S.body}>今日は「{reasons[checkedToday.reason].text}」。また明日。</Text>
        : <Chips>{reasons.map((reason, index) => <Chip key={reason.text} onPress={() => saveCheck(index)}>{reason.text}</Chip>)}</Chips>}
      {week.length > 0 && <View style={st.dots}>
        {week.map((check, index) => <View key={index} style={[st.dot, { backgroundColor: reasons[check.reason].own ? GOLD : '#4b5675' }]} />)}
        <Text style={S.tiny}>直近{week.length}回のうち、自分で選んだ {ownCount}</Text>
      </View>}
    </Card>

    <View style={[S.card, S.pad, { borderColor: '#4c6aa8' }]}>
      <Text style={S.kicker}>潮環占いとつなぐ</Text>
      <Text style={S.h2}>自分の意志を、{'\n'}いつ現実にする？</Text>
      <Text style={S.body}>望みを一つ決めて、今日の潮を見て、動くかを自分で選ぶ。</Text>
      <Button onPress={openWish}>{state.wish ? '「' + state.wish + '」を進める' : '望みを決める　›'}</Button>
      {!profile && <Text style={S.tiny}>潮を見るには、潮環占いで自分の海をひらきます（あとからでOK）。</Text>}
    </View>

    {state.results.length >= 2
      ? <History results={state.results} />
      : <Card><Text style={S.h3}>変化のグラフ</Text><Text style={S.body}>{last ? 'もう1回測ると、ここに変化が出ます。' : '測ると、ここに変化が出ます。'}</Text></Card>}

    {profile && <ResidentAsk profile={profile} />}
    <Text style={[S.tiny, { textAlign: 'center' }]}>点数は心理テストではなく「いまの目安」。人の優劣や運命を決めるものではありません。</Text>
  </View>;
}

function ResidentAsk({ profile }: { profile: Profile }) {
  return <Card>
    <Text style={S.kicker}>占いの住人から、ひとこと問い</Text>
    <Text style={S.h3}>{residentAsk[residentIndex(profile.t)]}</Text>
    <Text style={S.tiny}>点数には関係しません。考えるきっかけです。</Text>
  </Card>;
}

function FollowUp({ move, save }: { move: Move; save: (after: NonNullable<Move['after']>) => void }) {
  const [done, setDone] = useState<number | null>(null);
  return <Card>
    <Text style={S.kicker}>前の一手を振り返る</Text>
    <Text style={S.h3}>「{move.wish}」を「{choices[move.choice].text}」にした日</Text>
    {done === null
      ? <><Text style={S.body}>どうだった？</Text><Chips>{dones.map((text, index) => <Chip key={text} onPress={() => setDone(index)}>{text}</Chip>)}</Chips></>
      : <><Text style={S.body}>気づいたことは？</Text><Chips>{learns.map(text => <Chip key={text} onPress={() => save({ done, learn: text })}>{text}</Chip>)}</Chips></>}
  </Card>;
}

function History({ results }: { results: SelfResult[] }) {
  const list = results.slice(0, 8).reverse();
  const w = 300; const h = 110; const pad = 10;
  const x = (i: number) => list.length === 1 ? w / 2 : pad + i * (w - pad * 2) / (list.length - 1);
  const y = (v: number) => h - pad - v / 100 * (h - pad * 2);
  const line = (key: 'p' | 's') => list.map((r, i) => x(i) + ',' + y(r[key])).join(' ');
  const first = list[0]; const lastR = list[list.length - 1];
  return <Card>
    <Text style={S.kicker}>変化のグラフ</Text>
    <View accessible accessibilityRole="image" accessibilityLabel={'自己純度 ' + first.p + 'から' + lastR.p + '、自我強度 ' + first.s + 'から' + lastR.s}>
      <Svg width="100%" height={130} viewBox={'0 0 ' + w + ' ' + h}>
        {[0, 50, 100].map(v => <Line key={v} x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} stroke="#414e6a" strokeWidth=".6" strokeDasharray="2 4" />)}
        <Polyline points={line('p')} fill="none" stroke={GOLD} strokeWidth="2" />
        <Polyline points={line('s')} fill="none" stroke={AQUA} strokeWidth="2" />
        {list.map((r, i) => <Circle key={r.id} cx={x(i)} cy={y(r.p)} r="3" fill={GOLD} />)}
        {list.map((r, i) => <Circle key={'s' + r.id} cx={x(i)} cy={y(r.s)} r="3" fill={AQUA} />)}
      </Svg>
    </View>
    <View style={S.row}>
      <Text style={[S.tiny, { color: GOLD }]}>● 自己純度</Text>
      <Text style={[S.tiny, { color: AQUA }]}>● 自我強度</Text>
    </View>
    <Text style={S.body}>上がっても下がっても、それは「いまの自分」の記録。揺れは悪いことではありません。</Text>
  </Card>;
}

/* ---------- 診断（1問ずつ） ---------- */

export function SelfQuiz({ done }: { done: (answers: number[]) => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const index = answers.length;
  const scene = scenes[index];
  const shown = useIn(index);

  function pick(option: number) {
    if (picked !== null) return;
    setPicked(option);
    setTimeout(() => {
      const next = [...answers, option];
      setPicked(null);
      if (next.length === scenes.length) done(next); else setAnswers(next);
    }, 240);
  }

  if (!scene) return null;
  return <View style={S.stack}>
    <View style={st.progress} accessible accessibilityLabel={(index + 1) + '問目、全' + scenes.length + '問'}>
      {scenes.map((item, i) => <View key={item.id} style={[st.seg, i < index && { backgroundColor: GOLD }, i === index && { backgroundColor: '#8f7d4c' }]} />)}
    </View>
    <View style={[st.fade, { opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : 12 }], gap: 14 }]}>
      <View style={st.sceneCard}>
        <Float><Text style={st.sceneIcon}>{sceneIcons[scene.id]}</Text></Float>
        <Text style={S.kicker}>{index + 1} / {scenes.length}　{scene.tag}</Text>
        <Text accessibilityRole="header" style={[st.scene, { textAlign: "center" }]}>{scene.scene}</Text>
      </View>
      <Text style={S.tiny}>こんなとき、近いのは？</Text>
      <View style={{ gap: 10 }}>
        {scene.options.map((option, i) => <Big key={option.text} dot={optionColors[i]} selected={picked === i} onPress={() => pick(i)}>{option.text}</Big>)}
      </View>
    </View>
    {index > 0 && picked === null && <Button quiet onPress={() => setAnswers(answers.slice(0, -1))}>‹ ひとつ戻る</Button>}
  </View>;
}

/* ---------- 結果 ---------- */

export function SelfResultView({ result, previous, profile, again, openWish, openHome }: {
  result: SelfResult; previous?: SelfResult; profile: Profile | null; again: () => void; openWish: () => void; openHome: () => void;
}) {
  const [message, setMessage] = useState('');
  const quad = quads[quadOf(result.p, result.s)];
  const { own, other } = highlights(result.answers);
  const changed = previous ? changedCount(result.answers, previous.answers) : null;
  const text = ['潮環占い｜自己純度', quad.name, '自己純度 ' + result.p + '／自我強度 ' + result.s + '（いまの目安）', quad.line].join('\n');
  return <View style={S.stack}>
    <View style={[st.hero, glow(quad.color), { borderColor: quad.color, alignItems: 'center', overflow: 'hidden' }]}>
      <Sparkles color={quad.color} />
      <Text style={S.kicker}>いまの自分は</Text>
      <Pop><Text style={st.resultMark}>{quad.mark}</Text></Pop>
      <Pop delay={150}><Text accessibilityRole="header" style={[st.heroTitle, { color: quad.color, textAlign: 'center' }]}>{quad.name}</Text></Pop>
      <Pop delay={300}><Text style={[S.h3, { textAlign: 'center' }]}>{quad.line}</Text></Pop>
    </View>
    <Card>
      <QuadMap p={result.p} s={result.s} prev={previous ? { p: previous.p, s: previous.s } : undefined} quads={quads} />
      <Text style={S.tiny}>{previous ? '白い輪が前回の位置。点線が動いた道すじです。' : '2回目からは、前回の位置との動きが線で見えます。'}</Text>
    </Card>
    <Card>
      <Bar label="自己純度" value={result.p} color={GOLD} note="自分で評価して選べている度合い" />
      <Delta now={result.p} before={previous?.p} />
      <Bar label="自我強度" value={result.s} color={AQUA} note="外の声があっても、自分の物差しを保てる度合い" />
      <Delta now={result.s} before={previous?.s} />
      {changed !== null && <Text style={S.tiny}>前回から答えが変わった場面：{changed}／{scenes.length}</Text>}
    </Card>
    {(own.length > 0 || other.length > 0) && <Card>
      {own.length > 0 && <><Text style={S.kicker}>自分の判断が出た場面</Text><Chips>{own.map(tag => <Chip key={tag} active>{tag}</Chip>)}</Chips></>}
      {other.length > 0 && <><Text style={S.kicker}>周りに寄りやすい場面</Text><Chips>{other.map(tag => <Chip key={tag}>{tag}</Chip>)}</Chips></>}
    </Card>}
    <Card>
      <Text style={S.kicker}>自分への問い</Text>
      <Text style={S.h2}>{quad.ask}</Text>
      <Text style={S.tiny}>頭の中で答えるだけでOK。</Text>
    </Card>
    <Button onPress={openWish}>この意志を、潮に乗せる　›</Button>
    <Chips>
      <Chip onPress={() => { void shareText(text, setMessage); }}>結果を共有</Chip>
      <Chip onPress={again}>もういちど</Chip>
      <Chip onPress={openHome}>変化を見る</Chip>
    </Chips>
    {!!message && <Text selectable accessibilityLiveRegion="polite" style={S.tiny}>{message}</Text>}
    {!profile && <Text style={S.tiny}>潮環占いと合わせると、今日動くかを考える材料が増えます。</Text>}
    <Text style={S.tiny}>数値は「いまの目安」。上がることが正解ではなく、人の優劣でもありません。</Text>
  </View>;
}

/* ---------- 意志 → 潮 → 選ぶ ---------- */

export function SelfWish({ profile, today, wish, saveMove, createProfile, finish }: {
  profile: Profile | null; today: Date; wish: string; saveMove: (move: Omit<Move, 'id'>, wish: string) => void;
  createProfile: () => void; finish: () => void;
}) {
  const [step, setStep] = useState(wish ? 1 : 0);
  const [text, setText] = useState(wish);
  const [want, setWant] = useState<number | null>(null);
  const [skipTide, setSkipTide] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const tier = profile ? readDay(today, profile).layers.day : null;
  const guide = tier === null ? null : tideGuide(tier);
  const day = today.toISOString().slice(0, 10);
  const matches = guide && choice !== null ? guide.suggest === choice : null;

  function commit(why: string) {
    if (want === null || choice === null || !text.trim()) return;
    saveMove({ day, wish: text.trim(), want, tide: tier, choice, why }, text.trim());
    setSaved(true);
  }

  const stepBar = <View style={st.progress}>{[0, 1, 2, 3].map(i => <View key={i} style={[st.seg, i <= step && { backgroundColor: GOLD }]} />)}</View>;

  if (saved) return <View style={S.stack}>
    <View style={st.hero}>
      <Text style={S.kicker}>決めました</Text>
      <Text accessibilityRole="header" style={st.heroTitle}>{choices[choice ?? 0].mark}　{text}{'\n'}を「{choices[choice ?? 0].text}」</Text>
      <Text style={S.body}>あとで、どうだったかを振り返りましょう。自己診断のホームに出ます。</Text>
    </View>
    <Button onPress={finish}>自己診断に戻る</Button>
  </View>;

  if (step === 0) return <View style={S.stack}>
    {stepBar}
    <Text style={S.kicker}>① 望み</Text>
    <Text accessibilityRole="header" style={st.scene}>いま、現実にしたいことは？</Text>
    <Chips>{wishIdeas.map(idea => <Chip key={idea} active={text === idea} onPress={() => setText(idea)}>{idea}</Chip>)}</Chips>
    <TextInput value={text} onChangeText={value => setText(value.slice(0, 30))} placeholder="自分の言葉で（30字まで）" placeholderTextColor="#7f8cab" style={S.field} />
    <Button disabled={!text.trim()} onPress={() => setStep(1)}>次へ　›</Button>
  </View>;

  if (step === 1) return <View style={S.stack}>
    {stepBar}
    <Text style={S.kicker}>② 今の気持ち</Text>
    <Text accessibilityRole="header" style={st.scene}>「{text}」{'\n'}今日の気持ちは？</Text>
    <View style={{ gap: 10 }}>{wants.map((item, i) => <Big key={item} selected={want === i} onPress={() => { setWant(i); setStep(2); }}>{item}</Big>)}</View>
    <Button quiet onPress={() => setStep(0)}>‹ 望みを変える</Button>
  </View>;

  if (step === 2) return <View style={S.stack}>
    {stepBar}
    <Text style={S.kicker}>③ 今日の潮</Text>
    {guide && !skipTide ? <>
      <View style={st.hero}>
        <Text style={st.huge}>{guide.mark}</Text>
        <Text accessibilityRole="header" style={st.heroTitle}>{guide.name}</Text>
        <Text style={S.h3}>{guide.line}</Text>
        <Text style={S.tiny}>予言ではなく、考えるきっかけ。決めるのはあなた。</Text>
      </View>
      <Button onPress={() => setStep(3)}>自分で決める　›</Button>
    </> : <View style={S.stack}>
      <Text accessibilityRole="header" style={st.scene}>潮を見てから決める？</Text>
      {!profile && <Button onPress={createProfile}>自分の海をひらいて潮を見る</Button>}
      <Button quiet onPress={() => { setSkipTide(true); setStep(3); }}>潮は見ずに決める</Button>
    </View>}
    <Text style={S.tiny}>お金・健康・法律など大きな決断は、占いだけで決めないで。</Text>
  </View>;

  const disagree = matches === false;
  return <View style={S.stack}>
    {stepBar}
    <Text style={S.kicker}>④ あなたの選択</Text>
    <Text accessibilityRole="header" style={st.scene}>「{text}」{'\n'}どうする？</Text>
    <View style={{ gap: 10 }}>{choices.map((item, i) => <Big key={item.text} mark={item.mark} selected={choice === i} onPress={() => setChoice(i)}>{item.text}</Big>)}</View>
    {choice !== null && <Card>
      <Text style={S.h3}>{matches === null ? 'どうしてそう決めた？' : disagree ? '潮とは違う選択。その理由は？' : '潮と気持ちが重なったね。決め手は？'}</Text>
      <Chips>{whys.map(why => <Chip key={why} onPress={() => commit(why)}>{why}</Chip>)}</Chips>
      <Text style={S.tiny}>理由をタップすると保存されます。</Text>
    </Card>}
  </View>;
}

const st = StyleSheet.create({
  hero: { borderWidth: 1, borderColor: '#4c5271', borderRadius: 22, padding: 20, gap: 10, backgroundColor: '#141e37' },
  heroTitle: { color: C.ink, fontSize: 30, lineHeight: 41, fontWeight: '800' },
  huge: { fontSize: 44, lineHeight: 52 },
  scene: { color: C.ink, fontSize: 24, lineHeight: 34, fontWeight: '800' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: C.gold, backgroundColor: '#2a2a2e' },
  sceneCard: { alignItems: 'center', gap: 8, padding: 18, borderRadius: 22, backgroundColor: '#17223d', borderWidth: 1, borderColor: C.line },
  sceneIcon: { fontSize: 52, lineHeight: 64 },
  resultMark: { fontSize: 64, lineHeight: 76 },
  dotMark: { width: 14, height: 14, borderRadius: 7 },
  type: { fontSize: 26, lineHeight: 34, fontWeight: '800' },
  big: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 18, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  bigOn: { backgroundColor: C.gold, borderColor: C.gold },
  bigMark: { fontSize: 24 },
  bigText: { color: C.ink, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: 5 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#2a3552' },
  track: { height: 12, borderRadius: 6, backgroundColor: '#0e1424', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  grow: { transitionProperty: 'width', transitionDuration: '700ms' } as object,
  fade: { transitionProperty: 'opacity, transform', transitionDuration: '280ms' } as object,
  num: { fontSize: 26, fontWeight: '800' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 14, height: 14, borderRadius: 7 },
});
