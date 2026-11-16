import { useEffect, useRef, useState } from 'react';
import AsyncStorage from './web/storage';
import * as Haptics from './web/haptics';
import { Image } from './web/image';
import { StatusBar } from './web/status-bar';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from './web/safe-area';
import { harbor, seal } from './art';
import { blankInputs, dateKey, jstToday, makeProfile, readDay, validate, type Inputs } from './domain';
import { QuestionTrail, ReflectionEditor } from './LifeChart';
import { LifeWave, scrollToLifeCalendar } from './LifeWave';
import { ProfileForm } from './ProfileForm';
import { PairReading } from './PairReading';
import { QuestionAnswer, QuestionSea } from './Questions';
import { ShareTideCard } from './ResidentCard';
import { Today } from './Today';
import { TarotHome, type SavedTarotDraw } from './DailyTarot';
import { findTarot, seasonOf } from './tarotDeck';
import { Atlas, Chapter, Journal, Myth, NoteEditor, Ranking, Resident, type Note } from './screens';
import { C, S } from './ui';
import { findQuestion, type Reflection, type SavedQuestion } from './voyage';
import { mainTabs, TabBar, type MainTab } from './PetNavigation';

const detailTitles: Record<string, string> = {
  explanation: 'タイプ解説', selfQuiz: '診断', selfResult: '診断の結果', selfWish: '意志を潮に乗せる', profile: '自分の海をひらく',
  question: '問いを読む', compare: 'あの頃の海と比べる', homecoming: '帰郷の年', reflection: '振り返りを書く', trail: '問いの記録',
  share: '潮札を共有', myth: '潮環神話', pair: '相性を見る', resident: '住人の紹介', chapter: '神話を読む',
  note: '航海帳に記す', journal: '記録・設定', rank: '160名札の順位', people: '人の管理・リセット',
};
import { Guide } from './Guide';
import { ToTop } from './ToTop';
import { GlossProvider } from './Glossary';
import { Ritual } from './Ritual';
import { Opening } from './Opening';
import { PeopleManager, PersonSwitcher, type Person } from './People';
import { SelfHome, SelfQuiz, SelfResultView, SelfWish } from './SelfPurity';
import { emptySelf, quadOf, quads, score, type Move, type SelfState } from './self';
type Detail =
  | { kind: 'explanation' }
  | { kind: 'selfQuiz' }
  | { kind: 'selfResult'; id: number }
  | { kind: 'selfWish' }
  | { kind: 'profile'; questionId?: string; add?: boolean }
  | { kind: 'people' }
  | { kind: 'journal' }
  | { kind: 'question'; id: string; personal?: boolean }
  | { kind: 'compare'; id: string }
  | { kind: 'homecoming'; year: number }
  | { kind: 'reflection'; year: number; month: number; questionId?: string; id?: number }
  | { kind: 'trail'; id: string }
  | { kind: 'share' }
  | { kind: 'myth' }
  | { kind: 'pair' }
  | { kind: 'resident'; index: number }
  | { kind: 'chapter'; index: number }
  | { kind: 'note'; day: string }
  | { kind: 'rank'; date: Date };

type Saved = { inputs: Inputs | null; people: Person[]; notes: Note[]; favorites: number[]; read: number[]; questions: SavedQuestion[]; reflections: Reflection[]; self: SelfState; tarotDraw: SavedTarotDraw | null; tarotLog: SavedTarotDraw[] };
const empty: Saved = { inputs: null, people: [], notes: [], favorites: [], read: [], questions: [], reflections: [], self: emptySelf, tarotDraw: null, tarotLog: [] };
const storageKey = 'chokan/v1';
let pendingSave: Promise<void> = Promise.resolve();

export default function App() {
  // オープニングの幕が上がりはじめるまで、下の画面の登場演出（順位の数え上げなど）を待たせる。
  const [opening, setOpening] = useState<'play' | 'leaving' | 'done'>('play');
  return <SafeAreaProvider><GlossProvider><Voyage hold={opening === 'play'} />
    {opening !== 'done' && <Opening onReveal={() => setOpening('leaving')} onDone={() => setOpening('done')} />}</GlossProvider></SafeAreaProvider>;
}

function Voyage({ hold }: { hold: boolean }) {
  const windowWidth = useWindowDimensions().width;
  const wide = windowWidth >= 720;
  const desktop = windowWidth >= 1000;
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [stored, setStored] = useState<Saved>(empty);
  const [people, setPeople] = useState<Person[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [today, setToday] = useState(jstToday);
  const [tab, setTab] = useState<MainTab>('today');
  const [path, setPath] = useState<Detail[]>([]);
  const [todayVisit, setTodayVisit] = useState(0);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>();
  const [ritual, setRitual] = useState(false);
  const detail = path[path.length - 1];
  const active = people.find(person => person.id === activeId) ?? null;
  const inputs = active?.inputs ?? null;
  const profile = inputs ? makeProfile(inputs) : null;
  const me = people.find(person => person.me) ?? people[0];
  const meProfile = me ? makeProfile(me.inputs) : null;
  const selectedQuestion = findQuestion(selectedQuestionId);
  const day = dateKey(today);
  const accent = mainTabs.find(item => item.id === tab)?.accent ?? '#eacc8c';

  useEffect(() => {
    const page = detail ? detailTitles[detail.kind] : mainTabs.find(item => item.id === tab)?.title;
    if (Platform.OS === 'web') document.title = page ? page + '｜潮環占い' : '潮環占い';
  }, [detail, tab]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey).then(raw => {
      if (!mounted || !raw) return;
      const parsed = JSON.parse(raw);
      const data: Saved = { ...empty, ...parsed, self: { ...emptySelf, ...parsed.self },
        tarotLog: Array.isArray(parsed.tarotLog) ? parsed.tarotLog.filter((item: SavedTarotDraw) => typeof item?.day === 'string' && typeof item?.cardId === 'string') : [] };
      if (data.tarotDraw && !data.tarotLog.some(item => item.day === data.tarotDraw?.day)) data.tarotLog = [...data.tarotLog, data.tarotDraw];
      let list: Person[] = Array.isArray(parsed.people) ? parsed.people.filter((person: Person) => person?.inputs && !validate(person.inputs)) : [];
      if (!list.length && parsed.inputs && !validate(parsed.inputs)) list = [{ id: 1, inputs: parsed.inputs, me: true, saved: true }];
      data.inputs = null;
      data.people = list;
      setStored(data);
      setPeople(list);
      setActiveId((list.find(person => person.me) ?? list[0])?.id ?? null);
      if (list.length) setTab('today');
    }).catch(() => { if (mounted) setStorageError(true); })
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready || stored === empty) return;
    pendingSave = pendingSave.catch(() => {}).then(() => AsyncStorage.setItem(storageKey, JSON.stringify(stored)));
    pendingSave.then(() => setStorageError(false), () => setStorageError(true));
  }, [stored, ready]);

  useEffect(() => {
    const refresh = () => setToday(previous => {
      const next = jstToday();
      return next.getTime() === previous.getTime() ? previous : next;
    });
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener('change', refresh);
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  // 画面を開くときは先頭から、戻るときは元の位置へ（ページ全体がスクロールするため、自分で覚えて戻す）。
  const scrollMemory = useRef<number[]>([]);
  const scrollTo = (top: number) => {
    if (Platform.OS !== 'web') return;
    // 画面の組み替えが終わってから位置を合わせる（念のため、レイアウト確定後にもう一度）。
    const apply = () => window.scrollTo({ top, left: 0, behavior: 'instant' as ScrollBehavior });
    setTimeout(apply, 0);
    setTimeout(apply, 80);
  };
  function go(next: MainTab) {
    scrollMemory.current = [];
    scrollTo(0);
    setPath([]);
    setTab(next);
    setTodayVisit(previous => previous + 1);
    void Haptics.selectionAsync().catch(() => {});
  }
  function drawTarot(cardId: string) {
    const drawDay = dateKey(jstToday());
    setStored(previous => {
      const alreadyDrawn = previous.tarotDraw?.day === drawDay && !!findTarot(previous.tarotDraw.cardId);
      if (alreadyDrawn || !findTarot(cardId)) return previous;
      const entry = { day: drawDay, cardId };
      return { ...previous, tarotDraw: entry, tarotLog: [...previous.tarotLog.filter(item => item.day !== drawDay), entry].slice(-400) };
    });
  }
  const open = (next: Detail) => {
    if (Platform.OS === 'web') scrollMemory.current.push(window.scrollY);
    scrollTo(0);
    setPath(previous => [...previous, next]);
  };
  const back = () => {
    scrollTo(scrollMemory.current.pop() ?? 0);
    setPath(previous => previous.slice(0, -1));
  };
  const openResident = (index: number) => open({ kind: 'resident', index });
  const openChapter = (index: number) => open({ kind: 'chapter', index });
  const openNote = (day: string) => open({ kind: 'note', day });
  const editProfile = () => open({ kind: 'profile' });
  const openRanking = (date: Date) => open({ kind: 'rank', date });
  const openQuestion = (id: string, personal = false) => open({ kind: 'question', id, personal });
  // 運勢の輪をタップしたら、人生の流れタブ内の「運勢の輪」へ。別の画面には移らない。
  const [calendarFocus, setCalendarFocus] = useState<{ date: Date; mode: 'current' | 'stage'; key: number } | null>(null);
  const openCalendar = (date?: Date, mode?: 'current' | 'stage') => {
    setCalendarFocus({ date: date ?? today, mode: mode ?? 'current', key: Date.now() });
    go('chart');
    scrollToLifeCalendar();
  };
  const openMyth = () => open({ kind: 'myth' });
  const openTrail = (id: string) => open({ kind: 'trail', id });
  const compare = (id: string) => open({ kind: 'compare', id });
  const writeReflection = (year: number, month: number, questionId?: string) => open({ kind: 'reflection', year, month, questionId });
  const editReflection = (record: Reflection) => open({ kind: 'reflection', year: record.year, month: record.month, id: record.id });

  const self = stored.self;
  const updateSelf = (change: (value: SelfState) => SelfState) => setStored(previous => ({ ...previous, self: change(previous.self) }));
  const startQuiz = () => open({ kind: 'selfQuiz' });
  const openWish = () => open({ kind: 'selfWish' });

  function finishQuiz(answers: number[]) {
    const { p, s } = score(answers);
    const id = Date.now();
    updateSelf(value => ({ ...value, results: [{ id, day, p, s, answers }, ...value.results].slice(0, 60) }));
    setPath(previous => [...previous.slice(0, -1), { kind: 'selfResult', id }]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  function saveMove(move: Omit<Move, 'id'>, wish: string) {
    updateSelf(value => ({ ...value, wish, moves: [{ ...move, id: Date.now() }, ...value.moves].slice(0, 60) }));
  }

  function removeQuestion(id: string, day: string) {
    setStored(previous => ({ ...previous, questions: previous.questions.filter(entry => entry.id !== id || entry.day !== day) }));
  }

  function toggleQuestion(id: string) {
    setStored(previous => ({
      ...previous,
      questions: previous.questions.some(entry => entry.id === id && entry.day === day)
        ? previous.questions.filter(entry => entry.id !== id || entry.day !== day)
        : [{ id, day }, ...previous.questions],
    }));
  }

  function commitPeople(next: Person[], nextActive: number | null) {
    setPeople(next);
    setActiveId(nextActive);
    setStored(previous => ({ ...previous, inputs: null, people: next.filter(person => person.saved) }));
  }

  function removePerson(id: number) {
    const next = people.filter(person => person.id !== id);
    commitPeople(next, id === activeId ? ((next.find(person => person.me) ?? next[0])?.id ?? null) : activeId);
  }

  function resetAll() {
    setPeople([]);
    setActiveId(null);
    setSelectedQuestionId(undefined);
    setStored({ ...empty });
    setPath([]);
    setTab('today');
    setTodayVisit(previous => previous + 1);
  }

  function saveProfile(next: Inputs, remember: boolean, questionId?: string, add?: boolean) {
    if (add || !active) {
      const person: Person = { id: Date.now(), inputs: next, me: people.length === 0, saved: remember };
      commitPeople([...people, person], person.id);
    } else {
      commitPeople(people.map(entry => entry.id === active.id ? { ...entry, inputs: next, saved: remember } : entry), active.id);
    }
    setSelectedQuestionId(questionId);
    setRitual(true);
    setTodayVisit(previous => previous + 1);
    setPath([]);
    setTab('today');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  const body = {
    today: <Today people={people} activeId={activeId} onSwitch={id => { setActiveId(id); setTodayVisit(previous => previous + 1); }}
      onAdd={() => open({ kind: 'profile', add: true })} onManage={() => open({ kind: 'people' })} openJournal={() => open({ kind: 'journal' })} today={today} profile={profile} goMyth={openMyth} openCalendar={openCalendar} create={editProfile}
      ranks={openRanking} onSave={openNote} questions={stored.questions} reflections={stored.reflections}
      tarotDraw={stored.tarotDraw} tarotLog={stored.tarotLog} onDrawTarot={drawTarot}
      openQuestion={id => openQuestion(id, true)} openQuestions={() => go('questions')}
      shareTideCard={() => open({ kind: 'share' })} goSelf={() => go('self')}
      openExplanation={() => open({ kind: 'explanation' })} startQuiz={startQuiz}
      selfLast={self.results[0] ? { name: quads[quadOf(self.results[0].p, self.results[0].s)].name, mark: quads[quadOf(self.results[0].p, self.results[0].s)].mark, color: quads[quadOf(self.results[0].p, self.results[0].s)].color } : null}
      selectedQuestion={selectedQuestion ? {
        question: selectedQuestion,
        saved: stored.questions.some(entry => entry.id === selectedQuestion.id && entry.day === day),
        toggle: () => toggleQuestion(selectedQuestion.id),
        compare: () => compare(selectedQuestion.id),
      } : undefined}
      openHomecoming={year => open({ kind: 'homecoming', year })} />,
    tarot: <TarotHome today={today} savedDraw={stored.tarotDraw} log={stored.tarotLog} onDraw={drawTarot}
      personKey={profile ? 'k' + profile.t.key : 'guest'} season={profile ? seasonOf(profile.t.mod) : null}
      level={profile ? readDay(today, profile).layers.day : null} onCreate={editProfile} goToday={() => go('today')} />,
    self: <SelfHome state={self} profile={meProfile} today={day} start={startQuiz} openWish={openWish}
      openResult={id => open({ kind: 'selfResult', id })} goToday={() => go('today')}
      saveCheck={reason => updateSelf(value => ({ ...value, checks: [{ day, reason }, ...value.checks.filter(check => check.day !== day)].slice(0, 60) }))}
      saveAfter={(id, after) => updateSelf(value => ({ ...value, moves: value.moves.map(move => move.id === id ? { ...move, after } : move) }))} />,
    questions: <QuestionSea open={openQuestion} create={profile ? undefined : editProfile} />,
    chart: <LifeWave embedCalendar calendarFocus={calendarFocus} today={today} profile={profile} create={editProfile} openJournal={() => open({ kind: 'journal' })}
      write={writeReflection} showToday={() => go('today')} records={stored.reflections} edit={editReflection} />,
    atlas: <Atlas create={editProfile} profile={profile} favorites={stored.favorites} open={openResident} myth={openMyth} pair={() => open({ kind: 'pair' })} />,
  }[tab];

  function detailBody(detail: Detail) {
    switch (detail.kind) {
      case 'explanation':
        return <Guide today={today} profile={profile} onClose={back} />;
      case 'selfQuiz':
        return <SelfQuiz done={finishQuiz} />;
      case 'selfResult': {
        const index = self.results.findIndex(entry => entry.id === detail.id);
        const result = self.results[index];
        return result && <SelfResultView result={result} previous={self.results[index + 1]} profile={meProfile}
          again={() => setPath(previous => [...previous.slice(0, -1), { kind: 'selfQuiz' }])} openWish={openWish} openHome={() => go('self')} />;
      }
      case 'selfWish':
        return <SelfWish profile={meProfile} today={today} wish={self.wish} saveMove={saveMove} createProfile={editProfile} finish={() => go('self')} />;
      case 'profile':
        return <ProfileForm title={detail.add ? '友人・気になる人を占う' : 'あなたの海を、ひらきます。'} initial={detail.add ? blankInputs : inputs ?? blankInputs}
          persist={detail.add ? false : active ? active.saved : true} submitLabel={detail.add ? 'この人を占う' : undefined}
          onSubmit={(next, remember) => saveProfile(next, remember, detail.questionId, detail.add)} />;
      case 'journal':
        return <Journal profile={profile} notes={stored.notes} edit={editProfile} pair={() => open({ kind: 'pair' })} showToday={() => go('today')}
          questions={stored.questions} reflections={stored.reflections} openTrail={openTrail} editReflection={editReflection} openChart={() => go('chart')}
          create={() => openNote(dateKey(today))} openNote={openNote} goSelf={() => go('self')} selfCount={self.results.length}
          onForget={() => open({ kind: 'people' })} />;
      case 'people':
        return <PeopleManager people={people} activeId={activeId} select={id => { setActiveId(id); go('today'); }} remove={removePerson}
          add={() => open({ kind: 'profile', add: true })} resetAll={resetAll} />;
      case 'question': {
        const question = findQuestion(detail.id);
        return question && <QuestionAnswer question={question} profile={profile} today={today} personal={!!detail.personal && !!profile}
          saved={stored.questions.some(entry => entry.id === question.id && entry.day === day)} toggle={() => toggleQuestion(question.id)}
          readOwn={() => profile ? openQuestion(question.id, true) : open({ kind: 'profile', questionId: question.id })}
          browse={() => go('questions')} history={() => compare(question.id)} showToday={() => go('today')} />;
      }
      case 'compare':
        return <LifeWave today={today} profile={profile} questionId={detail.id} create={() => open({ kind: 'profile', questionId: detail.id })}
          write={writeReflection} showToday={() => go('today')} records={stored.reflections} edit={editReflection} />;
      case 'homecoming':
        return <LifeWave today={today} profile={profile} initialYear={detail.year} create={editProfile}
          write={writeReflection} showToday={() => go('today')} records={stored.reflections} edit={editReflection} />;
      case 'reflection': {
        const existing = stored.reflections.find(record => record.id === detail.id);
        return <ReflectionEditor initial={detail} existing={existing} save={value => {
          setStored(previous => ({
            ...previous,
            reflections: existing
              ? previous.reflections.map(record => record.id === existing.id ? { ...value, id: existing.id } : record)
              : [{ ...value, id: Math.max(Date.now(), (previous.reflections[0]?.id ?? 0) + 1) }, ...previous.reflections],
          }));
          if (existing) back(); else setPath([{ kind: 'journal' }]);
        }} remove={existing ? () => {
          setStored(previous => ({ ...previous, reflections: previous.reflections.filter(record => record.id !== existing.id) }));
          back();
        } : undefined} />;
      }
      case 'trail':
        return <QuestionTrail id={detail.id} saved={stored.questions} records={stored.reflections} edit={editReflection}
          reopen={() => openQuestion(detail.id)} compare={() => compare(detail.id)} remove={day => removeQuestion(detail.id, day)} />;
      case 'share':
        return profile && <ShareTideCard profile={profile} />;
      case 'myth':
        return <Myth open={openChapter} read={stored.read} />;
      case 'resident': {
        const { index } = detail;
        return <Resident index={index} profile={profile} favorite={stored.favorites.includes(index)}
          toggle={() => setStored(previous => ({
            ...previous,
            favorites: previous.favorites.includes(index) ? previous.favorites.filter(id => id !== index) : [...previous.favorites, index],
          }))} />;
      }
      case 'chapter': {
        const { index } = detail;
        return <Chapter index={index} read={stored.read.includes(index)} open={openChapter}
          done={() => setStored(previous => previous.read.includes(index) ? previous : { ...previous, read: [...previous.read, index] })} />;
      }
      case 'note': {
        const { day } = detail;
        return <NoteEditor day={day} existing={stored.notes.find(note => note.day === day)?.text}
          save={text => {
            setStored(previous => {
              const notes = previous.notes.filter(note => note.day !== day);
              if (text) notes.push({ day, text });
              return { ...previous, notes: notes.sort((a, b) => b.day.localeCompare(a.day)) };
            });
            setPath([{ kind: 'journal' }]);
          }} />;
      }
      case 'pair':
        return <PairReading profile={profile} />;
      case 'rank':
        return <Ranking date={detail.date} profile={profile} />;
    }
  }
  return <SafeAreaView style={layout.root} edges={['top', 'bottom', 'left', 'right']}>
    <StatusBar style="light" />
    {Platform.OS === 'web' && <Image source={harbor} style={[StyleSheet.absoluteFill, { opacity: 0.18 }]} contentFit="cover" />}
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[layout.frame, desktop && layout.frameDesktop]}>
      <div className="ambient" aria-hidden="true" style={{ '--accent': accent } as React.CSSProperties}>
        <b /><b /><b />
        {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ left: (i * 29 + 5) % 100 + '%', fontSize: 8 + (i % 4) * 3, animationDuration: 14 + (i % 5) * 4 + 's', animationDelay: -(i * 2.3) + 's' }}>✦</i>)}
      </div>
      <View pointerEvents="none" style={[layout.wash, { backgroundImage: `linear-gradient(180deg, ${mainTabs.find(item => item.id === tab)?.accent ?? '#eacc8c'}30 0%, transparent 100%)` } as object]} />
      <View style={layout.header}>
        {detail
          ? <Pressable accessibilityRole="button" accessibilityLabel="前の画面に戻る" onPress={back} style={layout.backBtn}>
            <Text style={layout.backMark}>‹</Text>
          </Pressable>
          : <View {...({ dataSet: { ui: 'seal' } } as object)} style={{ borderRadius: 10 }}><Image source={seal} style={{ width: 38, height: 38, borderRadius: 10 }} /></View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={layout.pageTitle}>
            {detail ? detailTitles[detail.kind] : mainTabs.find(item => item.id === tab)?.title}
          </Text>
          <Text numberOfLines={1} style={S.tiny}>
            {detail ? (mainTabs.find(item => item.id === tab)?.title ?? '') + ' › ' + detailTitles[detail.kind] : '潮環占い'}
          </Text>
        </View>
        {detail?.kind !== 'explanation' && <Pressable accessibilityRole="button" accessibilityLabel="仕組みの解説を開く" onPress={() => open({ kind: 'explanation' })}
          style={layout.help}>
          <Text style={{ color: C.aqua, fontWeight: '800' }}>? 解説</Text>
        </Pressable>}
      </View>
      <TabBar wide={wide} seasonIndex={profile?.t.mod ?? null} activeTab={tab} onSelect={go} />
      {storageError && <Text accessibilityRole="alert" style={[S.tiny, layout.error]}>端末の保存領域にアクセスできませんでした。この画面で続けられます。</Text>}
      {ready ? <>
        <ScrollView key={`${tab}-${todayVisit}`} {...({ dataSet: { screen: tab, layer: 'tab' } } as object)} style={[layout.scroll, detail && layout.hidden]} contentContainerStyle={[layout.content, desktop && layout.contentDesktop]}
          keyboardShouldPersistTaps="handled">
          {hold || (ritual && profile) ? null : body}
        </ScrollView>
        {path.map((entry, index) => <ScrollView key={entry.kind + index} {...({ dataSet: { screen: entry.kind, layer: 'detail' } } as object)}
          style={[layout.scroll, index !== path.length - 1 && layout.hidden]} contentContainerStyle={entry.kind === 'explanation' ? { flexGrow: 1 } : [layout.content, desktop && layout.contentDesktop]}
          keyboardShouldPersistTaps="handled">
          {detailBody(entry)}
        </ScrollView>)}
      </> : <View style={[layout.scroll, layout.content]}><Text style={S.body}>海図をひらいています…</Text></View>}
    </KeyboardAvoidingView>
    <ToTop resetKey={tab + (detail ? detail.kind + path.length : "")} />
    {ritual && profile && <Ritual profile={profile} today={today} onDone={() => setRitual(false)} />}
  </SafeAreaView>;
}

const layout = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.base, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 780, backgroundColor: C.base, alignSelf: 'center', overflow: 'hidden' },
  frameDesktop: { maxWidth: 1120 },
  contentDesktop: { paddingHorizontal: 32, paddingTop: 24 },
  header: { minHeight: 62, paddingHorizontal: 14, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  pageTitle: { color: C.ink, fontSize: 19, lineHeight: 26, fontWeight: '800' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  backMark: { color: C.ink, fontSize: 28, lineHeight: 30, fontWeight: '700' },
  help: { paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#4c6aa8' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scroll: { flex: 1 },
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, pointerEvents: 'none', visibility: 'hidden' } as object,
  content: { padding: 16, paddingBottom: 32 },
  error: { backgroundColor: '#4b2c29', padding: 8, color: C.error },
});


