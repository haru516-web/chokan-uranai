// サイトに入るときのオープニング。凪いだ夜の海に光のしずくが落ち、潮環がひらいて題字が現れる。タップで飛ばせる。
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ritualBg } from './art';
import { GodAnimation } from './GodAnimation';
import { startOpening } from './openingSea';

const TITLE = [...'潮環占い'];

export function Opening({ onReveal, onDone }: { onReveal: () => void; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const finish = useRef(onDone);
  finish.current = onDone;
  const reveal = useRef(onReveal);
  reveal.current = onReveal;

  useEffect(() => {
    if (!canvas.current) return;
    return startOpening(canvas.current, {
      onLayout: (cx, cy, r) => {
        root.current?.style.setProperty('--cx', cx + 'px');
        root.current?.style.setProperty('--cy', cy + 'px');
        root.current?.style.setProperty('--r', r + 'px');
      },
      onExit: () => setLeaving(true),
    });
  }, []);

  useEffect(() => {
    if (!leaving) return;
    reveal.current();   // 幕が上がりはじめたら、下の画面の登場演出を始めてもらう
    const timer = setTimeout(() => finish.current(), 800);
    return () => clearTimeout(timer);
  }, [leaving]);

  return createPortal(<div ref={root} className="ritual opening" data-leaving={leaving}
    style={ritualBg ? { backgroundImage: `url(${ritualBg})` } : undefined} role="img" aria-label="潮環占い" onClick={() => setLeaving(true)}>
    <canvas ref={canvas} className="ritual-sky" aria-hidden="true" />
    <div className="ritual-god opening-god" aria-hidden="true">
      <div style={{ width: '86%' }}><GodAnimation forcePlay index={4} style={{ width: '100%' }} /></div>
    </div>
    <div className="ritual-read opening-read" aria-hidden="true">
      <p className="opening-kicker">生年月日と名前でひらく、あなただけの海</p>
      <h1 className="opening-title">{TITLE.map((char, index) => <span key={index} style={{ animationDelay: 1.75 + index * .13 + 's' }}>{char}</span>)}</h1>
      <p className="opening-line">今日のあなたの海は、凪か、荒波か。</p>
    </div>
    <p className="ritual-skip">タップで進む</p>
  </div>, document.body);
}
