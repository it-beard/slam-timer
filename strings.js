/* ============================================================
   Пераклады інтэрфейсу.
   Каб дадаць мову: скапіюйце блок «en», перакладзіце радкі
   і дадайце <option> у select#set-lang у index.html.
   Па змаўчанні — беларуская; іншая выбіраецца ў наладах
   або параметрам ?lang=xx.
   ============================================================ */
window.SLAM_I18N = {
  be: {
    name: 'Беларуская',
    default_title: 'Паэтычны слэм',
    default_end: 'Час выйшаў',

    start: 'Старт', pause: 'Паўза', resume: 'Працягнуць', restart: 'Перазапуск', reset: 'Скід',
    next: 'Наступны', settings: 'Налады', fullscreen: 'На ўвесь экран', controls: 'Кіраванне таймерам',
    hint: 'Space — старт / паўза · Enter — перазапуск · R — скід · F — экран · S — налады',

    stage: 'Этап', min_short: 'хв',
    copied: 'Спасылка скапіяваная', copy_fail: 'Скапіюйце спасылку ўручную',
    muted: 'Гук выключаны', unmuted: 'Гук уключаны',
    live_running: 'Адлік ідзе', live_paused: 'Паўза', live_warn: 'Засталося мала часу', live_end: 'Час выйшаў',

    tab_time: 'Час', tab_signals: 'Сігналы', tab_look: 'Выгляд', tab_more: 'Яшчэ',

    mode: 'Рэжым', mode_countdown: 'Адлік', mode_stopwatch: 'Секундамер',
    duration: 'Працягласць', stage_name: 'Назва этапу', add_stage: 'Дадаць этап', remove_stage: 'Выдаліць этап',
    stages_help: 'Этапы ідуць адзін за адным: напрыклад, выступ 3:00, потым журы 1:00.',
    auto_advance: 'Аўтаматычна пачынаць наступны этап',
    after_zero: 'Пасля нуля', after_label: 'Надпіс', after_over: 'Лічыць перабор',
    end_text: 'Надпіс у канцы',

    warns: 'Папярэджанні, секунд да канца', marks: 'Сігналы, секунд ад старту',
    warns_help: 'Праз коску: 60, 15. Апошняе робіць лічбы чырвонымі з пульсацыяй, ранейшыя — залатымі.',
    marks_help: 'Праз коску: 60, 180. Апошняя адзнака робіць лічбы чырвонымі.',
    warn_sound: 'Гук пры папярэджанні', end_sound: 'Гук у канцы',
    tick: 'Цікаць апошнія 10 секунд', flash: 'Успышка экрана ў канцы',
    volume: 'Гучнасць', test: 'Праверыць',

    title_lbl: 'Загаловак на экране', theme: 'Тэма',
    theme_dark: 'Цёмная', theme_light: 'Светлая', theme_system: 'Сістэмная',
    accent: 'Акцэнтны колер', reset_accent: 'Вярнуць', ornament: 'Арнамент', language: 'Мова',

    copy_link: 'Скапіяваць спасылку з наладамі',
    copy_link_help: 'Адкрые таймер з гэтымі наладамі на любой прыладзе.',
    open_display: 'Адкрыць экран для залы',
    open_display_help: 'Другое акно без кнопак. Перацягніце яго на праектар і націсніце F. Кіруйце адсюль.',
    keys: 'Клавішы',
    k_space: 'Старт / паўза', k_enter: 'Перазапуск', k_r: 'Скід', k_shift_r: 'Да першага этапу',
    k_f: 'На ўвесь экран', k_s: 'Налады', k_m: 'Выключыць / уключыць гук',
    k_digits: 'Хуткі выбар хвілін (0 — дзесяць)', k_updown: '± 1 хвіліна', k_leftright: '± 10 секунд',
    k_next: 'Наступны этап', k_prev: 'Папярэдні этап', k_esc: 'Закрыць налады',

    defaults: 'Скінуць налады', cancel: 'Адмена', save: 'Захаваць', close: 'Закрыць',
  },

  en: {
    name: 'English',
    default_title: 'Poetry slam',
    default_end: 'Time out',

    start: 'Start', pause: 'Pause', resume: 'Resume', restart: 'Restart', reset: 'Reset',
    next: 'Next', settings: 'Settings', fullscreen: 'Fullscreen', controls: 'Timer controls',
    hint: 'Space — start / pause · Enter — restart · R — reset · F — fullscreen · S — settings',

    stage: 'Stage', min_short: 'min',
    copied: 'Link copied', copy_fail: 'Copy the link manually',
    muted: 'Sound off', unmuted: 'Sound on',
    live_running: 'Timer running', live_paused: 'Paused', live_warn: 'Time is almost up', live_end: 'Time is up',

    tab_time: 'Time', tab_signals: 'Signals', tab_look: 'Look', tab_more: 'More',

    mode: 'Mode', mode_countdown: 'Countdown', mode_stopwatch: 'Stopwatch',
    duration: 'Duration', stage_name: 'Stage name', add_stage: 'Add stage', remove_stage: 'Remove stage',
    stages_help: 'Stages run one after another: for example, performance 3:00, then judges 1:00.',
    auto_advance: 'Start the next stage automatically',
    after_zero: 'After zero', after_label: 'Message', after_over: 'Count overtime',
    end_text: 'End message',

    warns: 'Warnings, seconds before the end', marks: 'Signals, seconds from start',
    warns_help: 'Comma-separated: 60, 15. The last one turns the digits red and pulsing, earlier ones gold.',
    marks_help: 'Comma-separated: 60, 180. The last mark turns the digits red.',
    warn_sound: 'Sound on warning', end_sound: 'Sound at the end',
    tick: 'Tick during the last 10 seconds', flash: 'Flash the screen at the end',
    volume: 'Volume', test: 'Test',

    title_lbl: 'On-screen title', theme: 'Theme',
    theme_dark: 'Dark', theme_light: 'Light', theme_system: 'System',
    accent: 'Accent color', reset_accent: 'Reset', ornament: 'Ornament', language: 'Language',

    copy_link: 'Copy link with these settings',
    copy_link_help: 'Opens the timer with these settings on any device.',
    open_display: 'Open audience screen',
    open_display_help: 'A second window without buttons. Drag it to the projector and press F. Control the timer from here.',
    keys: 'Keyboard',
    k_space: 'Start / pause', k_enter: 'Restart', k_r: 'Reset', k_shift_r: 'Back to the first stage',
    k_f: 'Fullscreen', k_s: 'Settings', k_m: 'Mute / unmute',
    k_digits: 'Quick minutes (0 = ten)', k_updown: '± 1 minute', k_leftright: '± 10 seconds',
    k_next: 'Next stage', k_prev: 'Previous stage', k_esc: 'Close settings',

    defaults: 'Reset settings', cancel: 'Cancel', save: 'Save', close: 'Close',
  },
};
