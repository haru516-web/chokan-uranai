// UI の背景画像を、CSS の変数に渡す。CSS の中に url() を直接書くと、Expo の仕組みでは画像が配信されないので、他の画像と同じ方法（require）で受け取る。
// 差し替えるときは、assets/ui/ の同じファイル名の画像を置き換える。
// 新しい画像を足すときは、src/artFiles.ts の uiFiles に require を足す（画像が無いのに足すと、アプリが起動しなくなる）。
import { uiFiles } from './artFiles';

/** [ファイル名（拡張子なし）, CSS の変数, 目印の class（無ければ、常に有効）] */
const slots: [file: string, variable: string, flag?: string][] = [
  // 形ごとに画像を使い分けるもの（形は src/cardGlow.ts が測って、data-shape に入れる）
  ['card', '--ui-card-bg', 'has-card'], ['card-wide', '--ui-card-wide-bg'], ['card-tall', '--ui-card-tall-bg'],
  ['button-gold', '--ui-button-bg'], ['button-gold-short', '--ui-button-short-bg'],
  ['button-quiet', '--ui-quiet-bg'], ['button-quiet-short', '--ui-quiet-short-bg'],
  ['field', '--ui-field-bg', 'has-field'], ['field-short', '--ui-field-short-bg'],
  // 1種類だけのもの
  ['frame-poster', '--ui-poster-frame', 'has-poster'], ['frame-medal', '--ui-medal', 'has-medal'], ['cell-day', '--ui-cell', 'has-cell'], ['cell-day-selected', '--ui-cell-selected'], ['label-pill', '--ui-label', 'has-label'],
  ['panel-inset', '--ui-inset-bg', 'has-inset'], ['panel-inset-wide', '--ui-inset-wide-bg'], ['panel-inset-tall', '--ui-inset-tall-bg'],
  ['tabbar', '--ui-tabbar-bg'], ['tab-active', '--ui-tab-active-bg', 'has-tab-active'],
  ['header', '--ui-header-bg', 'has-header'], ['button-help', '--ui-help-bg', 'has-help'], ['button-round', '--ui-round-bg', 'has-round'],
  ['card-door', '--ui-door-bg', 'has-door'], ['card-question', '--ui-question-bg', 'has-question'],
  ['chip-active', '--ui-chip-active-bg', 'has-chip-active'], ['badge', '--ui-badge-bg', 'has-badge'], ['icon-frame', '--ui-icon-frame-bg', 'has-icon-frame'],
];

export function applyUiAssets() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [file, variable, flag] of slots) {
    const uri = uiFiles[`../assets/ui/${file}.webp`];
    if (!uri) continue;
    root.style.setProperty(variable, `url("${uri}")`);
    if (flag) root.classList.add(flag);
  }
}
