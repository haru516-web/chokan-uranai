import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, Text, TextInput, View } from 'react-native';
import { currents, gods, scenes, stages } from './art';
import { addDays, calendarEvents, content, cycleFor, cycleTier, dateLabel, lifeFields, residentIndex, shortDate, tierColors, tiers, type Profile } from './domain';
import { ReflectionCards } from './LifeChart';
import { ResidentSymbol, TideMarks } from './ResidentCard';
import { ctxFor, dayTable, labelOf, OUTER, SEASON, STAGES, yearScoreOf, blockScoreOf } from './scoring';
import { TideWheel } from './TideCharts';
import { Art, Button, C, Card, Chip, Chips, Heading, S, Section, Tile } from './ui';
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
  const index = selected ?? (mode === 'current' ? c.outer : c.stage);
  const [name, description, prompt] = (mode === 'current' ? content.currents : content.stages)[index];
  const events = calendarEvents(date, profile);
  const monthStart = new Date(Date.UTC(c.Y, c.MO - 1, 1));
  const dayCount = new Date(Date.UTC(c.Y, c.MO, 0)).getUTCDate();
  const block = Math.floor((c.MO - 1) / 4);
  const cycle = profile && cycleFor(profile.t);
  const year = OUTER[c.outer];
  const yearLevel = profile && cycle ? cycleTier(yearScoreOf(c.Y, profile.t).score, cycle.years) : null;
  const blockLevel = profile && cycle ? cycleTier(blockScoreOf(c.Y, block, profile.t).score, cycle.blocks) : null;

  function choose(date: Date) {
    setOffset(Math.round((date.getTime() - today.getTime()) / 86_400_000));
    setSelected(null);
  }

  return <View style={S.stack}>
    <Heading tag="潮の羅針盤" title="運勢の流れ" body="外の輪は十二年の海流。内の輪は一年の月と、四か月ごとの海況です。" />
    <TideWheel context={c} profile={profile}
      onMonth={month => choose(new Date(Date.UTC(c.Y, month - 1, 1)))}
      onYear={year => choose(new Date(Date.UTC(year, c.MO - 1, 1)))} />
    <View style={S.between}>
      <Chip onPress={() => choose(new Date(Date.UTC(c.Y - 1, c.MO - 1, 1)))}>‹ 前年</Chip>
      <Chip onPress={() => choose(today)}>現在に戻る</Chip>
      <Chip onPress={() => choose(new Date(Date.UTC(c.Y + 1, c.MO - 1, 1)))}>翌年 ›</Chip>
    </View>
    <Card>
      <Text style={S.kicker}>{c.Y}年{profile && c.Y >= profile.Y ? '　／　その年に' + (c.Y - profile.Y) + '歳' : ''}</Text>
      <Text style={S.h2}>{year.n}</Text>
      <Text style={S.body}>{year.t}　·　{year.th}の年。{year.d}。</Text>
      {yearLevel !== null && <Text style={[S.h3, { color: tierColors[yearLevel] }]}>年の運勢　{tiers[yearLevel]}</Text>}
      <Text style={S.kicker}>{block * 4 + 1}〜{block * 4 + 4}月</Text>
      <Text style={S.h3}>{STAGES[c.stage].n}{blockLevel !== null ? '　／　' + tiers[blockLevel] : ''}</Text>
      <Text style={S.body}>{STAGES[c.stage].d}。</Text>
    </Card>
    <Button quiet onPress={() => setShowCycle(!showCycle)}>{showCycle ? '見取り図を閉じる' : '過去と先の流れを見比べる'}</Button>
    {showCycle && <Card>
      <Chips>
        <Chip active={cycleMode === 'year'} onPress={() => setCycleMode('year')}>十二年の海流</Chip>
        <Chip active={cycleMode === 'block'} onPress={() => setCycleMode('block')}>四年分の海況</Chip>
      </Chips>
      {Array.from({ length: 12 }, (_, i) => {
        const step = i - 6;
        const isYear = cycleMode === 'year';
        const b = ((block + step) % 3 + 3) % 3;
        const y = c.Y + (isYear ? step : Math.floor((block + step) / 3));
        const item = isYear ? OUTER[(c.outer + step + 12) % 12] : STAGES[(c.stage + step + 12) % 12];
        const level = profile && cycle ? isYear ? cycleTier(yearScoreOf(y, profile.t).score, cycle.years)
          : cycleTier(blockScoreOf(y, b, profile.t).score, cycle.blocks) : null;
        return <Pressable accessibilityRole="button" key={step} onPress={() => choose(new Date(Date.UTC(y, isYear ? c.MO - 1 : b * 4, 1)))}
          style={[S.between, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }]}>
          <View style={{ flex: 1 }}><Text style={S.tiny}>{y}年{isYear ? '' : ' ' + (b * 4 + 1) + '〜' + (b * 4 + 4) + '月'}</Text>
            <Text style={S.h3}>{item.n}</Text></View>
          {level !== null && <Text style={[S.tiny, { color: tierColors[level] }]}>{tiers[level]}</Text>}
        </Pressable>;
      })}
    </Card>}
    <Section title="潮環の暦" note="月の形、月の距離、潮替わりを日付ごとに読む。" />
    <View style={S.between}>
      <Chip onPress={() => choose(new Date(Date.UTC(c.Y, c.MO - 2, 1)))}>‹ 前月</Chip>
      <Text style={S.h3}>{c.Y}年{c.MO}月</Text>
      <Chip onPress={() => choose(new Date(Date.UTC(c.Y, c.MO, 1)))}>翌月 ›</Chip>
    </View>
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {[...'日月火水木金土'].map(day => <Text key={day} style={[S.tiny, { width: '14.285%', textAlign: 'center', paddingBottom: 7 }]}>{day}</Text>)}
        {Array.from({ length: monthStart.getUTCDay() }, (_, i) => <View key={'blank' + i} style={{ width: '14.285%' }} />)}
        {Array.from({ length: dayCount }, (_, i) => {
          const day = addDays(monthStart, i);
          const hasEvent = calendarEvents(day, profile).some(event => event !== '帰郷の年');
          return <Pressable key={i} accessibilityRole="button" accessibilityLabel={shortDate(ctxFor(day)) + (hasEvent ? ' 行事あり' : '')}
            accessibilityState={{ selected: i + 1 === c.DA }} onPress={() => choose(day)}
            style={{ width: '14.285%', minHeight: 43, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: i + 1 === c.DA ? C.raised : undefined }}>
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
      <Chip active={mode === 'stage'} onPress={() => { setMode('stage'); setSelected(null); }}>12の海況</Chip>
    </Chips>
    <View style={S.card}>
      <Art source={images[index]} height={195} />
      <View style={S.pad}>
        <Text style={S.kicker}>{(index + 1).toString().padStart(2, '0')}  /  12</Text>
        <Text style={S.h2}>{mode === 'current' ? list[index].n : name}</Text><Text style={S.body}>{description}</Text>
        <Text style={[S.body, { color: C.aqua }]}>{prompt}</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
      {list.map((item, i) => <Pressable key={item.n} onPress={() => setSelected(i)} accessibilityRole="button" accessibilityState={{ selected: index === i }} style={[S.card, { width: '23.5%', borderColor: index === i ? C.gold : C.line }]}>
        <Art source={images[i]} height={60} />
        <Text style={[S.tiny, { paddingVertical: 5, textAlign: 'center' }]}>{item.n.replace('の海流', '')}</Text>
      </Pressable>)}
    </View>
    <Card><Text style={S.h3}>海の行事</Text><Text style={S.body}>元日は新しい海流と潮替わり。5月1日と9月1日も潮替わりです。新月・満月を迎える日は「月を読む日」。生まれた日は「私の出航日」、生まれ年の海流が12年ごとに巡る年は「帰郷の年」です。</Text></Card>
  </View>;
}

export function Atlas({ profile, favorites, open, myth, pair }: {
  profile: Profile | null; favorites: number[]; open: OpenResident; myth: () => void; pair: () => void;
}) {
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
    <Heading tag="THE RESIDENT ATLAS" title="海の住人図鑑" body="四季と四つの深さから生まれる、16の海の住人。" />
    <TextInput accessibilityLabel="住人を検索" value={query} onChangeText={setQuery}
      style={S.field} placeholder="住人名・役柄で検索" placeholderTextColor={C.muted} />
    <Chips>
      <Chip active={season === null} onPress={() => setSeason(null)}>すべての季節</Chip>
      {['春', '夏', '秋', '冬'].map((name, i) => <Chip key={name} active={season === i} onPress={() => setSeason(season === i ? null : i)}>{name}</Chip>)}
    </Chips>
    <Chips>
      {['浅瀬', '沿岸', '沖合', '深海'].map((name, i) => <Chip key={name} active={depth === i} onPress={() => setDepth(depth === i ? null : i)}>{name}</Chip>)}
      <Chip active={onlySaved} onPress={() => setOnlySaved(!onlySaved)}>☆ お気に入り</Chip>
    </Chips>
    <Text style={S.tiny}>{visible.length} / 16　·　お気に入り {favorites.length}体</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
      {visible.map(resident => <Pressable key={resident.id} accessibilityRole="button" onPress={() => open(resident.index)}
        accessibilityLabel={[resident.band, resident.subtitle, resident.index === own ? 'あなたの住人' : ''].filter(Boolean).join('、')}
        style={[S.card, { width: '48.5%' }]}>
        <View style={{ padding: 11, gap: 3 }}>
          <Text style={S.kicker}>NO. {resident.id}{resident.index === own ? ' · あなた' : ''}{favorites.includes(resident.index) ? ' · ★' : ''}</Text>
          <Text style={S.h2}>{resident.band}</Text>
          <Text style={S.body}>{resident.subtitle}</Text>
        </View>
        <View style={{ alignItems: 'center', padding: 12, backgroundColor: C.base }}>
          <ResidentSymbol entry={resident} />
        </View>
        <Text style={[S.tiny, { padding: 11 }]}>{resident.summary}</Text>
      </Pressable>)}
    </View>
    {visible.length === 0 && <Card><Text style={S.body}>条件に合う住人がいません。</Text><Button quiet onPress={() => { setSeason(null); setDepth(null); setOnlySaved(false); setQuery(''); }}>絞り込みをリセット</Button></Card>}
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
    <Heading tag={'RESIDENT NO. ' + entry.id} title={entry.band} body={entry.subtitle} />
    <View style={[S.card, { alignItems: 'center', padding: 24 }]}><ResidentSymbol entry={entry} size={128} profile={own ?? undefined} /></View>
    <Chips>
      <Chip>{season.act}</Chip><Chip active={favorite} onPress={toggle}>{favorite ? '★ お気に入り済み' : '☆ お気に入りに入れる'}</Chip>
    </Chips>
    <Card>
      <Text style={S.h3}>{entry.hook}</Text>
      <Text style={S.body}>{entry.inner}</Text>
    </Card>
    {([['人間関係', entry.relation], ['長所が裏返る瞬間', entry.shadow], ['ひとつの問い', entry.question], ['試せること', entry.action]] as const)
      .map(([title, text]) => <Card key={title}><Text style={S.h3}>{title}</Text><Text style={S.body}>{text}</Text></Card>)}
    <Text style={S.tiny}>16の住人は、暮らしや自分の傾向を読み直すための物語の象徴です。</Text>
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
    {content.chapters.map((chapter, index) => <Pressable key={chapter.title} onPress={() => open(index)} accessibilityRole="button" style={[S.card, S.row]}>
      <Image source={scenes[chapterArt[index]]} style={{ width: 74, height: 62 }} />
      <Text style={[S.h3, { flex: 1 }]}>{chapter.title}</Text><Text style={[S.tiny, { paddingRight: 12 }]}>{read.includes(index) ? '読了' : '›'}</Text>
    </Pressable>)}
    <Section title="五柱の神" note="潮環神話に登場する神々。" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {godOrder.map((god, index) => <View key={god} style={[S.card, { width: '18.5%' }]}>
        <Art source={gods[god]} height={67} />
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

export function Journal({ profile, notes, edit, pair, create, openNote, openName, onForget, questions, reflections, openTrail, editReflection, openChart }: {
  profile: Profile | null; notes: Note[]; edit: () => void; pair: () => void; create: () => void;
  openNote: (day: string) => void; openName: () => void; onForget: () => void;
  questions: SavedQuestion[]; reflections: Reflection[]; openTrail: (id: string) => void;
  editReflection: (record: Reflection) => void; openChart: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const resident = profile && ownResident(profile);
  const trails = [...new Set([...questions.map(entry => entry.id), ...reflections.flatMap(record => record.questionId ? [record.questionId] : [])])];
  return <View style={S.stack}>
    <Heading tag="THE LOGBOOK" title="航海帳" body="自分の潮札と、海を見て考えたことを残す場所。" />
    <View style={S.card}><Art source={scenes[2]} height={140} /></View>
    <Card>
      {profile && resident ? <>
        <Text style={S.kicker}>MY TIDE CARD</Text><Text style={S.h2}>{resident.band}</Text>
        <Text style={S.body}>{resident.subtitle}</Text>
        <Text style={S.tiny}>正確な名札 {labelOf(profile.t)}</Text>
        <Button onPress={openName}>私の名札を読む</Button>
        <Button quiet onPress={edit}>入力内容を変更</Button>
        {confirm ? <View style={S.stack}><Text style={S.body}>この端末の潮札と入力内容を削除しますか？</Text>
          <Chips><Chip onPress={() => setConfirm(false)}>キャンセル</Chip><Chip active onPress={() => { onForget(); setConfirm(false); }}>潮札を削除</Chip></Chips>
        </View> : <Chip onPress={() => setConfirm(true)}>潮札を削除する</Chip>}
      </> : <><Text style={S.h3}>私の潮札</Text><Button onPress={edit}>潮札をつくる</Button></>}
    </Card>
    <Button quiet onPress={pair}>二人の海をみる</Button>
    <Section title="同じ問いの航跡" note="残した日と、問いにつながる出来事を読み直せます。" />
    {trails.length === 0 && <Text style={S.body}>まだ残した問いはありません。</Text>}
    {trails.map(id => {
      const question = findQuestion(id);
      return question && <Pressable accessibilityRole="button" key={id} onPress={() => openTrail(id)} style={[S.card, S.pad]}>
        <Text style={S.kicker}>{id}　{question.title}</Text><Text style={S.h3}>{question.question}</Text>
      </Pressable>;
    })}
    <Section title="あの頃の海の記録" note="出来事、当時の受け取り方、今の受け取り方を並べて読めます。" />
    <ReflectionCards records={reflections} edit={editReflection} />
    <Button quiet onPress={openChart}>人生の海図から記録する</Button>
    <Section title="私の記録" note="航海帳・お気に入り・読了の記録は、この端末に保存されます。" />
    <Button quiet onPress={create}>今日の記録を書く</Button>
    {notes.length === 0 && <Text style={S.body}>まだ記録がありません。</Text>}
    {notes.map(note => <Pressable accessibilityRole="button" key={note.day} onPress={() => openNote(note.day)} style={[S.card, S.pad]}>
      <Text style={S.kicker}>{note.day}</Text><Text numberOfLines={2} style={S.body}>{note.text}</Text>
    </Pressable>)}
    <Card><Text style={S.h3}>潮環占いについて</Text><Text style={S.body}>潮環占いは、四季・名前の画数・暦を使って自分の状況を見つめるための創作占いです。人生の予測や性格を測定する方法としては実証されていません。月の形と距離は日本時間の正午を基準に計算しています。年の海流と四か月の海況は、暦に重ねた物語上の象徴です。</Text>
      <Text style={S.tiny}>漢字の画数　KANJIDIC2 © EDRDG（CC BY-SA 4.0）　／　月の計算　Jean Meeus『Astronomical Algorithms』</Text></Card>
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
