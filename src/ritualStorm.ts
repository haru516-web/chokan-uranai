// 鑑定の儀式の描画。嵐の海の上で、四重の光の輪が外から内へ満ちていく。
// 輪が一つ閉じるたびに稲妻が落ち、最後に嵐が割れて凪になる。DOM は触らず、canvas だけを描く。

export type Rgb = [number, number, number];
export type Bolt = { paths: number[][]; born: number; life: number; width: number };
type Spark = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; color: Rgb; drag: number };
type Shock = { r: number; born: number; life: number; grow: number; color: Rgb };
type Mote = { a: number; r: number; size: number; gold: boolean; px: number; py: number };

export type StormOptions = {
  tint: Rgb;
  calm: boolean;                       // 動きを減らす設定。嵐は描くが、画面の揺れを止め、稲妻の照り返しを弱める。
  onLayout: (cx: number, cy: number, r: number) => void;
  onStep: (done: number) => void;      // 閉じた輪の数（0〜4）
  onPercent: (value: number) => void;
  onFinale: () => void;                // 嵐が割れる瞬間
  onEnd: () => void;
};

export const RING_COUNT = 4;
const FILL = 1.7;                      // 輪一つが満ちる秒数
const LOAD = FILL * RING_COUNT;
const BURST = 0.5;                     // 最後の輪が閉じてから、嵐が割れるまで
const FINALE = 1.9;

export const GOLD: Rgb = [234, 204, 140];
export const PALE: Rgb = [251, 243, 224];
export const SKY: Rgb = [168, 196, 240];
export const BOLT: Rgb = [176, 200, 255];
const GLYPHS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const TAU = Math.PI * 2;

export const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));
export const ease = (x: number) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const smooth = (x: number) => x * x * (3 - 2 * x);
export const rgba = (c: Rgb, alpha: number) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(alpha).toFixed(3)})`;
export const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map(Math.round) as Rgb;
export const rand = (low: number, high: number) => low + Math.random() * (high - low);

export function hexToRgb(hex: string): Rgb {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return [142, 203, 255];
  const value = parseInt(match[1], 16);
  return [value >> 16, (value >> 8) & 255, value & 255];
}

// 折れ線を中点でずらして稲妻の形にする。
function jag(x0: number, y0: number, x1: number, y1: number, rough: number, depth: number) {
  let points = [[x0, y0], [x1, y1]];
  let offset = Math.hypot(x1 - x0, y1 - y0) * rough;
  for (let level = 0; level < depth; level++) {
    const next = [points[0]];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], length = Math.hypot(nx, ny) || 1;
      const shift = (Math.random() - .5) * offset;
      next.push([(a[0] + b[0]) / 2 + nx / length * shift, (a[1] + b[1]) / 2 + ny / length * shift], b);
    }
    points = next;
    offset *= .56;
  }
  return points;
}

export function makeBolt(x0: number, y0: number, x1: number, y1: number, now: number, width: number, branches: number): Bolt {
  const main = jag(x0, y0, x1, y1, .26, 6);
  const paths = [main.flat()];
  const total = Math.hypot(x1 - x0, y1 - y0), heading = Math.atan2(y1 - y0, x1 - x0);
  for (let i = 0; i < branches; i++) {
    const from = main[Math.floor(rand(.15, .7) * main.length)];
    const angle = heading + (Math.random() < .5 ? -1 : 1) * rand(.35, .95), length = total * rand(.16, .38);
    paths.push(jag(from[0], from[1], from[0] + Math.cos(angle) * length, from[1] + Math.sin(angle) * length, .3, 4).flat());
  }
  return { paths, born: now, life: rand(.42, .6), width };
}

export function startStorm(canvas: HTMLCanvasElement, options: StormOptions) {
  const context = canvas.getContext('2d');
  if (!context) { options.onEnd(); return () => {}; }
  const g: CanvasRenderingContext2D = context;
  const { tint, calm } = options;
  const ringColors: Rgb[] = [tint, GOLD, SKY, PALE];
  const dashes = [[2, 7], [26, 9], [1, 5], [12, 6]];
  let w = 0, h = 0, cx = 0, cy = 0, R = 0, dpr = 1;

  const layout = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    cx = w / 2; cy = h * .36; R = Math.min(w * .335, h * .205, 190);
    options.onLayout(cx, cy, R);
  };
  layout();
  window.addEventListener('resize', layout);

  const rain = Array.from({ length: 120 }, () => ({ x: Math.random() * 1.4, y: Math.random(), l: rand(.012, .03), v: rand(.9, 1.6) }));
  const stars = Array.from({ length: 46 }, (_, i) => ({ x: (i * 37 + 11) % 100 / 100, y: (i * 53 + 7) % 62 / 100, s: .6 + (i % 4) * .35, p: i * 1.7 }));
  const clouds = Array.from({ length: 8 }, (_, i) => ({ x: i / 7 + rand(-.06, .06), y: rand(-.02, .2), r: rand(.28, .5), v: rand(.008, .022) * (i % 2 ? 1 : -1) }));
  const motes: Mote[] = Array.from({ length: 84 }, () => ({ a: Math.random() * TAU, r: rand(.6, 2.6), size: rand(.8, 2.2), gold: Math.random() < .5, px: NaN, py: NaN }));
  const bolts: Bolt[] = [];
  const sparks: Spark[] = [];
  const shocks: Shock[] = [];
  const ringFlash = [0, 0, 0, 0];
  const glyphLit = GLYPHS.map(() => -1);

  let t = 0, last = 0, frame = 0, ended = false;
  let done = 0, percent = -1, flash = 0, warm = 0, shake = 0, nextSkyBolt = .8, converged = false, burst = false;

  const strike = (bolt: Bolt, power: number) => {
    bolts.push(bolt);
    flash = Math.max(flash, power);
    if (!calm) shake = Math.max(shake, power);
  };
  const scatter = (x: number, y: number, count: number, speed: number, color: Rgb, spread = TAU, heading = 0) => {
    for (let i = 0; i < count; i++) {
      const angle = heading + (Math.random() - .5) * spread, v = speed * rand(.25, 1);
      sparks.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, born: t, life: rand(.5, 1.25), size: rand(.8, 2.4), color: Math.random() < .35 ? PALE : color, drag: rand(1.2, 2.6) });
    }
  };

  function tick(now: number) {
    if (ended) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - (last || now)) / 1000, .05);
    last = now;
    t += dt;

    const tf = t - LOAD;                                      // 最後の輪が閉じてからの秒数
    const dawn = tf > BURST ? smooth(clamp((tf - BURST) / 1.1)) : 0;
    const progress = clamp(t / LOAD);
    const storm = (.3 + .7 * smooth(progress)) * (1 - dawn);
    const scale = h / 850;

    /* ---- 進み具合の通知 ---- */
    const filled = Math.min(RING_COUNT, Math.floor(t / FILL));
    while (done < filled) {
      const index = done++;
      const radius = R * (1 - index * .14);
      ringFlash[index] = 1;
      shocks.push({ r: radius, born: t, life: .9, grow: R * .75, color: ringColors[index] });
      scatter(cx, cy - radius, 30, 330 * scale, ringColors[index], Math.PI * 1.1, -Math.PI / 2);
      strike(makeBolt(cx + rand(-.32, .32) * w, -20, cx, cy - radius, t, 2.4, 3), .85);
      options.onStep(done);
    }
    const value = Math.round(progress * 100);
    if (value !== percent) options.onPercent(percent = value);

    if (tf > .22 && !converged) {                              // 稲妻が四方から輪へ集まる
      converged = true;
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i - 2) * .62, far = Math.max(w, h) * .75;
        strike(makeBolt(cx + Math.cos(angle) * far, cy + Math.sin(angle) * far, cx + Math.cos(angle) * R, cy + Math.sin(angle) * R, t, 2.2, 2), 1);
      }
    }
    if (tf > BURST && !burst) {                                // 嵐が割れる
      burst = true;
      warm = 1;
      for (let i = 0; i < 3; i++) shocks.push({ r: R * .5, born: t + i * .13, life: 1.25, grow: Math.max(w, h) * .8, color: i === 1 ? tint : GOLD });
      scatter(cx, cy, 170, 760 * scale, GOLD);
      options.onFinale();
    }
    if (storm > .38 && tf < 0 && t > nextSkyBolt) {     // 遠くの空の稲妻
      nextSkyBolt = t + rand(1.1, 2.3);
      const x = Math.random() < .5 ? rand(.04, .3) * w : rand(.7, .96) * w;
      strike(makeBolt(x + rand(-60, 60), -20, x, h * rand(.6, .74), t, 1.5, 2), .45);
    }
    if (tf > FINALE) { ended = true; cancelAnimationFrame(frame); options.onEnd(); return; }

    flash *= Math.exp(-dt * 7); warm *= Math.exp(-dt * 1.7); shake *= Math.exp(-dt * 9);
    for (let i = 0; i < RING_COUNT; i++) ringFlash[i] *= Math.exp(-dt * 2.6);

    /* ---- 描画 ---- */
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    if (shake > .02) g.translate(rand(-1, 1) * shake * 5, rand(-1, 1) * shake * 4);

    // 空
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgba(mix([4, 6, 16], tint, dawn * .12), .8));
    sky.addColorStop(.6, rgba(mix([9, 15, 34], tint, dawn * .3), .72));
    sky.addColorStop(1, rgba([7, 11, 24], .86));
    g.fillStyle = sky;
    g.fillRect(-10, -10, w + 20, h + 20);

    for (const star of stars) {
      const alpha = (.25 + .35 * Math.sin(t * 1.6 + star.p)) * (1 - storm * .85) + dawn * .3;
      if (alpha <= .02) continue;
      g.fillStyle = rgba(PALE, alpha);
      g.fillRect(star.x * w, star.y * h, star.s, star.s);
    }

    // 雲。稲妻の瞬間だけ内側から明るくなる。
    for (const cloud of clouds) {
      cloud.x += cloud.v * dt * (.5 + storm);
      if (cloud.x > 1.3) cloud.x = -.3; else if (cloud.x < -.3) cloud.x = 1.3;
      const x = cloud.x * w, y = cloud.y * h, radius = cloud.r * Math.max(w, h * .6);
      const body = g.createRadialGradient(x, y, 0, x, y, radius);
      body.addColorStop(0, rgba(mix([34, 44, 74], BOLT, flash * .55), .62 * storm + flash * .16));
      body.addColorStop(1, rgba([20, 28, 50], 0));
      g.fillStyle = body;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    g.globalCompositeOperation = 'lighter';

    // 夜明けの光の柱
    if (dawn > 0) {
      const beam = g.createLinearGradient(cx - R * 1.5, 0, cx + R * 1.5, 0);
      beam.addColorStop(0, rgba(GOLD, 0)); beam.addColorStop(.5, rgba(mix(GOLD, PALE, .5), dawn * .3 * (1 - clamp((tf - 1.3) / .6) * .5))); beam.addColorStop(1, rgba(GOLD, 0));
      g.fillStyle = beam;
      g.fillRect(cx - R * 1.5, 0, R * 3, h);
    }

    // 稲妻
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = bolts.length - 1; i >= 0; i--) {
      const bolt = bolts[i], age = (t - bolt.born) / bolt.life;
      if (age >= 1) { bolts.splice(i, 1); continue; }
      const alpha = age < .1 ? 1 : age < .2 ? .3 : age < .32 ? .9 : (1 - age) / .68 * .75;
      bolt.paths.forEach((path, index) => {
        const width = bolt.width * (index ? .5 : 1);
        g.beginPath();
        g.moveTo(path[0], path[1]);
        for (let k = 2; k < path.length; k += 2) g.lineTo(path[k], path[k + 1]);
        g.strokeStyle = rgba(BOLT, alpha * .28); g.lineWidth = width * 5; g.stroke();
        g.strokeStyle = rgba([240, 246, 255], alpha); g.lineWidth = width; g.stroke();
      });
    }

    // 雨
    if (storm > .08) {
      g.strokeStyle = rgba(SKY, .3 * storm + flash * .15);
      g.lineWidth = 1;
      g.beginPath();
      const slant = .22 + storm * .25;
      for (const drop of rain) {
        drop.y += drop.v * dt * (.8 + storm);
        drop.x -= drop.v * dt * slant;
        if (drop.y > 1) { drop.y -= 1.05; drop.x = Math.random() * 1.4; }
        const x = drop.x * w, y = drop.y * h, length = drop.l * h * (.6 + storm);
        g.moveTo(x, y);
        g.lineTo(x - length * slant, y + length);
      }
      g.stroke();
    }

    // 輪の奥の光
    const pulse = Math.max(...ringFlash);
    const aura = g.createRadialGradient(cx, cy, R * .2, cx, cy, R * 1.9);
    aura.addColorStop(0, rgba(mix(tint, GOLD, progress * .5), .16 + progress * .2 + pulse * .16 + warm * .3));
    aura.addColorStop(1, rgba(tint, 0));
    g.fillStyle = aura;
    g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);

    // 中心へ渦を巻いて集まる光の粒
    const gather = 1 - dawn;
    for (const mote of motes) {
      mote.r -= dt * (.2 + (2.7 - mote.r) * .34) * (.6 + progress) * (burst ? -2.4 : 1);
      mote.a += dt * (.5 + 1.5 / (mote.r * mote.r));
      if (mote.r < .52 || mote.r > 3.2) { if (burst) continue; mote.r = rand(1.7, 2.7); mote.a = Math.random() * TAU; mote.px = NaN; }
      const x = cx + Math.cos(mote.a) * mote.r * R, y = cy + Math.sin(mote.a) * mote.r * R;
      const alpha = clamp((2.7 - mote.r) / .7) * clamp((mote.r - .52) / .22) * (.35 + progress * .5) * (burst ? gather : 1);
      if (alpha > .02 && !Number.isNaN(mote.px)) {
        g.strokeStyle = rgba(mote.gold ? GOLD : tint, alpha);
        g.lineWidth = mote.size;
        g.beginPath(); g.moveTo(mote.px, mote.py); g.lineTo(x, y); g.stroke();
      }
      mote.px = x; mote.py = y;
    }

    // 四重の輪
    const squeeze = tf > 0 ? 1 - .07 * ease(clamp(tf / BURST)) + .1 * dawn : 1;
    const breathe = 1 + Math.sin(t * 2.1) * .006;
    g.save();
    g.translate(cx, cy);
    g.scale(squeeze * breathe, squeeze * breathe);

    // 目盛り（全体の進み）
    for (let i = 0; i < 60; i++) {
      const lit = i / 60 < progress, major = i % 5 === 0;
      const angle = -Math.PI / 2 + i / 60 * TAU, inner = R * 1.07, outer = R * (major ? 1.125 : 1.1);
      g.strokeStyle = rgba(lit ? GOLD : SKY, lit ? (major ? .95 : .6) : .14);
      g.lineWidth = major ? 1.8 : 1;
      g.beginPath();
      g.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      g.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      g.stroke();
    }

    // 十二支の輪
    g.font = `600 ${Math.round(R * .088)}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    GLYPHS.forEach((glyph, index) => {
      const lit = (index + .5) / 12 < progress;
      if (lit && glyphLit[index] < 0) glyphLit[index] = t;
      const fresh = lit ? Math.exp(-(t - glyphLit[index]) * 3) : 0;
      const angle = -Math.PI / 2 + index / 12 * TAU + t * .035;
      g.save();
      g.rotate(angle + Math.PI / 2);
      g.translate(0, -R * 1.235);
      g.scale(1 + fresh * .5, 1 + fresh * .5);
      g.fillStyle = rgba(lit ? mix(GOLD, PALE, fresh) : SKY, lit ? .75 + fresh * .25 : .16);
      g.fillText(glyph, 0, 0);
      g.restore();
    });

    for (let i = 0; i < RING_COUNT; i++) {
      const radius = R * (1 - i * .14), color = ringColors[i], direction = i % 2 ? -1 : 1;
      const fill = ease(clamp((t - i * FILL) / FILL)), complete = fill >= 1, glow = ringFlash[i];

      // 回る飾りの軌道
      g.save();
      g.rotate(t * (.1 + i * .05) * -direction);
      g.setLineDash(dashes[i]);
      g.strokeStyle = rgba(color, complete ? .5 : .2);
      g.lineWidth = 1;
      g.beginPath(); g.arc(0, 0, radius + 5, 0, TAU); g.stroke();
      g.restore();
      g.setLineDash([]);
      g.strokeStyle = rgba(color, .1);
      g.beginPath(); g.arc(0, 0, radius, 0, TAU); g.stroke();
      if (fill <= 0) continue;

      // 満ちていく弧
      const start = -Math.PI / 2, head = start + direction * fill * TAU;
      g.beginPath(); g.arc(0, 0, radius, start, head, direction < 0);
      g.strokeStyle = rgba(color, .2 + glow * .3 + dawn * .2); g.lineWidth = 11 + glow * 12; g.stroke();
      g.strokeStyle = rgba(mix(color, PALE, .35 + glow * .5), .95); g.lineWidth = 2.6; g.stroke();

      if (complete) {
        // 閉じた輪の上を、光が巡りつづける
        const lap = start + direction * ((t * .55 + i * .23) % 1) * TAU;
        g.beginPath(); g.arc(0, 0, radius, lap - direction * .5, lap, direction < 0);
        g.strokeStyle = rgba(PALE, .55); g.lineWidth = 3.4; g.stroke();
      } else {
        // 光の尾と先端
        for (let k = 0; k < 7; k++) {
          const from = head - direction * (k + 1) * .07 * Math.min(1, fill * 6), to = head - direction * k * .07 * Math.min(1, fill * 6);
          g.beginPath(); g.arc(0, 0, radius, from, to, direction < 0);
          g.strokeStyle = rgba(PALE, .5 * (1 - k / 7)); g.lineWidth = 7 - k * .7; g.stroke();
        }
        const hx = Math.cos(head) * radius, hy = Math.sin(head) * radius;
        const bead = g.createRadialGradient(hx, hy, 0, hx, hy, 17);
        bead.addColorStop(0, rgba(PALE, 1)); bead.addColorStop(.25, rgba(color, .75)); bead.addColorStop(1, rgba(color, 0));
        g.fillStyle = bead;
        g.fillRect(hx - 17, hy - 17, 34, 34);
        if (Math.random() < .55) {
          const speed = 60 * scale, tangent = head + direction * Math.PI / 2 + Math.PI;
          sparks.push({ x: cx + hx * squeeze, y: cy + hy * squeeze, vx: Math.cos(tangent) * speed + rand(-30, 30), vy: Math.sin(tangent) * speed + rand(-30, 30), born: t, life: rand(.35, .8), size: rand(.7, 1.7), color, drag: 2.4 });
        }
      }
    }
    g.restore();

    // 輪が閉じた瞬間の波紋
    for (let i = shocks.length - 1; i >= 0; i--) {
      const shock = shocks[i], age = (t - shock.born) / shock.life;
      if (age < 0) continue;
      if (age >= 1) { shocks.splice(i, 1); continue; }
      const out = 1 - Math.pow(1 - age, 3);
      g.strokeStyle = rgba(shock.color, (1 - age) * .6);
      g.lineWidth = 1 + (1 - age) * 5;
      g.beginPath(); g.arc(cx, cy, shock.r + shock.grow * out, 0, TAU); g.stroke();
    }

    // 波。奥から手前へ五層。嵐が強まるほど高くなり、大波が横切る。
    g.globalCompositeOperation = 'source-over';
    const swellX = ((t * .3) % 1.5 - .25) * w, swell = h * .15 * Math.pow(storm, 1.5);
    for (let layer = 0; layer < 5; layer++) {
      const base = h * (.735 + layer * .058), amplitude = (8 + layer * 7) * (.4 + storm * 1.25) * scale;
      const k = .012 / (1 + layer * .22) * (850 / Math.max(w, 420)) * 1.4, speed = .9 + layer * .32;
      const lift = layer < 3 ? swell * (1 - layer * .26) : 0, spread = Math.max(w, 520) * (.3 + layer * .04);
      g.beginPath();
      g.moveTo(-10, h + 10);
      let crestX = 0, crestY = h;
      for (let x = -10; x <= w + 10; x += 6) {
        const side = x - (swellX + layer * 46);
        const bump = lift * Math.exp(-Math.pow(side / (side > 0 ? spread * .62 : spread), 2));
        const y = base - bump
          + amplitude * (.58 * Math.sin(x * k + t * speed + layer * 1.3) + .3 * Math.sin(x * k * 2.3 - t * speed * 1.4 + layer * 2.1) + .12 * Math.sin(x * k * 5.1 + t * speed * 2.2));
        if (y < crestY) { crestY = y; crestX = x; }
        g.lineTo(x, y);
      }
      g.lineTo(w + 10, h + 10);
      g.closePath();
      const top = base - amplitude - lift;
      const water = g.createLinearGradient(0, top, 0, base + 90 * scale);
      water.addColorStop(0, rgba(mix(mix([30, 58, 104], [10, 20, 44], layer / 4), tint, .1 + dawn * .25 + flash * .25), .93));
      water.addColorStop(1, rgba(mix([10, 20, 44], [5, 9, 22], layer / 4), .97));
      g.fillStyle = water;
      g.fill();
      g.strokeStyle = rgba(mix(SKY, PALE, flash), .16 + storm * .12 + flash * .5 + dawn * .2);
      g.lineWidth = 1.2;
      g.stroke();
      if (lift > 24 && layer === 1 && Math.random() < .5) scatter(crestX, crestY, 2, 150 * scale, [220, 234, 255], 1.6, -Math.PI / 2 - .5);   // 大波のしぶき
    }

    g.globalCompositeOperation = 'lighter';

    // 水面に映る輪の光
    g.save();
    g.translate(cx, h * .8);
    g.scale(1, .34);
    const glint = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.9);
    glint.addColorStop(0, rgba(mix(tint, GOLD, .5), .1 + progress * .16 + pulse * .2 + warm * .3 + dawn * .2));
    glint.addColorStop(1, rgba(tint, 0));
    g.fillStyle = glint;
    g.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    g.restore();

    // 火花
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i], age = (t - spark.born) / spark.life;
      if (age >= 1) { sparks.splice(i, 1); continue; }
      const slow = Math.exp(-dt * spark.drag);
      spark.vx *= slow; spark.vy = spark.vy * slow + 60 * dt * scale;
      const x = spark.x, y = spark.y;
      spark.x += spark.vx * dt; spark.y += spark.vy * dt;
      g.strokeStyle = rgba(spark.color, (1 - age) * .95);
      g.lineWidth = spark.size;
      g.beginPath(); g.moveTo(x, y); g.lineTo(spark.x, spark.y); g.stroke();
    }

    // 稲妻の照り返しと、嵐が割れるときの金の光
    if (flash > .01) { g.fillStyle = rgba(BOLT, flash * (calm ? .1 : .2)); g.fillRect(-10, -10, w + 20, h + 20); }
    if (warm > .01) {
      const bloom = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .9);
      bloom.addColorStop(0, rgba(mix(GOLD, PALE, .6), warm * .55)); bloom.addColorStop(.45, rgba(GOLD, warm * .2)); bloom.addColorStop(1, rgba(GOLD, 0));
      g.fillStyle = bloom;
      g.fillRect(-10, -10, w + 20, h + 20);
    }
  }
  frame = requestAnimationFrame(tick);

  return () => {
    ended = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', layout);
  };
}
