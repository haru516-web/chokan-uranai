import { useEffect, useRef, useState } from 'react';
import AsyncStorage from './web/storage';
import * as Haptics from './web/haptics';
import { Image } from './web/image';
import { StatusBar } from './web/status-bar';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from './web/safe-area';
import { harbor, seal, uiIcon } from './art';
import { blankInputs, dateKey, jstToday, makeProfile, readDay, validate, type Inputs } from './domain';
import { ReflectionEditor } from './LifeChart';
import { LifeWave, scrollToLifeCalendar } from './LifeWave';
import { ProfileForm } from './ProfileForm';
import { Compat } from './Compat';
import { QuestionAnswer, QuestionSea } from './Questions';
import { ShareTideCard } from './ResidentCard';
import { Today } from './Today';
import { TarotHome, type SavedTarotDraw } from './DailyTarot';
import { findTarot, seasonOf } from './tarotDeck';
import { Atlas, Chapter, Myth, Ranking, Resident } from './screens';
import { C, S, ui } from './ui';
import { findQuestion, type Reflection, type SavedQuestion } from './voyage';
import { mainTabs, TabBar, type MainTab } from './PetNavigation';

const detailTitles: Record<string, string> = {
  explanation: 'タイプ解説', upgrade: '有料版', settings: '設定', terms: '利用規約', privacy: 'プライバシーポリシー', tokushoho: '特定商取引法に基づく表記', profile: '自分の海をひらく',
  question: '問いを読む', compare: 'あの頃の海と比べる', homecoming: '帰郷の年', reflection: '振り返りを書く',
  share: '潮札を共有', myth: '潮環神話', resident: '住人の紹介', chapter: '神話を読む',
  rank: '160名札の順位', people: '人の管理・リセット',
};
import { Guide } from './Guide';
import { ToTop } from './ToTop';
import { GlossProvider } from './Glossary';
import { Ritual } from './Ritual';
import { Opening } from './Opening';
import { PeopleManager, type Person } from './People';
import { Upgrade } from './Upgrade';
import { Settings } from './Settings';
import { Privacy, Terms, Tokushoho } from './Legal';
import { UPGRADE } from './entitlement';
import { widgetEntries } from './widgetPayload';
import { usePlan } from './plan';
import { updateNativeWidget } from './web/native';
type Detail =
  | { kind: 'explanation' }
  | { kind: 'upgrade' }
  | { kind: 'settings' }
  | { kind: 'terms' }
  | { kind: 'privacy' }
  | { kind: 'tokushoho' }
  | { kind: 'profile'; questionId?: string; add?: boolean }
  | { kind: 'people' }
  | { kind: 'question'; id: string; personal?: boolean }
  | { kind: 'compare'; id: string }
  | { kind: 'homecoming'; year: number }
  | { kind: 'reflection'; year: number; month: number; questionId?: string; id?: number }
  | { kind: 'share' }
  | { kind: 'myth' }
  | { kind: 'resident'; index: number }
  | { kind: 'chapter'; index: number }
  | { kind: 'rank'; date: Date };

type Saved = { inputs: Inputs | null; people: Person[]; favorites: number[]; read: number[]; questions: SavedQuestion[]; reflections: Reflection[]; tarotDraw: SavedTarotDraw | null; tarotLog: SavedTarotDraw[];
  /** 「鑑定」タブを最後に開いた日（YYYY-MM-DD）。null＝まだ一度も開いていない。タブの NEW・赤い点の出し分けに使う。 */
  readingDay: string | null };
const empty: Saved = { inputs: null, people: [], favorites: [], read: [], questions: [], reflections: [], tarotDraw: null, tarotLog: [], readingDay: null };
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
  const plan = usePlan();
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [stored, setStored] = useState<Saved>(empty);
  const [people, setPeople] = useState<Person[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [today, setToday] = useState(jstToday);
  const [tab, setTab] = useState<MainTab>('today');
  const [path, setPath] = useState<Detail[]>([]);
  const [todayVisit, setTodayVisit] = useState(0);
  // 静的ページ（/questions/…）の「この問いを読む」から、?question=Q01 で開いたときは、その問いを選んだ状態で始める。
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return findQuestion(new URLSearchParams(window.location.search).get('question'))?.id;
  });
  const [ritual, setRitual] = useState(false);
  const detail = path[path.length - 1];
  const active = people.find(person => person.id === activeId) ?? null;
  const inputs = active?.inputs ?? null;
  const profile = inputs ? makeProfile(inputs) : null;
  const selectedQuestion = findQuestion(selectedQuestionId);
  const day = dateKey(today);
  const accent = mainTabs.find(item => item.id === tab)?.accent ?? '#eacc8c';

  // 「鑑定」タブを開いたら、今日は読んだことにする（NEW・赤い点が消える）。占った人がいるときだけ。
  useEffect(() => {
    if (!ready || tab !== 'reading' || detail || !profile || stored.readingDay === day) return;
    setStored(previous => previous.readingDay === day ? previous : { ...previous, readingDay: day });
  }, [ready, tab, detail, !!profile, stored.readingDay, day]);

  useEffect(() => {
    const page = detail ? detailTitles[detail.kind] : mainTabs.find(item => item.id === tab)?.title;
    if (Platform.OS === 'web') document.title = page ? page + '｜潮環占い' : '潮環占い';
  }, [detail, tab]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey).then(raw => {
      if (!mounted || !raw) return;
      const parsed = JSON.parse(raw);
      const data: Saved = { ...empty, ...parsed,
        tarotLog: Array.isArray(parsed.tarotLog) ? parsed.tarotLog.filter((item: SavedTarotDraw) => typeof item?.day === 'string' && typeof item?.cardId === 'string') : [] };
      // 以前の自己診断・日記の保存データは、もう使わない。
      delete (data as Record<string, unknown>).self;
      delete (data as Record<string, unknown>).notes;
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

  // ホーム画面ウィジェットへ、今日から7日分の内容を渡す。保存した「自分」がいなければ、はじめかたの案内になる。
  useEffect(() => {
    if (!ready) return;
    try { updateNativeWidget(widgetEntries(people, plan === 'paid', today)); } catch { /* ウィジェットが作れなくても、占いは動く */ }
  }, [ready, people, today, plan]);

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
    if (Platform.OS === 'ios') void Haptics.selectionAsync().catch(() => {});
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
  // 有料版：画面のどこからでも、案内を開ける（Premiumの鍵など）。購入状態は、ネイティブから DomApp 経由で届く。
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const onUpgrade = () => openRef.current({ kind: 'upgrade' });
    window.addEventListener(UPGRADE, onUpgrade);
    return () => window.removeEventListener(UPGRADE, onUpgrade);
  }, []);
  const back = () => {
    scrollTo(scrollMemory.current.pop() ?? 0);
    setPath(previous => previous.slice(0, -1));
  };
  const openResident = (index: number) => open({ kind: 'resident', index });
  const openChapter = (index: number) => open({ kind: 'chapter', index });
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
  const compare = (id: string) => open({ kind: 'compare', id });
  const writeReflection = (year: number, month: number, questionId?: string) => open({ kind: 'reflection', year, month, questionId });
  const editReflection = (record: Reflection) => open({ kind: 'reflection', year: record.year, month: record.month, id: record.id });

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
    if (Platform.OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  const renderToday = (view: 'result' | 'reading') => <Today view={view} openReading={() => go('reading')} people={people} activeId={activeId} onSwitch={id => { setActiveId(id); setTodayVisit(previous => previous + 1); }}
      onAdd={() => open({ kind: 'profile', add: true })} onManage={() => open({ kind: 'people' })} today={today} profile={profile} goMyth={openMyth} openCalendar={openCalendar} create={editProfile}
      ranks={openRanking} questions={stored.questions} reflections={stored.reflections}
      tarotDraw={stored.tarotDraw} tarotLog={stored.tarotLog} onDrawTarot={drawTarot}
      openQuestion={id => openQuestion(id, true)} openQuestions={() => go('questions')}
      shareTideCard={() => open({ kind: 'share' })} openExplanation={() => open({ kind: 'explanation' })}
      selectedQuestion={selectedQuestion ? {
        question: selectedQuestion,
        saved: stored.questions.some(entry => entry.id === selectedQuestion.id && entry.day === day),
        toggle: () => toggleQuestion(selectedQuestion.id),
        compare: () => compare(selectedQuestion.id),
      } : undefined}
      openHomecoming={year => open({ kind: 'homecoming', year })} />;
  const body = {
    today: renderToday('result'),
    reading: renderToday('reading'),
    tarot: <TarotHome today={today} savedDraw={stored.tarotDraw} log={stored.tarotLog} onDraw={drawTarot}
      personKey={profile ? 'k' + profile.t.key : 'guest'} season={profile ? seasonOf(profile.t.mod) : null}
      level={profile ? readDay(today, profile).layers.day : null} onCreate={editProfile} goToday={() => go('today')} />,
    match: <Compat profile={profile} people={people} create={editProfile} today={today} />,
    questions: <QuestionSea open={openQuestion} create={profile ? undefined : editProfile} />,
    chart: <LifeWave embedCalendar calendarFocus={calendarFocus} today={today} profile={profile} create={editProfile}
      write={writeReflection} showToday={() => go('today')} records={stored.reflections} edit={editReflection} />,
    atlas: <Atlas create={editProfile} profile={profile} favorites={stored.favorites} open={openResident} myth={openMyth} pair={() => go('match')} />,
  }[tab];

  function detailBody(detail: Detail) {
    switch (detail.kind) {
      case 'explanation':
        return <Guide today={today} profile={profile} onClose={back} />;
      case 'upgrade':
        return <Upgrade openLegal={kind => open({ kind })} />;
      case 'settings':
        return <Settings openUpgrade={() => open({ kind: 'upgrade' })} openPeople={() => open({ kind: 'people' })} openLegal={kind => open({ kind })} />;
      case 'terms':
        return <Terms />;
      case 'tokushoho':
        return <Tokushoho />;
      case 'privacy':
        return <Privacy />;
      case 'profile':
        return <ProfileForm title={detail.add ? '友人・気になる人を占う' : 'あなたの海を、ひらきます。'} initial={detail.add ? blankInputs : inputs ?? blankInputs}
          persist={detail.add ? false : active ? active.saved : true} submitLabel={detail.add ? 'この人を占う' : undefined}
          onSubmit={(next, remember) => saveProfile(next, remember, detail.questionId, detail.add)} />;
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
          back();
        }} remove={existing ? () => {
          setStored(previous => ({ ...previous, reflections: previous.reflections.filter(record => record.id !== existing.id) }));
          back();
        } : undefined} />;
      }
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
      <View {...ui('header')} style={layout.header}>
        {detail
          ? <Pressable accessibilityRole="button" accessibilityLabel="前の画面に戻る" onPress={back} {...ui('round')} style={layout.backBtn}>
            {uiIcon('icon-back') ? <Image source={uiIcon('icon-back')!} style={{ width: 24, height: 24 }} contentFit="contain" accessible={false} /> : <Text style={layout.backMark}>‹</Text>}
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
        {detail?.kind !== 'explanation' && detail?.kind !== 'settings' && <Pressable accessibilityRole="button" accessibilityLabel="仕組みの解説を開く" onPress={() => open({ kind: 'explanation' })}
          {...ui('help')} style={layout.help}>
          <View accessible={false} style={layout.helpMark}>{uiIcon('icon-help') ? <Image source={uiIcon('icon-help')!} style={{ width: 26, height: 26 }} contentFit="contain" accessible={false} /> : <Text style={layout.helpMarkText}>?</Text>}</View>
          <Text style={layout.helpText}>使い方・解説</Text>
        </Pressable>}
        {detail?.kind !== 'settings' && <Pressable accessibilityRole="button" accessibilityLabel="設定を開く（契約の管理など）" onPress={() => open({ kind: 'settings' })} {...ui('round')} style={layout.gear}>
          {uiIcon('icon-gear') ? <Image source={uiIcon('icon-gear')!} style={{ width: 24, height: 24 }} contentFit="contain" accessible={false} /> : <Text style={layout.gearMark}>⚙</Text>}
        </Pressable>}
      </View>
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
      <TabBar wide={wide} seasonIndex={profile?.t.mod ?? null} activeTab={tab === 'questions' ? 'today' : tab} onSelect={go}
        badges={ready && profile && stored.readingDay !== day ? { reading: stored.readingDay === null ? 'new' : 'dot' } : undefined} />
    </KeyboardAvoidingView>
    <ToTop resetKey={tab + (detail ? detail.kind + path.length : "")} />
    {ritual && profile && <Ritual profile={profile} today={today} onDone={() => setRitual(false)} />}
  </SafeAreaView>;
}

const layout = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: C.base, alignItems: 'center' },
  frame: { flex: 1, minHeight: 0, width: '100%', maxWidth: 780, backgroundColor: C.base, alignSelf: 'center', overflow: 'hidden' },
  frameDesktop: { maxWidth: 1120 },
  contentDesktop: { paddingHorizontal: 32, paddingTop: 24 },
  header: { minHeight: 62, paddingHorizontal: 14, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  pageTitle: { color: C.ink, fontSize: 19, lineHeight: 26, fontWeight: '800' },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  backMark: { color: C.ink, fontSize: 28, lineHeight: 30, fontWeight: '700' },
  help: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 6, paddingRight: 13, minHeight: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.aqua, backgroundColor: 'rgba(126,226,208,.14)' },
  gear: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.line, backgroundColor: C.panel },
  gearMark: { color: C.ink, fontSize: 20, lineHeight: 24 },
  helpMark: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.aqua, alignItems: 'center', justifyContent: 'center' },
  helpMarkText: { color: C.dark, fontSize: 16, lineHeight: 20, fontWeight: '900' },
  helpText: { color: C.ink, fontSize: 14, lineHeight: 18, fontWeight: '900' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  scroll: { flex: 1, minHeight: 0 },
  hidden: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, pointerEvents: 'none', visibility: 'hidden' } as object,
  content: { padding: 16, paddingBottom: 32 },
  error: { backgroundColor: '#4b2c29', padding: 8, color: C.error },
});


