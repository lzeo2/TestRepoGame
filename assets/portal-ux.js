/* UNBLOCKMATH // ARCADE -- portal UX layer (vanilla JS, offline, defer).
 * A11y/keyboard enhancements over the minified React bundle.
 * Also injects SVG gameplay icons into thumbnail areas. */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function textOf(el) { return el ? (el.textContent || '').trim() : ''; }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0;
  }

  function visibleCards() {
    return $$('.bento-grid .game-card').filter(isVisible);
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function ensureSkipLink() {
    var link = $('.skip-link');
    if (!link) {
      link = document.createElement('a');
      link.className = 'skip-link';
      link.href = '#main-content';
      link.textContent = 'Skip to content';
      document.body.insertBefore(link, document.body.firstChild);
    }
    if (!link.getAttribute('data-ux-bound')) {
      link.setAttribute('data-ux-bound', '1');
      link.addEventListener('click', function (e) {
        var main = document.getElementById('main-content');
        if (!main) return;
        e.preventDefault();
        main.setAttribute('tabindex', '-1');
        main.focus();
      });
    }
  }

  function ensureMainTarget() {
    if (document.getElementById('main-content')) return;
    if (!$('.app')) return;
    var main = document.createElement('main');
    main.id = 'main-content';
    main.className = 'app__main app__main--fallback';
    main.setAttribute('tabindex', '-1');
    main.setAttribute('data-ux-fallback', '1');
    var root = document.getElementById('root') || document.body;
    root.appendChild(main);
  }

  /* ================================================================
     SVG GAME ICONS — gameplay visuals for each game thumbnail.
     White stroke on transparent background; category solid color
     shows through from the .game-card__thumb CSS.
     ================================================================ */
  var GAME_ICONS = {
    /* --- Classic --- */
    '2048': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="10" width="24" height="24" rx="3"/><rect x="46" y="10" width="24" height="24" rx="3"/><rect x="10" y="46" width="24" height="24" rx="3"/><rect x="46" y="46" width="24" height="24" rx="3"/><text x="22" y="27" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff" stroke="none">2</text><text x="58" y="27" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff" stroke="none">4</text><text x="22" y="63" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff" stroke="none">8</text><text x="58" y="63" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff" stroke="none">16</text></svg>',
    'Snake': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 52 Q16 36 32 36 Q48 36 48 20 Q48 8 64 8"/><circle cx="67" cy="8" r="2.5" fill="#fff"/><circle cx="16" cy="56" r="3.5" fill="#fff" stroke="none"/></svg>',
    'Chrome Dino': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 24 Q24 14 36 12 Q48 10 50 20 Q52 28 46 32 L42 32 L42 44 L44 44 L44 52 L38 52 L38 44 L34 44 L34 52 L28 52 L28 44 L24 44 Z" fill="#fff" fill-opacity="0.15"/><path d="M20 64 L60 64"/><path d="M40 64 L40 68 L48 68" stroke-width="2"/><path d="M52 64 L52 68 L60 68" stroke-width="2"/></svg>',
    'Breakout': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="14" height="8" rx="1.5"/><rect x="26" y="12" width="14" height="8" rx="1.5"/><rect x="44" y="12" width="14" height="8" rx="1.5"/><rect x="62" y="12" width="14" height="8" rx="1.5"/><rect x="8" y="24" width="14" height="8" rx="1.5"/><rect x="26" y="24" width="14" height="8" rx="1.5"/><rect x="44" y="24" width="14" height="8" rx="1.5"/><rect x="62" y="24" width="14" height="8" rx="1.5"/><line x1="18" y1="68" x2="62" y2="68" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="44" r="3.5" fill="#fff"/></svg>',
    'Hextris': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="40,14 56,23 56,41 40,50 24,41 24,23"/><polygon points="40,30 48,34.5 48,43.5 40,48 32,43.5 32,34.5"/></svg>',
    'Flappy Bird': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="30" cy="40" rx="12" ry="10" fill="#fff" fill-opacity="0.15"/><circle cx="36" cy="37" r="2" fill="#fff"/><path d="M42 38 L50 35 L42 41"/><path d="M20 32 Q16 26 22 24" stroke-width="2"/><path d="M22 50 L14 56 M26 52 L20 60"/></svg>',
    'Fruit Ninja': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="38" r="14"/><path d="M40 24 L40 52" stroke-width="2" stroke-dasharray="3 2"/><path d="M26 54 L54 54" stroke-width="2"/><path d="M22 62 L58 62" stroke-width="1.5" opacity="0.5"/></svg>',
    'Tile Merge': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="14" width="22" height="22" rx="3"/><rect x="44" y="14" width="22" height="22" rx="3"/><rect x="14" y="44" width="22" height="22" rx="3"/><rect x="44" y="44" width="22" height="22" rx="3"/><path d="M25 36 L25 44" stroke-width="2"/><path d="M25 44 L36 44" stroke-width="2"/><path d="M55 36 L55 44" stroke-width="2"/><path d="M55 44 L66 44" stroke-width="2"/></svg>',
    'Match Flip': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="18" width="22" height="30" rx="3" transform="rotate(-8 23 33)"/><rect x="46" y="18" width="22" height="30" rx="3" transform="rotate(8 57 33)"/><text x="23" y="38" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff" stroke="none">?</text><text x="57" y="38" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff" stroke="none">?</text></svg>',
    'Brick Dash': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="16" height="8" rx="1.5" fill="#fff" fill-opacity="0.2"/><rect x="28" y="12" width="16" height="8" rx="1.5" fill="#fff" fill-opacity="0.3"/><rect x="48" y="12" width="16" height="8" rx="1.5" fill="#fff" fill-opacity="0.2"/><rect x="8" y="24" width="16" height="8" rx="1.5" fill="#fff" fill-opacity="0.3"/><rect x="28" y="24" width="16" height="8" rx="1.5" fill="#fff" fill-opacity="0.2"/><rect x="48" y="24" width="16" height="8" rx="1.5" fill="#fff" fill-opacity="0.3"/><line x1="18" y1="66" x2="62" y2="66" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="46" r="3" fill="#fff"/></svg>',
    'Pong': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><rect x="12" y="22" width="5" height="22" rx="2" fill="#fff"/><rect x="63" y="36" width="5" height="22" rx="2" fill="#fff"/><circle cx="40" cy="40" r="4" fill="#fff"/><line x1="40" y1="8" x2="40" y2="72" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/></svg>',
    'Tetris': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><rect x="14" y="46" width="12" height="12" fill="#fff" fill-opacity="0.3"/><rect x="26" y="46" width="12" height="12" fill="#fff" fill-opacity="0.3"/><rect x="38" y="46" width="12" height="12" fill="#fff" fill-opacity="0.3"/><rect x="50" y="46" width="12" height="12" fill="#fff" fill-opacity="0.3"/><rect x="14" y="34" width="12" height="12" fill="#fff" fill-opacity="0.3"/><rect x="26" y="34" width="12" height="12" fill="#fff" fill-opacity="0.3"/><rect x="38" y="34" width="12" height="12" fill="#fff" fill-opacity="0.3"/><rect x="26" y="22" width="12" height="12" fill="#fff" fill-opacity="0.2"/><rect x="38" y="22" width="12" height="12" fill="#fff" fill-opacity="0.2"/><rect x="30" y="6" width="12" height="12" fill="#fff" fill-opacity="0.15" transform="rotate(0 36 12)"/></svg>',
    'Memory': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="14" width="18" height="24" rx="3"/><text x="17" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="none">♠</text><rect x="31" y="14" width="18" height="24" rx="3" fill="#fff" fill-opacity="0.15"/><text x="40" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="none">♦</text><rect x="8" y="42" width="18" height="24" rx="3" fill="#fff" fill-opacity="0.15"/><text x="17" y="58" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="none">♣</text><rect x="31" y="42" width="18" height="24" rx="3"/><text x="40" y="58" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="none">♥</text></svg>',
    'Cut the Rope': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10 L40 40"/><path d="M60 10 L40 40"/><circle cx="40" cy="50" r="10" fill="#fff" fill-opacity="0.2"/><path d="M34 48 L40 54 L46 48" fill="none" stroke-width="2"/></svg>',
    'Story Adventure': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20 L16 62 Q16 66 20 66 L54 66 Q58 66 58 62 L58 20 Q58 16 54 16 L20 16 Q16 16 16 20Z" fill="#fff" fill-opacity="0.1"/><line x1="24" y1="28" x2="50" y2="28"/><line x1="24" y1="36" x2="50" y2="36"/><line x1="24" y1="44" x2="42" y2="44"/><path d="M54 56 L64 46 L64 56 Z" fill="#fff" fill-opacity="0.3"/></svg>',
    'Lights Out': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="26" cy="26" r="8" fill="#fff" fill-opacity="0.4"/><circle cx="54" cy="26" r="8" fill="#fff" fill-opacity="0.1"/><circle cx="26" cy="54" r="8" fill="#fff" fill-opacity="0.1"/><circle cx="54" cy="54" r="8" fill="#fff" fill-opacity="0.4"/></svg>',
    'Sudoku': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"><rect x="10" y="10" width="60" height="60" stroke-width="2.5"/><line x1="30" y1="10" x2="30" y2="70" stroke-width="2.5"/><line x1="50" y1="10" x2="50" y2="70" stroke-width="2.5"/><line x1="10" y1="30" x2="70" y2="30" stroke-width="2.5"/><line x1="10" y1="50" x2="70" y2="50" stroke-width="2.5"/><text x="20" y="24" font-size="10" fill="#fff" stroke="none" text-anchor="middle">5</text><text x="40" y="44" font-size="10" fill="#fff" stroke="none" text-anchor="middle">9</text><text x="60" y="64" font-size="10" fill="#fff" stroke="none" text-anchor="middle">1</text></svg>',
    'Math Quiz': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><text x="16" y="32" font-size="22" font-weight="bold" fill="#fff" stroke="none">7</text><text x="30" y="32" font-size="22" fill="#fff" stroke="none">+</text><text x="48" y="32" font-size="22" font-weight="bold" fill="#fff" stroke="none">3</text><line x1="16" y1="40" x2="64" y2="40"/><text x="40" y="60" font-size="26" font-weight="bold" fill="#fff" stroke="none">?</text></svg>',

    /* --- Action --- */
    'Ovo': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="36" cy="18" r="6" fill="#fff" fill-opacity="0.2"/><path d="M36 24 L36 46 L28 60 L36 56 L44 60 L36 46"/><line x1="24" y1="36" x2="48" y2="36" stroke-width="2.5"/></svg>',
    'Run 3': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="40,12 64,28 64,52 40,68 16,52 16,28" fill="#fff" fill-opacity="0.08"/><circle cx="40" cy="40" r="4" fill="#fff"/><path d="M40 36 L40 22"/><path d="M44 40 L56 40"/><path d="M36 40 L24 40"/><path d="M43 44 L52 54"/><path d="M37 44 L28 54"/></svg>',
    'Slope': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 60 L68 20"/><circle cx="50" cy="32" r="5" fill="#fff" fill-opacity="0.3"/><rect x="14" y="14" width="8" height="14" rx="1" fill="#fff" fill-opacity="0.2" transform="rotate(15 18 21)"/><rect x="30" y="10" width="8" height="14" rx="1" fill="#fff" fill-opacity="0.2" transform="rotate(15 34 17)"/><rect x="46" y="14" width="8" height="14" rx="1" fill="#fff" fill-opacity="0.2" transform="rotate(15 50 21)"/></svg>',
    'Age of War': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M40 10 L54 26 L54 46 L40 56 L26 46 L26 26 Z" fill="#fff" fill-opacity="0.1"/><path d="M40 20 L40 48" stroke-width="3"/><path d="M28 34 L52 34" stroke-width="3"/></svg>',
    'Eaglercraft': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="20" height="20" rx="2" fill="#fff" fill-opacity="0.15"/><rect x="44" y="16" width="20" height="20" rx="2" fill="#fff" fill-opacity="0.1"/><rect x="16" y="44" width="20" height="20" rx="2" fill="#fff" fill-opacity="0.1"/><rect x="44" y="44" width="20" height="20" rx="2" fill="#fff" fill-opacity="0.15"/><circle cx="36" cy="26" r="2" fill="#fff"/><circle cx="26" cy="26" r="2" fill="#fff"/></svg>',
    'FPS': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="40" r="16" stroke-width="1.5"/><line x1="40" y1="20" x2="40" y2="60" stroke-width="1" opacity="0.5"/><line x1="20" y1="40" x2="60" y2="40" stroke-width="1" opacity="0.5"/><circle cx="40" cy="40" r="2" fill="#fff"/></svg>',
    'Boss Rush': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="32" r="14" fill="#fff" fill-opacity="0.1"/><path d="M30 28 L36 28" stroke-width="3"/><path d="M44 28 L50 28" stroke-width="3"/><path d="M32 36 Q40 44 48 36"/><path d="M26 18 L22 10"/><path d="M54 18 L58 10"/></svg>',
    'Star Catcher': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="40,12 44,28 60,28 47,38 52,54 40,44 28,54 33,38 20,28 36,28" fill="#fff" fill-opacity="0.2"/><circle cx="40" cy="52" r="10" stroke-width="2"/><path d="M36 48 L44 56" stroke-width="1.5"/></svg>',
    'Whack-a-Mole': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="40" cy="50" rx="14" ry="8" fill="#fff" fill-opacity="0.15"/><circle cx="40" cy="38" r="8" fill="#fff" fill-opacity="0.2"/><circle cx="37" cy="36" r="1.5" fill="#fff"/><circle cx="43" cy="36" r="1.5" fill="#fff"/><line x1="56" y1="20" x2="44" y2="34" stroke-width="3.5" stroke-linecap="round"/></svg>',
    'Gladihoppers': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="34" cy="18" r="6" fill="#fff" fill-opacity="0.15"/><path d="M34 24 L34 46"/><path d="M22 34 L46 34"/><path d="M34 46 L24 62"/><path d="M34 46 L44 62"/><path d="M46 30 L60 22 L60 36 Z" fill="#fff" fill-opacity="0.15"/></svg>',
    'Burrito Bison': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="36" cy="44" rx="18" ry="10" fill="#fff" fill-opacity="0.15"/><circle cx="30" cy="40" r="2" fill="#fff"/><circle cx="42" cy="40" r="2" fill="#fff"/><path d="M32 48 L40 48"/><path d="M58 24 L66 18 M62 28 L72 24 M56 30 L62 28" stroke-width="2"/></svg>',
    'Subway Surfers': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="36" cy="18" r="5" fill="#fff" fill-opacity="0.2"/><path d="M36 23 L36 44"/><path d="M26 32 L46 32"/><path d="M36 44 L28 58"/><path d="M36 44 L44 58"/><path d="M20 62 L60 62"/><rect x="44" y="50" width="12" height="12" rx="1" fill="#fff" fill-opacity="0.1"/></svg>',
    'Super Hot': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M40 14 L40 10" /><circle cx="40" cy="40" r="18" stroke-width="1.5" opacity="0.3"/><circle cx="40" cy="40" r="10" stroke-width="1.5" opacity="0.5"/><circle cx="40" cy="40" r="3" fill="#fff"/></svg>',
    '10 Minutes Till Dawn': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="40" r="14" fill="#fff" fill-opacity="0.08"/><path d="M40 26 L40 54" stroke-width="2"/><path d="M26 40 L54 40" stroke-width="2"/><circle cx="40" cy="40" r="4" fill="#fff" fill-opacity="0.3"/><path d="M52 20 L56 16 M52 28 L58 26 M20 52 L16 56 M28 52 L26 58" stroke-width="2"/></svg>',
    'Fancy Pants Adventure 3': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="18" r="6"/><path d="M32 24 L32 42"/><path d="M20 34 L44 34"/><path d="M32 42 L24 58"/><path d="M32 42 L40 58"/></svg>',
    'Vex 7': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="34" cy="18" r="5" fill="#fff" fill-opacity="0.2"/><path d="M34 23 L34 42"/><path d="M24 32 L44 32"/><path d="M34 42 L26 58"/><path d="M34 42 L42 58"/><path d="M50 14 L50 62" stroke-width="1.5" opacity="0.4"/><path d="M50 40 L60 34 M50 48 L60 42" stroke-width="2"/></svg>',
    'Geometry Dash Lite': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="22" y="26" width="18" height="18" rx="2" fill="#fff" fill-opacity="0.2" transform="rotate(15 31 35)"/><line x1="12" y1="60" x2="68" y2="60" stroke-width="2"/><path d="M12 52 L22 44 L32 52 L42 44 L52 52 L62 44 L68 52" stroke-width="1.5" opacity="0.4"/></svg>',
    'Baldi\'s Basics': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="30" r="12" fill="#fff" fill-opacity="0.1"/><circle cx="36" cy="28" r="2" fill="#fff"/><circle cx="44" cy="28" r="2" fill="#fff"/><path d="M34 34 Q40 38 46 34"/><rect x="24" y="44" width="32" height="24" rx="2" fill="#fff" fill-opacity="0.08"/><line x1="30" y1="52" x2="50" y2="52" stroke-width="1.5"/><line x1="30" y1="58" x2="50" y2="58" stroke-width="1.5"/></svg>',
    'Temple Run 2': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="34" cy="16" r="5" fill="#fff" fill-opacity="0.2"/><path d="M34 21 L34 40"/><path d="M24 30 L44 30"/><path d="M34 40 L26 56"/><path d="M34 40 L42 56"/><path d="M12 60 L68 60"/><path d="M64 20 L64 56" stroke-width="1.5" opacity="0.4"/></svg>',
    'Last Lantern': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M36 40 L40 16 L44 40" fill="#fff" fill-opacity="0.2"/><circle cx="40" cy="40" r="4" fill="#fff" fill-opacity="0.4"/><path d="M40 44 L40 62"/><circle cx="40" cy="62" r="2" fill="#fff"/><circle cx="40" cy="40" r="14" stroke-width="1" stroke-dasharray="3 3" opacity="0.3"/></svg>',

    /* --- Sports --- */
    'Soccer Random': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="40" r="16" fill="#fff" fill-opacity="0.1"/><path d="M40 24 L48 32 L44 42 L36 42 L32 32 Z" fill="#fff" fill-opacity="0.2"/><path d="M40 24 L40 16"/><path d="M56 40 L64 40"/><path d="M24 40 L16 40"/><path d="M40 56 L40 64"/></svg>',
    'Basket Random': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="38" r="16"/><path d="M24 38 Q40 30 56 38"/><path d="M24 38 Q40 46 56 38"/><line x1="40" y1="22" x2="40" y2="54"/><path d="M30 28 Q40 38 30 48"/><path d="M50 28 Q40 38 50 48"/></svg>',
    'Volley Random': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="34" r="12"/><path d="M28 34 Q40 26 52 34"/><path d="M28 34 Q40 42 52 34"/><path d="M34 24 Q40 34 34 44"/><path d="M46 24 Q40 34 46 44"/><line x1="12" y1="56" x2="68" y2="56" stroke-width="2"/></svg>',
    'QWOP': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="36" cy="16" r="5" fill="#fff" fill-opacity="0.2"/><path d="M36 21 L36 42"/><path d="M24 30 L48 30"/><path d="M36 42 L22 58 L18 68"/><path d="M36 42 L48 58 L52 68"/><text x="20" y="76" font-size="8" fill="#fff" stroke="none" text-anchor="middle">Q</text><text x="36" y="76" font-size="8" fill="#fff" stroke="none" text-anchor="middle">W</text><text x="52" y="76" font-size="8" fill="#fff" stroke="none" text-anchor="middle">O</text><text x="68" y="76" font-size="8" fill="#fff" stroke="none" text-anchor="middle">P</text></svg>',
    'Paddle Duel': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><rect x="10" y="18" width="5" height="24" rx="2" fill="#fff"/><rect x="65" y="38" width="5" height="24" rx="2" fill="#fff"/><circle cx="40" cy="40" r="3.5" fill="#fff"/><line x1="40" y1="8" x2="40" y2="72" stroke-width="1" stroke-dasharray="4 4" opacity="0.3"/><text x="20" y="66" font-size="9" fill="#fff" stroke="none" text-anchor="middle">P1</text><text x="60" y="66" font-size="9" fill="#fff" stroke="none" text-anchor="middle">P2</text></svg>',
    'Retro Bowl': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="40" cy="40" rx="18" ry="12" fill="#fff" fill-opacity="0.1"/><path d="M30 34 L40 40 L50 34" stroke-width="2"/><path d="M36 26 Q40 18 44 26" stroke-width="2"/><path d="M40 18 L40 12" stroke-width="2"/></svg>',

    /* --- Strategy --- */
    'Tic Tac Toe': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><line x1="30" y1="16" x2="30" y2="64"/><line x1="50" y1="16" x2="50" y2="64"/><line x1="16" y1="30" x2="64" y2="30"/><line x1="16" y1="50" x2="64" y2="50"/><path d="M20 20 L28 28 M28 20 L20 28" stroke-width="2.5"/><circle cx="40" cy="40" r="5" stroke-width="2.5"/><path d="M52 52 L60 60 M60 52 L52 60" stroke-width="2.5"/></svg>',
    'Connect Four': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="10" width="60" height="60" rx="4"/><circle cx="25" cy="25" r="7" fill="#fff" fill-opacity="0.3"/><circle cx="55" cy="25" r="7" fill="#fff" fill-opacity="0.15"/><circle cx="25" cy="55" r="7" fill="#fff" fill-opacity="0.15"/><circle cx="55" cy="55" r="7" fill="#fff" fill-opacity="0.3"/><circle cx="40" cy="40" r="7" fill="#fff" fill-opacity="0.3"/><circle cx="40" cy="25" r="7" fill="#fff" fill-opacity="0.15"/><circle cx="25" cy="40" r="7" fill="#fff" fill-opacity="0.15"/><circle cx="55" cy="40" r="7" fill="#fff" fill-opacity="0.15"/><circle cx="40" cy="55" r="7" fill="#fff" fill-opacity="0.15"/></svg>',
    'Grid Heist': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><rect x="12" y="12" width="24" height="24" rx="2" fill="#fff" fill-opacity="0.2"/><rect x="44" y="12" width="24" height="24" rx="2"/><rect x="12" y="44" width="24" height="24" rx="2"/><rect x="44" y="44" width="24" height="24" rx="2" fill="#fff" fill-opacity="0.2"/><circle cx="64" cy="24" r="4" fill="#fff" fill-opacity="0.3"/><path d="M24 24 L56 24" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.4"/></svg>',
    'Queue Escape': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="22" cy="34" r="5" fill="#fff" fill-opacity="0.2"/><circle cx="38" cy="34" r="5" fill="#fff" fill-opacity="0.15"/><circle cx="54" cy="34" r="5" fill="#fff" fill-opacity="0.15"/><path d="M22 39 L22 52 L54 52 L54 39" stroke-width="1.5"/><path d="M54 28 L66 28 L66 56 L54 56" stroke-width="1.5"/><rect x="56" y="36" width="8" height="12" rx="1" fill="#fff" fill-opacity="0.2"/></svg>',
    'Papa\'s Pizzeria': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="36" r="16" fill="#fff" fill-opacity="0.1"/><path d="M40 20 L40 36 L54 36" fill="#fff" fill-opacity="0.15"/><circle cx="32" cy="30" r="2" fill="#fff" fill-opacity="0.3"/><circle cx="44" cy="26" r="2" fill="#fff" fill-opacity="0.3"/><circle cx="48" cy="38" r="2" fill="#fff" fill-opacity="0.3"/><path d="M26 58 L54 58" stroke-width="2"/></svg>',

    /* --- Puzzle --- */
    'Minesweeper': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="40" r="10" fill="#fff" fill-opacity="0.2"/><circle cx="40" cy="40" r="4" fill="#fff" fill-opacity="0.4"/><path d="M40 26 L40 20"/><path d="M40 54 L40 60"/><path d="M26 40 L20 40"/><path d="M54 40 L60 40"/><path d="M30 30 L26 26"/><path d="M50 50 L54 54"/><path d="M50 30 L54 26"/><path d="M30 50 L26 54"/></svg>',
    'Letter Boxed': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="40,12 64,28 64,56 40,72 16,56 16,28" fill="#fff" fill-opacity="0.08"/><text x="40" y="30" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="none">A</text><text x="58" y="48" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="none">B</text><text x="22" y="48" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff" stroke="none">C</text></svg>',

    /* --- Riddle --- */
    'Character Alsen': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="28" r="12" fill="#fff" fill-opacity="0.1"/><circle cx="36" cy="26" r="2" fill="#fff"/><circle cx="44" cy="26" r="2" fill="#fff"/><path d="M36 32 Q40 36 44 32"/><rect x="24" y="42" width="32" height="26" rx="3" fill="#fff" fill-opacity="0.08"/><line x1="30" y1="50" x2="50" y2="50" stroke-width="1.5"/><line x1="30" y1="56" x2="46" y2="56" stroke-width="1.5"/><line x1="30" y1="62" x2="42" y2="62" stroke-width="1.5"/></svg>',
    'Typing Speed': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="24" width="60" height="36" rx="4" fill="#fff" fill-opacity="0.08"/><rect x="16" y="30" width="8" height="6" rx="1"/><rect x="28" y="30" width="8" height="6" rx="1"/><rect x="40" y="30" width="8" height="6" rx="1"/><rect x="52" y="30" width="8" height="6" rx="1"/><rect x="16" y="40" width="8" height="6" rx="1"/><rect x="28" y="40" width="8" height="6" rx="1"/><rect x="40" y="40" width="8" height="6" rx="1"/><rect x="52" y="40" width="8" height="6" rx="1"/><rect x="22" y="50" width="36" height="6" rx="1"/><path d="M58 16 L64 10 M58 16 L64 22" stroke-width="1.5"/></svg>',

    /* --- Story --- */
    'A Dark Room': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="14" width="52" height="52" rx="3" fill="#fff" fill-opacity="0.05"/><path d="M36 54 L40 44 L44 54" stroke-width="2"/><path d="M34 52 Q40 38 46 52" fill="#fff" fill-opacity="0.15"/><circle cx="40" cy="34" r="3" fill="#fff" fill-opacity="0.2"/></svg>',
    'Stranded In Isekai': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="32" r="10" fill="#fff" fill-opacity="0.1"/><path d="M34 30 Q40 38 46 30"/><path d="M40 42 L40 58"/><path d="M30 64 Q40 54 50 64" fill="#fff" fill-opacity="0.08"/><path d="M52 20 L60 14 M52 26 L62 22" stroke-width="2"/></svg>',
    'Fleeing the Complex': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="12" width="44" height="56" rx="3" fill="#fff" fill-opacity="0.08"/><rect x="24" y="18" width="14" height="10" rx="1"/><rect x="42" y="18" width="14" height="10" rx="1"/><line x1="18" y1="36" x2="62" y2="36" stroke-width="1.5"/><path d="M30 44 L50 44" stroke-width="1.5"/><path d="M30 52 L46 52" stroke-width="1.5"/><circle cx="54" cy="54" r="4" fill="#fff" fill-opacity="0.2"/></svg>',
    'Infiltrating the Airship': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="40" cy="36" rx="26" ry="14" fill="#fff" fill-opacity="0.08"/><ellipse cx="40" cy="36" rx="20" ry="10" fill="#fff" fill-opacity="0.05"/><line x1="40" y1="50" x2="40" y2="62"/><path d="M32 62 L48 62"/><path d="M34 20 L34 14 L46 14 L46 20" stroke-width="1.5"/><circle cx="28" cy="36" r="3" fill="#fff" fill-opacity="0.2"/></svg>',

    /* --- Simulation --- */
    'BitLife': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="8" width="44" height="64" rx="6" fill="#fff" fill-opacity="0.08"/><line x1="26" y1="20" x2="54" y2="20" stroke-width="1.5"/><line x1="26" y1="30" x2="48" y2="30" stroke-width="1.5"/><line x1="26" y1="40" x2="52" y2="40" stroke-width="1.5"/><line x1="26" y1="50" x2="44" y2="50" stroke-width="1.5"/><circle cx="40" cy="66" r="3" stroke-width="1.5"/></svg>',

    /* --- Multiplayer --- */
    'House of Hazards': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 40 L40 18 L64 40"/><rect x="22" y="40" width="36" height="28" rx="2" fill="#fff" fill-opacity="0.08"/><rect x="34" y="52" width="12" height="16" rx="1"/><path d="M14 52 L10 58 M14 48 L8 42" stroke-width="2"/><path d="M66 52 L70 58 M66 48 L72 42" stroke-width="2"/></svg>',
  };

  /* Category fallback icons (for games without a specific icon) */
  var CATEGORY_ICONS = {
    'action': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M44 12 L28 42 L40 42 L36 68 L56 34 L44 34 Z" fill="#fff" fill-opacity="0.15"/></svg>',
    'classic': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><rect x="12" y="12" width="8" height="56" rx="3" fill="#fff" fill-opacity="0.2"/><rect x="60" y="12" width="8" height="56" rx="3" fill="#fff" fill-opacity="0.2"/><circle cx="40" cy="40" r="5" fill="#fff"/></svg>',
    'sports': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="40" cy="40" r="18"/><path d="M40 22 Q52 32 52 40 Q52 48 40 58 Q28 48 28 40 Q28 32 40 22"/><line x1="22" y1="40" x2="58" y2="40" stroke-width="1.5"/></svg>',
    'strategy': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M40 12 L40 52 M40 52 L28 64 M40 52 L52 64"/><circle cx="40" cy="12" r="5" fill="#fff" fill-opacity="0.2"/><circle cx="28" cy="64" r="3" fill="#fff" fill-opacity="0.15"/><circle cx="52" cy="64" r="3" fill="#fff" fill-opacity="0.15"/><circle cx="24" cy="28" r="3" fill="#fff" fill-opacity="0.15"/><circle cx="56" cy="28" r="3" fill="#fff" fill-opacity="0.15"/></svg>',
    'puzzle': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="14" width="22" height="22" rx="3" fill="#fff" fill-opacity="0.15"/><rect x="44" y="14" width="22" height="22" rx="3" fill="#fff" fill-opacity="0.1"/><rect x="14" y="44" width="22" height="22" rx="3" fill="#fff" fill-opacity="0.1"/><rect x="44" y="44" width="22" height="22" rx="3" fill="#fff" fill-opacity="0.15"/></svg>',
    'riddle': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><text x="40" y="50" text-anchor="middle" font-size="36" font-weight="bold" fill="#fff" fill-opacity="0.3" stroke="none">?</text></svg>',
    'story': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20 L16 62 Q16 66 20 66 L54 66 Q58 66 58 62 L58 20 Q58 16 54 16 L20 16 Q16 16 16 20Z" fill="#fff" fill-opacity="0.08"/><line x1="24" y1="28" x2="50" y2="28"/><line x1="24" y1="36" x2="50" y2="36"/><line x1="24" y1="44" x2="42" y2="44"/></svg>',
    'simulation': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="8" width="44" height="64" rx="6" fill="#fff" fill-opacity="0.08"/><circle cx="40" cy="66" r="3" stroke-width="1.5"/><line x1="26" y1="20" x2="54" y2="20" stroke-width="1.5"/><line x1="26" y1="32" x2="54" y2="32" stroke-width="1.5"/><line x1="26" y1="44" x2="54" y2="44" stroke-width="1.5"/></svg>',
    'multiplayer': '<svg viewBox="0 0 80 80" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="28" cy="30" r="8" fill="#fff" fill-opacity="0.1"/><circle cx="52" cy="30" r="8" fill="#fff" fill-opacity="0.1"/><path d="M14 56 Q14 44 28 44 Q42 44 42 56"/><path d="M38 56 Q38 44 52 44 Q66 44 66 56"/><text x="40" y="72" text-anchor="middle" font-size="10" fill="#fff" stroke="none" font-weight="bold">VS</text></svg>',
  };

  /* Game title -> icon SVG lookup. Falls back to category icon. */
  function getGameIcon(title, category) {
    if (GAME_ICONS[title]) return GAME_ICONS[title];
    return CATEGORY_ICONS[category] || CATEGORY_ICONS['classic'];
  }

  function applyCardMetadata() {
    $$('.bento-grid .game-card').forEach(function (card) {
      var title = textOf($('.game-card__title', card));
      var cat = textOf($('.game-card__category', card));
      if (!card.hasAttribute('data-cat')) card.setAttribute('data-cat', cat);
      if (!card.hasAttribute('data-featured')) {
        card.setAttribute(
          'data-featured',
          card.classList.contains('game-card--featured') ? 'true' : 'false'
        );
      }
      if (card.getAttribute('tabindex') === null) card.setAttribute('tabindex', '0');
      if (!card.getAttribute('role')) card.setAttribute('role', 'button');
      if (!card.getAttribute('aria-keyshortcuts')) {
        card.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight Enter');
      }
      if (!card.getAttribute('aria-label')) {
        card.setAttribute(
          'aria-label',
          title + (cat ? ', ' + cat + ' game' : '') + '. Press Enter to play.'
        );
      }

      /* Inject SVG gameplay icon into the thumbnail area */
      var icon = $('.game-card__icon', card);
      if (icon && title && !icon.querySelector('svg')) {
        icon.innerHTML = getGameIcon(title, cat);
      }

      /* Add data-title to card and thumb for CSS pseudo-element content. */
      if (title) {
        card.setAttribute('data-title', title);
        var thumb = $('.game-card__thumb', card);
        if (thumb) thumb.setAttribute('data-title', title);
      }
    });
  }

  /* --- Local catalog cache: one request shared by search-adjacent UX --- */
  var _gameUrlCache = null;
  var _gameCachePromise = null;
  var _gamesList = [];
  var _gamesPromise = null;

  function fetchGames() {
    if (_gamesPromise) return _gamesPromise;
    _gamesPromise = fetch('./games.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Catalog request failed');
        return r.json();
      })
      .then(function (games) {
        _gamesList = Array.isArray(games) ? games : [];
        return _gamesList;
      })
      .catch(function () {
        _gamesList = [];
        return _gamesList;
      });
    return _gamesPromise;
  }

  function fetchGameUrlCache() {
    if (_gameCachePromise) return _gameCachePromise;
    _gameUrlCache = new Map();
    _gameCachePromise = fetchGames().then(function (games) {
      games.forEach(function (g) {
        if (g && g.title && g.url) _gameUrlCache.set(g.title, g.url);
      });
      return _gameUrlCache;
    });
    return _gameCachePromise;
  }

  function openGameUrl(url) {
    var safe = safeGamePath(url);
    if (safe !== './') window.open(safe, '_blank');
  }

  function openCard(card) {
    if (!card) return;
    var title = textOf($('.game-card__title', card));
    var url = _gameUrlCache && _gameUrlCache.get(title);
    if (url) {
      openGameUrl(url);
      return;
    }
    /* Enter can arrive before the local catalog request finishes. Retry once
       the cache is ready instead of making keyboard users press Enter again. */
    fetchGameUrlCache().then(function (cache) {
      var resolved = cache.get(title);
      if (resolved) openGameUrl(resolved);
    });
  }

  function focusCard(card) {
    if (card && card.focus) card.focus();
  }

  function moveCard(current, direction) {
    var cards = visibleCards();
    var index = cards.indexOf(current);
    if (index === -1 || cards.length < 2) return;

    var origin = current.getBoundingClientRect();
    var originX = origin.left + origin.width / 2;
    var originY = origin.top + origin.height / 2;
    var candidates = cards.filter(function (card) {
      if (card === current) return false;
      var rect = card.getBoundingClientRect();
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;
      if (direction === 'left') return x < originX - 1;
      if (direction === 'right') return x > originX + 1;
      if (direction === 'up') return y < originY - 1;
      return y > originY + 1;
    });

    if (!candidates.length) return;
    candidates.sort(function (a, b) {
      var ar = a.getBoundingClientRect();
      var br = b.getBoundingClientRect();
      var ax = ar.left + ar.width / 2;
      var ay = ar.top + ar.height / 2;
      var bx = br.left + br.width / 2;
      var by = br.top + br.height / 2;
      var aPrimary = direction === 'left' || direction === 'right'
        ? Math.abs(ax - originX) : Math.abs(ay - originY);
      var bPrimary = direction === 'left' || direction === 'right'
        ? Math.abs(bx - originX) : Math.abs(by - originY);
      var aCross = direction === 'left' || direction === 'right'
        ? Math.abs(ay - originY) : Math.abs(ax - originX);
      var bCross = direction === 'left' || direction === 'right'
        ? Math.abs(by - originY) : Math.abs(bx - originX);
      return (aCross - bCross) || (aPrimary - bPrimary);
    });
    focusCard(candidates[0]);
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    var t = e.target && e.target.closest ? e.target.closest('.game-card') : null;
    if (!t) return;
    if (e.target.closest('button, a')) return;
    openCard(t);
  });

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var ae = document.activeElement;
    if (!ae || !ae.classList || !ae.classList.contains('game-card')) return;
    var cards = visibleCards();
    if (cards.indexOf(ae) === -1) return;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        moveCard(ae, 'right');
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveCard(ae, 'down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveCard(ae, 'left');
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveCard(ae, 'up');
        break;
      case 'Home':
        e.preventDefault();
        focusCard(cards[0]);
        break;
      case 'End':
        e.preventDefault();
        focusCard(cards[cards.length - 1]);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        openCard(ae);
        break;
    }
  });

  /* Safe path guard for "Open in new tab" (mirrors bundle __portalSafeSrc). */
  function safeGamePath(p) {
    if (typeof p !== 'string') return './';
    var t = p.trim();
    if (!t || t.length === 0) return './';
    if (!/^Games\//.test(t)) return './';
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(t)) return './';
    if (/^\/\//.test(t)) return './';
    if (t.split('/').indexOf('..') > -1) return './';
    if (/%2e|%2f|%5c|%00|\\/i.test(t)) return './';
    if (/[\u0000-\u001F\u007F]/.test(t)) return './';
    return t;
  }

  var modalOpener = null;

  function addModalLoadingState(modal) {
    var wrap = $('.game-modal__frame-wrap', modal);
    var frame = $('.game-modal__frame', modal);
    if (!wrap || !frame || wrap.getAttribute('data-ux-loading-bound')) return;
    wrap.setAttribute('data-ux-loading-bound', '1');
    wrap.setAttribute('aria-busy', 'true');
    var status = document.createElement('div');
    status.className = 'game-modal__loading';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.innerHTML = '<span class="game-modal__spinner" aria-hidden="true"></span>' +
      '<span>Loading game&hellip;</span>';
    wrap.appendChild(status);

    function finishLoading(message, failed) {
      wrap.setAttribute('aria-busy', 'false');
      wrap.classList.add(failed ? 'is-load-error' : 'is-loaded');
      status.textContent = message || 'Game ready';
      if (!failed) status.setAttribute('aria-hidden', 'true');
    }
    frame.addEventListener('load', function () { finishLoading('Game ready', false); });
    frame.addEventListener('error', function () {
      finishLoading('Unable to load this game. Try opening it in a new tab.', true);
    });
  }

  function addModalControls(modal) {
    var footer = $('.game-modal__footer', modal);
    var frame = $('.game-modal__frame', modal);
    if (frame && !frame.getAttribute('title')) {
      frame.setAttribute('title', textOf($('.game-modal__title', modal)) || 'Game');
    }
    if (!footer || $('.game-modal__open', footer)) return;
    var src = frame ? frame.getAttribute('src') : '';
    var a = document.createElement('a');
    a.className = 'game-modal__open';
    a.href = safeGamePath(src);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Open in new tab';
    a.setAttribute('aria-label', 'Open this game in a new tab');
    footer.appendChild(a);
  }

  /* One dialog root: the bundle marks .game-modal__content as
     role=dialog + aria-modal + aria-labelledby; never stack a second
     role on the wrapper. Drop stale wrapper semantics, backstop name. */
  function addModalDialogSemantics(modal) {
    var content = $('.game-modal__content', modal);
    var isContentDialog = content && content.getAttribute('role') === 'dialog';
    var dialog = isContentDialog ? content : modal;
    if (isContentDialog) {
      ['role', 'aria-modal', 'aria-labelledby', 'aria-label'].forEach(function (a) {
        if (modal.hasAttribute(a)) modal.removeAttribute(a);
      });
    }
    if (!dialog.hasAttribute('role')) dialog.setAttribute('role', 'dialog');
    if (dialog.getAttribute('aria-modal') !== 'true') dialog.setAttribute('aria-modal', 'true');
    var title = $('.game-modal__title', dialog);
    if (title) {
      if (!title.id) title.id = 'game-modal-title';
      if (!dialog.getAttribute('aria-labelledby')) {
        dialog.setAttribute('aria-labelledby', title.id);
      }
    } else if (!dialog.getAttribute('aria-label')) {
      dialog.setAttribute('aria-label', 'Game dialog');
    }
  }

  /* Tab backstop: bundle traps Tab; this window listener re-captures
     focus that lands behind the dialog. */
  function trapModalFocus(e) {
    if (e.key !== 'Tab') return;
    var modal = $('.game-modal');
    if (!modal) return;
    var ae = document.activeElement;
    if (ae && ae.nodeType === 1 && modal.contains(ae)) return;
    var focusables = $$(
      'a[href], button, iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      modal
    ).filter(function (el) {
      if (el.disabled) return false;
      var r = el.getBoundingClientRect();
      var s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    });
    if (!focusables.length) return;
    e.preventDefault();
    (e.shiftKey ? focusables[focusables.length - 1] : focusables[0]).focus();
  }
  window.addEventListener('keydown', trapModalFocus, false);

  var lastCard = null;
  document.addEventListener('focusin', function (e) {
    var c = e.target && e.target.closest ? e.target.closest('.game-card') : null;
    if (c) lastCard = c;
  });

  function syncModal() {
    var modal = $('.game-modal');
    if (modal) {
      addModalDialogSemantics(modal);
      addModalLoadingState(modal);
      if (!modal.getAttribute('data-ux-tracked')) {
        modal.setAttribute('data-ux-tracked', '1');
        var ae = document.activeElement;
        modalOpener = ae && ae.nodeType === 1 ? ae : null;
        addModalControls(modal);
      }
    } else if (modalOpener) {
      var cur = document.activeElement;
      if (!cur || cur === document.body || cur === document.documentElement || !cur.isConnected) {
        var target = modalOpener.isConnected
          ? modalOpener
          : (lastCard && lastCard.isConnected ? lastCard : null);
        if (target && target.focus) target.focus();
      }
      modalOpener = null;
    }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var close = $('.game-modal__close');
    if (close) close.click();
  });

  function applyFilterMetadata() {
    $$('.category-filter__btn').forEach(function (b) {
      if (!b.hasAttribute('data-cat-id')) {
        var id = textOf(b).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all';
        b.setAttribute('data-cat-id', id);
      }
    });
  }

  var categoryTransitionTimer = null;
  function animateCategoryChange() {
    var grid = $('.bento-grid');
    if (!grid) return;
    grid.classList.remove('is-filtering');
    /* Restart the short, content-led transition without forcing a scroll. */
    void grid.offsetWidth;
    grid.classList.add('is-filtering');
    if (categoryTransitionTimer) clearTimeout(categoryTransitionTimer);
    categoryTransitionTimer = setTimeout(function () {
      grid.classList.remove('is-filtering');
      categoryTransitionTimer = null;
    }, 260);
  }

  function initCategoryTransitions() {
    document.addEventListener('click', function (e) {
      var button = e.target && e.target.closest ?
        e.target.closest('.category-filter__btn') : null;
      if (button) animateCategoryChange();
    }, true);
  }

  var searchDebounceTimer = null;
  var SEARCH_DEBOUNCE_MS = 180;
  function replaySearchValue(input, value) {
    var setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    setter.call(input, value);
    input.setAttribute('data-ux-search-replay', '1');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function initDebouncedSearch() {
    document.addEventListener('input', function (e) {
      var input = e.target;
      if (!input || !input.matches || !input.matches('.search-bar__input')) return;
      if (input.getAttribute('data-ux-search-replay') === '1') {
        input.removeAttribute('data-ux-search-replay');
        return;
      }
      if (e.isComposing) return;
      e.stopImmediatePropagation();
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      var value = input.value;
      searchDebounceTimer = setTimeout(function () {
        searchDebounceTimer = null;
        replaySearchValue(input, value);
      }, SEARCH_DEBOUNCE_MS);
    }, true);

    document.addEventListener('keydown', function (e) {
      var input = e.target;
      if (e.key !== 'Escape' || !input || !input.matches ||
          !input.matches('.search-bar__input') || !input.value) return;
      e.preventDefault();
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
      replaySearchValue(input, '');
    });
  }

  function applyGrouping() {
    var featured = $('.bento-grid__featured');
    if (featured) {
      if (featured.getAttribute('role') !== 'region') featured.setAttribute('role', 'region');
      if (!featured.getAttribute('aria-label')) featured.setAttribute('aria-label', 'Featured games');
    }
    var standard = $('.bento-grid__standard');
    if (standard) {
      if (standard.getAttribute('role') !== 'region') standard.setAttribute('role', 'region');
      if (!standard.getAttribute('aria-label')) standard.setAttribute('aria-label', 'All games');
    }
    var logo = $('.app__logo-text');
    if (logo) {
      if (logo.getAttribute('role') !== 'heading') logo.setAttribute('role', 'heading');
      if (!logo.getAttribute('aria-level')) logo.setAttribute('aria-level', '1');
    }
  }

  var moTimer = null;
  function onMutations() {
    if (moTimer) return;
    moTimer = setTimeout(function () {
      moTimer = null;
      ensureSkipLink();
      ensureMainTarget();
      applyCardMetadata();
      applyFilterMetadata();
      applyGrouping();
      syncModal();
    }, 80);
  }

  /* --- Theme toggle: light / dark mode --- */
  function initThemeToggle() {
    var STORAGE_KEY = 'theme';

    /* Determine the initial theme: localStorage > prefers-color-scheme > dark */
    function getPreferredTheme() {
      var stored = null;
      try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
      return 'dark';
    }

    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      /* Update <meta name="color-scheme"> so browser chrome matches */
      var meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) meta.setAttribute('content', theme);
    }

    function saveTheme(theme) {
      try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) {}
    }

    /* Apply stored / preferred theme immediately (pre-flash) */
    applyTheme(getPreferredTheme());

    /* Build the toggle button */
    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle light/dark theme');
    btn.innerHTML =
      '<svg class="theme-toggle__icon" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      /* Moon icon shown in dark mode, sun in light — swap via CSS below */
      '<circle cx="12" cy="12" r="5"/>' +
      '<line x1="12" y1="1" x2="12" y2="3"/>' +
      '<line x1="12" y1="21" x2="12" y2="23"/>' +
      '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
      '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
      '<line x1="1" y1="12" x2="3" y2="12"/>' +
      '<line x1="21" y1="12" x2="23" y2="12"/>' +
      '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
      '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>' +
      '</svg>';

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      saveTheme(next);
      /* Update the icon: moon for dark mode, sun for light */
      updateIcon(next);
    });

    function updateIcon(theme) {
      /* Swap between sun (shown when dark, i.e. click to go light)
         and moon (shown when light, i.e. click to go dark). */
      var svg = btn.querySelector('svg');
      if (!svg) return;
      if (theme === 'dark') {
        /* Sun icon: user clicks to switch to light */
        svg.innerHTML =
          '<circle cx="12" cy="12" r="5"/>' +
          '<line x1="12" y1="1" x2="12" y2="3"/>' +
          '<line x1="12" y1="21" x2="12" y2="23"/>' +
          '<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>' +
          '<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>' +
          '<line x1="1" y1="12" x2="3" y2="12"/>' +
          '<line x1="21" y1="12" x2="23" y2="12"/>' +
          '<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>' +
          '<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
      } else {
        /* Moon icon: user clicks to switch to dark */
        svg.innerHTML =
          '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
      }
    }

    /* Set initial icon */
    updateIcon(getPreferredTheme());

    /* Insert the button into the page (top-right, fixed position) */
    document.body.appendChild(btn);

    /* React to OS-level theme changes (e.g. macOS auto dark/light) */
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) {
        mq.addEventListener('change', function (e) {
          /* Only auto-switch if user hasn't explicitly chosen */
          var stored = null;
          try { stored = localStorage.getItem(STORAGE_KEY); } catch (_) {}
          if (stored) return; /* User has a preference — respect it */
          var theme = e.matches ? 'dark' : 'light';
          applyTheme(theme);
          updateIcon(theme);
        });
      }
    }
  }

  /* --- Random Game button: fetch games.json, pick one, open in new tab --- */
  function initRandomGameBtn() {
    var btn = document.getElementById('random-game-btn');
    if (!btn || btn.getAttribute('data-ux-bound')) return;
    btn.setAttribute('data-ux-bound', '1');
    fetchGames().then(function (games) {
      if (games.length) btn.classList.add('is-ready');
    });
    btn.addEventListener('click', function () {
      btn.classList.add('is-launching');
      btn.setAttribute('aria-busy', 'true');
      var chooseAndOpen = function (games) {
        if (!games || !games.length) return;
        var g = games[Math.floor(Math.random() * games.length)];
        if (g && g.url) openGameUrl(g.url);
      };
      if (_gamesList.length) {
        chooseAndOpen(_gamesList);
        btn.removeAttribute('aria-busy');
        setTimeout(function () { btn.classList.remove('is-launching'); }, 550);
      } else {
        fetchGames().then(chooseAndOpen).then(function () {
          btn.removeAttribute('aria-busy');
          setTimeout(function () { btn.classList.remove('is-launching'); }, 550);
        });
      }
    });
  }

  /* --- Card click interceptor: open games in new tab, block React modal --- */
  function initCardNewTab() {
    /* Pre-fetch the URL cache so it's ready before the user clicks. */
    fetchGameUrlCache();

    /* Capture-phase listener runs *before* the bundle's delegated handler.
       Stop propagation so the React bundle never sees the click. */
    document.addEventListener('click', function (e) {
      var card = e.target && e.target.closest ? e.target.closest('.game-card') : null;
      if (!card) return;
      /* Let proxy launcher / random-btn / skip-link through. */
      if (e.target.closest('.proxy-launcher, .random-game-btn, .skip-link')) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      var title = textOf($('.game-card__title', card));
      var url = _gameUrlCache && _gameUrlCache.get(title);
      if (url) {
        openGameUrl(url);
      } else {
        fetchGameUrlCache().then(function (cache) {
          var resolved = cache.get(title);
          if (resolved) openGameUrl(resolved);
        });
      }
    }, true); /* capture phase */

    /* Also retroactively add target='_blank' to any existing play-button
       links so mid-click anchor navigation also opens a new tab. */
    $$('.game-card__play[href]').forEach(function (btn) {
      if (!btn.getAttribute('target')) btn.setAttribute('target', '_blank');
      if (!btn.getAttribute('rel')) btn.setAttribute('rel', 'noopener noreferrer');
    });
  }

  ready(function () {
    ensureSkipLink();
    initThemeToggle();
    initRandomGameBtn();
    initCategoryTransitions();
    initDebouncedSearch();
    initCardNewTab();
    var mo = new MutationObserver(onMutations);
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    onMutations();
  });
})();

/* ================================================================
   TAG BADGES — inject tag badges into game cards
   ================================================================ */
function injectTagBadges() {
  // Fetch games.json to get tag data
  fetch('./games.json')
    .then(function(response) { return response.json(); })
    .then(function(games) {
      // Create a map of game title to tags
      var tagMap = {};
      games.forEach(function(game) {
        if (game.tags && game.tags.length > 0) {
          tagMap[game.title] = game.tags;
        }
      });

      // Find all game cards and inject tags
      $$('.game-card').forEach(function(card) {
        var titleEl = card.querySelector('.game-card__title');
        if (!titleEl) return;
        
        var title = textOf(titleEl);
        var tags = tagMap[title];
        
        if (tags && tags.length > 0) {
          // Check if tags container already exists
          if (card.querySelector('.game-card__tags')) return;
          
          // Create tags container
          var tagsContainer = document.createElement('div');
          tagsContainer.className = 'game-card__tags';
          
          tags.forEach(function(tag) {
            var tagEl = document.createElement('span');
            tagEl.className = 'game-card__tag game-card__tag--' + tag;
            tagEl.textContent = tag;
            tagsContainer.appendChild(tagEl);
          });
          
          // Insert after category badge or at end of card
          var categoryEl = card.querySelector('.game-card__category');
          if (categoryEl && categoryEl.parentNode) {
            categoryEl.parentNode.insertBefore(tagsContainer, categoryEl.nextSibling);
          } else {
            card.appendChild(tagsContainer);
          }
        }
      });
    })
    .catch(function(err) {
      console.warn('[portal-ux] Failed to inject tags:', err);
    });
}

// Run on load and on DOM mutations
ready(function() {
  injectTagBadges();
  
  // Also run when new cards are added (e.g., filtering, search)
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length > 0) {
        setTimeout(injectTagBadges, 100);
      }
    });
  });
  
  var grid = $('.bento-grid');
  if (grid) {
    observer.observe(grid, { childList: true, subtree: true });
  }
});
