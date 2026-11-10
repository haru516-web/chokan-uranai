import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { harbor, seal } from './src/art';
import { blankInputs, dateKey, jstToday, makeProfile, residentIndex, validate, type Inputs } from './src/domain';
import { LifeChart, QuestionTrail, ReflectionEditor } from './src/LifeChart';
import { ProfileForm } from './src/ProfileForm';
import { PairReading } from './src/PairReading';
import { NameReading } from './src/NameReading';
import { QuestionAnswer, QuestionSea } from './src/Questions';
import { ShareTideCard } from './src/ResidentCard';
import { Today } from './src/Today';
import { Atlas, Calendar, Chapter, Journal, Myth, NoteEditor, Ranking, Resident, type Note } from './src/screens';
import { C, S } from './src/ui';
import { findQuestion, type Reflection, type SavedQuestion } from './src/voyage';

const tabs = [
  { id: 'today', label: '今日', mark: '☾' },
  { id: 'questions', label: '問い', mark: '◌' },
  { id: 'chart', label: '海図', mark: '◈' },
  { id: 'atlas', label: '図鑑', mark: '✦' },
  { id: 'journal', label: '航海帳', mark: '⌑' },
] as const;
type Tab = typeof tabs[number]['id'];
type Detail =
  | { kind: 'profile'; questionId?: string }
  | { kind: 'name'; questionId?: string }
  | { kind: 'question'; id: string; personal?: boolean }
  | { kind: 'compare'; id: string }
  | { kind: 'homecoming'; year: number }
  | { kind: 'reflection'; year: number; month: number; questionId?: string; id?: number }
  | { kind: 'trail'; id: string }
  | { kind: 'share' }
  | { kind: 'calendar'; date?: Date; mode?: 'current' | 'stage' }
  | { kind: 'myth' }
  | { kind: 'pair' }
  | { kind: 'resident'; index: number }
  | { kind: 'chapter'; index: number }
  | { kind: 'note'; day: string }
  | { kind: 'rank'; date: Date };

type Saved = { inputs: Inputs | null; notes: Note[]; favorites: number[]; read: number[]; questions: SavedQuestion[]; reflections: Reflection[] };
const empty: Saved = { inputs: null, notes: [], favorites: [], read: [], questions: [], reflections: [] };
const storageKey = 'chokan/v1';
let pendingSave: Promise<void> = Promise.resolve();

export default function App() {
  return <SafeAreaProvider><Voyage /></SafeAreaProvider>;
}

function Voyage() {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [stored, setStored] = useState<Saved>(empty);
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [today, setToday] = useState(jstToday);
  const [tab, setTab] = useState<Tab>('questions');
  const [path, setPath] = useState<Detail[]>([]);
  const detail = path[path.length - 1];
  const profile = inputs ? makeProfile(inputs) : null;
  const day = dateKey(today);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(storageKey).then(raw => {
      if (!mounted || !raw) return;
      const data: Saved = { ...empty, ...JSON.parse(raw) };
      if (data.inputs && validate(data.inputs)) data.inputs = null;
      setStored(data);
      setInputs(data.inputs);
      if (data.inputs) setTab('today');
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

  function go(next: Tab) {
    setPath([]);
    setTab(next);
    if (Platform.OS === 'ios') void Haptics.selectionAsync().catch(() => {});
  }
  const open = (next: Detail) => setPath(previous => [...previous, next]);
  const back = () => setPath(previous => previous.slice(0, -1));
  const openResident = (index: number) => open({ kind: 'resident', index });
  const openChapter = (index: number) => open({ kind: 'chapter', index });
  const openNote = (day: string) => open({ kind: 'note', day });
  const editProfile = () => open({ kind: 'profile' });
  const openName = () => open({ kind: 'name' });
  const openRanking = (date: Date) => open({ kind: 'rank', date });
  const openQuestion = (id: string, personal = false) => open({ kind: 'question', id, personal });
  const openCalendar = (date?: Date, mode?: 'current' | 'stage') => open({ kind: 'calendar', date, mode });
  const openMyth = () => open({ kind: 'myth' });
  const openTrail = (id: string) => open({ kind: 'trail', id });
  const compare = (id: string) => open({ kind: 'compare', id });
  const writeReflection = (year: number, month: number, questionId?: string) => open({ kind: 'reflection', year, month, questionId });
  const editReflection = (record: Reflection) => open({ kind: 'reflection', year: record.year, month: record.month, id: record.id });

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

  function saveProfile(next: Inputs, remember: boolean, questionId?: string) {
    setInputs(next);
    setStored(previous => ({ ...previous, inputs: remember ? next : null }));
    setPath(previous => [...previous.slice(0, -1), { kind: 'name', questionId }]);
    if (Platform.OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }

  const body = {
    today: <Today today={today} profile={profile} goMyth={openMyth} openCalendar={openCalendar} create={editProfile} openName={openName}
      ranks={openRanking} onSave={openNote} questions={stored.questions} reflections={stored.reflections}
      openQuestion={id => openQuestion(id, true)} openChart={() => go('chart')} openQuestions={() => go('questions')}
      openHomecoming={() => open({ kind: 'homecoming', year: today.getUTCFullYear() - 12 })} />,
    questions: <QuestionSea open={openQuestion} create={profile ? undefined : editProfile} />,
    chart: <LifeChart today={today} profile={profile} create={editProfile} calendar={() => openCalendar()}
      write={writeReflection} showToday={() => go('today')} records={stored.reflections} edit={editReflection} />,
    atlas: <Atlas profile={profile} favorites={stored.favorites} open={openResident} myth={openMyth} pair={() => open({ kind: 'pair' })} />,
    journal: <Journal profile={profile} notes={stored.notes} edit={editProfile} pair={() => open({ kind: 'pair' })} openName={openName}
      questions={stored.questions} reflections={stored.reflections} openTrail={openTrail} editReflection={editReflection} openChart={() => go('chart')}
      create={() => openNote(dateKey(today))} openNote={openNote}
      onForget={() => { setInputs(null); setStored(previous => ({ ...previous, inputs: null })); }} />,
  }[tab];

  function detailBody(detail: Detail) {
    switch (detail.kind) {
      case 'profile':
        return <ProfileForm title="あなたの海を、ひらきます。" initial={inputs ?? blankInputs} persist={!!stored.inputs}
          onSubmit={(next, remember) => saveProfile(next, remember, detail.questionId)} />;
      case 'name':
        return profile && <NameReading profile={profile} today={today} showRanks={() => openRanking(today)} showCalendar={openCalendar}
          showToday={() => go('today')} showResident={() => openResident(residentIndex(profile.t))}
          showAtlas={() => go('atlas')} share={() => open({ kind: 'share' })}
          questionId={detail.questionId} readQuestion={id => openQuestion(id, true)} />;
      case 'question': {
        const question = findQuestion(detail.id);
        return question && <QuestionAnswer question={question} profile={profile} today={today} personal={!!detail.personal && !!profile}
          saved={stored.questions.some(entry => entry.id === question.id && entry.day === day)} toggle={() => toggleQuestion(question.id)}
          readOwn={() => profile ? openQuestion(question.id, true) : open({ kind: 'profile', questionId: question.id })}
          browse={() => go('questions')} history={() => compare(question.id)} showToday={() => go('today')} />;
      }
      case 'compare':
        return <LifeChart today={today} profile={profile} questionId={detail.id} create={() => open({ kind: 'profile', questionId: detail.id })}
          write={writeReflection} showToday={() => go('today')} records={stored.reflections} edit={editReflection} />;
      case 'homecoming':
        return <LifeChart today={today} profile={profile} initialYear={detail.year} create={editProfile}
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
          if (existing) back(); else go('journal');
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
      case 'calendar':
        return <Calendar today={today} profile={profile} initial={detail.date ? { date: detail.date, mode: detail.mode ?? 'current' } : undefined} />;
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
            go('journal');
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={layout.frame}>
      <View style={layout.header}>
        {detail
          ? <Pressable accessibilityRole="button" accessibilityLabel="前の画面に戻る" onPress={back} style={layout.back}>
            <Text style={layout.brand}>‹ 戻る</Text>
          </Pressable>
          : <View style={S.row}>
            <Image source={seal} style={{ width: 35, height: 35, borderRadius: 10 }} />
            <Text style={layout.brand}>潮環占い</Text>
          </View>}
        <Text style={[S.kicker, { color: C.aqua }]}>潮の羅針盤</Text>
      </View>
      {storageError && <Text accessibilityRole="alert" style={[S.tiny, layout.error]}>端末の保存領域にアクセスできませんでした。この画面で続けられます。</Text>}
      {ready ? <>
        <ScrollView key={tab} style={[layout.scroll, detail && layout.hidden]} contentContainerStyle={layout.content}
          keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
        {path.map((entry, index) => <ScrollView key={entry.kind + index}
          style={[layout.scroll, index !== path.length - 1 && layout.hidden]} contentContainerStyle={layout.content}
          keyboardShouldPersistTaps="handled">
          {detailBody(entry)}
        </ScrollView>)}
      </> : <View style={[layout.scroll, layout.content]}><Text style={S.body}>海図をひらいています…</Text></View>}
      <View accessibilityRole="tablist" style={layout.nav}>
        {tabs.map(item => {
          const active = tab === item.id;
          return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => go(item.id)}
            style={({ pressed }) => [layout.navItem, active && layout.navActive, pressed && { opacity: 0.65 }]}>
            <Text aria-hidden style={[layout.mark, active && { color: C.gold }]}>{item.mark}</Text>
            <Text style={[layout.navLabel, active && { color: C.gold }]}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const layout = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.base, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: 780, backgroundColor: C.base, alignSelf: 'center' },
  header: { minHeight: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomColor: C.line, borderBottomWidth: StyleSheet.hairlineWidth },
  brand: { color: C.ink, fontSize: 19, fontWeight: '800', letterSpacing: 2 },
  back: { minHeight: 44, justifyContent: 'center', paddingRight: 14 },
  scroll: { flex: 1 },
  hidden: { display: 'none' },
  content: { padding: 16, paddingBottom: 28 },
  nav: { flexDirection: 'row', gap: 3, paddingHorizontal: 9, paddingTop: 6, paddingBottom: 5, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.panel },
  navItem: { flex: 1, minHeight: 51, justifyContent: 'center', alignItems: 'center', borderRadius: 13, gap: 2 },
  navActive: { backgroundColor: C.raised },
  mark: { color: C.aqua, fontSize: 20, lineHeight: 22 },
  navLabel: { color: C.muted, fontWeight: '700', fontSize: 11, lineHeight: 16 },
  error: { backgroundColor: '#4b2c29', padding: 8, color: C.error },
});
