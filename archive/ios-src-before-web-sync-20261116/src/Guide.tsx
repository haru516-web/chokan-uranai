// 使い方ガイド。「友達はどんなタイプか」「海流・海況・波はどう違うか」を、次へ／戻る／スキップだけで読める。
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currents, residentArt, stages, tierArt } from './art';
import { residentIndex, tierColors, tiers, type Profile } from './domain';
import { glossary } from './terms';
import { ctxFor, OUTER, SEASON, STAGES } from './scoring';
import { Image } from './web/image';
import residents from './residents.json';
import readingText from './reading-text.json';
import { C, display, rounded, S } from './ui';

// 季節は 春 夏 秋 冬 の順（SEASON は 冬 春 夏 秋 の順なので並べ替える）。
const seasonOrder = [1, 2, 3, 0];
const depthBands = [
  { n: '浅瀬', range: '1.0〜2.0', text: '目の前の変化にすぐ気づき、すぐ動く。軽くて速い。', care: '反応しすぎて疲れやすい' },
  { n: '沿岸', range: '2.5〜3.0', text: '身近な人やものを、手をかけて育てる。面倒見がいい。', care: '境目があいまいになりやすい' },
  { n: '沖合', range: '3.5〜4.0', text: '一歩引いて、全体の形を見渡す。冷静で見通しが利く。', care: '即答が苦手で、選択肢を増やしがち' },
  { n: '深海', range: '4.5〜5.5', text: '時間をかけて、言葉にならないことまで抱える。独自の世界を持つ。', care: '分かってもらいにくく、ひとりになりがち' },
];
const marks = [
  { mark: '無印', title: '印のない人', text: '多くの人はこのタイプ。日ごとの運勢は、その日の海のとおりに素直に出ます。' },
  { mark: '−', title: '向かい風の印', text: 'みんなが追い風の日に進みにくく、荒れた日に意外と進める、風の受け方が逆になりやすい人。', care: '努力不足ではなく、風向きの違いです。' },
  { mark: 'A', title: '渦の印', text: '月が近い日ほど運勢の振れ幅が大きく、動く日は大きく動く人。周りを巻き込む力もあります。', care: '当たる日も外れる日も大きめです。' },
];
const tierNotes = ['動いた分だけ返ってくる、最高の追い風', '帆を張れば進める、いい流れ', '波の少ない、ふつうの日。整えるのに向く', '波が立つ。大きな決断は急がない', '休んでいい合図。守ることに力を使う'];
const tierRanks = ['1〜16位', '17〜56位', '57〜104位', '105〜144位', '145〜160位'];

type Page = { key: string; kicker: string; title: string; lead?: string; accent: string; body: ReactNode };
const glow = (color: string) => ({ backgroundImage: `linear-gradient(120deg, ${color}2e, transparent 75%)` }) as never;

function Tag({ children, color = C.gold }: { children: string; color?: string }) {
  return <View {...({ dataSet: { gd: 'pulse' } } as object)} style={[st.tag, { borderColor: color }]}><Text style={[st.tagText, { color }]}>{children}</Text></View>;
}

export function Guide({ today, profile, onClose }: { today: Date; profile: Profile | null; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<{ scrollTo: (o: { y: number; animated: boolean }) => void } | null>(null);
  useEffect(() => { scroller.current?.scrollTo({ y: 0, animated: false }); }, [index]);
  const c = ctxFor(today);
  const mine = profile ? { season: profile.t.mod, resident: residentIndex(profile.t) } : null;
  const mineDepth = mine ? mine.resident % 4 : -1;

  const seasonCards = seasonOrder.map(mod => {
    const info = readingText.SEASON_INFO[mod];
    return { mod, info, season: SEASON[mod] };
  });

  const pages: Page[] = [
    { key: 'season', accent: '#eacc8c', kicker: '1 ／ 季節　4種類', title: 'なにを得意とする人か',
      lead: '春・夏・秋・冬は、季節というより「力の向き」です。友達がどれにあたるか想像しながら見てみましょう。',
      body: <>{seasonCards.map(({ mod, info, season }) => <View key={mod} style={[st.card, { borderColor: season.col + 'aa' }, glow(season.col)]}>
        <View style={st.cardHead}><Text style={[st.big, { color: season.col }]}>{season.n}</Text>
          <View style={{ flex: 1 }}><Text style={[st.rowTitle, { color: season.col }]}>{info.act}人</Text><Text style={st.small}>{info.what}</Text></View>
          {mine?.season === mod && <Tag color={season.col}>あなた</Tag>}</View>
        <Text style={st.line}><Text style={st.label}>得意　</Text>{info.good}</Text>
        <Text style={st.line}><Text style={st.label}>注意　</Text>{info.care}</Text>
      </View>)}</> },

    { key: 'depth', accent: '#8ecbff', kicker: '2 ／ 深さ　4段階', title: 'どう受け止める人か',
      lead: '深さは、物事を受け止める距離と時間のこと。浅いほどすぐ反応し、深いほどじっくり受け止めます。',
      body: <>
        <View style={st.scale} {...({ dataSet: { gd: 'grid' } } as object)}>{depthBands.map((b, i) => <View key={b.n} style={[st.scaleStep, { opacity: .45 + i * .18 }]}><Text style={st.scaleText}>{b.n}</Text></View>)}</View>
        {depthBands.map((b, i) => <View key={b.n} style={[st.card, { borderColor: '#4c6aa8' }, glow('#8ecbff')]}>
          <View style={st.cardHead}><Text style={[st.big, { color: C.aqua }]}>{b.n}</Text>
            <View style={{ flex: 1 }}><Text style={st.small}>深さ {b.range}</Text></View>
            {mineDepth === i && <Tag color={C.aqua}>あなた</Tag>}</View>
          <Text style={st.rowText}>{b.text}</Text>
          <Text style={st.line}><Text style={st.label}>気をつけたい　</Text>{b.care}</Text>
        </View>)}</> },

    { key: 'marks', accent: '#e3af92', kicker: '3 ／ 印　3パターン', title: '風の受け方のくせ',
      lead: '名札に「−」や「A」がつく人がいます。良し悪しではなく、風の受け方の違いです。',
      body: <>{marks.map((m, i) => <View key={m.mark} style={[st.card, { borderColor: i === 1 ? '#e3af92aa' : i === 2 ? '#b6cde8aa' : C.line }, glow(i === 1 ? '#e3af92' : i === 2 ? '#b6cde8' : '#eacc8c')]}>
        <View style={st.cardHead}><Text style={[st.big, { color: C.gold }]}>{m.mark}</Text><View style={{ flex: 1 }}><Text style={st.rowTitle}>{m.title}</Text></View></View>
        <Text style={st.rowText}>{m.text}</Text>{m.care && <Text style={st.hint}>{m.care}</Text>}
      </View>)}</> },

    ...seasonOrder.map((mod, group): Page => {
      const season = SEASON[mod];
      return { key: 'type-' + mod, accent: season.col, kicker: `4 ／ 16タイプ　${group + 1}・${season.n}`, title: season.n + 'の4タイプ',
        lead: '同じ季節でも、深さによって、人との関わり方がちがいます。',
        body: <>{[0, 1, 2, 3].map(d => {
          const i = group * 4 + d, r = residents[i];
          return <View key={r.id} style={[st.card, { borderColor: season.col + 'aa' }, glow(season.col), mine?.resident === i && st.cardMine]}>
            <View style={st.cardHead}>
              <Image source={residentArt[i]} accessible={false} className="gd-bob" style={st.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={[st.small, { color: season.col }]}>{r.band}</Text>
                <Text style={st.rowTitle}>{r.subtitle}</Text>
              </View>
              {mine?.resident === i && <Tag color={season.col}>あなた</Tag>}
            </View>
            <Text style={st.rowText}>{r.summary}</Text>
            <Text style={st.hint}>{r.hook}</Text>
          </View>;
        })}</> };
    }),

    { key: 'tier', accent: '#efd393', kicker: '5 ／ 波　5段階', title: '今日の波は5つのどれか',
      lead: '毎日の運勢は、5つの「波」のどれかで表します。いい・悪いではなく、過ごし方の合図です。',
      body: <>{tiers.map((name, i) => <View key={name} style={[st.card, { borderColor: tierColors[i] + 'aa' }, glow(tierColors[i])]}>
        <View style={st.cardHead}>
          {tierArt[i] ? <Image source={tierArt[i]!} accessible={false} className="gd-bob" style={st.avatar} /> : <Text style={[st.big, { color: tierColors[i] }]}>{glossary[name].mark}</Text>}
          <View style={{ flex: 1 }}><Text style={[st.rowTitle, { color: tierColors[i] }]}>{name}</Text><Text style={st.small}>{tierRanks[i]}</Text></View>
        </View>
        <Text style={st.rowText}>{tierNotes[i]}</Text>
      </View>)}</> },

    ...[0, 1].map((half): Page => ({ key: 'current-' + half, accent: '#7ee2d0', kicker: `6 ／ 海流　12種類　${half + 1}／2`, title: half ? '海流　後半の6つ' : '海流　前半の6つ',
      lead: half ? '12年でひと巡り。毎年、立春に切り替わります。' : '海流は「その年全体の大きな流れ」。12年でひと巡りし、毎年、立春に切り替わります。',
      body: <View style={st.grid} {...({ dataSet: { gd: 'grid' } } as object)}>{OUTER.slice(half * 6, half * 6 + 6).map((o, k) => {
        const i = half * 6 + k;
        return <View key={o.n} style={[st.tile, c.outer === i && st.cardMine]}>
          <Image source={currents[i]} accessible={false} className="gd-zoom" style={st.tileImg} />
          <Text style={st.tileTitle}>{o.n}</Text><Text style={st.tileTh}>{o.th}</Text><Text style={st.tileText}>{o.d}</Text>
          {c.outer === i && <Tag>今年</Tag>}
        </View>;
      })}</View> })),

    ...[0, 1, 2, 3].map((q): Page => ({ key: 'stage-' + q, accent: ['#b6cde8', '#7ee2a0', '#e0a5b3', '#f2c979'][q], kicker: `7 ／ 海況　24種類　${q + 1}／4`, title: ['海況　静から動き出す', '海況　追い風にのる', '海況　荒れる時期', '海況　整えて次へ'][q],
      lead: q === 0 ? '海況は「その時期の海のようす」。約半月ごとに、この順番で巡ります。' : q === 3 ? '海流は年、海況は約半月、波は今日の調子。長さがちがうだけの、どれも「いまの海のようす」です。' : '約半月ごとに切り替わります。',
      body: <View style={st.grid} {...({ dataSet: { gd: 'grid' } } as object)}>{STAGES.slice(q * 6, q * 6 + 6).map((s, k) => {
        const i = q * 6 + k;
        return <View key={s.n} style={[st.tile, c.stage === i && st.cardMine]}>
          <Image source={stages[i]} accessible={false} className="gd-zoom" style={st.tileImg} />
          <Text style={st.tileTh}>{i + 1}番目</Text><Text style={st.tileTitle}>{s.n}</Text><Text style={st.tileText}>{s.d}</Text>
          {c.stage === i && <Tag>いま</Tag>}
        </View>;
      })}</View> })),

  ];

  const last = pages.length - 1;
  const page = pages[index];
  return createPortal(<View style={st.overlay}><View style={st.frame}>
    <View style={st.top}>
      <Text style={st.count}>{index + 1} / {pages.length}</Text>
      <View style={st.bar}><View style={[st.barFill, { width: `${((index + 1) / pages.length) * 100}%` }]} /></View>
      {index < last && <Pressable accessibilityRole="button" accessibilityLabel="ガイドをスキップ" onPress={onClose} style={st.skip}><Text style={st.skipText}>スキップ</Text></Pressable>}
    </View>
    <View pointerEvents="none" key={'w' + page.key} {...({ dataSet: { gd: 'wash' } } as object)} style={[st.wash, { backgroundImage: `radial-gradient(ellipse at 50% 0%, ${page.accent}55, transparent 70%)` } as never]} />
    <ScrollView ref={scroller as never} style={{ flex: 1 }} contentContainerStyle={st.page}>
      <View key={page.key} {...({ dataSet: { gd: 'list' } } as object)} style={{ gap: 14 }}>
        <Text style={[st.kicker, { color: page.accent }]}>{page.kicker}</Text>
        <Text accessibilityRole="header" accessibilityLabel={page.title} {...({ dataSet: { gd: 'title' } } as object)} style={st.title}>
          {[...page.title].map((ch, k) => <Text key={k} {...({ dataSet: { gd: 'char' } } as object)} style={{ animationDelay: 80 + k * 32 + 'ms' } as never}>{ch}</Text>)}
        </Text>
        {page.lead && <Text style={S.body}>{page.lead}</Text>}
        {page.body}
      </View>
    </ScrollView>
    <View style={st.nav}>
      <Pressable accessibilityRole="button" disabled={index === 0} onPress={() => setIndex(index - 1)} style={[st.navBtn, st.navBack, index === 0 && { opacity: .35 }]}><Text style={st.navBackText}>‹ 戻る</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => index === last ? onClose() : setIndex(index + 1)} style={[st.navBtn, st.navNext]}><Text style={st.navNextText}>{index === last ? 'とじる' : '次へ ›'}</Text></Pressable>
    </View>
  </View></View>, document.body);
}

const st = StyleSheet.create({
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', backgroundColor: C.base, zIndex: 3000 } as never,
  frame: { flex: 1, width: '100%', maxWidth: 780, minHeight: 0 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14 },
  count: { color: C.muted, fontSize: 13, fontWeight: '800', minWidth: 44 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: C.raised, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3, backgroundColor: C.gold, transition: 'width .45s cubic-bezier(.16,1,.3,1)' } as never,
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 } as never,
  skip: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center' },
  skipText: { color: C.muted, fontSize: 14, fontWeight: '700' },
  page: { padding: 16, paddingBottom: 24 },
  kicker: { color: C.gold, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  title: { color: C.ink, fontSize: 28, lineHeight: 38, fontFamily: rounded, fontWeight: '800' },
  card: { gap: 8, padding: 14, borderRadius: 16, borderWidth: 1, backgroundColor: C.panel },
  cardMine: { borderColor: C.gold, borderWidth: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontSize: 30, lineHeight: 38, fontFamily: display, minWidth: 44, textAlign: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28 } as never,
  rowTitle: { color: C.ink, fontSize: 18, lineHeight: 26, fontWeight: '800' },
  rowText: { color: C.ink, fontSize: 16, lineHeight: 25 },
  rowMark: { color: C.gold, fontSize: 22, fontWeight: '800', width: 52, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
  small: { color: C.muted, fontSize: 14, lineHeight: 21 },
  line: { color: C.ink, fontSize: 15, lineHeight: 23 },
  label: { color: C.gold, fontWeight: '800' },
  hint: { color: C.muted, fontSize: 14, lineHeight: 22 },
  you: { color: C.gold, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  tagText: { fontSize: 12, fontWeight: '800' },
  scale: { flexDirection: 'row', gap: 4 },
  scaleStep: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: '#2a4a7c', alignItems: 'center' },
  scaleText: { color: C.ink, fontSize: 13, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48.5%', gap: 4, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel },
  tileImg: { width: '100%', height: 96, borderRadius: 10 } as never,
  tileTitle: { color: C.ink, fontSize: 16, lineHeight: 22, fontWeight: '800' },
  tileTh: { color: C.gold, fontSize: 12, fontWeight: '800' },
  tileText: { color: C.muted, fontSize: 13, lineHeight: 19 },
  nav: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: C.base },
  navBtn: { flex: 1, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  navBack: { borderWidth: 1, borderColor: C.line, flex: 1 },
  navBackText: { color: C.ink, fontSize: 16, fontWeight: '800' },
  navNext: { backgroundColor: C.gold, flex: 2 },
  navNextText: { color: C.dark, fontSize: 17, fontWeight: '900' },
});
