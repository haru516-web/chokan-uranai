// 鑑定の儀式。入力の直後、嵐の海の上で四重の光の輪が満ちていき、何を読んでいるのかを一つずつ見せてから結果をひらく。タップで飛ばせる。
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ritualBg } from './art';
import type { Profile } from './domain';
import { GodAnimation } from './GodAnimation';
import { hexToRgb, RING_COUNT, startStorm } from './ritualStorm';
import { ctxFor, SEASON, STAGES, stageFor } from './scoring';

const ORIGIN_GOD = 4;   // 源神（潮祖）

export function Ritual({ profile, today, onDone }: { profile: Profile; today: Date; onDone: () => void }) {
  const [done, setDone] = useState(0);
  const [opened, setOpened] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  const finish = useRef(onDone);
  finish.current = onDone;

  const c = ctxFor(today);
  const season = SEASON[profile.t.mod];
  const steps = [
    { label: '生まれた日の海をひらく', value: `${profile.Y}年${profile.M}月${profile.D}日`, result: season.n + 'の海' },
    { label: '名前の画数を数える', value: profile.name, result: profile.total + '画' },
    { label: '今日の月を読む', value: `${c.MO}月${c.DA}日`, result: c.moon + '・' + c.phaseTide },
    { label: '三つの潮を重ねる', value: c.yearPillar + '年・' + c.MO + '月', result: STAGES[stageFor(c, profile.t)].n },
  ];
  const now = steps[Math.min(done, RING_COUNT - 1)];

  useEffect(() => {
    if (!canvas.current) return;
    return startStorm(canvas.current, {
      tint: hexToRgb(season.col),
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
    // 一度きりの演出。途中で人や日付が変わっても描き直さない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => finish.current(), 620);
    return () => clearTimeout(timer);
  }, [leaving]);

  return createPortal(<div ref={root} className="ritual" data-leaving={leaving} data-opened={opened}
    style={{ '--tint': season.col, ...(ritualBg ? { backgroundImage: `url(${ritualBg})` } : {}) } as React.CSSProperties}
    role="status" aria-live="polite" onClick={() => setLeaving(true)}>
    <canvas ref={canvas} className="ritual-sky" aria-hidden="true" />
    <div className="ritual-god" aria-hidden="true">
      <div key={done} className="ritual-god-beat"><GodAnimation forcePlay index={ORIGIN_GOD} style={{ width: '100%' }} /></div>
    </div>
    <div className="ritual-read">
      <p key={opened ? 'open' : done} className="ritual-now">
        {opened || done >= RING_COUNT ? 'あなたの海が、ひらきます' : now.label}
        <small>{opened || done >= RING_COUNT ? season.n + 'の海 ・ ' + steps[3].result : now.value}</small>
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
