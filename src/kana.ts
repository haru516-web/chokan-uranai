// 文章を、IME で打って変換するように見せるための読み（文節ごとの [ひらがな, 表示]）。
// 今日のひと言・一手は名札の数値から組み立てる文章になったので、いまは読みを持つ文章はない（該当なしなら通常の打ち込み表示になる）。
export type ImeSegment = [kana: string, text: string];

const lines: ImeSegment[][] = [];
const actions: ImeSegment[][] = [];

/** 文章に対応する読みがあれば返す（文章と完全一致するものだけ）。 */
export function imeSegmentsFor(line: string): ImeSegment[] | null {
  return [...lines, ...actions].find(segments => segments.map(segment => segment[1]).join('') === line) ?? null;
}
