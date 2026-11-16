// 用語ポップ。本文中の用語（点線の下線）をタップすると、下からカードがせり上がって説明する。
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { aliases, glossary, type Term } from './terms';

export type SheetRow = { mark: string; label: string; text: string; color?: string };
export type Sheet = Term & { rows?: SheetRow[]; color?: string };

// 一度でも開いた用語は見た目を弱め、初回ヒントも消す（端末内に保存）。
const READ_KEY = 'chokan.gloss.read';
const readSet = (() => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')); } catch { return new Set<string>(); }
})();
const listeners = new Set<() => void>();
function markRead(id: string) {
  if (readSet.has(id)) return;
  readSet.add(id);
  try { localStorage.setItem(READ_KEY, JSON.stringify([...readSet])); } catch { /* 保存できなくても動く */ }
  listeners.forEach(fn => fn());
}
function useReadVersion() {
  const [, bump] = useState(0);
  useEffect(() => { const fn = () => bump(n => n + 1); listeners.add(fn); return () => { listeners.delete(fn); }; }, []);
}

const Ctx = createContext<(sheet: Sheet | string) => void>(() => {});
/** 用語ID（glossary のキー）か、その場で組み立てた内容を渡すとポップが開く。 */
export const useGloss = () => useContext(Ctx);

export function GlossProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [closing, setClosing] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const open = useCallback((next: Sheet | string) => {
    const value = typeof next === 'string' ? glossary[next] : next;
    if (typeof next === 'string' && value) markRead(next);
    if (value) { setClosing(false); setSheet(value); }
  }, []);
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setSheet(null); setClosing(false); }, 220);
  }, []);

  useEffect(() => {
    if (!sheet) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet, close]);

  const color = sheet?.color ?? '#eacc8c';
  return <Ctx.Provider value={open}>
    {children}
    {sheet && createPortal(<div className="gloss-layer" data-closing={closing} style={{ '--gloss': color } as React.CSSProperties}>
      <button type="button" className="gloss-scrim" aria-label="説明を閉じる" onClick={close} />
      <div className="gloss-sheet" role="dialog" aria-modal="true" aria-label={sheet.title + 'の説明'}>
        <span className="gloss-grip" aria-hidden="true" />
        <div className="gloss-head">
          <span className="gloss-mark" aria-hidden="true"><span className="gloss-ring" /><b>{sheet.mark}</b></span>
          <div>
            <p className="gloss-kicker">{sheet.kicker}</p>
            <h2 className="gloss-title">{sheet.title}</h2>
          </div>
        </div>
        <p className="gloss-body">{sheet.body}</p>
        {sheet.rows && <ul className="gloss-rows">
          {sheet.rows.map((row, index) => <li key={row.label} style={{ animationDelay: 120 + index * 90 + 'ms', '--row': row.color ?? color } as React.CSSProperties}>
            <span className="gloss-row-mark">{row.mark}</span>
            <span><b>{row.label}</b>{row.text}</span>
          </li>)}
        </ul>}
        {sheet.more && <p className="gloss-more">{sheet.more}</p>}
        <button ref={closeButton} type="button" className="gloss-close" onClick={close}>とじる</button>
      </div>
    </div>, document.body)}
  </Ctx.Provider>;
}

const words = Object.keys(aliases).sort((a, b) => b.length - a.length);
const pattern = new RegExp('(' + words.join('|') + ')', 'g');
const termStyle = {
  textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: '#eacc8c', cursor: 'help',
  color: '#f3d9a0', backgroundColor: 'rgba(234, 204, 140, .14)', borderRadius: 5, paddingHorizontal: 2,
} as unknown as TextStyle;
const readStyle = { color: 'inherit', backgroundColor: 'transparent' } as unknown as TextStyle;
const infoStyle = { fontSize: 11, color: '#eacc8c', fontWeight: '800' } as unknown as TextStyle;

/** 解説つきの言葉の印（ⓘ）。既読なら出さない。 */
function Info({ read }: { read: boolean }) {
  return read ? null : <Text accessible={false} style={infoStyle}>ⓘ</Text>;
}

/** 「金色の言葉をタップで解説」の一行ヒント。一度でも解説を開いたら出なくなる。 */
export function GlossHint() {
  useReadVersion();
  if (readSet.size > 0) return null;
  return <Text style={{ fontSize: 12, color: '#eacc8c' }}>ⓘ 金色の言葉をタップすると、やさしい解説が出ます</Text>;
}

/** 文章の中の用語を、タップで説明が出るリンクにする（同じ用語は最初の1回だけ）。 */
export function Gloss({ children, style, skip }: { children: string; style?: StyleProp<TextStyle>; skip?: string[] }) {
  const open = useGloss();
  useReadVersion();
  const parts = useMemo(() => {
    const seen = new Set<string>(skip);
    return children.split(pattern).map(part => {
      const id = aliases[part];
      if (!id || seen.has(id)) return { text: part };
      seen.add(id);
      return { text: part, id };
    });
  }, [children, skip]);
  return <Text style={style}>
    {parts.map((part, index) => part.id
      ? <Text key={index} accessibilityRole="button" accessibilityLabel={part.text + 'の説明を開く'} onPress={() => open(part.id!)} style={[termStyle, readSet.has(part.id) && readStyle]}>{part.text}<Info read={readSet.has(part.id)} /></Text>
      : part.text)}
  </Text>;
}

/** 用語ひとつを、タップできる言葉として置く。 */
export function TermText({ id, children, style }: { id: string; children?: string; style?: StyleProp<TextStyle> }) {
  const open = useGloss();
  useReadVersion();
  return <Text accessibilityRole="button" accessibilityLabel={(children ?? id) + 'の説明を開く'} onPress={() => open(id)} style={[style, termStyle, readSet.has(id) && readStyle]}>{children ?? id}<Info read={readSet.has(id)} /></Text>;
}
