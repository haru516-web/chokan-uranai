// 占い結果が確定する瞬間の演出。順位を数えているあいだは光が数字へ集まり、
// 止まった瞬間に、その日の段階（凱風〜轟沈）に合った光景が画面いっぱいに広がる。
// 鑑定の儀式（ritualStorm）と同じ稲妻・波紋・火花を使う。

import { BOLT, clamp, makeBolt, mix, PALE, rand, rgba, TAU, type Bolt, type Rgb } from './ritualStorm';

type Spark = { x: number; y: number; vx: number; vy: number; born: number; life: number; size: number; color: Rgb; drag: number; gravity: number };
type Shock = { born: number; life: number; grow: number; color: Rgb; width: number };
type Flake = { x: number; y: number; vy: number; sway: number; phase: number; size: number; born: number };
type Streak = { x: number; y: number; length: number; v: number; born: number };
type Point = { x: number; y: number };

export type ResultFxOptions = {
  anchor: () => Point | null;   // 順位の数字の中心（画面座標）
  chargeAt: number;             // 数え上げが始まるまでの秒数
  onShake: (power: number) => void;
  onEnd: () => void;
};

const SPARKS = [140, 90, 36, 110, 150];
const SPEED = [540, 460, 220, 560, 660];

export function startResultFx(canvas: HTMLCanvasElement, options: ResultFxOptions) {
  const context = canvas.getContext('2d');
  if (!context) return { setColor() {}, finish() {}, stop() {} };
  const g: CanvasRenderingContext2D = context;
  let w = 0, h = 0, dpr = 1;
  const layout = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  };
  layout();
  window.addEventListener('resize', layout);

  const motes = Array.from({ length: 54 }, () => ({ a: Math.random() * TAU, r: rand(50, 260), size: rand(.8, 2), px: NaN, py: NaN }));
  const sparks: Spark[] = [];
  const shocks: Shock[] = [];
  const bolts: Bolt[] = [];
  const flakes: Flake[] = [];
  const streaks: Streak[] = [];
  const queue: { at: number; run: (at: Point) => void }[] = [];
  let color: Rgb = [234, 204, 140];
  let t = 0, last = 0, frame = 0, ended = false, doneAt = -1, level = 2, flash = 0, bloom = 0, origin: Point = { x: 0, y: 0 };

  const burst = (at: Point, count: number, speed: number, tone: Rgb, gravity = 80) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU, v = speed * rand(.2, 1);
      sparks.push({ x: at.x, y: at.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, born: t, life: rand(.6, 1.5), size: rand(.9, 2.6), color: Math.random() < .35 ? PALE : tone, drag: rand(1.3, 2.6), gravity });
    }
  };
  const strike = (at: Point, power: number) => {
    bolts.push(makeBolt(at.x + rand(-.3, .3) * w, -20, at.x + rand(-12, 12), at.y, t, 2.6, 3));
    flash = Math.max(flash, power);
    burst(at, 34, 420, color, 260);
    options.onShake(power);
  };

  function tick(now: number) {
    if (ended) return;
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - (last || now)) / 1000, .05);
    last = now;
    t += dt;
    const at = options.anchor() ?? origin;
    origin = at;
    const scale = Math.min(1, w / 600);

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round'; g.lineJoin = 'round';

    /* ---- 数えているあいだ：光が数字へ集まり、だんだん速くなる ---- */
    if (doneAt < 0 && t > options.chargeAt) {
      const charge = clamp((t - options.chargeAt) / 2.2);
      const halo = g.createRadialGradient(at.x, at.y, 0, at.x, at.y, 120);
      halo.addColorStop(0, rgba(color, .1 + charge * .26 + Math.sin(t * 18) * .03 * charge));
      halo.addColorStop(1, rgba(color, 0));
      g.fillStyle = halo;
      g.fillRect(at.x - 120, at.y - 120, 240, 240);
      for (const mote of motes) {
        mote.r -= dt * (60 + (260 - mote.r) * .9) * (.5 + charge * 2.2);
        mote.a += dt * (1 + 9000 / (mote.r * mote.r + 900)) * (.6 + charge);
        if (mote.r < 26) { mote.r = rand(170, 270); mote.a = Math.random() * TAU; mote.px = NaN; }
        const x = at.x + Math.cos(mote.a) * mote.r, y = at.y + Math.sin(mote.a) * mote.r * .72;
        const alpha = clamp((270 - mote.r) / 70) * clamp((mote.r - 26) / 30) * (.3 + charge * .6);
        if (!Number.isNaN(mote.px)) {
          g.strokeStyle = rgba(mix(color, PALE, .2), alpha); g.lineWidth = mote.size;
          g.beginPath(); g.moveTo(mote.px, mote.py); g.lineTo(x, y); g.stroke();
        }
        mote.px = x; mote.py = y;
      }
    }

    /* ---- 確定した瞬間から ---- */
    if (doneAt >= 0) {
      const tf = t - doneAt;
      while (queue.length && queue[0].at <= tf) queue.shift()!.run(at);
      flash *= Math.exp(-dt * 7); bloom *= Math.exp(-dt * 2.1);

      // 数字の奥から放たれる光の筋
      const rays = clamp(1 - tf / 1.7);
      if (rays > 0) {
        const reach = (90 + 330 * (1 - Math.pow(1 - clamp(tf / .55), 3))) * scale, count = level === 2 ? 10 : 18;
        for (let i = 0; i < count; i++) {
          const angle = i / count * TAU + tf * .25, inner = 56 * scale, length = reach * (i % 2 ? .62 : 1);
          g.strokeStyle = rgba(mix(color, PALE, .3), rays * (i % 2 ? .16 : .3));
          g.lineWidth = i % 2 ? 2 : 4;
          g.beginPath();
          g.moveTo(at.x + Math.cos(angle) * inner, at.y + Math.sin(angle) * inner);
          g.lineTo(at.x + Math.cos(angle) * (inner + length), at.y + Math.sin(angle) * (inner + length));
          g.stroke();
        }
      }

      // 波紋
      for (let i = shocks.length - 1; i >= 0; i--) {
        const shock = shocks[i], age = (tf - shock.born) / shock.life;
        if (age < 0) continue;
        if (age >= 1) { shocks.splice(i, 1); continue; }
        g.strokeStyle = rgba(shock.color, (1 - age) * .6);
        g.lineWidth = 1 + (1 - age) * shock.width;
        g.beginPath(); g.arc(at.x, at.y, 30 + shock.grow * (1 - Math.pow(1 - age, 3)), 0, TAU); g.stroke();
      }

      // 稲妻（荒波・轟沈）
      for (let i = bolts.length - 1; i >= 0; i--) {
        const bolt = bolts[i], age = (t - bolt.born) / bolt.life;
        if (age >= 1) { bolts.splice(i, 1); continue; }
        const alpha = age < .1 ? 1 : age < .2 ? .3 : age < .32 ? .9 : (1 - age) / .68 * .75;
        bolt.paths.forEach((path, index) => {
          const width = bolt.width * (index ? .5 : 1);
          g.beginPath();
          g.moveTo(path[0], path[1]);
          for (let k = 2; k < path.length; k += 2) g.lineTo(path[k], path[k + 1]);
          g.strokeStyle = rgba(mix(BOLT, color, .5), alpha * .3); g.lineWidth = width * 5; g.stroke();
          g.strokeStyle = rgba([255, 244, 246], alpha); g.lineWidth = width; g.stroke();
        });
      }

      // 追い風の筋（順風）
      for (let i = streaks.length - 1; i >= 0; i--) {
        const streak = streaks[i], age = tf - streak.born;
        if (age < 0) continue;
        streak.x += streak.v * dt;
        if (streak.x - streak.length > w) { streaks.splice(i, 1); continue; }
        const wind = g.createLinearGradient(streak.x - streak.length, 0, streak.x, 0);
        wind.addColorStop(0, rgba(color, 0)); wind.addColorStop(1, rgba(mix(color, PALE, .4), .5));
        g.strokeStyle = wind; g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(streak.x - streak.length, streak.y + Math.sin(streak.x * .012) * 8);
        g.quadraticCurveTo(streak.x - streak.length / 2, streak.y - 10, streak.x, streak.y + Math.sin(streak.x * .012) * 8);
        g.stroke();
      }

      // 舞い落ちる金の欠片（凱風）
      const settle = clamp((4.6 - tf) / .9);
      for (let i = flakes.length - 1; i >= 0; i--) {
        const flake = flakes[i], age = tf - flake.born;
        if (age < 0) continue;
        flake.y += flake.vy * dt;
        if (flake.y > h + 20) { flakes.splice(i, 1); continue; }
        const x = flake.x + Math.sin(age * 2.2 + flake.phase) * flake.sway, turn = Math.cos(age * 5 + flake.phase);
        g.save();
        g.translate(x, flake.y);
        g.rotate(Math.PI / 4 + age);
        g.scale(turn, 1);
        g.fillStyle = rgba(turn > 0 ? color : PALE, (.5 + Math.abs(turn) * .5) * settle);
        g.fillRect(-flake.size / 2, -flake.size / 2, flake.size, flake.size);
        g.restore();
      }

      if (tf > 5) { stop(); options.onEnd(); return; }
    }

    // 火花
    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i], age = (t - spark.born) / spark.life;
      if (age >= 1) { sparks.splice(i, 1); continue; }
      const slow = Math.exp(-dt * spark.drag);
      spark.vx *= slow; spark.vy = spark.vy * slow + spark.gravity * dt;
      const x = spark.x, y = spark.y;
      spark.x += spark.vx * dt; spark.y += spark.vy * dt;
      g.strokeStyle = rgba(spark.color, (1 - age) * .95);
      g.lineWidth = spark.size;
      g.beginPath(); g.moveTo(x, y); g.lineTo(spark.x, spark.y); g.stroke();
    }

    if (bloom > .01) {
      const light = g.createRadialGradient(at.x, at.y, 0, at.x, at.y, Math.max(w, h) * .75);
      light.addColorStop(0, rgba(mix(color, PALE, .5), bloom * .42)); light.addColorStop(.45, rgba(color, bloom * .14)); light.addColorStop(1, rgba(color, 0));
      g.fillStyle = light;
      g.fillRect(0, 0, w, h);
    }
    if (flash > .01) { g.fillStyle = rgba(mix(BOLT, color, .4), flash * .16); g.fillRect(0, 0, w, h); }
  }
  frame = requestAnimationFrame(tick);

  function stop() {
    ended = true;
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', layout);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
  }

  return {
    setColor(next: Rgb) { color = next; },
    /** 順位が止まった。段階に合わせた光景を始める。 */
    finish(tier: number, tone: Rgb) {
      if (doneAt >= 0 || ended) return;
      doneAt = t; level = tier; color = tone; bloom = 1;
      const far = Math.max(w, h);
      burst(origin, SPARKS[tier], SPEED[tier] * Math.min(1, w / 600), tone, tier === 2 ? 10 : 90);
      const rings = tier === 2 ? 5 : 3;
      for (let i = 0; i < rings; i++) shocks.push({ born: i * (tier === 2 ? .32 : .13), life: tier === 2 ? 2.2 : 1.2, grow: far * (tier === 2 ? .5 : .8), color: i % 2 ? PALE : tone, width: tier === 2 ? 2.5 : 3.5 });
      if (tier === 0) {
        for (let i = 0; i < 90; i++) flakes.push({ x: Math.random() * w, y: rand(-60, -10), vy: rand(110, 260), sway: rand(10, 34), phase: Math.random() * TAU, size: rand(3.5, 7.5), born: rand(.1, 2.6) });
        queue.push({ at: .38, run: at => { burst(at, 90, 620 * Math.min(1, w / 600), PALE); bloom = Math.max(bloom, .7); } });
      }
      if (tier === 1) for (let i = 0; i < 30; i++) streaks.push({ x: rand(-w * .6, 0), y: rand(.08, .92) * h, length: rand(120, 320), v: rand(900, 1700), born: rand(0, .9) });
      if (tier >= 3) {
        strike(origin, 1);
        if (tier === 4) {
          queue.push({ at: .22, run: at => strike(at, .8) });
          queue.push({ at: .5, run: at => strike(at, 1) });
        }
      }
    },
    stop,
  };
}
