// scene.html をヘッドレスChromeで1コマずつ撮り、連番画像にする（依存なし。Node 22+）。
// 使い方: node promo/tiktok-compat/record.mjs <出力フォルダ>
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FPS = 30;
const out = resolve(process.argv[2] ?? join(tmpdir(), 'tiktok-compat-frames'));
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

const port = 9400 + Math.floor(Math.random() * 500);
const profile = join(tmpdir(), 'chrome-scene-' + Date.now());
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', '--hide-scrollbars',
  '--allow-file-access-from-files', '--force-device-scale-factor=1', '--window-size=1080,1920', 'about:blank'], { stdio: 'ignore' });
try {
  let list = [];
  for (let i = 0; i < 60 && !list.length; i++) { try { list = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter(t => t.type === 'page'); } catch { /* 起動待ち */ } if (!list.length) await sleep(200); }
  const ws = new WebSocket(list[0].webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const waits = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && waits.has(m.id)) { waits.get(m.id)(m); waits.delete(m.id); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; waits.set(i, m => m.error ? rej(new Error(method + ': ' + m.error.message)) : res(m.result)); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(resolve(import.meta.dirname, 'scene.html')).href });
  for (let i = 0; i < 100; i++) { if (await evalJs('typeof window.ready !== "undefined"').catch(() => false)) break; await sleep(100); }
  await evalJs('window.ready');
  const duration = await evalJs('window.DURATION');
  const total = Math.round(duration * FPS);
  for (let f = 0; f < total; f++) {
    await evalJs(`render(${f / FPS})`);
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 95, captureBeyondViewport: false });
    writeFileSync(join(out, String(f).padStart(5, '0') + '.jpg'), Buffer.from(data, 'base64'));
    if (f % 60 === 0) console.log(`${f}/${total}`);
  }
  console.log(`done ${total} frames -> ${out}`);
  ws.close();
} finally {
  chrome.kill();
}
