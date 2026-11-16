import { useState } from 'react';
import { Image } from './web/image';
import { Pressable, Text, TextInput, View } from 'react-native';
import { currents, residentArt, scenes, stages } from './art';
import { addDays, calendarEvents, content, cycleFor, cycleTier, dateLabel, lifeFields, residentIndex, shortDate, tierColors, tiers, type Profile } from './domain';
import { ReflectionCards } from './LifeChart';
import { GodAnimation } from './GodAnimation';
import { Gloss } from './Glossary';
import { TypeTraits } from './NameReading';
import { TideMarks } from './ResidentCard';
import { ctxFor, dayTable, FIVE_PHASES, labelOf, monthStagesFor, OUTER, SEASON, solarMonthStartDate, solarStageStartDate, STAGES, stageFor, yearScoreOf, blockScoreOf } from './scoring';
import { TideWheel } from './TideCharts';
import { Art, Button, C, Card, Chip, Chips, Fold, Heading, NextLinks, S, Section, Tile, tapFx, useColumns } from './ui';
import { findQuestion, ownResident, residents, type Reflection, type SavedQuestion } from './voyage';

export type Note = { day: string; text: string };
export type OpenResident = (index: number) => void;

export function Calendar({ today, profile, initial }: { today: Date; profile: Profile | null; initial?: { date: Date; mode: 'current' | 'stage' } }) {
  const [offset, setOffset] = useState(() => initial ? Math.round((initial.date.getTime() - today.getTime()) / 86_400_000) : 0);
  const [mode, setMode] = useState<'current' | 'stage'>(initial?.mode ?? 'current');
  const [selected, setSelected] = useState<number | null>(null);
  const [showCycle, setShowCycle] = useState(false);
  const [cycleMode, setCycleMode] = useState<'year' | 'block'>('year');
  const date = addDays(today, offset);
  const c = ctxFor(date);
  const list = mode === 'current' ? OUTER : STAGES;
  const images = mode === 'current' ? currents : stages;
  const stageIndex = stageFor(c, profile?.t);
  const index = selected ?? (mode === 'current' ? c.outer : stageIndex);
  const [name, description, prompt] = (mode === 'current' ? content.currents : content.stages)[index];
  const events = calendarEvents(date, profile);
  const monthStart = new Date(Date.UTC(c.Y, c.MO - 1, 1));
  const dayCount = new Date(Date.UTC(c.Y, c.MO, 0)).getUTCDate();
  const block = c.solarMonth;
  const cycle = profile && cycleFor(profile.t);
  const year = OUTER[c.outer];
  const yearLevel = profile && cycle ? cycleTier(yearScoreOf(c.solarYear, profile.t).score, cycle.years) : null;
  const blockLevel = profile && cycle ? cycleTier(blockScoreOf(c.solarYear, block, profile.t).score, cycle.blocks) : null;

  // 見られるのは今日まで。先の日付を選ぼうとしたら今日に合わせる。
  const nowCtx = ctxFor(today);
  const atPresentYear = c.solarYear >= nowCtx.solarYear;
  const atPresentMonth = c.Y > nowCtx.Y || (c.Y === nowCtx.Y && c.MO >= nowCtx.MO);
  function choose(date: Date) {
    if (date.getTime() > today.getTime()) date = today;
    setOffset(Math.round((date.getTime() - today.getTime()) / 86_400_000));
    setSelected(null);
  }

  return <View style={S.stack}>
    <Heading tag="過去と今の運勢" title="運勢の輪" body="輪や日付をタップすると、その時期の海に切り替わります。見られるのは今日までです。" />
    <TideWheel pastOnly context={c} profile={profile}
      onMonth={month => choose(new Date(Date.UTC(c.Y, month - 1, 1)))}
      onStage={stage => choose(solarStageStartDate(c.solarYear, stage))}
      onYear={year => choose(solarMonthStartDate(year, 0))} />
    <View style={S.between}>
      <Chip onPress={() => choose(solarMonthStartDate(c.solarYear - 1, c.solarMonth))}>‹ 前年</Chip>
      <Chip onPress={() => choose(today)}>現在に戻る</Chip>
      {atPresentYear ? <View style={{ minWidth: 60 }} /> : <Chip onPress={() => choose(solarMonthStartDate(c.solarYear + 1, c.solarMonth))}>翌年 ›</Chip>}
    </View>
    <Card>
      <Text style={S.kicker}>{c.solarYear}年　·　{c.yearPillar}{profile && c.solarYear >= profile.birthSolarYear ? '　／　その年に' + (c.solarYear - profile.birthSolarYear) + '歳' : ''}</Text>
      <Text style={S.h2}>{year.n}</Text>
      <Text style={S.body}>{year.th}の年。{year.d}。</Text>
      <Text style={S.tiny}>年干 {c.yearStem}（{c.yearPolarity}・{FIVE_PHASES[c.yearElement].name}）· 年支 {c.yearBranch}（{FIVE_PHASES[c.yearBranchElement].name}）　／　月支 {c.monthBranch}</Text>
      {yearLevel !== null && <Text style={[S.h3, { color: tierColors[yearLevel] }]}>年の運勢　{tiers[yearLevel]}</Text>}
      <Text style={S.kicker}>いまの海況</Text>
      <Text style={S.h3}>{STAGES[stageIndex].n}{blockLevel !== null ? '　／　' + tiers[blockLevel] : ''}</Text>
      <Text style={S.body}>{STAGES[stageIndex].d}。</Text>
    </Card>
    <Button quiet onPress={() => setShowCycle(!showCycle)}>{showCycle ? '見取り図を閉じる' : '過去の流れを見比べる'}</Button>
    {showCycle && <Card>
      <Chips>
        <Chip active={cycleMode === 'year'} onPress={() => setCycleMode('year')}>十二年の海流</Chip>
        <Chip active={cycleMode === 'block'} onPress={() => setCycleMode('block')}>一年分の月の海況</Chip>
      </Chips>
      {Array.from({ length: 7 }, (_, i) => {
        const step = i - 6;
        const isYear = cycleMode === 'year';
        const solarMonth = ((block + step) % 12 + 12) % 12;
        const y = c.solarYear + (isYear ? step : Math.floor((block + step) / 12));
        const item = isYear ? OUTER[(c.outer + step + 12) % 12] : monthStagesFor(y, solarMonth, profile?.t);
        const level = profile && cycle ? isYear ? cycleTier(yearScoreOf(y, profile.t).score, cycle.years)
          : cycleTier(blockScoreOf(y, solarMonth, profile.t).score, cycle.blocks) : null;
        return <Pressable {...tapFx} accessibilityRole="button" key={step} onPress={() => choose(isYear ? solarMonthStartDate(y, 0) : solarMonthStartDate(y, solarMonth))}
          style={[S.between, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }]}>
          <View style={{ flex: 1 }}><Text style={S.tiny}>{y}年{isYear ? '' : ' · ' + (solarMonthStartDate(y, solarMonth).getUTCMonth() + 1) + '月ごろ'}</Text>
            <Text style={S.h3}>{item.n}</Text></View>
          {level !== null && <Text style={[S.tiny, { color: tierColors[level] }]}>{tiers[level]}</Text>}
        </Pressable>;
      })}
    </Card>}
    <Section title="潮環の暦" note="月の形、月の距離、潮替わりを日付ごとに読む。" />
    <View style={S.between}>
      <Chip onPress={() => choose(new Date(Date.UTC(c.Y, c.MO - 2, 1)))}>‹ 前月</Chip>
      <Text style={S.h3}>{c.Y}年{c.MO}月</Text>
      {atPresentMonth ? <View style={{ minWidth: 60 }} /> : <Chip onPress={() => choose(new Date(Date.UTC(c.Y, c.MO, 1)))}>翌月 ›</Chip>}
    </View>
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[...'日月火水木金土'].map(day => <Text key={day} style={[S.tiny, { width: '14.285%', textAlign: 'center', paddingBottom: 7 }]}>{day}</Text>)}
        {Array.from({ length: monthStart.getUTCDay() }, (_, i) => <View key={'blank' + i} style={{ width: '14.285%' }} />)}
        {Array.from({ length: dayCount }, (_, i) => {
          const day = addDays(monthStart, i);
          const hasEvent = calendarEvents(day, profile).some(event => event !== '帰郷の年');
          const future = day.getTime() > today.getTime();
          return <Pressable {...tapFx} key={i} accessibilityRole="button" accessibilityLabel={shortDate(ctxFor(day)) + (hasEvent ? ' 行事あり' : '')} disabled={future}
            accessibilityState={{ selected: i + 1 === c.DA, disabled: future }} onPress={() => choose(day)}
            style={{ width: '14.285%', minHeight: 43, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: i + 1 === c.DA ? C.raised : undefined, opacity: future ? .28 : 1 }}>
            <Text style={{ color: i + 1 === c.DA ? C.gold : C.ink, fontWeight: '700' }}>{i + 1}</Text>
            <Text style={{ color: C.gold, fontSize: 7, height: 9 }}>{hasEvent ? '◆' : ' '}</Text>
          </Pressable>;
        })}
      </View>
      <View style={S.between}><Text style={S.h3}>{c.DA}日　{c.moon}</Text><Chip onPress={() => choose(today)}>今日へ</Chip></View>
      <Text style={S.body}>{c.phaseTide}　·　月の距離 {c.tide}</Text>
      {!!events.length && <Chips>{events.map(event => <Chip key={event}>{event}</Chip>)}</Chips>}
    </Card>
    <Section title="海流と海況の図譜" />
    <Chips>
      <Chip active={mode === 'current'} onPress={() => { setMode('current'); setSelected(null); }}>12の海流</Chip>
      <Chip active={mode === 'stage'} onPress={() => { setMode('stage'); setSelected(null); }}>24の海況</Chip>
    </Chips>
    <View style={S.card}>
      <Art source={images[index]} height={195} />
      <View style={S.pad}>
        <Text style={S.kicker}>{(index + 1).toString().padStart(2, '0')}  /  {list.length}</Text>
        <Text style={S.h2}>{mode === 'current' ? list[index].n : name}</Text><Text style={S.body}>{description}</Text>
        <Text style={[S.body, { color: C.aqua }]}>{prompt}</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
      {list.map((item, i) => <Pressable {...tapFx} key={item.n} onPress={() => setSelected(i)} accessibilityRole="button" accessibilityState={{ selected: index === i }} style={[S.card, { width: '23.5%', borderColor: index === i ? C.gold : C.line }]}>
        <Art source={images[i]} height={60} />
        <Text style={[S.tiny, { paddingVertical: 5, textAlign: 'center' }]}>{item.n.replace('の海流', '')}</Text>
      </Pressable>)}
    </View>
    <Card><Text style={S.h3}>海の行事</Text><Gloss style={S.body}>立春に年の海流が替わり、約半月ごとに24の海況が巡ります。新月・満月を迎える日は「月を読む日」。生まれた日は「私の出航日」、生まれた年と同じ十二支の海流が巡る年は「帰郷の年」です。</Gloss></Card>
  </View>;
}

// 四季の神様。god は GodAnimation の番号（0 冬 / 1 春 / 2 夏 / 3 秋 / 4 潮祖）。
const seasonGods = [
  { god: 1, name: '春霞', season: '春', role: '見えない島を信じて、先に踏み出す神。' },
  { god: 2, name: '夏照', season: '夏', role: '声を届けて、まだ見ぬ誰かを呼ぶ神。' },
  { god: 3, name: '秋津', season: '秋', role: '測り、見たものを記録に残す神。' },
  { god: 0, name: '冬凪', season: '冬', role: '静かに、石の下まで問い直す神。' },
];

export function Atlas({ profile, favorites, open, myth, pair, create }: {
  profile: Profile | null; favorites: number[]; open: OpenResident; myth: () => void; pair: () => void; create: () => void;
}) {
  const { item: columnWidth } = useColumns();
  const [season, setSeason] = useState<number | null>(null);
  const [depth, setDepth] = useState<number | null>(null);
  const [onlySaved, setOnlySaved] = useState(false);
  const [query, setQuery] = useState('');
  const own = profile ? residentIndex(profile.t) : -1;
  const visible = residents.map((resident, index) => ({ ...resident, index })).filter(resident => {
    return (season === null || Math.floor(resident.index / 4) === season) &&
      (depth === null || resident.index % 4 === depth) && (!onlySaved || favorites.includes(resident.index)) &&
      [resident.band, resident.subtitle].some(text => text.includes(query.trim()));
  });
  return <View style={S.stack}>
    <Section title="四季の神様" note="16のタイプを季節ごとに見守る、四柱の神様。" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
      {seasonGods.map(item => <View key={item.name} style={[S.card, { width: columnWidth, alignItems: 'center', padding: 12, gap: 4 }]}>
        <GodAnimation forcePlay index={item.god} style={{ width: 96 }} label={item.name + '（' + item.season + '）'} />
        <Text style={S.kicker}>{item.season}の神</Text>
        <Text style={S.h2}>{item.name}</Text>
        <Text style={[S.tiny, { textAlign: 'center' }]}>{item.role}</Text>
      </View>)}
    </View>
    <Heading tag="16タイプ" title="あなたはどのタイプ？" body="気になるタイプをタップ。考え方や人との関わり方が読めます。" />
    {profile ? <Button onPress={() => open(own)}>自分のタイプを見る　›</Button> : <Button onPress={create}>自分のタイプを調べる（約30秒）　›</Button>}
    <TextInput accessibilityLabel="占いタイプを検索" value={query} onChangeText={setQuery}
      style={S.field} placeholder="例：冬の深海、番人" placeholderTextColor={C.muted} />
    <Chips>
      <Chip active={season === null} onPress={() => setSeason(null)}>すべての季節</Chip>
      {['春', '夏', '秋', '冬'].map((name, i) => <Chip key={name} active={season === i} onPress={() => setSeason(season === i ? null : i)}>{name}</Chip>)}
    </Chips>
    <Chips>
      {['浅瀬', '沿岸', '沖合', '深海'].map((name, i) => <Chip key={name} active={depth === i} onPress={() => setDepth(depth === i ? null : i)}>{name}</Chip>)}
      <Chip active={onlySaved} onPress={() => setOnlySaved(!onlySaved)}>☆ お気に入り</Chip>
    </Chips>
    <Text style={S.tiny}>{visible.length} / 16　·　お気に入り {favorites.length}件</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
      {visible.map(resident => <Pressable {...tapFx} key={resident.id} accessibilityRole="button" onPress={() => open(resident.index)}
        accessibilityLabel={[resident.band, resident.subtitle, resident.index === own ? 'あなたのタイプ' : ''].filter(Boolean).join('、')}
        style={[S.card, { width: columnWidth }]}>
        <View style={{ padding: 11, gap: 3 }}>
          <Text style={S.kicker}>NO. {resident.id}{resident.index === own ? ' · あなた' : ''}{favorites.includes(resident.index) ? ' · ★' : ''}</Text>
          <Text style={S.h2}>{resident.band}</Text>
          <Text style={S.body}>{resident.subtitle}</Text>
        </View>
        <Image source={residentArt[resident.index]} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" accessible={false} />
        <Text style={[S.tiny, { padding: 11 }]}>{resident.summary}</Text>
      </Pressable>)}
    </View>
    {visible.length === 0 && <Card><Text style={S.body}>条件に合うタイプが見つかりません。</Text><Button quiet onPress={() => { setSeason(null); setDepth(null); setOnlySaved(false); setQuery(''); }}>絞り込みをリセット</Button></Card>}
    <Button quiet onPress={pair}>二人の海をみる</Button>
    <Section title="潮環の世界" />
    <Tile source={scenes[0]} subtitle="潮環神話" title="見られなかった海" onPress={myth} />
  </View>;
}

export function Resident({ index, profile, favorite, toggle }: { index: number; profile: Profile | null; favorite: boolean; toggle: () => void }) {
  const entry = residents[index];
  const own = profile && residentIndex(profile.t) === index ? profile : null;
  const season = SEASON[(Math.floor(index / 4) + 1) % 4];
  const depth = own && content.depths[own.t.ni];
  return <View style={S.stack}>
    <Heading tag={'占いタイプ ' + entry.id + '／16'} title={entry.band} body={entry.subtitle} />
    <View style={[S.card, { width: '100%', maxWidth: 360, alignSelf: 'center' }]}>
      <Image source={residentArt[index]} style={{ width: '100%', aspectRatio: 1 }} contentFit="cover" accessible accessibilityLabel={entry.band + 'のイラスト'} />
    </View>
    <Chips>
      <Chip>{season.act}</Chip><Chip active={favorite} onPress={toggle}>{favorite ? '★ お気に入り済み' : '☆ お気に入りに入れる'}</Chip>
    </Chips>
    <Card>
      <Text style={S.h3}>{entry.hook}</Text>
      <Text style={S.body}>{entry.inner}</Text>
    </Card>
    <TypeTraits entry={entry} />
    <Text style={S.tiny}>この占いタイプは、自分の考え方や日々の過ごし方を振り返るためのヒントです。</Text>
    {own && depth && <Card>
      <Text style={S.kicker}>YOUR EXACT TIDE CARD</Text><Text style={S.h2}>{labelOf(own.t)}</Text>
      <Text style={S.body}>深さ {depth[0]}　{depth[1]}。{depth[2]}で持ち味が出やすく、{depth[3]}には余白を取ってみましょう。</Text>
      <TideMarks profile={own} />
      <Text style={S.tiny}>深さは物事を受け止める距離と時間の比喩です。</Text>
    </Card>}
    <Section title="暮らしに置いてみる" note="気になる分野から、一つだけ問いを持ち帰る。" />
    {lifeFields.map(([title, question]) => <Card key={title}><Text style={S.h3}>{title}</Text><Text style={S.body}>{question}</Text></Card>)}
  </View>;
}

const chapterArt = [0, 4, 7, 1, 2, 4, 5, 3, 6, 7];
const godOrder = [4, 1, 2, 3, 0];
const godNames = ['潮祖', '春霞', '夏照', '秋津', '冬凪'];

export function Myth({ open, read }: { open: (index: number) => void; read: number[] }) {
  return <View style={S.stack}>
    <Heading tag="THE UNSEEN SEA" title="見られなかった海" body="潮環の世界を描いた創作神話。海が消えたとされる夜から、物語が始まります。" />
    <View style={S.card}><Art source={scenes[0]} height={214} /></View>
    <Section title="物語を読む" note={'全' + content.chapters.length + '章　·　読了 ' + read.length + '章'} />
    {content.chapters.map((chapter, index) => <Pressable {...tapFx} key={chapter.title} onPress={() => open(index)} accessibilityRole="button" style={[S.card, S.row]}>
      <Image source={scenes[chapterArt[index]]} style={{ width: 74, height: 62 }} />
      <Text style={[S.h3, { flex: 1 }]}>{chapter.title}</Text><Text style={[S.tiny, { paddingRight: 12 }]}>{read.includes(index) ? '読了' : '›'}</Text>
    </Pressable>)}
    <Section title="五柱の神" note="潮環神話に登場する神々。" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {godOrder.map((god, index) => <View key={god} style={[S.card, { width: '18.5%' }]}>
        <GodAnimation index={god} style={{ width: '100%' }} />
        <Text style={[S.tiny, { textAlign: 'center', paddingVertical: 6 }]}>{godNames[index]}</Text>
      </View>)}
    </View>
  </View>;
}

export function Chapter({ index, read, done, open }: { index: number; read: boolean; done: () => void; open: (index: number) => void }) {
  const chapter = content.chapters[index];
  return <View style={S.stack}>
    <Heading tag={'TIDE MYTH  /  ' + String(index + 1).padStart(2, '0')} title={chapter.title} />
    <View style={S.card}><Art source={scenes[chapterArt[index]]} height={206} /></View>
    <View style={{ gap: 15, paddingHorizontal: 5, paddingVertical: 12 }}>
      {chapter.paragraphs.map((text, i) => <Text key={i} selectable style={[S.body, { fontSize: 16, lineHeight: 30, color: C.ink }]}>{text}</Text>)}
    </View>
    <Button quiet={read} onPress={done}>{read ? '✓ 読了済み' : '読了を記録する'}</Button>
    {index < content.chapters.length - 1 && <Button quiet onPress={() => open(index + 1)}>次の章へ　›</Button>}
  </View>;
}

export function Journal({ profile, notes, edit, pair, create, openNote, showToday, onForget, questions, reflections, openTrail, editReflection, openChart, goSelf, selfCount }: {
  profile: Profile | null; notes: Note[]; edit: () => void; pair: () => void; create: () => void;
  openNote: (day: string) => void; showToday: () => void; onForget: () => void;
  questions: SavedQuestion[]; reflections: Reflection[]; openTrail: (id: string) => void;
  editReflection: (record: Reflection) => void; openChart: () => void; goSelf: () => void; selfCount: number;
}) {
  const [confirm, setConfirm] = useState(false);
  const [fold, setFold] = useState<'data' | 'about' | null>(null);
  const resident = profile && ownResident(profile);
  const trails = [...new Set([...questions.map(entry => entry.id), ...reflections.flatMap(record => record.questionId ? [record.questionId] : [])])];
  const empty = !notes.length && !trails.length && !reflections.length && !selfCount;
  return <View style={S.stack}>
    <Heading tag="記録" title="あなたの記録" body="考えたこと・残した問い・自己純度の変化が、ここに集まります。" />
    <Button onPress={create}>今日のことを書く　›</Button>
    <Chips>
      <Chip active={notes.length > 0}>{`日記 ${notes.length}`}</Chip>
      <Chip active={trails.length > 0}>{`問い ${trails.length}`}</Chip>
      <Chip active={reflections.length > 0}>{`振り返り ${reflections.length}`}</Chip>
      <Chip active={selfCount > 0}>{`自己純度 ${selfCount}回`}</Chip>
    </Chips>
    {empty && <Card>
      <Text style={S.h3}>まだ何も残っていません</Text>
      <Text style={S.body}>占いや診断のあとに「記録する」を押すと、ここに並びます。</Text>
    </Card>}
    <NextLinks items={[
      { label: '自己純度の変化を見る', hint: selfCount ? selfCount + '回分の記録' : '1分の診断からはじめる', onPress: goSelf },
      { label: '今日の占いを見る', onPress: showToday },
      { label: '過去の年を振り返って記録する', hint: '人生の流れから、あの頃の出来事を残せます', onPress: openChart },
    ]} />
    {notes.length > 0 && <>
      <Section title="日記" />
      {notes.map(note => <Pressable {...tapFx} accessibilityRole="button" key={note.day} onPress={() => openNote(note.day)} style={[S.card, S.pad]}>
        <Text style={S.kicker}>{note.day}</Text><Text numberOfLines={2} style={S.body}>{note.text}</Text>
      </Pressable>)}
    </>}
    {trails.length > 0 && <>
      <Section title="残した問い" note="タップすると、残した日と出来事を読み返せます。" />
      {trails.map(id => {
        const question = findQuestion(id);
        return question && <Pressable {...tapFx} accessibilityRole="button" key={id} onPress={() => openTrail(id)} style={[S.card, S.pad]}>
          <Text style={S.kicker}>{id}　{question.title}</Text><Text style={S.h3}>{question.question}</Text>
        </Pressable>;
      })}
    </>}
    {reflections.length > 0 && <>
      <Section title="あの頃の振り返り" />
      <ReflectionCards records={reflections} edit={editReflection} />
    </>}
    <Fold title="私の潮札・データの管理" hint={resident ? resident.band + '・端末に保存中' : '未作成'} open={fold === 'data'} onToggle={() => setFold(fold === 'data' ? null : 'data')}>
      <Text style={S.body}>登録した人の入力内容や、記録のすべてを消せます。</Text>
      <Button quiet onPress={onForget}>人の管理・データのリセット</Button>
      <Button quiet onPress={pair}>二人の海をみる</Button>
    </Fold>
    <Fold title="潮環占いについて" hint="占いの位置づけ・出典" open={fold === 'about'} onToggle={() => setFold(fold === 'about' ? null : 'about')}>
      <Gloss style={S.body}>潮環占いは、四季・名前の画数・暦を使って自分の状況を見つめるための創作占いです。人生の予測や性格を測定する方法としては実証されていません。月相と節気の切り替えは日本時間正午の天文値、日の干支は日本時間の日付を基準にしています。十干・十二支・節気・五行の対応を暦上の参照枠にし、十二支と既存の海流の対応、四季型との五行照合、海況への反映は潮環独自の設計です。十二支の五行は一つに簡略化し、月干や時刻は扱いません。</Gloss>
      <Text style={S.tiny}>漢字の画数　KANJIDIC2 © EDRDG（CC BY-SA 4.0）　／　月の計算　Jean Meeus『Astronomical Algorithms』</Text>
    </Fold>
  </View>;
}

export function NoteEditor({ day, existing, save }: { day: string; existing?: string; save: (text: string) => void }) {
  const [text, setText] = useState(existing ?? '');
  const [confirm, setConfirm] = useState(false);
  return <View style={S.stack}>
    <Heading tag={day} title="航海帳に記す" body="今日見たもの、考えたこと、次に持っていきたいもの。" />
    <Card>
      <TextInput accessibilityLabel="航海の記録" multiline maxLength={1200} value={text} onChangeText={setText}
        placeholder="海を見て、何を考えましたか。" placeholderTextColor={C.muted} style={[S.field, { minHeight: 180, textAlignVertical: 'top' }]} />
      <Text style={S.tiny}>{text.length} / 1200</Text>
      <Button disabled={!text.trim()} onPress={() => save(text.trim())}>記録を保存</Button>
      {existing && (confirm
        ? <Chips><Chip onPress={() => setConfirm(false)}>キャンセル</Chip><Chip active onPress={() => save('')}>記録を削除</Chip></Chips>
        : <Chip onPress={() => setConfirm(true)}>記録を削除する</Chip>)}
    </Card>
  </View>;
}

export function Ranking({ date, profile }: { date: Date; profile: Profile | null }) {
  const [page, setPage] = useState(0);
  const c = ctxFor(date);
  const { rows } = dayTable(c);
  return <View style={S.stack}>
    <Heading tag="THE 160 TIDE CARDS" title="名札の順位" body={dateLabel(c) + '　·　この日の海との組み合わせ'} />
    <Chips>{Array.from({ length: 8 }, (_, i) =>
      <Chip key={i} active={i === page} onPress={() => setPage(i)}>{(i * 20 + 1) + '〜' + (i * 20 + 20)}</Chip>)}</Chips>
    <Card>{rows.slice(page * 20, page * 20 + 20).map(row => <View key={row.t.key} style={[S.between, { borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6 }]}>
      <Text style={[S.h3, { color: row.t.key === profile?.t.key ? C.gold : C.ink }]}>{row.rank}位　{labelOf(row.t)}</Text>
      <Text style={S.tiny}>{row.t.key === profile?.t.key ? 'あなた　' : ''}{row.score.toFixed(1)}点</Text>
    </View>)}</Card>
  </View>;
}

