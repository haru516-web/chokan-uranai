// 文章の中で色を付ける言葉（例：「恋愛・対人」を分野の色にする）。ひと言の画面表示・打ち出し・共有画像で同じ決め方を使う。
export type Mark = { text: string; color: string };
export type Run = { text: string; color?: string };

/** 文字ごとの色（印の言葉が出てくる所すべて）。 */
function colorsOf(text: string, marks: Mark[]) {
  const colors: (string | undefined)[] = new Array(text.length).fill(undefined);
  for (const mark of marks) {
    if (!mark.text) continue;
    for (let from = text.indexOf(mark.text); from >= 0; from = text.indexOf(mark.text, from + mark.text.length)) {
      for (let k = from; k < from + mark.text.length; k++) colors[k] = mark.color;
    }
  }
  return colors;
}

/** text[from, to) を、同じ色が続く塊に分ける。 */
export function colorRuns(text: string, marks: Mark[] | undefined, from = 0, to = text.length): Run[] {
  if (!marks?.length) return from < to ? [{ text: text.slice(from, to) }] : [];
  const colors = colorsOf(text, marks);
  const runs: Run[] = [];
  for (let k = from; k < to; k++) {
    const last = runs[runs.length - 1];
    if (last && last.color === colors[k]) last.text += text[k];
    else runs.push({ text: text[k], color: colors[k] });
  }
  return runs;
}

/** タイプ説明の文章から、色を付ける言葉を自動で選ぶ。書き出し＝水色、「　」の中＝金色、「一方で」「でも」以降の弱点＝珊瑚色。 */
export function typeTextMarks(text: string): Mark[] {
  const marks: Mark[] = [];
  const lead = text.match(/^[^、。]+/)?.[0];
  if (lead) marks.push({ text: lead, color: '#9fd3ff' });
  for (const quoted of text.matchAll(/「[^」]+」/g)) marks.push({ text: quoted[0], color: '#f5d98a' });
  for (const weak of text.matchAll(/(?:その一方で|一方で|一方|その反面|半面|でも|けれど|しかし)、?([^。]+)/g)) marks.push({ text: weak[1], color: '#ffb59c' });
  return marks;
}
