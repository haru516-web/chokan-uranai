import { artFiles, deityFiles } from './artFiles';

function find(files: Record<string, string>, name: string) {
  const entry = Object.entries(files).find(([path]) => path.endsWith('/' + name));
  if (!entry) throw new Error('Missing web asset: ' + name);
  return entry[1];
}

/** あれば使う画像（Codex に依頼中の追加アート）。無いあいだは undefined で、画面は絵文字や図形で代用する。 */
const optional = (name: string, prefix = false) => Object.entries(artFiles).find(([path]) => {
  const file = path.slice(path.lastIndexOf('/') + 1);
  return prefix ? file.startsWith(name) && file.endsWith('.webp') : file === name;
})?.[1];
export const tierArt = Array.from({ length: 5 }, (_, i) => optional('tier-0' + (i + 1) + '.webp'));
export const ritualBg = optional('ritual-bg.webp');
export const iconArt = {
  compass: optional('icon-compass.webp'), question: optional('icon-question.webp'), book: optional('icon-book.webp'),
  work: optional('icon-work.webp'), love: optional('icon-love.webp'), money: optional('icon-money.webp'), health: optional('icon-health.webp'),
};
/** タロットのカード絵。番号（0〜21）で探す。Codex の作業中でまだ無い札は undefined。 */
export const tarotArt = (no: number) => optional(`tarot-${String(no).padStart(2, '0')}-`, true);
/** タロットの裏面（Codex に依頼中）。無いあいだは undefined で、画面は図形で代用する。 */
export const tarotBack = optional('tarot-back.webp');

/** 季節の神様の単体イラスト（透過）。番号は GodAnimation と同じ（0 冬 / 1 春 / 2 夏 / 3 秋 / 4 潮祖）。 */
export const godArt = ['winter', 'spring', 'summer', 'autumn', 'origin'].map(name => find(artFiles, 'god-' + name + '.webp'));

export const harbor = find(artFiles, 'harbor.webp');
export const seal = find(artFiles, 'app-icon.png');
export const godSheets = ['winter', 'spring', 'summer', 'autumn', 'origin'].map(name => find(deityFiles, 'sheet-' + name + '.webp'));
// 図鑑の住人は、神様の幼い姿（assets/art/resident-01〜16.webp、透過）。
export const residentArt = Array.from({ length: 16 }, (_, i) => find(artFiles, 'resident-' + String(i + 1).padStart(2, '0') + '.webp'));
// 海流は新しい12の順（子〜亥）。絵を作り直し中のあいだは、近い生き物の既存の絵を仮に使う（珊瑚→亀、牡蠣→烏賊）。
// 新しい絵は current2-01〜12.webp、海況は stage2-01〜24.webp として置くと、自動で差し替わる。
const currentFallback = [3, 8, 10, 0, 4, 7, 2, 1, 9, 6, 5, 11];
export const currents = Array.from({ length: 12 }, (_, i) =>
  optional('current2-' + String(i + 1).padStart(2, '0') + '.webp') ?? find(artFiles, 'current-' + String(currentFallback[i] + 1).padStart(2, '0') + '.webp'));
export const stages = Array.from({ length: 24 }, (_, i) =>
  optional('stage2-' + String(i + 1).padStart(2, '0') + '.webp') ?? find(artFiles, 'stage-' + String(Math.floor(i / 2) + 1).padStart(2, '0') + '.webp'));
export const scenes = Array.from({ length: 8 }, (_, i) => find(artFiles, 'scene-' + String(i + 1).padStart(2, '0') + '.webp'));
