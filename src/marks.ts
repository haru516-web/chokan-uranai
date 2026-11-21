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
