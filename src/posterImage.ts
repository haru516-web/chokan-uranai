// 占い結果のポスターを、PNG画像として書き出す（画面の枠の中身を canvas に描き直す）。
import { C } from './ui';

export type PosterImage = {
  color: string; level: number; godUrl?: string; dateText: string; personName?: string;
  plate: string; band: string; rank: number; dayWord: string; line: string; action: string;
};

const TIER_NAMES = ['凱風', '順風', '凪', '荒波', '轟沈'];
const TIER_COLORS = ['#efd393', '#b6dfc4', '#c1d2ef', '#ff5a4d', '#e0245e'];
const ROUNDED = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Yu Gothic UI", sans-serif';
const DISPLAY = '"Dela Gothic One", "Zen Maru Gothic", sans-serif';
const W = 390, SCALE = 3, PAD = 22;

function loadImage(url: string) {
  return new Promise<HTMLImageElement | null>(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 幅に収まるよう、文字を折り返す（日本語なので1文字ずつ測る）。 */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let current = '';
  for (const char of text) {
    if (current && ctx.measureText(current + char).width > width) { lines.push(current); current = char; } else current += char;
  }
  if (current) lines.push(current);
  return lines;
}

function draw(canvas: HTMLCanvasElement, data: PosterImage, god: HTMLImageElement | null, height: number) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  ctx.scale(SCALE, SCALE);
  const { color } = data;
  const inner = W - PAD * 2;
  ctx.textBaseline = 'alphabetic';

  // 枠と背景
  roundRect(ctx, 0, 0, W, height, 28);
  ctx.fillStyle = '#141e37';
  ctx.fill();
  ctx.save();
  roundRect(ctx, 0, 0, W, height, 28);
  ctx.clip();
  const sky = ctx.createRadialGradient(W / 2, 110, 10, W / 2, 110, 260);
  sky.addColorStop(0, color + '33');
  sky.addColorStop(1, color + '00');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, height);
  // 下の波
  [[34, .22, 0], [24, .32, 1.7], [14, .5, 3.1]].forEach(([amp, alpha, phase], row) => {
    ctx.beginPath();
    const base = height - 34 + row * 12;
    ctx.moveTo(0, height);
    for (let x = 0; x <= W; x += 6) ctx.lineTo(x, base - Math.sin(x / 52 + phase) * (amp / 3));
    ctx.lineTo(W, height);
    ctx.closePath();
    ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fill();
  });
  ctx.restore();
  roundRect(ctx, 1.5, 1.5, W - 3, height - 3, 27);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  let y = 18 + 18;
  ctx.font = `900 12px ${ROUNDED}`;
  ctx.fillStyle = C.gold;
  ctx.textAlign = 'left';
  ctx.fillText(data.dateText, PAD, y);
  ctx.fillStyle = 'rgba(251,243,224,.7)';
  ctx.textAlign = 'right';
  ctx.fillText('潮環占い', W - PAD, y);
  ctx.textAlign = 'center';
  y += 14;

  if (god) {
    const gw = 84, gh = gw * god.naturalHeight / god.naturalWidth;
    ctx.drawImage(god, (W - gw) / 2, y, gw, gh);
    y += gh + 6;
  }
  if (data.personName) {
    ctx.font = `700 12px ${ROUNDED}`;
    ctx.fillStyle = C.muted;
    ctx.fillText(data.personName + 'さんのタイプ', W / 2, y + 12);
    y += 18;
  }
  ctx.font = `400 58px ${DISPLAY}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(data.plate, W / 2, y + 52);
  y += 70;
  ctx.font = `900 20px ${ROUNDED}`;
  ctx.fillText(data.band, W / 2, y + 16);
  y += 40;

  // 今日の運勢
  ctx.font = `900 14px ${ROUNDED}`;
  const label = data.dayWord + 'の運勢';
  const labelW = ctx.measureText(label).width;
  ctx.fillStyle = color;
  ctx.fillText(label, W / 2, y + 5);
  ctx.globalAlpha = .6;
  ctx.fillRect(PAD, y, (inner - labelW) / 2 - 10, 2);
  ctx.fillRect(W - PAD - (inner - labelW) / 2 + 10, y, (inner - labelW) / 2 - 10, 2);
  ctx.globalAlpha = 1;
  y += 22;

  // 順位
  ctx.font = `800 18px ${ROUNDED}`;
  const tail = ' 位 / 160';
  const tailW = ctx.measureText(tail).width;
  ctx.font = `800 44px ${ROUNDED}`;
  const numW = ctx.measureText(String(data.rank)).width;
  const startX = (W - numW - tailW) / 2;
  ctx.textAlign = 'left';
  ctx.shadowColor = color + 'aa';
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(String(data.rank), startX, y + 40);
  ctx.shadowBlur = 0;
  ctx.font = `800 18px ${ROUNDED}`;
  ctx.fillStyle = C.muted;
  ctx.fillText(tail, startX + numW, y + 40);
  y += 62;

  // 5段階
  const weights = TIER_NAMES.map((_, i) => i === data.level ? 2.4 : 1);
  const gap = 5, total = weights.reduce((a, b) => a + b, 0), unit = (inner - gap * 4) / total;
  let x = PAD;
  ctx.textAlign = 'center';
  TIER_NAMES.forEach((name, i) => {
    const w = weights[i] * unit, active = i === data.level;
    ctx.font = active ? `400 32px ${DISPLAY}` : `800 12px ${ROUNDED}`;
    ctx.fillStyle = active ? TIER_COLORS[i] : '#6c7896';
    ctx.fillText(name, x + w / 2, y + (active ? 30 : 14));
    ctx.globalAlpha = active ? 1 : .3;
    ctx.fillStyle = TIER_COLORS[i];
    roundRect(ctx, x, y + (active ? 42 : 24), w, active ? 12 : 7, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    x += w + gap;
  });
  y += 76;

  // ひとこと
  ctx.font = `700 20px ${ROUNDED}`;
  ctx.fillStyle = C.ink;
  wrap(ctx, data.line, inner).forEach(text => { ctx.fillText(text, W / 2, y + 22); y += 31; });
  y += 12;

  // 今日の一手
  ctx.font = `800 19px ${ROUNDED}`;
  const actionLines = wrap(ctx, data.action, inner - 28);
  const boxH = 14 + 16 + 8 + actionLines.length * 28 + 10;
  roundRect(ctx, PAD, y, inner, boxH, 16);
  ctx.fillStyle = 'rgba(15,24,48,.72)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = C.line;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = `900 12px ${ROUNDED}`;
  ctx.fillStyle = C.gold;
  ctx.fillText(data.dayWord + 'の一手', PAD + 14, y + 26);
  ctx.font = `800 19px ${ROUNDED}`;
  ctx.fillStyle = C.ink;
  actionLines.forEach((text, i) => ctx.fillText(text, PAD + 14, y + 54 + i * 28));
  return y + boxH;
}

/** 結果ポスターを PNG の Blob にする。保存は、画面に出したプレビューのボタンから（ブラウザに止められないように）。 */
export async function makePosterImage(data: PosterImage): Promise<Blob> {
  // フォントの読み込みが遅くても、3秒で待つのをやめる。
  await Promise.race([
    Promise.all([`900 20px ${ROUNDED}`, `400 58px ${DISPLAY}`, `800 18px ${ROUNDED}`].map(font => document.fonts.load(font, data.plate + data.band + '位凱風順風凪荒波轟沈'))),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);
  const god = data.godUrl ? await loadImage(data.godUrl) : null;
  // 高さは、いちど描いて測ってから決める。
  const probe = document.createElement('canvas');
  const bottom = draw(probe, data, god, 1400);
  const canvas = document.createElement('canvas');
  draw(canvas, data, god, Math.ceil(bottom + 56));
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Empty image');
  return blob;
}
