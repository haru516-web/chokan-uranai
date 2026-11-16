// タロットをめくったときの演出。札が飛んでくるあいだは光の尾を引き、開いた瞬間に火花が札のふちから弾ける。
// そのあと、札ごとの世界（塔なら稲妻と雨、星なら流れ星、女帝なら花びら…）が札のまわりに漂いつづける。
// 輪は使わず、光の粒・光の筋・稲妻で見せる。奥（back）と手前（front）の二枚の canvas に描き分ける。

import { BOLT, clamp, GOLD, makeBolt, mix, PALE, rand, rgba, TAU, type Bolt, type Rgb } from './ritualStorm';

type Mode = 'wind' | 'rise' | 'swirl' | 'mist' | 'snow' | 'petal' | 'ash' | 'beam' | 'ray' | 'stars' | 'shoot' | 'rain';
type Theme = { a: Rgb; b: Rgb; modes: Mode[]; bolts?: number; again?: number; shake?: boolean; burst?: number };

/** 札ごとの光景。a・b は主な色、modes は漂うもの、bolts は開いた瞬間に落ちる稲妻の数、again は稲妻がくり返す間隔（秒）。 */
const THEMES: Record<string, Theme> = {
  fool: { a: GOLD, b: PALE, modes: ['wind', 'rise'] },
  magician: { a: [255, 190, 110], b: GOLD, modes: ['swirl', 'rise'], bolts: 1 },
  priestess: { a: [150, 180, 255], b: [220, 230, 255], modes: ['mist', 'snow', 'stars'] },
  empress: { a: [255, 170, 200], b: [170, 230, 170], modes: ['petal', 'rise'] },
  emperor: { a: [255, 170, 90], b: GOLD, modes: ['beam', 'rise'] },
  hierophant: { a: GOLD, b: PALE, modes: ['beam', 'snow'] },
  lovers: { a: [255, 140, 170], b: [255, 210, 220], modes: ['swirl', 'petal'] },
  chariot: { a: [255, 150, 80], b: PALE, modes: ['wind'], burst: 110 },
  strength: { a: [255, 200, 120], b: [180, 230, 150], modes: ['rise', 'ray'] },
  hermit: { a: [255, 210, 130], b: [150, 170, 220], modes: ['mist', 'rise'] },
  wheel: { a: GOLD, b: [140, 190, 255], modes: ['swirl', 'stars'] },
  justice: { a: [210, 220, 240], b: GOLD, modes: ['beam', 'snow'] },
  hanged: { a: [120, 220, 210], b: [180, 200, 255], modes: ['mist', 'rise'] },
  death: { a: [190, 170, 230], b: [200, 205, 215], modes: ['ash', 'mist'] },
  temperance: { a: [130, 220, 230], b: GOLD, modes: ['swirl', 'rise'] },
  devil: { a: [255, 70, 70], b: [255, 150, 80], modes: ['rise', 'mist'], bolts: 1, shake: true },
  tower: { a: [255, 200, 120], b: BOLT, modes: ['rain'], bolts: 3, again: 2.4, shake: true, burst: 120 },
  star: { a: [160, 200, 255], b: PALE, modes: ['stars', 'shoot', 'snow'] },
  moon: { a: [170, 180, 255], b: [220, 225, 255], modes: ['mist', 'stars'] },
  sun: { a: [255, 210, 110], b: [255, 240, 190], modes: ['ray', 'rise'], burst: 110 },
  judgement: { a: PALE, b: GOLD, modes: ['beam', 'rise'], bolts: 1 },
  world: { a: GOLD, b: [150, 220, 200], modes: ['swirl', 'petal', 'stars'] },
};
const FALLBACK: Theme = { a: GOLD, b: PALE, modes: ['rise', 'stars'] };

// kind: 0 光の粒 / 1 ひらひら舞う欠片（花びら・灰） / 2 風の筋
type Particle = { kind: 0 | 1 | 2; x: number; y: number; vx: number; vy: number; size: number; color: Rgb; born: number; life: number; phase: number; sway: number; drag: number; gravity: number };
type Box = { left: number; top: number; width: number; height: number };

export function startTarotFx(back: HTMLCanvasElement, front: HTMLCanvasElement, options: { cardId: string; landAt: number; box: () => Box | null; onShake: () => void }) {
  const backContext = back.getContext('2d'), frontContext = front.getContext('2d');
  if (!backContext || !frontContext) return () => {};
  const b: CanvasRenderingContext2D = backContext, f: CanvasRenderingContext2D = frontContext;
  const theme = THEMES[options.cardId] ?? FALLBACK;
  const has = (mode: Mode) => theme.modes.includes(mode);
  const tone = () => Math.random() < .5 ? theme.a : theme.b;
  let w = 0, h = 0, dpr = 1;
  const layout = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    for (const canvas of [back, front]) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  };
  layout();
  window.addEventListener('resize', layout);

  const particles: Particle[] = [];
  const bolts: Bolt[] = [];
  const stars = Array.from({ length: 60 }, (_, i) => ({ x: (i * 37 + 11) % 100 / 100, y: (i * 53 + 7) % 100 / 100, s: .8 + (i % 4) * .5, p: i * 1.7 }));
  const rain = Array.from({ length: 90 }, () => ({ x: Math.random() * 1.4, y: Math.random(), l: rand(.012, .03), v: rand(.9, 1.6) }));
  const mist = Array.from({ length: 6 }, (_, i) => ({ x: i / 5 + rand(-.1, .1), y: rand(.2, .85), r: rand(.3, .5), v: rand(.01, .03) * (i % 2 ? 1 : -1) }));
  const orbit = Array.from({ length: 44 }, (_, i) => ({ a: Math.random() * TAU, r: rand(.78, 1.25), v: rand(.5, 1.2) * (i % 2 ? 1 : -1), size: rand(.9, 2.2), color: i % 2 ? theme.a : theme.b, px: NaN, py: NaN }));
  const shoots: { x: number; y: number; vx: number; vy: number; born: number }[] = [];
  let t = 0, last = 0, frame = 0, ended = false, landed = false, flash = 0, bloom = 0, edge = -1, nextBolt = 0, nextShoot = 0;
  let box: Box = { left: w / 2 - 100, top: h / 2 - 150, width: 200, height: 300 };

  const add = (particle: Partial<Particle> & { x: number; y: number }) => {
    if (particles.length > 420) return;
    particles.push({ kind: 0, vx: 0, vy: 0, size: 1.4, color: theme.a, born: t, life: 1, phase: Math.random() * TAU, sway: 0, drag: 0, gravity: 0, ...particle });
  };
  // 札のふちの一点と、そこから外へ向かう向き
  const rim = () => {
    const side = Math.floor(Math.random() * 4), along = Math.random();
    if (side === 0) return { x: box.left + box.width * along, y: box.top, nx: (along - .5) * .8, ny: -1 };
    if (side === 1) return { x: box.left + box.width * along, y: box.top + box.height, nx: (along - .5) * .8, ny: 1 };
    if (side === 2) return { x: box.left, y: box.top + box.height * along, nx: -1, ny: (along - .5) * .8 };
    return { x: box.left + box.width, y: box.top + box.height * along, nx: 1, ny: (along - .5) * .8 };
  };
  const strike = (power: number) => {
    const target = { x: box.left + box.width * rand(.15, .85), y: box.top + rand(0, 8) };
    bolts.push(makeBolt(target.x + rand(-.35, .35) * w, -20, target.x, target.y, t, 2.5, 3));
    flash = Math.max(flash, power);
    for (let i = 0; i < 26; i++) {
      const angle = -Math.PI / 2 + rand(-1.3, 1.3), v = rand(80, 420);
      add({ x: target.x, y: target.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, life: rand(.4, 1), size: rand(.8, 2.2), color: Math.random() < .4 ? PALE : theme.a, drag: 2, gravity: 420 });
    }
    if (theme.shake) options.onShake();
  };

  function tick(now: number) {
    if (ended) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - (last || now)) / 1000, .05);
    last = now;
    t += dt;
    box = options.box() ?? box;
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const since = t - options.landAt, calm = clamp(since / 1.4);   // 開いてから、光景がゆっくり満ちてくる

    /* ---- 飛んでくるあいだ：光の尾 ---- */
    if (since < 0) for (let i = 0; i < 5; i++) add({ x: cx + rand(-1, 1) * box.width * .5, y: cy + rand(-1, 1) * box.height * .5, vx: rand(-90, 90), vy: rand(-90, 90), life: rand(.5, 1.1), size: rand(1, 2.6), color: tone(), drag: 1.5 });

    /* ---- 開いた瞬間 ---- */
    if (since >= 0 && !landed) {
      landed = true;
      bloom = 1; edge = t;
      for (let i = 0; i < (theme.burst ?? 70); i++) {
        const from = rim(), v = rand(70, 460);
        add({ x: from.x, y: from.y, vx: from.nx * v + rand(-40, 40), vy: from.ny * v + rand(-40, 40), life: rand(.6, 1.5), size: rand(.9, 2.6), color: Math.random() < .35 ? PALE : tone(), drag: rand(1.4, 2.6), gravity: 70 });
      }
      for (let i = 0; i < (theme.bolts ?? 0); i++) setTimeout(() => { if (!ended) strike(i ? .8 : 1); }, i * 210);
      nextBolt = t + (theme.again ?? 0) + .8;
      nextShoot = t + .5;
    }

    /* ---- 開いたあと：札ごとの光景を湧かせる ---- */
    if (landed) {
      const spawn = (perSecond: number) => Math.random() < perSecond * dt * calm;
      if (has('rise') && spawn(30)) add({ x: cx + rand(-1, 1) * box.width * 1.3, y: box.top + box.height + rand(-40, 110), vy: rand(-130, -45), life: rand(2.4, 4.5), size: rand(1, 2.8), color: tone(), sway: rand(8, 26) });
      if (has('snow') && spawn(18)) add({ x: Math.random() * w, y: -8, vy: rand(30, 90), life: rand(5, 9), size: rand(1, 2.6), color: tone(), sway: rand(10, 30) });
      if (has('petal') && spawn(9)) add({ kind: 1, x: Math.random() * w, y: -10, vy: rand(50, 120), life: rand(5, 9), size: rand(5, 9), color: tone(), sway: rand(20, 46) });
      if (has('ash') && spawn(11)) add({ kind: 1, x: Math.random() * w, y: -10, vy: rand(22, 60), life: rand(7, 12), size: rand(2.5, 5), color: tone(), sway: rand(14, 34) });
      if (has('wind') && spawn(11)) add({ kind: 2, x: -rand(20, 200), y: rand(.06, .94) * h, vx: rand(800, 1500), life: 2, size: rand(110, 300), color: tone() });
      if (theme.again && t > nextBolt) { nextBolt = t + theme.again * rand(.7, 1.3); strike(.7); }
      if (has('shoot') && t > nextShoot) {
        nextShoot = t + rand(.9, 2);
        shoots.push({ x: rand(.1, .9) * w, y: rand(-.05, .3) * h, vx: rand(-520, -300), vy: rand(260, 420), born: t });
      }
    }
    flash *= Math.exp(-dt * 7); bloom *= Math.exp(-dt * 1.8);

    /* ================= 奥の canvas ================= */
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.clearRect(0, 0, w, h);
    b.globalCompositeOperation = 'lighter';
    b.lineCap = 'round'; b.lineJoin = 'round';

    if (landed) {
      // 札の奥のあかり
      const glow = b.createRadialGradient(cx, cy, box.width * .2, cx, cy, box.height * 1.15);
      glow.addColorStop(0, rgba(theme.a, .2 * calm + bloom * .4));
      glow.addColorStop(1, rgba(theme.a, 0));
      b.fillStyle = glow;
      b.fillRect(0, 0, w, h);

      if (has('mist')) for (const cloud of mist) {
        cloud.x += cloud.v * dt;
        if (cloud.x > 1.4) cloud.x = -.4; else if (cloud.x < -.4) cloud.x = 1.4;
        const x = cloud.x * w, y = cloud.y * h, radius = cloud.r * Math.max(w, h * .7);
        const fog = b.createRadialGradient(x, y, 0, x, y, radius);
        fog.addColorStop(0, rgba(mix(theme.a, theme.b, .5), .11 * calm)); fog.addColorStop(1, rgba(theme.a, 0));
        b.fillStyle = fog;
        b.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      if (has('stars')) for (const star of stars) {
        const alpha = (.3 + .5 * Math.sin(t * 1.8 + star.p)) * calm;
        if (alpha <= .03) continue;
        b.fillStyle = rgba(star.p % 3 < 1.5 ? theme.b : PALE, alpha);
        b.fillRect(star.x * w, star.y * h, star.s, star.s);
        if (star.s > 2 && alpha > .55) { b.fillRect(star.x * w - 3, star.y * h + star.s / 2 - .4, 6 + star.s, .8); b.fillRect(star.x * w + star.s / 2 - .4, star.y * h - 3, .8, 6 + star.s); }
      }

      // 天から差す光の柱
      if (has('beam')) for (let i = 0; i < 4; i++) {
        const x = cx + (i - 1.5) * box.width * .62 + Math.sin(t * .5 + i * 1.9) * 16, half = box.width * (.16 + (i % 2) * .08);
        const shaft = b.createLinearGradient(0, 0, 0, h);
        shaft.addColorStop(0, rgba(mix(theme.a, PALE, .4), .2 * calm * (.7 + .3 * Math.sin(t * 1.3 + i))));
        shaft.addColorStop(.85, rgba(theme.a, 0));
        b.fillStyle = shaft;
        b.beginPath(); b.moveTo(x - half * .5, 0); b.lineTo(x + half * .5, 0); b.lineTo(x + half * 1.5 + (i - 1.5) * 26, h); b.lineTo(x - half * 1.5 + (i - 1.5) * 26, h); b.closePath(); b.fill();
      }

      // 札の奥から伸びる光の筋
      if (has('ray')) for (let i = 0; i < 16; i++) {
        const angle = i / 16 * TAU + t * .12, inner = box.width * .45, length = Math.max(w, h) * (i % 2 ? .42 : .62) * (.4 + .6 * calm);
        const ray = b.createLinearGradient(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner, cx + Math.cos(angle) * (inner + length), cy + Math.sin(angle) * (inner + length));
        ray.addColorStop(0, rgba(mix(theme.a, PALE, .3), (i % 2 ? .12 : .22) * calm)); ray.addColorStop(1, rgba(theme.a, 0));
        b.strokeStyle = ray; b.lineWidth = i % 2 ? 5 : 11;
        b.beginPath(); b.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner); b.lineTo(cx + Math.cos(angle) * (inner + length), cy + Math.sin(angle) * (inner + length)); b.stroke();
      }

      if (has('rain')) {
        b.strokeStyle = rgba(theme.b, .3 * calm + flash * .15);
        b.lineWidth = 1;
        b.beginPath();
        for (const drop of rain) {
          drop.y += drop.v * dt * 1.7; drop.x -= drop.v * dt * .45;
          if (drop.y > 1) { drop.y -= 1.05; drop.x = Math.random() * 1.4; }
          const x = drop.x * w, y = drop.y * h, length = drop.l * h * 1.5;
          b.moveTo(x, y); b.lineTo(x - length * .45, y + length);
        }
        b.stroke();
      }

      for (let i = shoots.length - 1; i >= 0; i--) {
        const shoot = shoots[i], age = t - shoot.born;
        if (age > 1.1) { shoots.splice(i, 1); continue; }
        const x = shoot.x + shoot.vx * age, y = shoot.y + shoot.vy * age, alpha = Math.sin(clamp(age / 1.1) * Math.PI);
        const trail = b.createLinearGradient(x - shoot.vx * .22, y - shoot.vy * .22, x, y);
        trail.addColorStop(0, rgba(theme.a, 0)); trail.addColorStop(1, rgba(PALE, alpha));
        b.strokeStyle = trail; b.lineWidth = 2;
        b.beginPath(); b.moveTo(x - shoot.vx * .22, y - shoot.vy * .22); b.lineTo(x, y); b.stroke();
      }

      // 札のふちを走る光（四角いまま外へ広がって消える）
      const spread = edge < 0 ? 1 : clamp((t - edge) / 1.1);
      if (spread < 1) for (let i = 0; i < 2; i++) {
        const grow = (1 - Math.pow(1 - spread, 3)) * (34 + i * 46);
        b.strokeStyle = rgba(i ? theme.b : mix(theme.a, PALE, .4), (1 - spread) * .8);
        b.lineWidth = 1 + (1 - spread) * 4;
        b.beginPath(); b.roundRect(box.left - grow, box.top - grow, box.width + grow * 2, box.height + grow * 2, 13 + grow * .5); b.stroke();
      }
    }

    // 稲妻
    for (let i = bolts.length - 1; i >= 0; i--) {
      const bolt = bolts[i], age = (t - bolt.born) / bolt.life;
      if (age >= 1) { bolts.splice(i, 1); continue; }
      const alpha = age < .1 ? 1 : age < .2 ? .3 : age < .32 ? .9 : (1 - age) / .68 * .75;
      bolt.paths.forEach((path, index) => {
        const width = bolt.width * (index ? .5 : 1);
        b.beginPath();
        b.moveTo(path[0], path[1]);
        for (let k = 2; k < path.length; k += 2) b.lineTo(path[k], path[k + 1]);
        b.strokeStyle = rgba(mix(BOLT, theme.a, .5), alpha * .3); b.lineWidth = width * 5; b.stroke();
        b.strokeStyle = rgba([255, 248, 244], alpha); b.lineWidth = width; b.stroke();
      });
    }
    if (flash > .01) { b.fillStyle = rgba(mix(BOLT, theme.a, .4), flash * .16); b.fillRect(0, 0, w, h); }

    /* ================= 手前の canvas ================= */
    f.setTransform(dpr, 0, 0, dpr, 0, 0);
    f.clearRect(0, 0, w, h);
    f.globalCompositeOperation = 'lighter';
    f.lineCap = 'round';

    // 札のまわりを巡る光の粒
    if (landed && has('swirl')) for (const mote of orbit) {
      mote.a += mote.v * dt;
      const x = cx + Math.cos(mote.a) * mote.r * box.width * .78, y = cy + Math.sin(mote.a) * mote.r * box.height * .62 + Math.sin(mote.a * 2 + t) * 10;
      if (!Number.isNaN(mote.px)) {
        f.strokeStyle = rgba(mote.color, (.5 + .4 * Math.sin(mote.a * 3 + t * 2)) * calm);
        f.lineWidth = mote.size;
        f.beginPath(); f.moveTo(mote.px, mote.py); f.lineTo(x, y); f.stroke();
      }
      mote.px = x; mote.py = y;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i], age = (t - p.born) / p.life;
      if (age >= 1 || p.y > h + 30 || p.x > w + 320) { particles.splice(i, 1); continue; }
      const fade = Math.min(1, age * 6) * (1 - Math.pow(age, 3));
      if (p.drag) { const slow = Math.exp(-dt * p.drag); p.vx *= slow; p.vy *= slow; }
      p.vy += p.gravity * dt;
      const x0 = p.x + Math.sin((t - p.born) * 2 + p.phase) * p.sway, y0 = p.y;
      p.x += p.vx * dt; p.y += p.vy * dt;
      const x1 = p.x + Math.sin((t - p.born + dt) * 2 + p.phase) * p.sway;
      if (p.kind === 0) {
        // 光の粒：芯と、そのまわりのにじみ。速い粒は短い尾を引く。
        const shine = fade * (.7 + .3 * Math.sin(t * 6 + p.phase));
        f.fillStyle = rgba(p.color, shine * .09);
        f.beginPath(); f.arc(x1, p.y, p.size * 3, 0, TAU); f.fill();
        f.beginPath(); f.arc(x1, p.y, p.size * 1.9, 0, TAU); f.fill();
        f.strokeStyle = rgba(mix(p.color, PALE, .35), shine);
        f.lineWidth = p.size * 1.3;
        f.beginPath(); f.moveTo(x0 - p.vx * dt * 1.5, y0 - p.vy * dt * 1.5); f.lineTo(x1 + .01, p.y + .01); f.stroke();
      } else if (p.kind === 1) {
        const turn = Math.cos((t - p.born) * 3.2 + p.phase);
        f.save();
        f.translate(x1, p.y);
        f.rotate(p.phase + (t - p.born) * .9);
        f.scale(turn, 1);
        f.fillStyle = rgba(p.color, fade * (.45 + Math.abs(turn) * .4));
        f.beginPath(); f.ellipse(0, 0, p.size, p.size * .55, 0, 0, TAU); f.fill();
        f.restore();
      } else {
        const wind = f.createLinearGradient(p.x - p.size, 0, p.x, 0);
        wind.addColorStop(0, rgba(p.color, 0)); wind.addColorStop(1, rgba(mix(p.color, PALE, .4), .5 * calm));
        f.strokeStyle = wind; f.lineWidth = 1.6;
        f.beginPath();
        f.moveTo(p.x - p.size, p.y + Math.sin(p.x * .012 + p.phase) * 8);
        f.quadraticCurveTo(p.x - p.size / 2, p.y - 10, p.x, p.y + Math.sin(p.x * .012 + p.phase) * 8);
        f.stroke();
      }
    }
  }
  frame = requestAnimationFrame(tick);

  return () => {
    ended = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', layout);
  };
}
