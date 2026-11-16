// サイトに入るときのオープニングの描画。凪いだ夜の海に光のしずくが一滴落ち、そこから三重の輪（潮環）がひらく。
// 鑑定の儀式（ritualStorm）と同じ輪・目盛り・十二支を使い、嵐ではなく静けさで見せる。

import { clamp, ease, GOLD, mix, PALE, rand, rgba, SKY, smooth, TAU, type Rgb } from './ritualStorm';

type Spark = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; color: Rgb };
type Shock = { born: number; life: number; grow: number; color: Rgb };

export type OpeningOptions = {
  onLayout: (cx: number, cy: number, r: number) => void;
  onExit: () => void;   // 輪がひらききって、幕が上がりはじめる瞬間
};

const DROP_AT = .25, HIT = .95, DRAW = 1.05, HOLD = 3.1;
const GLYPHS = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const RINGS: { size: number; color: Rgb; dash: number[] }[] = [
  { size: 1, color: GOLD, dash: [2, 7] },
  { size: .82, color: SKY, dash: [26, 9] },
  { size: .64, color: PALE, dash: [1, 5] },
];

export function startOpening(canvas: HTMLCanvasElement, options: OpeningOptions) {
  const context = canvas.getContext('2d');
  if (!context) { options.onExit(); return () => {}; }
  const g: CanvasRenderingContext2D = context;
  let w = 0, h = 0, cx = 0, cy = 0, R = 0, dpr = 1;
  const layout = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    cx = w / 2; cy = h * .37; R = Math.min(w * .3, h * .185, 170);
    options.onLayout(cx, cy, R);
  };
  layout();
  window.addEventListener('resize', layout);

  const stars = Array.from({ length: 70 }, (_, i) => ({ x: (i * 37 + 11) % 100 / 100, y: (i * 53 + 7) % 66 / 100, s: .6 + (i % 4) * .4, p: i * 1.7, d: (i % 12) * .09 }));
  const motes = Array.from({ length: 46 }, () => ({ a: Math.random() * TAU, r: rand(.7, 2.6), size: rand(.7, 1.8), px: NaN, py: NaN }));
  const sparks: Spark[] = [];
  const shocks: Shock[] = [];
  let t = 0, last = 0, frame = 0, ended = false, hit = false, exited = false, bloom = 0;

  function tick(now: number) {
    if (ended) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - (last || now)) / 1000, .05);
    last = now;
    t += dt;
    const scale = h / 850;
    const open = clamp((t - HIT) / DRAW);                      // 輪がどこまで描かれたか
    const leave = smooth(clamp((t - HOLD) / .8));              // 幕が上がる

    if (t > HIT && !hit) {
      hit = true;
      bloom = 1;
      for (let i = 0; i < 3; i++) shocks.push({ born: t + i * .16, life: 1.5, grow: R * (1.5 + i * .5), color: i === 1 ? SKY : GOLD });
      for (let i = 0; i < 46; i++) {
        const angle = Math.random() * TAU, v = rand(60, 330) * scale;
        sparks.push({ x: cx, y: cy, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, born: t, life: rand(.6, 1.4), size: rand(.8, 2.2), color: Math.random() < .4 ? PALE : GOLD });
      }
    }
    if (t > HOLD && !exited) { exited = true; bloom = Math.max(bloom, .8); options.onExit(); }
    bloom *= Math.exp(-dt * 1.9);

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);

    // 夜空
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgba([4, 6, 16], .82));
    sky.addColorStop(.6, rgba(mix([9, 15, 34], GOLD, open * .07), .7));
    sky.addColorStop(1, rgba([7, 11, 24], .86));
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    for (const star of stars) {
      const alpha = clamp((t - star.d) / .8) * (.4 + .4 * Math.sin(t * 1.5 + star.p));
      if (alpha <= .02) continue;
      g.fillStyle = rgba(PALE, alpha);
      g.fillRect(star.x * w, star.y * h, star.s, star.s);
    }

    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';

    // 落ちてくる光のしずく
    if (t > DROP_AT && t < HIT) {
      const fall = Math.pow((t - DROP_AT) / (HIT - DROP_AT), 2.2), y = -30 + (cy + 30) * fall;
      const tail = g.createLinearGradient(0, y - 150 * scale, 0, y);
      tail.addColorStop(0, rgba(GOLD, 0)); tail.addColorStop(1, rgba(PALE, .85));
      g.strokeStyle = tail; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(cx, y - 150 * scale); g.lineTo(cx, y); g.stroke();
      const bead = g.createRadialGradient(cx, y, 0, cx, y, 20);
      bead.addColorStop(0, rgba(PALE, 1)); bead.addColorStop(.3, rgba(GOLD, .7)); bead.addColorStop(1, rgba(GOLD, 0));
      g.fillStyle = bead;
      g.fillRect(cx - 20, y - 20, 40, 40);
    }

    if (hit) {
      // 輪の奥の光
      const aura = g.createRadialGradient(cx, cy, R * .2, cx, cy, R * 2);
      aura.addColorStop(0, rgba(GOLD, (.12 + open * .16 + bloom * .3) * (1 - leave)));
      aura.addColorStop(1, rgba(GOLD, 0));
      g.fillStyle = aura;
      g.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);

      // ゆっくり中心へ寄ってくる光の粒
      for (const mote of motes) {
        mote.r -= dt * (.1 + (2.7 - mote.r) * .16) * (exited ? -5 : 1);
        mote.a += dt * (.3 + .8 / (mote.r * mote.r));
        if (mote.r < .68 || mote.r > 3.4) { if (exited) continue; mote.r = rand(1.8, 2.7); mote.a = Math.random() * TAU; mote.px = NaN; }
        const x = cx + Math.cos(mote.a) * mote.r * R, y = cy + Math.sin(mote.a) * mote.r * R;
        const alpha = clamp((2.7 - mote.r) / .7) * clamp((mote.r - .68) / .2) * .55 * open * (1 - leave);
        if (alpha > .02 && !Number.isNaN(mote.px)) {
          g.strokeStyle = rgba(GOLD, alpha); g.lineWidth = mote.size;
          g.beginPath(); g.moveTo(mote.px, mote.py); g.lineTo(x, y); g.stroke();
        }
        mote.px = x; mote.py = y;
      }

      // 三重の輪。幕が上がるときは、輪ごと外へひらいていく。
      const grow = 1 + leave * 1.9, fade = 1 - leave;
      g.save();
      g.translate(cx, cy);
      g.scale(grow * (1 + Math.sin(t * 2) * .005), grow * (1 + Math.sin(t * 2) * .005));

      for (let i = 0; i < 60; i++) {
        const lit = i / 60 < open, major = i % 5 === 0, angle = -Math.PI / 2 + i / 60 * TAU;
        g.strokeStyle = rgba(lit ? GOLD : SKY, (lit ? (major ? .95 : .6) : .12) * fade);
        g.lineWidth = major ? 1.8 : 1;
        g.beginPath();
        g.moveTo(Math.cos(angle) * R * 1.07, Math.sin(angle) * R * 1.07);
        g.lineTo(Math.cos(angle) * R * (major ? 1.125 : 1.1), Math.sin(angle) * R * (major ? 1.125 : 1.1));
        g.stroke();
      }
      g.font = `600 ${Math.round(R * .088)}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      GLYPHS.forEach((glyph, index) => {
        const since = (t - HIT) - (index + .5) / 12 * DRAW, lit = since > 0, fresh = lit ? Math.exp(-since * 3) : 0;
        g.save();
        g.rotate(index / 12 * TAU + t * .035);
        g.translate(0, -R * 1.235);
        g.scale(1 + fresh * .5, 1 + fresh * .5);
        g.fillStyle = rgba(lit ? mix(GOLD, PALE, fresh) : SKY, (lit ? .75 + fresh * .25 : .12) * fade);
        g.fillText(glyph, 0, 0);
        g.restore();
      });

      RINGS.forEach((ring, i) => {
        const radius = R * ring.size, direction = i % 2 ? -1 : 1;
        const fill = ease(clamp((t - HIT - i * .14) / (DRAW - .2))), start = -Math.PI / 2, head = start + direction * fill * TAU;
        g.save();
        g.rotate(t * (.1 + i * .05) * -direction);
        g.setLineDash(ring.dash);
        g.strokeStyle = rgba(ring.color, (fill >= 1 ? .5 : .2) * fade);
        g.lineWidth = 1;
        g.beginPath(); g.arc(0, 0, radius + 5, 0, TAU); g.stroke();
        g.restore();
        g.setLineDash([]);
        if (fill <= 0) return;
        g.beginPath(); g.arc(0, 0, radius, start, head, direction < 0);
        g.strokeStyle = rgba(ring.color, (.2 + bloom * .25) * fade); g.lineWidth = 11; g.stroke();
        g.strokeStyle = rgba(mix(ring.color, PALE, .4), .95 * fade); g.lineWidth = 2.6; g.stroke();
        if (fill >= 1) {
          const lap = start + direction * ((t * .5 + i * .3) % 1) * TAU;
          g.beginPath(); g.arc(0, 0, radius, lap - direction * .5, lap, direction < 0);
          g.strokeStyle = rgba(PALE, .55 * fade); g.lineWidth = 3.4; g.stroke();
        } else {
          const hx = Math.cos(head) * radius, hy = Math.sin(head) * radius;
          const bead = g.createRadialGradient(hx, hy, 0, hx, hy, 16);
          bead.addColorStop(0, rgba(PALE, 1)); bead.addColorStop(.25, rgba(ring.color, .75)); bead.addColorStop(1, rgba(ring.color, 0));
          g.fillStyle = bead;
          g.fillRect(hx - 16, hy - 16, 32, 32);
        }
      });
      g.restore();

      // しずくが落ちた瞬間の波紋
      for (let i = shocks.length - 1; i >= 0; i--) {
        const shock = shocks[i], age = (t - shock.born) / shock.life;
        if (age < 0) continue;
        if (age >= 1) { shocks.splice(i, 1); continue; }
        g.strokeStyle = rgba(shock.color, (1 - age) * .55);
        g.lineWidth = 1 + (1 - age) * 4;
        g.beginPath(); g.arc(cx, cy, R * .2 + shock.grow * (1 - Math.pow(1 - age, 3)), 0, TAU); g.stroke();
      }
    }

    // 凪いだ海
    g.globalCompositeOperation = 'source-over';
    for (let layer = 0; layer < 5; layer++) {
      const base = h * (.76 + layer * .055), amplitude = (4 + layer * 3.5) * scale;
      const k = .012 / (1 + layer * .22) * (850 / Math.max(w, 420)) * 1.4, speed = .5 + layer * .18;
      g.beginPath();
      g.moveTo(-10, h + 10);
      for (let x = -10; x <= w + 10; x += 8) g.lineTo(x, base + amplitude * (.6 * Math.sin(x * k + t * speed + layer * 1.3) + .4 * Math.sin(x * k * 2.3 - t * speed * 1.4 + layer * 2.1)));
      g.lineTo(w + 10, h + 10);
      g.closePath();
      const water = g.createLinearGradient(0, base - amplitude, 0, base + 90 * scale);
      water.addColorStop(0, rgba(mix(mix([30, 58, 104], [10, 20, 44], layer / 4), GOLD, open * .12 + bloom * .2), .93));
      water.addColorStop(1, rgba(mix([10, 20, 44], [5, 9, 22], layer / 4), .97));
      g.fillStyle = water;
      g.fill();
      g.strokeStyle = rgba(mix(SKY, PALE, bloom), .16 + open * .1 + bloom * .3);
      g.lineWidth = 1.2;
      g.stroke();
    }

    g.globalCompositeOperation = 'lighter';
    // 水面に映る輪の光
    g.save();
    g.translate(cx, h * .82);
    g.scale(1, .3);
    const glint = g.createRadialGradient(0, 0, 0, 0, 0, R * 2);
    glint.addColorStop(0, rgba(GOLD, open * .22 + bloom * .3));
    glint.addColorStop(1, rgba(GOLD, 0));
    g.fillStyle = glint;
    g.fillRect(-R * 2, -R * 2, R * 4, R * 4);
    g.restore();

    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i], age = (t - spark.born) / spark.life;
      if (age >= 1) { sparks.splice(i, 1); continue; }
      const slow = Math.exp(-dt * 2);
      spark.vx *= slow; spark.vy = spark.vy * slow + 40 * dt * scale;
      const x = spark.x, y = spark.y;
      spark.x += spark.vx * dt; spark.y += spark.vy * dt;
      g.strokeStyle = rgba(spark.color, 1 - age);
      g.lineWidth = spark.size;
      g.beginPath(); g.moveTo(x, y); g.lineTo(spark.x, spark.y); g.stroke();
    }
    if (bloom > .01) {
      const light = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * .8);
      light.addColorStop(0, rgba(mix(GOLD, PALE, .6), bloom * .4)); light.addColorStop(.5, rgba(GOLD, bloom * .12)); light.addColorStop(1, rgba(GOLD, 0));
      g.fillStyle = light;
      g.fillRect(0, 0, w, h);
    }
  }
  frame = requestAnimationFrame(tick);

  return () => {
    ended = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', layout);
  };
}
