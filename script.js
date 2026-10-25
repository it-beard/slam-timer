/* ============================================================
   Таймер для паэтычнага слэму
   Клавішы: Space — старт/паўза, Enter — перазапуск, R — скід,
            F — на ўвесь экран, S — налады
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const root = document.documentElement;
  const body = document.body;

  const clockEl = $('#clock');
  const digitsEl = $('#digits');
  const threadFill = $('#thread-fill');
  const titleEl = $('#title');
  const controls = $('#controls');
  const btnToggle = $('#btn-toggle');
  const dlg = $('#settings');
  const form = $('#settings-form');

  /* ---------- налады ---------- */
  const STORAGE_KEY = 'slam-timer-settings';
  const DEFAULTS = {
    minutes: 3,
    seconds: 0,
    warn: 15,          // сігнал за столькі секунд да канца
    sound: true,
    endSound: true,
    title: 'Паэтычны слэм',
    theme: 'dark',
  };

  function loadSettings() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      return { ...DEFAULTS };
    }
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* прыватны рэжым */ }
  }
  let settings = loadSettings();

  /* ---------- арнамент (вышыўка «крыжыкам») ----------
     '#' — асноўны колер, 'o' — дадатковы, '.' — пуста.
     Ромб з кручкамі і маленькі «сонечны» ромб між імі. */
  const MOTIF = [
    '.......#.#..............',
    '........#...............',
    '........#...........#...',
    '.......#.#.........###..',
    '......#...#.........#...',
    '.....#..o..#............',
    '....#..o.o..#.......o...',
    '#..#..o...o..#..#..o.o..',
    '.##..o..#..o..##..o.#.o.',
    '#..#..o...o..#..#..o.o..',
    '....#..o.o..#.......o...',
    '.....#..o..#............',
    '......#...#.........#...',
    '.......#.#.........###..',
    '........#...........#...',
    '........#...............',
    '.......#.#..............',
  ];
  const ZIG = ['o...', '.o.o', '..o.'];
  const W = MOTIF[0].length;

  function buildTile() {
    const empty = '.'.repeat(W);
    const line = '#'.repeat(W);
    const zig = ZIG.map((r) => r.repeat(W / r.length));
    return [line, empty, ...zig, empty, ...MOTIF, empty, ...zig, empty, line];
  }

  function ornamentURI(colorA, colorB) {
    const rows = buildTile();
    const paths = { '#': [], o: [] };
    rows.forEach((row, y) => {
      let x = 0;
      while (x < W) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        let run = 1;
        while (x + run < W && row[x + run] === ch) run++;
        paths[ch].push(`M${x} ${y}h${run}v1h-${run}z`);
        x += run;
      }
    });
    const H = rows.length;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
      `<path fill="${colorA}" d="${paths['#'].join('')}"/>` +
      `<path fill="${colorB}" d="${paths.o.join('')}"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  function paintOrnaments() {
    const cs = getComputedStyle(root);
    const uri = ornamentURI(
      cs.getPropertyValue('--orn-a').trim(),
      cs.getPropertyValue('--orn-b').trim(),
    );
    document.querySelectorAll('.orn').forEach((el) => { el.style.backgroundImage = uri; });
  }

  /* ---------- гук (Web Audio) — «пік» як у кухоннага таймера ---------- */
  let audioCtx = null;
  function audio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  /* адзін кароткі «пік» */
  function pip(ctx, t, dur = 0.11, freq = 1400, vol = 0.14) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + dur - 0.02);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter).connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  /* серыя «пікаў»: n разоў з інтэрвалам gap секунд */
  function beeps(n, gap = 0.22) {
    const ctx = audio();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    for (let i = 0; i < n; i++) pip(ctx, t0 + i * gap);
  }
  const warnBeep = () => beeps(3);   // за 15 секунд — тройчы
  const endBeep = () => beeps(5);    // у канцы — пяць разоў

  /* ---------- не даваць экрану гаснуць ---------- */
  let wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch { /* не крытычна */ }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && T.status === 'running') keepAwake();
  });

  /* ---------- таймер ---------- */
  const T = { status: 'idle', durationMs: 0, remainingMs: 0, endAt: 0, warned: false, raf: 0 };
  let lastStr = '';

  const durationMs = () => (settings.minutes * 60 + settings.seconds) * 1000;

  function fmt(sec) {
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }

  function renderDigits(sec) {
    const str = fmt(sec);
    if (str === lastStr) return;
    lastStr = str;
    digitsEl.innerHTML = [...str]
      .map((ch) => (ch === ':' ? '<span class="c">:</span>' : `<span class="d">${ch}</span>`))
      .join('');
    clockEl.classList.toggle('wide', str.length > 4);
    document.title = `${str} · ${settings.title}`;
  }

  function renderThread() {
    const k = T.durationMs ? T.remainingMs / T.durationMs : 0;
    threadFill.style.transform = `scaleX(${k})`;
  }

  function setStatus(s) {
    T.status = s;
    body.dataset.status = s;
    btnToggle.textContent = s === 'running' ? 'Паўза' : s === 'paused' ? 'Далей' : 'Старт';
  }

  function reset() {
    cancelAnimationFrame(T.raf);
    T.durationMs = durationMs();
    T.remainingMs = T.durationMs;
    T.warned = false;
    clockEl.classList.remove('warn', 'done');
    lastStr = '';
    renderDigits(Math.ceil(T.remainingMs / 1000));
    renderThread();
    setStatus('idle');
  }

  function start() {
    if (T.status === 'running') return;
    if (T.status === 'done') reset();
    audio();
    keepAwake();
    T.endAt = performance.now() + T.remainingMs;
    setStatus('running');
    T.raf = requestAnimationFrame(tick);
  }

  function pause() {
    if (T.status !== 'running') return;
    cancelAnimationFrame(T.raf);
    T.remainingMs = Math.max(0, T.endAt - performance.now());
    setStatus('paused');
  }

  function toggle() { if (T.status === 'running') pause(); else start(); }
  function restart() { reset(); start(); }

  function tick() {
    T.remainingMs = Math.max(0, T.endAt - performance.now());
    const sec = Math.ceil(T.remainingMs / 1000);
    renderDigits(sec);
    renderThread();

    if (!T.warned && settings.warn > 0 && sec <= settings.warn) {
      T.warned = true;
      clockEl.classList.add('warn');
      if (settings.sound) warnBeep();
    }

    if (T.remainingMs <= 0) { finish(); return; }
    T.raf = requestAnimationFrame(tick);
  }

  function finish() {
    cancelAnimationFrame(T.raf);
    clockEl.classList.remove('warn');
    clockEl.classList.add('done');
    setStatus('done');
    document.title = `Time out · ${settings.title}`;
    if (settings.endSound) endBeep();
  }

  /* ---------- паказ / схаванне кіравання ---------- */
  let uiTimer = 0;
  function showUI() {
    body.classList.add('ui');
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { if (!dlg.open) body.classList.remove('ui'); }, 3000);
  }
  window.addEventListener('pointermove', showUI);
  window.addEventListener('pointerdown', showUI);

  /* ---------- на ўвесь экран ---------- */
  function toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) { const p = req.call(root); if (p && p.catch) p.catch(() => {}); }
    } else {
      const exit = d.exitFullscreen || d.webkitExitFullscreen;
      if (exit) exit.call(d);
    }
  }

  /* ---------- дыялог наладаў ---------- */
  const f = {
    min: $('#set-min'),
    sec: $('#set-sec'),
    warn: $('#set-warn'),
    sound: $('#set-sound'),
    endSound: $('#set-endsound'),
    title: $('#set-title'),
    theme: $('#set-theme'),
  };

  function openSettings() {
    if (dlg.open) return;
    f.min.value = settings.minutes;
    f.sec.value = settings.seconds;
    f.warn.value = settings.warn;
    f.sound.checked = settings.sound;
    f.endSound.checked = settings.endSound;
    f.title.value = settings.title;
    f.theme.value = settings.theme;
    showUI();
    dlg.showModal();
    f.min.focus();
    f.min.select();
  }

  const clamp = (v, lo, hi, dflt) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== '' ? Math.min(hi, Math.max(lo, Math.round(n))) : dflt;
  };

  function applySettings() {
    titleEl.textContent = settings.title;
    root.dataset.theme = settings.theme;
    paintOrnaments();
  }

  form.addEventListener('submit', () => {
    const prevDuration = durationMs();
    settings = {
      minutes: clamp(f.min.value, 0, 99, DEFAULTS.minutes),
      seconds: clamp(f.sec.value, 0, 59, DEFAULTS.seconds),
      warn: clamp(f.warn.value, 0, 5999, DEFAULTS.warn),
      sound: f.sound.checked,
      endSound: f.endSound.checked,
      title: f.title.value.trim() || DEFAULTS.title,
      theme: f.theme.value === 'light' ? 'light' : 'dark',
    };
    if (settings.minutes === 0 && settings.seconds === 0) {
      settings.minutes = DEFAULTS.minutes;
      settings.seconds = DEFAULTS.seconds;
    }
    saveSettings();
    applySettings();
    const idle = T.status !== 'running' && T.status !== 'paused';
    if (idle || durationMs() !== prevDuration) reset();
  });

  $('#btn-cancel').addEventListener('click', () => dlg.close());
  $('#btn-test-sound').addEventListener('click', warnBeep);
  dlg.addEventListener('close', showUI);

  /* ---------- кнопкі ---------- */
  btnToggle.addEventListener('click', toggle);
  $('#btn-restart').addEventListener('click', restart);
  $('#btn-reset').addEventListener('click', reset);
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-full').addEventListener('click', toggleFullscreen);
  /* здымаем фокус, каб Space / Enter не націскалі кнопку другі раз */
  controls.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => b.blur()));

  /* ---------- клавіятура (па фізічных клавішах — працуе ў любой раскладцы) ---------- */
  window.addEventListener('keydown', (e) => {
    if (dlg.open || e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        toggle();
        break;
      case 'Enter':
      case 'NumpadEnter':
        e.preventDefault();
        restart();
        break;
      case 'KeyR':
        reset();
        break;
      case 'KeyF':
        toggleFullscreen();
        break;
      case 'KeyS':
      case 'Comma':
        openSettings();
        break;
      default:
        break;
    }
  });

  /* разблакоўка гуку на першы жэст карыстальніка */
  const unlock = () => { audio(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  /* ---------- старт ---------- */
  applySettings();
  reset();
  showUI();
})();
