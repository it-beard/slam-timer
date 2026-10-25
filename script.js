/* ============================================================
   Сцэнічны таймер
   Клавішы: Space — старт/паўза, Enter — перазапуск, R — скід,
   Shift+R — да першага этапу, F — на ўвесь экран, S — налады,
   M — гук, 1–9/0 — хвіліны, ↑↓ — ±1 хв, ←→ — ±10 с,
   N/PageDown — наступны этап, P/PageUp — папярэдні.
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];
  const root = document.documentElement;
  const body = document.body;
  const I18N = window.SLAM_I18N || {};
  const params = new URLSearchParams(location.search);
  const isDisplay = params.has('display');

  const el = {
    clock: $('#clock'), digits: $('#digits'), endtext: $('#endtext'), threadFill: $('#thread-fill'),
    title: $('#title'), subtitle: $('#subtitle'), controls: $('#controls'), hint: $('#hint'),
    btnToggle: $('#btn-toggle'), btnNext: $('#btn-next'), toast: $('#toast'), live: $('#live'),
    badgeMuted: $('#badge-muted'), themeMeta: $('meta[name="theme-color"]'),
    dlg: $('#settings'), form: $('#settings-form'),
  };

  /* ============================================================
     Налады
     ============================================================ */
  const STORAGE_KEY = 'slam-timer-settings';
  const MAX_SEC = 35999;                       // 9:59:59
  const ACCENT = { dark: '#c4262e', light: '#b1222b' };
  const PRESETS = [1, 2, 3, 5, 10, 15];        // хвіліны для хуткага выбару
  const DEFAULTS = {
    v: 2,
    lang: '',                                  // '' — як у браўзера
    mode: 'countdown',                         // countdown | stopwatch
    segments: [{ name: '', duration: 180 }],   // этапы, секунды
    autoAdvance: false,
    overtime: false,                           // пасля нуля лічыць перабор
    endText: '',                               // '' — па змаўчанні для мовы
    warns: [15],                               // секунд да канца (ад большага)
    warnSound: true,
    endSound: true,
    tick: false,                               // цікаць апошнія 10 с
    flash: false,                              // успышка экрана ў канцы
    volume: 70,
    title: '',                                 // '' — па змаўчанні для мовы
    theme: 'dark',                             // dark | light | system
    accent: '',                                // '' — колер тэмы
    ornament: true,
  };
  let settings;

  const clampInt = (v, lo, hi, dflt) => {
    if (v === '' || v === null || v === undefined) return dflt;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
  };
  const toBool = (v, dflt) => {
    if (typeof v === 'boolean') return v;
    if (v === 1 || v === '1' || v === 'true' || v === 'yes') return true;
    if (v === 0 || v === '0' || v === 'false' || v === 'no') return false;
    return dflt;
  };

  /* «3» → 3:00, «0:30», «1:05:00», «90s», «2h» → секунды; null — не разабраць */
  function parseDuration(str) {
    const s = String(str || '').trim().toLowerCase().replace(',', '.');
    if (!s) return null;
    let m;
    if ((m = s.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/))) return +m[1] * 3600 + +m[2] * 60 + +m[3];
    if ((m = s.match(/^(\d{1,3}):(\d{1,2})$/))) return +m[1] * 60 + +m[2];
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(h|г|гадз)$/))) return Math.round(+m[1] * 3600);
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(s|с|сек)$/))) return Math.round(+m[1]);
    if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|хв)?$/))) return Math.round(+m[1] * 60);
    return null;
  }
  /* «60, 15» або «1:00 15» → [60, 15] (у секундах) */
  const parseList = (str) => String(str || '').split(/[,;\s]+/).filter(Boolean)
    .map((p) => (p.includes(':') ? parseDuration(p) : Math.round(Number(p))))
    .filter((n) => Number.isFinite(n) && n > 0);

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + ':' + String(s).padStart(2, '0');
  }

  /* Прыводзіць любы аб'ект (localStorage, URL, іншае акно) да правільных наладаў */
  function sanitize(raw) {
    const o = raw && typeof raw === 'object' ? { ...raw } : {};
    /* міграцыя з першай версіі */
    if (!o.segments && (o.minutes != null || o.seconds != null)) {
      o.segments = [{ name: '', duration: clampInt(o.minutes, 0, 99, 3) * 60 + clampInt(o.seconds, 0, 59, 0) }];
    }
    if (!o.warns && o.warn != null) o.warns = [o.warn];
    if (o.warnSound == null && o.sound != null) o.warnSound = o.sound;
    if (o.title === 'Паэтычны слэм') o.title = '';

    const segments = (Array.isArray(o.segments) ? o.segments : DEFAULTS.segments).slice(0, 20)
      .map((g) => ({ name: String((g && g.name) || '').slice(0, 40), duration: clampInt(g && g.duration, 1, MAX_SEC, 0) }))
      .filter((g) => g.duration > 0);
    const warns = (Array.isArray(o.warns) ? o.warns : DEFAULTS.warns)
      .map((w) => clampInt(w, 1, MAX_SEC, 0)).filter(Boolean);

    return {
      v: 2,
      lang: I18N[o.lang] ? o.lang : '',
      mode: o.mode === 'stopwatch' ? 'stopwatch' : 'countdown',
      segments: segments.length ? segments : DEFAULTS.segments.map((g) => ({ ...g })),
      autoAdvance: toBool(o.autoAdvance, false),
      overtime: toBool(o.overtime, false),
      endText: String(o.endText || '').slice(0, 40),
      warns: [...new Set(warns)].sort((a, b) => b - a).slice(0, 10),
      warnSound: toBool(o.warnSound, true),
      endSound: toBool(o.endSound, true),
      tick: toBool(o.tick, false),
      flash: toBool(o.flash, false),
      volume: clampInt(o.volume, 0, 100, 70),
      title: String(o.title || '').slice(0, 60),
      theme: ['dark', 'light', 'system'].includes(o.theme) ? o.theme : 'dark',
      accent: /^#[0-9a-f]{6}$/i.test(String(o.accent || '')) ? String(o.accent).toLowerCase() : '',
      ornament: toBool(o.ornament, true),
    };
  }

  function loadStored() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* прыватны рэжым */ }
  }

  /* ---------- параметры ў спасылцы ---------- */
  function fromParams(p) {
    const o = {};
    if (p.has('lang')) o.lang = p.get('lang');
    if (p.has('mode')) o.mode = p.get('mode');
    if (p.has('seq')) {
      o.segments = p.get('seq').split(',').map((part) => {
        const i = part.lastIndexOf('=');
        const d = parseDuration(i >= 0 ? part.slice(i + 1) : part);
        return d ? { name: i >= 0 ? part.slice(0, i).trim() : '', duration: d } : null;
      }).filter(Boolean);
    } else if (p.has('t')) {
      const d = parseDuration(p.get('t'));
      if (d) o.segments = [{ name: '', duration: d }];
    }
    if (p.has('auto')) o.autoAdvance = p.get('auto');
    if (p.has('over')) o.overtime = p.get('over');
    if (p.has('end')) o.endText = p.get('end');
    if (p.has('warn')) o.warns = parseList(p.get('warn'));
    if (p.has('sound')) { o.warnSound = p.get('sound'); o.endSound = p.get('sound'); }
    if (p.has('warnsound')) o.warnSound = p.get('warnsound');
    if (p.has('endsound')) o.endSound = p.get('endsound');
    if (p.has('tick')) o.tick = p.get('tick');
    if (p.has('flash')) o.flash = p.get('flash');
    if (p.has('vol')) o.volume = p.get('vol');
    if (p.has('title')) o.title = p.get('title');
    if (p.has('theme')) o.theme = p.get('theme');
    if (p.has('accent')) o.accent = '#' + p.get('accent').replace(/^#/, '');
    if (p.has('orn')) o.ornament = p.get('orn');
    return o;
  }
  function toParams(s) {
    const p = new URLSearchParams();
    const d = DEFAULTS;
    if (s.lang) p.set('lang', s.lang);
    if (s.mode !== d.mode) p.set('mode', s.mode);
    if (s.segments.length > 1 || s.segments[0].name) {
      p.set('seq', s.segments.map((g) => (g.name ? g.name.replace(/[,=]/g, ' ').trim() + '=' : '') + fmt(g.duration)).join(','));
    } else if (s.segments[0].duration !== d.segments[0].duration) {
      p.set('t', fmt(s.segments[0].duration));
    }
    if (s.autoAdvance) p.set('auto', '1');
    if (s.overtime) p.set('over', '1');
    if (s.endText) p.set('end', s.endText);
    if (s.warns.join(',') !== d.warns.join(',')) p.set('warn', s.warns.join(','));
    if (!s.warnSound && !s.endSound) p.set('sound', '0');
    else {
      if (!s.warnSound) p.set('warnsound', '0');
      if (!s.endSound) p.set('endsound', '0');
    }
    if (s.tick) p.set('tick', '1');
    if (s.flash) p.set('flash', '1');
    if (s.volume !== d.volume) p.set('vol', s.volume);
    if (s.title) p.set('title', s.title);
    if (s.theme !== d.theme) p.set('theme', s.theme);
    if (s.accent) p.set('accent', s.accent.slice(1));
    if (!s.ornament) p.set('orn', '0');
    return p.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',');
  }
  const baseUrl = () => location.href.split(/[?#]/)[0];

  /* ============================================================
     Мова
     ============================================================ */
  let L = I18N.be || {};
  function detectLang() {
    for (const tag of navigator.languages || [navigator.language || 'en']) {
      const code = String(tag).slice(0, 2).toLowerCase();
      if (code === 'be' || code === 'ru') return 'be';
      if (I18N[code]) return code;
    }
    return 'en';
  }
  const langOf = (s = settings) => s.lang || detectLang();
  const t = (key) => (L[key] != null ? L[key] : (I18N.be && I18N.be[key]) || key);
  function applyLang(s = settings) {
    const code = langOf(s);
    L = I18N[code] || I18N.be || {};
    root.lang = code;
    $$('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    $$('[data-i18n-ph]').forEach((n) => { n.placeholder = t(n.dataset.i18nPh); });
    $$('[data-i18n-aria]').forEach((n) => { n.setAttribute('aria-label', t(n.dataset.i18nAria)); });
  }
  const titleOf = () => settings.title || t('default_title');
  const endTextOf = () => settings.endText || t('default_end');

  /* ============================================================
     Тэма і арнамент
     ============================================================ */
  const lightMq = matchMedia('(prefers-color-scheme: light)');
  const resolveTheme = (s = settings) => (s.theme === 'system' ? (lightMq.matches ? 'light' : 'dark') : s.theme);
  function applyTheme(s = settings) {
    root.dataset.theme = resolveTheme(s);
    if (s.accent) root.style.setProperty('--accent', s.accent);
    else root.style.removeProperty('--accent');
    body.classList.toggle('no-orn', !s.ornament);
    paintOrnaments();
    if (el.themeMeta) el.themeMeta.content = cssVar('--bg');
  }
  lightMq.addEventListener('change', () => { if (settings.theme === 'system') applyTheme(); });
  const cssVar = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  /* Арнамент — вышыўка «крыжыкам».
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
    let a = cssVar('--orn-a');
    if (!a || a.startsWith('var(')) a = cssVar('--accent');
    const uri = ornamentURI(a, cssVar('--orn-b'));
    $$('.orn').forEach((n) => { n.style.backgroundImage = uri; });
  }

  /* ============================================================
     Гук (Web Audio). Сігналы плануюцца наперад у аўдыякантэксце,
     таму гучаць дакладна, нават калі ўкладка ў фоне.
     ============================================================ */
  let audioCtx = null;
  let muted = false;
  const scheduled = [];                        // серыі «пікаў»: { at, oscs }
  const volOf = (v) => Math.pow(v / 100, 1.6) * 0.25;

  function audioInit() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume().then(scheduleSounds).catch(() => {});
    return audioCtx;
  }
  /* адзін кароткі «пік», як у кухоннага таймера */
  function pip(ctx, at, { dur = 0.11, freq = 1400, vol = volOf(settings.volume) } = {}) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, vol), at + 0.008);
    g.gain.setValueAtTime(Math.max(0.0001, vol), at + dur - 0.02);
    g.gain.linearRampToValueAtTime(0.0001, at + dur);
    osc.connect(filter).connect(g).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + dur + 0.02);
    osc.onended = () => { osc.disconnect(); filter.disconnect(); g.disconnect(); };
    return osc;
  }
  function series(ctx, at, n, opts, gap = 0.22) {
    const oscs = [];
    for (let i = 0; i < n; i++) oscs.push(pip(ctx, at + i * gap, opts));
    return { at, oscs };
  }
  /* Адмяняе запланаваныя серыі. Тая, што ўжо гучыць, дагучыць (< 1 с), калі не all. */
  function cancelSounds(all = false) {
    const now = audioCtx ? audioCtx.currentTime : 0;
    for (let i = scheduled.length - 1; i >= 0; i--) {
      const s = scheduled[i];
      if (all || s.at > now) {
        s.oscs.forEach((o) => { try { o.onended = null; o.stop(); o.disconnect(); } catch { /* ужо спынены */ } });
        scheduled.splice(i, 1);
      }
    }
  }
  function beepsNow(n, opts) {
    const ctx = audioInit();
    if (!ctx || muted) return;
    const go = () => series(ctx, ctx.currentTime + 0.02, n, opts);
    if (ctx.state === 'running') go();
    else ctx.resume().then(go).catch(() => {});
  }
  /* План сігналаў для бягучага этапу: at — прайшло мс ад старту */
  function soundPlan() {
    const ev = [];
    const ws = settings.warns;
    if (settings.mode === 'countdown') {
      const D = T.durationMs;
      const last = ws[ws.length - 1];
      if (settings.warnSound) ws.forEach((w) => ev.push({ at: D - w * 1000, n: w === last ? 3 : 1 }));
      if (settings.endSound) ev.push({ at: D, n: 5 });
      if (settings.tick) {
        for (let s = 1; s <= 10; s++) {
          const at = D - s * 1000;
          if (!ev.some((e) => e.at === at)) ev.push({ at, n: 1, opts: { dur: 0.045, freq: 1000, vol: volOf(settings.volume) * 0.5 } });
        }
      }
    } else if (settings.warnSound) {
      ws.forEach((w) => ev.push({ at: w * 1000, n: 3 }));
    }
    return ev.filter((e) => e.at >= 0);
  }
  function scheduleSounds() {
    cancelSounds();
    if (isDisplay || muted || T.status !== 'running' || T.over) return;
    if (!audioCtx || audioCtx.state !== 'running') return;
    const now = elapsedMs();
    for (const e of soundPlan()) {
      const dt = (e.at - now) / 1000;
      if (dt < -0.2) continue;
      scheduled.push(series(audioCtx, audioCtx.currentTime + Math.max(0, dt) + 0.01, e.n, e.opts));
    }
  }
  function toggleMute() {
    muted = !muted;
    el.badgeMuted.hidden = !muted;
    if (muted) cancelSounds(true); else scheduleSounds();
    toast(t(muted ? 'muted' : 'unmuted'));
  }

  /* ============================================================
     Не даваць экрану гаснуць
     ============================================================ */
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
    if (document.visibilityState === 'visible' && T.status === 'running') { keepAwake(); render(); }
  });

  /* ============================================================
     Таймер. Лічым «прайшло» (elapsed) ад старту этапу:
     base — назапашана да апошняга старту, startedAt — момант старту.
     ============================================================ */
  const T = { status: 'idle', seg: 0, base: 0, startedAt: 0, durationMs: 0, over: false, raf: 0, fallback: 0, warnedLive: false };
  const elapsedMs = (now = performance.now()) => T.base + (T.status === 'running' ? now - T.startedAt : 0);
  const isSeq = () => settings.mode === 'countdown' && settings.segments.length > 1;
  const hasNext = () => isSeq() && T.seg < settings.segments.length - 1;

  function loadSegment() {
    T.seg = Math.min(Math.max(0, T.seg), settings.segments.length - 1);
    T.durationMs = settings.mode === 'countdown' ? settings.segments[T.seg].duration * 1000 : 0;
  }
  function ensureLoop() { if (!T.raf) T.raf = requestAnimationFrame(tick); }
  function stopLoop() { cancelAnimationFrame(T.raf); T.raf = 0; }
  function tick() { T.raf = 0; render(); if (T.status === 'running') ensureLoop(); }
  /* калі ўкладка ў фоне, rAF спіць — таймер абуджае render у момант нуля */
  function armFallback() {
    clearTimeout(T.fallback);
    if (T.status !== 'running' || settings.mode !== 'countdown' || T.over) return;
    const rem = T.durationMs - elapsedMs();
    if (rem > 0) T.fallback = setTimeout(render, rem + 30);
  }

  let lastStr = '';
  function renderDigits(str) {
    if (str === lastStr) return;
    lastStr = str;
    let w = 0;
    el.digits.innerHTML = [...str].map((ch) => {
      if (ch === ':') { w += 0.3; return '<span class="c">:</span>'; }
      if (ch === '+') { w += 0.5; return '<span class="s">+</span>'; }
      w += 0.64;
      return `<span class="d">${ch}</span>`;
    }).join('');
    el.digits.style.setProperty('--w', w.toFixed(2));
  }
  function setClockState(state) {
    el.clock.classList.toggle('soon', state === 'soon');
    el.clock.classList.toggle('warn', state === 'warn');
  }
  function render() {
    const e = elapsedMs();
    const ws = settings.warns;
    const active = T.status === 'running' || T.status === 'paused';
    let str;
    if (settings.mode === 'stopwatch') {
      str = fmt(e / 1000);
      const sec = e / 1000;
      setClockState(!active || !ws.length ? '' : sec >= ws[0] ? 'warn' : sec >= ws[ws.length - 1] ? 'soon' : '');
    } else {
      let rem = T.durationMs - e;
      if (rem <= 0 && !T.over && T.status === 'running') {
        if (finish()) return;                  // пачаўся наступны этап
        rem = T.durationMs - elapsedMs();
      }
      if (T.over) {
        str = '+' + fmt(-rem / 1000);
        setClockState('');
      } else {
        str = fmt(Math.ceil(Math.max(0, rem) / 1000));
        const sec = rem / 1000;
        const st = !active || !ws.length ? '' : sec <= ws[ws.length - 1] ? 'warn' : sec <= ws[0] ? 'soon' : '';
        setClockState(st);
        if (st === 'warn' && !T.warnedLive && T.status === 'running') { T.warnedLive = true; announce(t('live_warn')); }
      }
      el.threadFill.style.transform = `scaleX(${T.durationMs ? Math.max(0, rem) / T.durationMs : 0})`;
    }
    renderDigits(str);
    document.title = `${T.status === 'done' ? endTextOf() : str} · ${titleOf()}`;
  }
  function renderMeta() {
    el.title.textContent = titleOf();
    const seq = isSeq();
    el.subtitle.hidden = !seq;
    if (seq) {
      const g = settings.segments[T.seg];
      el.subtitle.textContent = `${T.seg + 1} / ${settings.segments.length}${g.name ? ' · ' + g.name : ''}`;
    }
    el.btnNext.hidden = !seq;
    const end = endTextOf();
    el.endtext.textContent = end;
    el.endtext.style.setProperty('--ew', Math.max(2.5, end.length * 0.46).toFixed(2));
    body.classList.toggle('stopwatch', settings.mode === 'stopwatch');
    el.hint.textContent = t('hint');
  }
  function setStatus(s) {
    T.status = s;
    body.dataset.status = s;
    el.btnToggle.textContent = t(s === 'running' ? 'pause' : s === 'paused' ? 'resume' : 'start');
  }
  function applySettings() {
    applyLang();
    applyTheme();
    setStatus(T.status);
    renderMeta();
    lastStr = '';
    render();
  }

  function reset(opts = {}) {
    stopLoop();
    clearTimeout(T.fallback);
    cancelSounds();
    loadSegment();
    T.base = 0; T.over = false; T.warnedLive = false;
    el.clock.classList.remove('done', 'over');
    setClockState('');
    setStatus('idle');
    renderMeta();
    render();
    if (!opts.silent) sync();
  }
  function start() {
    if (T.status === 'running') return;
    if (T.status === 'done') {
      if (hasNext()) { nextSegment(true); return; }
      reset({ silent: true });
    }
    audioInit();
    keepAwake();
    T.startedAt = performance.now();
    setStatus('running');
    announce(t('live_running'));
    scheduleSounds();
    armFallback();
    ensureLoop();
    sync();
  }
  function pause() {
    if (T.status !== 'running') return;
    T.base = elapsedMs();
    stopLoop();
    clearTimeout(T.fallback);
    cancelSounds();
    setStatus('paused');
    announce(t('live_paused'));
    render();
    sync();
  }
  const toggle = () => (T.status === 'running' ? pause() : start());
  function restart() { reset({ silent: true }); start(); }
  /* вяртае true, калі аўтаматычна пачаўся наступны этап */
  function finish() {
    clearTimeout(T.fallback);
    if (settings.flash) flash();
    if (settings.autoAdvance && hasNext()) { nextSegment(true); return true; }
    announce(t('live_end'));
    if (settings.overtime) {
      T.over = true;
      setClockState('');
      el.clock.classList.add('over');
    } else {
      stopLoop();
      T.base = T.durationMs;
      setStatus('done');
      setClockState('');
      el.clock.classList.add('done');
    }
    sync();
    return false;
  }
  function nextSegment(autoStart) {
    if (!hasNext()) return;
    const wasRunning = T.status === 'running';
    T.seg += 1;
    reset({ silent: true });
    if (autoStart || wasRunning) start(); else sync();
  }
  function prevSegment() {
    const wasRunning = T.status === 'running';
    T.seg = Math.max(0, T.seg - 1);
    reset({ silent: true });
    if (wasRunning) start(); else sync();
  }
  function firstSegment() { T.seg = 0; reset(); }

  /* ±секунды: у спакоі мяняе працягласць этапу, у працы — час, што застаўся */
  function adjust(deltaSec) {
    if (settings.mode !== 'countdown') return;
    if (T.status === 'idle') {
      const g = settings.segments[T.seg];
      g.duration = clampInt(g.duration + deltaSec, 5, MAX_SEC, g.duration);
      saveSettings(); syncSettings(); loadSegment(); render();
      toast(fmt(g.duration));
      return;
    }
    if (T.status === 'done' && deltaSec <= 0) return;
    const now = performance.now();
    const next = Math.max(0, elapsedMs(now) - deltaSec * 1000);
    if (T.status === 'done') { setStatus('paused'); el.clock.classList.remove('done'); }
    T.base = next - (T.status === 'running' ? now - T.startedAt : 0);
    if (T.over && T.durationMs - next > 0) { T.over = false; el.clock.classList.remove('over'); }
    scheduleSounds(); armFallback(); render();
    toast((deltaSec > 0 ? '+' : '−') + fmt(Math.abs(deltaSec)));
    sync();
  }
  function quickSet(min) {
    if (settings.mode !== 'countdown' || T.status !== 'idle') return;
    settings.segments[T.seg].duration = min * 60;
    saveSettings(); syncSettings(); loadSegment(); render();
    toast(fmt(min * 60));
  }

  /* ============================================================
     Дробязі інтэрфейсу: тост, жывы рэгіён, успышка, кнопкі, экран
     ============================================================ */
  let toastTimer = 0;
  function toast(msg) {
    if (isDisplay) return;
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1500);
  }
  function announce(msg) { el.live.textContent = msg; }
  let flashTimer = 0;
  function flash() {
    body.classList.remove('flashing');
    void body.offsetWidth;
    body.classList.add('flashing');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => body.classList.remove('flashing'), 2600);
  }

  let uiTimer = 0;
  function showUI() {
    body.classList.add('ui');
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { if (!el.dlg.open) body.classList.remove('ui'); }, 3000);
  }
  window.addEventListener('pointermove', showUI);
  window.addEventListener('pointerdown', showUI);

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

  /* ============================================================
     Сінхранізацыя вокнаў (экран для залы) праз BroadcastChannel
     ============================================================ */
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('slam-timer') : null;
  function snapshot() {
    return {
      status: T.status, seg: T.seg, base: T.base, over: T.over,
      startedWall: T.status === 'running' ? Date.now() - (performance.now() - T.startedAt) : 0,
    };
  }
  function sync() { if (bc) bc.postMessage({ type: 'state', state: snapshot() }); }
  function syncSettings() { if (bc) bc.postMessage({ type: 'settings', settings }); }
  function applyState(s) {
    if (!s || typeof s !== 'object') return;
    stopLoop(); clearTimeout(T.fallback); cancelSounds();
    T.seg = clampInt(s.seg, 0, 19, 0);
    loadSegment();
    T.base = Math.max(0, Number(s.base) || 0);
    T.over = !!s.over;
    el.clock.classList.remove('done', 'over');
    setClockState('');
    if (T.over) el.clock.classList.add('over');
    if (s.status === 'done') el.clock.classList.add('done');
    if (s.status === 'running') {
      T.startedAt = performance.now() - (Date.now() - Number(s.startedWall));
      setStatus('running');
      audioInit(); keepAwake(); scheduleSounds(); armFallback(); ensureLoop();
    } else {
      setStatus(['idle', 'paused', 'done'].includes(s.status) ? s.status : 'idle');
    }
    renderMeta();
    lastStr = '';
    render();
  }
  if (bc) {
    bc.onmessage = (ev) => {
      const m = ev.data || {};
      if (m.type === 'hello') { syncSettings(); sync(); }
      else if (m.type === 'settings') { settings = sanitize(m.settings); applySettings(); loadSegment(); render(); }
      else if (m.type === 'state') applyState(m.state);
    };
  }

  /* ============================================================
     Дыялог наладаў
     ============================================================ */
  const fe = {
    auto: $('#set-auto'), end: $('#set-end'), warn: $('#set-warn'), warnSound: $('#set-sound'),
    endSound: $('#set-endsound'), tick: $('#set-tick'), flash: $('#set-flash'), volume: $('#set-volume'),
    title: $('#set-title'), accent: $('#set-accent'), orn: $('#set-orn'), lang: $('#set-lang'),
    countdownOpts: $('#countdown-opts'), rowAuto: $('#row-auto'), segHelp: $('#seg-help'),
    lblWarn: $('#lbl-warn'), helpWarn: $('#help-warn'), linkOut: $('#link-out'),
    timebox: $('#timebox'), segList: $('#segments'), chips: $('#chips'), dlgBody: $('.dlg-body', el.dlg),
    btnCopy: $('#btn-copy-link'),
  };
  let draftSegs = [];
  let activeRow = 0;
  let accentCustom = false;
  let savedNow = false;

  const getRadio = (name) => { const r = $(`input[name="${name}"]:checked`, el.form); return r ? r.value : ''; };
  const setRadio = (name, val) => { $$(`input[name="${name}"]`, el.form).forEach((r) => { r.checked = r.value === val; }); };

  function selectTab(id) {
    $$('.tab', el.dlg).forEach((b) => {
      const on = b.dataset.tab === id;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on);
    });
    $$('.panel[data-panel]', el.dlg).forEach((p) => { p.hidden = p.dataset.panel !== id; });
    fe.dlgBody.scrollTop = 0;
  }
  $$('.tab', el.dlg).forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

  function renderChips() {
    fe.chips.replaceChildren(...PRESETS.map((n) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.min = n;
      b.textContent = `${n} ${t('min_short')}`;
      return b;
    }));
  }
  function renderSegRows() {
    const multi = draftSegs.length > 1;
    fe.timebox.classList.toggle('multi', multi);
    fe.segList.replaceChildren(...draftSegs.map((g, i) => {
      const row = document.createElement('div');
      row.className = 'segrow' + (multi ? ' multi' : '');
      if (multi) {
        const name = document.createElement('input');
        name.type = 'text'; name.className = 'seg-name'; name.maxLength = 40; name.autocomplete = 'off';
        name.value = g.name; name.placeholder = `${t('stage')} ${i + 1}`; name.dataset.i = i;
        row.append(name);
      }
      const dur = document.createElement('input');
      dur.type = 'text'; dur.className = 'seg-dur'; dur.inputMode = 'numeric'; dur.autocomplete = 'off';
      dur.value = fmt(g.duration); dur.placeholder = '3:00'; dur.dataset.i = i;
      dur.setAttribute('aria-label', t('duration'));
      row.append(dur);
      if (multi) {
        const rm = document.createElement('button');
        rm.type = 'button'; rm.className = 'icon-btn'; rm.dataset.remove = i;
        rm.setAttribute('aria-label', t('remove_stage')); rm.textContent = '×';
        row.append(rm);
      }
      return row;
    }));
    fe.rowAuto.hidden = !multi;
    fe.segHelp.hidden = !multi;
    activeRow = Math.min(activeRow, draftSegs.length - 1);
  }
  function updateModeUI() {
    const stopwatch = getRadio('mode') === 'stopwatch';
    fe.countdownOpts.hidden = stopwatch;
    fe.lblWarn.textContent = t(stopwatch ? 'marks' : 'warns');
    fe.helpWarn.textContent = t(stopwatch ? 'marks_help' : 'warns_help');
    fe.warn.placeholder = stopwatch ? '60, 180' : '60, 15';
  }
  function fillForm() {
    setRadio('mode', settings.mode);
    draftSegs = settings.segments.map((g) => ({ ...g }));
    activeRow = 0;
    renderSegRows();
    renderChips();
    fe.auto.checked = settings.autoAdvance;
    setRadio('after', settings.overtime ? 'overtime' : 'label');
    fe.end.value = settings.endText;
    fe.end.placeholder = t('default_end');
    fe.warn.value = settings.warns.join(', ');
    fe.warnSound.checked = settings.warnSound;
    fe.endSound.checked = settings.endSound;
    fe.tick.checked = settings.tick;
    fe.flash.checked = settings.flash;
    fe.volume.value = settings.volume;
    fe.title.value = settings.title;
    fe.title.placeholder = t('default_title');
    setRadio('theme', settings.theme);
    accentCustom = !!settings.accent;
    fe.accent.value = settings.accent || ACCENT[resolveTheme()];
    fe.orn.checked = settings.ornament;
    fe.lang.value = langOf();
    fe.linkOut.hidden = true;
    fe.btnCopy.textContent = t('copy_link');
    updateModeUI();
  }
  function collectForm() {
    return sanitize({
      ...settings,
      mode: getRadio('mode'),
      segments: draftSegs,
      autoAdvance: fe.auto.checked,
      overtime: getRadio('after') === 'overtime',
      endText: fe.end.value.trim(),
      warns: parseList(fe.warn.value),
      warnSound: fe.warnSound.checked,
      endSound: fe.endSound.checked,
      tick: fe.tick.checked,
      flash: fe.flash.checked,
      volume: fe.volume.value,
      title: fe.title.value.trim(),
      theme: getRadio('theme'),
      accent: accentCustom ? fe.accent.value : '',
      ornament: fe.orn.checked,
      lang: fe.lang.value,
    });
  }
  /* папярэдні прагляд мовы, тэмы і акцэнту, пакуль дыялог адкрыты */
  function previewLook() {
    const s = collectForm();
    applyLang(s);
    applyTheme(s);
    setStatus(T.status);
    renderMeta();
    renderChips();
    renderSegRows();
    updateModeUI();
    fe.end.placeholder = t('default_end');
    fe.title.placeholder = t('default_title');
    fe.btnCopy.textContent = t('copy_link');
  }

  function openSettings() {
    if (el.dlg.open) return;
    savedNow = false;
    fillForm();
    selectTab('time');
    showUI();
    el.dlg.showModal();
    const first = $('.seg-dur', fe.segList);
    if (first && getRadio('mode') === 'countdown') { first.focus(); first.select(); }
  }
  function closeSettings() { if (el.dlg.open) el.dlg.close(); }

  /* этапы */
  fe.segList.addEventListener('input', (e) => {
    const i = +e.target.dataset.i;
    if (e.target.classList.contains('seg-name')) draftSegs[i].name = e.target.value;
    if (e.target.classList.contains('seg-dur')) { const d = parseDuration(e.target.value); if (d) draftSegs[i].duration = Math.min(MAX_SEC, d); }
  });
  fe.segList.addEventListener('change', (e) => {
    if (!e.target.classList.contains('seg-dur')) return;
    const i = +e.target.dataset.i;
    const d = parseDuration(e.target.value);
    if (d) draftSegs[i].duration = Math.min(MAX_SEC, d);
    e.target.value = fmt(draftSegs[i].duration);
  });
  fe.segList.addEventListener('focusin', (e) => { if (e.target.dataset.i != null) activeRow = +e.target.dataset.i; });
  fe.segList.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (!rm) return;
    draftSegs.splice(+rm.dataset.remove, 1);
    renderSegRows();
  });
  $('#btn-add-seg').addEventListener('click', () => {
    if (draftSegs.length >= 20) return;
    draftSegs.push({ name: '', duration: draftSegs[draftSegs.length - 1].duration });
    renderSegRows();
    const inputs = $$('.seg-name', fe.segList);
    if (inputs.length) inputs[inputs.length - 1].focus();
  });
  fe.chips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    draftSegs[activeRow].duration = +chip.dataset.min * 60;
    const dur = $$('.seg-dur', fe.segList)[activeRow];
    if (dur) dur.value = fmt(draftSegs[activeRow].duration);
  });

  el.form.addEventListener('change', (e) => {
    if (e.target.name === 'mode') updateModeUI();
    if (e.target.name === 'theme' || e.target.id === 'set-lang' || e.target.id === 'set-orn') previewLook();
    if (e.target.id === 'set-accent') { accentCustom = true; previewLook(); }
  });
  fe.accent.addEventListener('input', () => { accentCustom = true; previewLook(); });
  $('#btn-accent-reset').addEventListener('click', () => { accentCustom = false; fe.accent.value = ACCENT[resolveTheme(collectForm())]; previewLook(); });
  $('#btn-test-sound').addEventListener('click', () => beepsNow(3, { vol: volOf(+fe.volume.value) }));

  $('#btn-copy-link').addEventListener('click', async () => {
    const q = toParams(collectForm());
    const url = baseUrl() + (q ? '?' + q : '');
    fe.linkOut.value = url;
    fe.linkOut.hidden = false;
    try {
      await navigator.clipboard.writeText(url);
      fe.btnCopy.textContent = t('copied');
    } catch {
      fe.btnCopy.textContent = t('copy_fail');
      fe.linkOut.focus(); fe.linkOut.select();
    }
  });
  $('#btn-display').addEventListener('click', () => {
    const url = baseUrl() + '?display';
    const w = window.open(url, 'slam-timer-display');
    if (!w) { fe.linkOut.value = url; fe.linkOut.hidden = false; fe.linkOut.focus(); fe.linkOut.select(); }
  });
  $('#btn-defaults').addEventListener('click', () => {
    settings = sanitize({ lang: settings.lang });
    saveSettings(); applySettings(); syncSettings(); fillForm(); reset();
  });

  el.form.addEventListener('submit', () => {
    const prev = settings;
    settings = collectForm();
    savedNow = true;
    saveSettings();
    applySettings();
    syncSettings();
    const timingChanged = prev.mode !== settings.mode || prev.overtime !== settings.overtime
      || prev.segments.map((g) => g.duration).join() !== settings.segments.map((g) => g.duration).join();
    if (T.status === 'idle' || T.status === 'done' || timingChanged) reset();
    else { loadSegment(); scheduleSounds(); armFallback(); render(); }
  });
  $('#btn-cancel').addEventListener('click', closeSettings);
  $('#btn-close').addEventListener('click', closeSettings);
  el.dlg.addEventListener('close', () => {
    if (!savedNow) applySettings();            // адмяніць папярэдні прагляд
    showUI();
  });

  /* ============================================================
     Кнопкі і клавіятура
     ============================================================ */
  el.btnToggle.addEventListener('click', toggle);
  el.btnNext.addEventListener('click', () => nextSegment(false));
  $('#btn-restart').addEventListener('click', restart);
  $('#btn-reset').addEventListener('click', () => reset());
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-full').addEventListener('click', toggleFullscreen);
  /* здымаем фокус, каб Space / Enter не націскалі кнопку другі раз */
  $$('button', el.controls).forEach((b) => b.addEventListener('click', () => b.blur()));

  /* па фізічных клавішах (e.code) — працуе ў любой раскладцы */
  window.addEventListener('keydown', (e) => {
    if (el.dlg.open || e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.code) {
      case 'Space': e.preventDefault(); toggle(); break;
      case 'Enter': case 'NumpadEnter': e.preventDefault(); restart(); break;
      case 'KeyR': if (e.shiftKey) firstSegment(); else reset(); break;
      case 'KeyF': toggleFullscreen(); break;
      case 'KeyS': case 'Comma': openSettings(); break;
      case 'KeyM': toggleMute(); break;
      case 'ArrowUp': e.preventDefault(); adjust(60); break;
      case 'ArrowDown': e.preventDefault(); adjust(-60); break;
      case 'ArrowRight': e.preventDefault(); adjust(10); break;
      case 'ArrowLeft': e.preventDefault(); adjust(-10); break;
      case 'KeyN': case 'PageDown': e.preventDefault(); nextSegment(false); break;
      case 'KeyP': case 'PageUp': e.preventDefault(); prevSegment(); break;
      case 'Home': e.preventDefault(); firstSegment(); break;
      default:
        if (/^(Digit|Numpad)\d$/.test(e.code)) { const n = +e.code.slice(-1); quickSet(n === 0 ? 10 : n); }
    }
  });

  /* разблакоўка гуку на першы жэст карыстальніка */
  const unlock = () => { audioInit(); };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  /* ============================================================
     Старт
     ============================================================ */
  if (isDisplay) body.classList.add('display');
  settings = sanitize(loadStored());
  const overrides = fromParams(params);
  if (Object.keys(overrides).length) settings = sanitize({ ...settings, ...overrides });
  applySettings();
  reset({ silent: true });
  showUI();
  if (bc) bc.postMessage({ type: 'hello' });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
})();
