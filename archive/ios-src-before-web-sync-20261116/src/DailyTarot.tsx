import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { tarotBack } from './art';
import { dateKey } from './domain';
import { Image } from './web/image';
import { findTarot, seasonNames, tarotDeck, tarotSpread, tarotTone, type Level, type Season, type TarotCard } from './tarotDeck';
import { Button, C, Heading, NextLinks, S } from './ui';
import { startTarotFx } from './tarotFx';

export type SavedTarotDraw = { day: string; cardId: string };

/** 札の表。絵があれば絵、まだ無い札は番号と名前の札面で代用。 */
function CardFront({ card, style }: { card: TarotCard; style?: object }) {
  return card.image
    ? <Image source={card.image} style={[styles.cardFace, style]} contentFit="cover"
      accessible accessibilityLabel={card.deity + 'のタロットカード「' + card.arcana + '」'} />
    : <View style={[styles.cardFace, styles.placeholder, style]} accessible accessibilityLabel={'タロットカード「' + card.arcana + '」'}>
      <Text style={styles.placeNo}>{card.no}</Text>
      <Text style={styles.placeName}>{card.arcana}</Text>
      <Text style={S.tiny}>{card.en}</Text>
    </View>;
}

/** 札の裏。絵（tarot-back.webp）があれば絵、無ければ図形で代用。 */
function CardBack({ style, caption }: { style?: object; caption?: string }) {
  if (tarotBack) return <Image source={tarotBack} style={[styles.backImage, style]} contentFit="cover" />;
  return <View style={[styles.back, style]}>
    <View style={styles.backInner}>
      <View style={styles.ringSmall}><View style={styles.ringCoreSmall} /></View>
      {caption ? <Text style={styles.backCaption}>{caption}</Text> : null}
    </View>
  </View>;
}

/** 上部タブの「タロット」。占いをしていなくても、これだけで遊べる。 */
export function TarotHome({ goToday, ...props }: React.ComponentProps<typeof DailyTarot> & { goToday: () => void }) {
  return <View style={S.stack}>
    <Heading tag="タロット" title="今日の一枚を引く" body="占いをしなくても遊べます。入力や登録は要りません。1日1回、22枚の大アルカナから出会う札です。" />
    <DailyTarot {...props} />
    {props.season === null && <NextLinks items={[
      { icon: '☾', label: '今日の運勢を占う', hint: '占うと、この札があなたの海の読みで変わります', onPress: goToday },
    ]} />}
  </View>;
}

const FLY_MS = 1700;   // 札が飛んできて開くまで（magic の tarot-fly と同じ長さ）

/** めくった札のまわりに、その札の光景（光の粒・光の筋・稲妻）を描く。奥と手前の二枚に分けて、札の絵は隠さない。 */
function TarotFx({ cardId }: { cardId: string }) {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!back.current || !front.current) return;
    return startTarotFx(back.current, front.current, {
      cardId, landAt: FLY_MS / 1000,
      box: () => document.querySelector('[data-ui="tarot-card"]')?.getBoundingClientRect() ?? null,
      onShake: () => document.querySelector('[data-ui="tarot-stage"]')?.animate(
        [{ transform: 'none' }, { transform: 'translate(-7px, 4px)' }, { transform: 'translate(6px, -4px)' }, { transform: 'translate(-4px, 2px)' }, { transform: 'translate(2px, -1px)' }, { transform: 'none' }],
        { duration: 420, easing: 'ease-out' }),
    });
  }, [cardId]);
  return <>
    <canvas ref={back} className="tarot-fx tarot-fx-back" aria-hidden="true" />
    <canvas ref={front} className="tarot-fx tarot-fx-front" aria-hidden="true" />
  </>;
}

type Flight = { card: TarotCard; dx: number; dy: number; s: number; w: number };

/**
 * 今日の一枚。
 *  - 占いをしていなくても引ける（普遍の意味だけ）。
 *  - 占い済みなら、タイプの季節と今日の運勢に合わせた読みが加わる。
 * 伏せられた22枚（大アルカナ全部）から、気になる一枚をユーザーが選んで引く。選ぶと札が回りながら画面に近づき、大きく開く。
 * 場の並び順は日付と人から決まるので、開き直しても同じ。
 */
export function DailyTarot({ today, savedDraw, log, onDraw, personKey, season, level, onCreate }: {
  today: Date;
  savedDraw: SavedTarotDraw | null;
  log: SavedTarotDraw[];
  onDraw: (cardId: string) => void;
  personKey: string;
  season: Season | null;
  level: Level | null;
  onCreate?: () => void;
}) {
  const day = dateKey(today);
  const card = savedDraw?.day === day ? findTarot(savedDraw.cardId) : undefined;
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!flight) { setLanded(false); return; }
    const timer = setTimeout(() => setLanded(true), FLY_MS);
    return () => clearTimeout(timer);
  }, [flight]);

  const spread = card ? [] : tarotSpread(day, personKey, [], tarotDeck.length);

  function pickCard(pick: TarotCard, event: GestureResponderEvent) {
    // 押した札の位置から、画面中央の大きな札へ。位置が取れなければ下から近づく。
    const target = (event as unknown as { currentTarget?: { getBoundingClientRect?: () => DOMRect } }).currentTarget;
    const rect = target?.getBoundingClientRect?.();
    const vw = typeof window === 'undefined' ? 390 : window.innerWidth;
    const vh = typeof window === 'undefined' ? 780 : window.innerHeight;
    const w = Math.min(vw * .72, 300);
    setFlight(rect
      ? { card: pick, dx: rect.left + rect.width / 2 - vw / 2, dy: rect.top + rect.height / 2 - vh / 2, s: rect.width / w, w }
      : { card: pick, dx: 0, dy: vh * .35, s: .25, w });
    setLanded(false);
    onDraw(pick.id);
  }

  return <View style={[S.card, styles.panel]}>
    <Text style={S.kicker}>ONE ORACLE · 今日の一枚</Text>
    <Text style={S.h2}>潮環の神様から、今日のカード</Text>
    <Text style={S.body}>問いをひとつ心に思い浮かべてから、一枚引いてみましょう。</Text>

    {card ? <>
      <CardFront card={card} />
      <View style={styles.reading}>
        <Text style={S.kicker}>{card.no} · {card.en} · {card.deity}</Text>
        <Text style={styles.arcana}>{card.arcana}</Text>
        <Text style={[S.tiny, { textAlign: 'center' }]}>{card.keywords.join('・')}</Text>
        <Text style={S.h3}>{card.theme}</Text>
        <Text style={S.body}>{card.message}</Text>
        <View style={styles.action}>
          <Text style={[S.kicker, { color: C.aqua }]}>今日の小さな一手</Text>
          <Text style={S.body}>{card.action}</Text>
        </View>

        {season !== null && level !== null ? <View style={styles.lens}>
          <Text style={[S.kicker, { color: C.gold }]}>あなたの海（{seasonNames[season]}）では</Text>
          <Text style={S.body}>{card.lens[season]}</Text>
          <Text style={S.body}>{tarotTone(level, card.heavy)}</Text>
        </View> : onCreate ? <View style={styles.lens}>
          <Text style={[S.kicker, { color: C.gold }]}>あなたの海で読むと、意味が変わります</Text>
          <Text style={S.body}>占うと、あなたのタイプの季節と今日の運勢に合わせた読みが、この札に加わります。</Text>
          <Button quiet onPress={onCreate}>占って、この札を読み直す</Button>
        </View> : null}

        <Text style={S.tiny}>今日のカードはこの端末に保存されています。次のカードは明日引けます。</Text>
      </View>
    </> : <>
      <Text style={[S.tiny, { textAlign: 'center' }]}>伏せられた{spread.length}枚の中から、いま気になる一枚をタップして選びます。</Text>
      <View style={styles.spread}>
        {spread.map((pick, index) => <Pressable key={pick.id} accessibilityRole="button" accessibilityLabel={'カードを選ぶ（' + (index + 1) + '枚目）'}
          {...({ dataSet: { gd: 'pop' } } as object)}
          onPress={event => pickCard(pick, event)} style={({ pressed }) => [styles.small, { animationDelay: 60 + index * 45 + 'ms' } as object, pressed && styles.pressed]}>
          <View {...({ dataSet: { gd: 'sway' } } as object)} style={{ animationDelay: 1300 + index * 120 + 'ms' } as object}>
            <CardBack caption={String(index + 1)} style={styles.fill} />
          </View>
        </Pressable>)}
      </View>
      <Text style={[S.tiny, { textAlign: 'center' }]}>引けるのは1日1回です。入力やプロフィール登録は不要です。</Text>
    </>}

    {flight && typeof document !== 'undefined' && createPortal(<Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={() => { if (landed) setFlight(null); }}
      {...({ dataSet: { ui: 'tarot-overlay' } } as object)}>
      <TarotFx cardId={flight.card.id} />
      <View {...({ dataSet: { ui: 'tarot-stage' } } as object)}>
        <View {...({ dataSet: { ui: 'tarot-card' } } as object)}
          style={{ width: flight.w, height: flight.w * 1.5, '--dx': flight.dx + 'px', '--dy': flight.dy + 'px', '--s': flight.s } as object}>
          <View {...({ dataSet: { ui: 'tarot-face-back' } } as object)}><CardBack style={styles.fill} /></View>
          <View {...({ dataSet: { ui: 'tarot-face-front' } } as object)}><CardFront card={flight.card} style={styles.fill} /></View>
        </View>
      </View>
      <View {...({ dataSet: { ui: 'tarot-caption' } } as object)}>
        <Text style={styles.popKicker}>{flight.card.no} · {flight.card.en}</Text>
        <Text style={styles.popName}>{flight.card.arcana}</Text>
        <Text style={styles.popKeys}>{flight.card.keywords.join('・')}</Text>
        <Text style={styles.popHint}>タップして、読みを見る</Text>
      </View>
    </Pressable>, document.body)}
  </View>;
}

const styles = StyleSheet.create({
  panel: { alignItems: 'center', padding: 18, gap: 10 },
  cardFace: { width: 190, height: 285, borderRadius: 13, borderColor: C.gold, borderWidth: 1 },
  fill: { width: '100%', height: '100%', borderRadius: 13 },
  placeholder: { backgroundColor: C.base, alignItems: 'center', justifyContent: 'center', gap: 6 },
  placeNo: { color: C.gold, fontSize: 40, fontWeight: '800' },
  placeName: { color: C.ink, fontSize: 24, fontWeight: '800' },
  reading: { width: '100%', gap: 8, marginTop: 4 },
  arcana: { color: C.ink, fontSize: 28, fontWeight: '800', textAlign: 'center', marginVertical: 1 },
  action: { borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 12, gap: 4, marginTop: 4 },
  lens: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10, gap: 6, marginTop: 6 },
  back: { aspectRatio: 2 / 3, borderRadius: 13, borderColor: C.gold, borderWidth: 1, backgroundColor: C.base, padding: 4 },
  backImage: { aspectRatio: 2 / 3, borderRadius: 13, borderColor: C.gold, borderWidth: 1 },
  backInner: { flex: 1, borderRadius: 8, borderColor: '#88744f', borderWidth: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  backCaption: { color: C.muted, fontSize: 12, letterSpacing: 2 },
  spread: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, width: '100%' },
  small: { width: '14.2%', flexGrow: 0, flexShrink: 0, maxWidth: 74 },
  ringSmall: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  ringCoreSmall: { width: 15, height: 15, borderRadius: 8, borderWidth: 1, borderColor: C.aqua },
  pressed: { opacity: .78, transform: [{ scale: .99 }] },
  popKicker: { color: C.gold, fontSize: 12, letterSpacing: 2, fontWeight: '800', textAlign: 'center' },
  popName: { color: C.ink, fontSize: 34, fontWeight: '800', textAlign: 'center' },
  popKeys: { color: C.muted, fontSize: 14, textAlign: 'center' },
  popHint: { color: C.aqua, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
