# Slam Timer

[Беларуская](README.md) · [English](README.en.md)

A fullscreen countdown timer for poetry slams, open mics, pitch sessions and any stage performance with a time limit. Big digits readable from the back row, an ornament in the style of Belarusian embroidery (vyshyvanka), a warning before the end and a signal when time is up.

**Live:** https://timer.itbeard.com

![Timer in the dark theme](screenshots/dark.jpg)

| Light theme | Final seconds | Time's up |
|---|---|---|
| ![Light theme](screenshots/light.jpg) | ![Warning: red digits](screenshots/warn.jpg) | ![Time out message](screenshots/timeout.jpg) |

## Features

- **Huge digits** that fill the screen, with a progress "thread" underneath that shortens as time passes.
- **Warning** a configurable number of seconds before the end (15 by default): the digits turn red and pulse, and three short beeps play.
- **Time's up:** a *Time out* message and five beeps.
- **Settings** without reloading: duration up to 99:59, warning threshold, sounds on and off, on-screen title, dark or light theme. Settings persist in the browser.
- **Keyboard control** by physical key position, so it works in any keyboard layout.
- **Controls and cursor hide** after three seconds of inactivity, leaving only the timer on screen.
- **The screen stays on** while counting (Wake Lock API).
- **Accurate timing.** The countdown is based on `performance.now()`, so it does not drift and catches up correctly after the tab was in the background.
- **No dependencies, no build step:** one HTML, one CSS and one JS file. Sounds are synthesized with Web Audio. The ornament is generated as SVG from a text cross-stitch chart.

## Keys

| Key | Action |
|---|---|
| `Space` | Start / pause |
| `Enter` | Restart (reset and start immediately) |
| `R` | Reset |
| `F` | Toggle fullscreen |
| `S` or `,` | Settings |
| `Esc` | Close settings |

Shortcuts are bound to physical key positions, so `R`, `F` and `S` work in Cyrillic layouts too.

## Interface language

The interface is currently in Belarusian. Here is what the buttons and settings mean:

| On screen | Meaning |
|---|---|
| Старт / Паўза / Далей | Start / Pause / Resume |
| Перазапуск | Restart |
| Скід | Reset |
| Налады | Settings |
| На ўвесь экран | Fullscreen |
| Хвіліны / Секунды | Minutes / Seconds |
| Сігнал за столькі секунд да канца | Warn this many seconds before the end |
| Тры «пікі» перад канцом | Three beeps before the end |
| Пяць «пікаў», калі час скончыўся | Five beeps when time is up |
| Загаловак на экране | On-screen title |
| Тэма: Цёмная / Светлая | Theme: Dark / Light |
| Праверыць гук | Test sound |
| Адмена / Захаваць | Cancel / Save |

## Running an event

1. Open https://timer.itbeard.com on the laptop connected to the projector or TV.
2. Press `S`, set the time limit (for example 3:00 with a 15-second warning) and check the sound with «Праверыць гук» (Test sound).
3. Press `F` to go fullscreen.
4. Before each performer: `Enter` to restart, or `Space` to start.

Tips:

- Browsers do not play audio until the page has received at least one click or key press. The first `Space` unlocks it, but test the sound beforehand.
- The Playfair Display font is loaded from Google Fonts. The timer works offline, but the digits fall back to the system serif font.
- Safari on iPhone does not support fullscreen for web pages. iPad, Android and desktops work fine.

## Running locally

Download the repository and open `index.html` in a browser. No server and no build step are needed.

```bash
git clone https://github.com/it-beard/slam-timer.git
open slam-timer/index.html
```

To host your own copy, fork the repository and enable GitHub Pages for the `main` branch (Settings → Pages).

## Customizing

- **Colors** are CSS variables in `:root` and `:root[data-theme="light"]` at the top of `style.css`.
- **Ornament** is the `MOTIF` array in `script.js`: `#` is the main color, `o` the secondary color, `.` is empty. The chart repeats horizontally.
- **Defaults** (duration, warning, title) are in the `DEFAULTS` object in `script.js`.
- **UI texts** live in `index.html`, plus the start button labels in the `setStatus` function in `script.js`.

## Structure

```
index.html   markup and the settings dialog
style.css    styles, themes, animations
script.js    timer, sound, ornament, keyboard, settings
```

## Browser support

A modern browser with `<dialog>` support is required: Chrome and Edge 37+, Firefox 98+, Safari 15.4+. Wake Lock works in Chrome, Edge, Safari 16.4+ and Firefox 126+. In other browsers the timer still works, but the screen may turn off after the system timeout.
