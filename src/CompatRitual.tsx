// 相性の儀式。二人のタイプを確定した直後、鑑定の儀式と同じ嵐の海の上で、四重の光の輪が満ちていく。
// 輪が閉じるたびに「何を重ねたか」を一つずつ見せ、中央の二人が少しずつ近づく。最後に嵐が割れ、二人が重なって結果がひらく。タップで飛ばせる。
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { residentArt, ritualBg } from './art';
import { SEASON_NAMES, type Compat } from './pairing';
import { hexToRgb, RING_COUNT, startStorm } from './ritualStorm';

const TINT = '#f0a8c0';

export function CompatRitual({ result, onDone }: { result: Compat; onDone: () => void }) {
  const { a, b } = result;
  const [done, setDone] = useState(0);
  const [opened, setOpened] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  const finish = useRef(onDone);
  finish.current = onDone;

  const best = [...result.areas].sort((x, y) => y.score - x.score)[0];
  const steps = [
    { label: '二人の季節を重ねる', value: SEASON_NAMES[a.season] + ' × ' + SEASON_NAMES[b.season], result: result.season.relation.split('（')[0] },
    { label: '二人の深さを測る', value: a.num.toFixed(1) + ' × ' + b.num.toFixed(1), result: '差 ' + result.diff.toFixed(1) },
    { label: '四つの運を読む', value: '恋愛・結婚・仕事・友情', result: best.label + 'が強い' },
    { label: '二つの潮を結ぶ', value: result.first.band + ' と ' + result.second.band, result: result.total + '点' },
  ];
  const now = steps[Math.min(done, RING_COUNT - 1)];

  useEffect(() => {
    if (!canvas.current) return;
    return startStorm(canvas.current, {
      tint: hexToRgb(TINT),
      calm: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      onLayout: (cx, cy, r) => {
        root.current?.style.setProperty('--cx', cx + 'px');
        root.current?.style.setProperty('--cy', cy + 'px');
        root.current?.style.setProperty('--r', r + 'px');
      },
      onStep: setDone,
      onPercent: value => { if (percent.current) percent.current.textContent = String(value); },
      onFinale: () => setOpened(true),
      onEnd: () => setLeaving(true),
    });
    // 一度きりの演出。途中で二人が変わっても描き直さない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => finish.current(), 620);
    return () => clearTimeout(timer);
  }, [leaving]);

  return createPortal(<div ref={root} className="ritual pair-ritual" data-leaving={leaving} data-opened={opened}
    style={{ '--tint': TINT, ...(ritualBg ? { backgroundImage: `url(${ritualBg})` } : {}) } as React.CSSProperties}
    role="status" aria-live="polite" onClick={() => setLeaving(true)}>
    <canvas ref={canvas} className="ritual-sky" aria-hidden="true" />
    <div className="ritual-god" aria-hidden="true">
      <div className="pair-faces" data-step={opened ? 5 : Math.min(done, 4)}>
        <img className="pair-face pair-face-a" src={residentArt[a.index]} alt="" />
        <img className="pair-face pair-face-b" src={residentArt[b.index]} alt="" />
        <span key={done} className="pair-flash" />
      </div>
    </div>
    <div className="ritual-read">
      <p key={opened ? 'open' : done} className="ritual-now">
        {opened || done >= RING_COUNT ? 'ふたりの海が、ひらきます' : now.label}
        <small>{opened || done >= RING_COUNT ? result.season.title : now.value}</small>
      </p>
      <p className="ritual-percent" aria-hidden="true"><span ref={percent}>0</span><i>%</i></p>
      <ol className="ritual-found">
        {steps.map((item, index) => <li key={item.label} data-state={index < done ? 'done' : index === done ? 'now' : 'wait'}>
          <span className="ritual-sr">{item.label}：</span>{index < done ? item.result : '・・・'}
        </li>)}
      </ol>
    </div>
    <p className="ritual-skip">タップで結果へ</p>
  </div>, document.body);
}
