import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const projectDir = path.resolve(import.meta.dirname, '..');
const electron = path.join(projectDir, 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, extra = '') => { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name + (extra ? ' [' + extra + ']' : '')); if (!ok) failures++; };

async function connect(port) {
  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = l.find(t => t.type === 'page' && t.webSocketDebuggerUrl); } catch {}
    if (!target) await sleep(500);
  }
  if (!target) throw new Error('no CDP target');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const pending = new Map(); let id = 0;
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const run = expression => { const i = ++id; return new Promise((res, rej) => { pending.set(i, m => { if (m.error || m.result?.exceptionDetails) rej(new Error(JSON.stringify(m.error || m.result.exceptionDetails))); else res(m.result?.result?.value); }); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })); }); };
  return { ws, run };
}

async function launch(extraEnv, port) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'chess-close-test-'));
  const env = { ...process.env, CHESS_PROFILE: profile, CHESS_TEST_HOOK: '1', ...extraEnv };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, ['.', `--remote-debugging-port=${port}`], { cwd: projectDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const cdp = await connect(port);
  await sleep(1200);
  return { child, cdp, profile };
}

// 1. Анимация должна стартовать со стороны источника, а не с противоположной.
try {
  const a = await launch({}, 9371);
  const { run } = a.cdp;
  await run(`document.querySelector('button[data-nav="play"]').click(); 'ok'`); await sleep(500);
  await run(`document.querySelector('[data-action="start-game"]')?.click(); 'started'`); await sleep(600);
  await run(`document.querySelector('.square[data-square="e2"]').click(); 'e2'`); await sleep(120);
  await run(`document.querySelector('.square[data-square="e4"]').click(); 'e4'`);
  await sleep(30);
  const raw = await run(`(()=>{const img=document.querySelector('.square[data-square="e4"] img');return img?getComputedStyle(img).transform:'NO_IMG';})()`);
  const m = /matrix\(1, 0, 0, 1, [-\d.]+, ([-\d.]+)\)/.exec(raw);
  const ty = m ? Number(m[1]) : NaN;
  check('animation starts at the source square (ty > 0 for e2->e4)', Number.isFinite(ty) && ty > 0, raw);
  await run(`window.coach.testClose(); 'closing'`);
  for (let i = 0; i < 40 && a.child.exitCode === null; i++) await sleep(250);
  check('normal close exits after a successful save', a.child.exitCode === 0, String(a.child.exitCode));
  if (a.child.exitCode === null) a.child.kill('SIGKILL');
} catch (e) { check('animation/close happy path completed', false, e.message); }

// 2. При отказе сохранения приложение обязано НЕ закрыться и показать ошибку.
try {
  const b = await launch({ CHESS_FAIL_SAVE: '1' }, 9372);
  const { run } = b.cdp;
  await run(`window.coach.testClose(); 'closing'`);
  await sleep(1200);
  const stillRunning = b.child.exitCode === null;
  const toast = await run(`document.querySelector('#toast')?.textContent || ''`);
  check('save failure keeps the app open', stillRunning, 'exitCode=' + b.child.exitCode);
  check('save failure shows a visible message', /не сохранён/i.test(toast), toast);
  b.child.kill('SIGKILL');
} catch (e) { check('save-failure scenario completed', false, e.message); }

console.log(failures ? `RESULT: FAIL (${failures})` : 'RESULT: PASS');
process.exit(failures ? 1 : 0);
