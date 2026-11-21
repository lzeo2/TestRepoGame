const STORAGE_KEY = 'chess-workshop:appearance-v1';
const THEME_COLORS = {
  workshop: ['#ece2ce', '#5c8395'],
  walnut: ['#eed4aa', '#8d6047'],
  moss: ['#edf1d8', '#657f59'],
  slate: ['#dce8f3', '#586d8d'],
};
const PIECE_SETS = ['cburnett', 'merida', 'unicode'];
const ROLES = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

function colorOr(value, fallback) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export function normalizeAppearance(value, reduceMotion = false) {
  const [light, dark] = THEME_COLORS.workshop;
  return {
    light: colorOr(value?.light, light),
    dark: colorOr(value?.dark, dark),
    pieces: PIECE_SETS.includes(value?.pieces) ? value.pieces : 'cburnett',
    coordinates: typeof value?.coordinates === 'boolean' ? value.coordinates : true,
    legalHints: typeof value?.legalHints === 'boolean' ? value.legalHints : true,
    animation: typeof value?.animation === 'boolean' ? value.animation : !reduceMotion,
  };
}

function themeFor({ light, dark }) {
  return Object.keys(THEME_COLORS).find(key => {
    const colors = THEME_COLORS[key];
    return colors[0] === light && colors[1] === dark;
  }) ?? 'custom';
}

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
  const [r, g, b] = rgb.map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return .2126 * r + .7152 * g + .0722 * b;
}

function labelColor(hex) {
  return luminance(hex) > .179 ? '#000000' : '#ffffff';
}

function applyColors(root, square, color) {
  root.style.setProperty(`--board-${square}`, color);
  root.style.setProperty(`--board-${square}-label`, labelColor(color));
}

export function mountAppearance(dialog, { onChange } = {}) {
  const doc = dialog.ownerDocument;
  const browser = doc.defaultView;
  const root = doc.documentElement;
  const reduceMotion = browser.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  let saved;
  try { saved = JSON.parse(browser.localStorage.getItem(STORAGE_KEY)); }
  catch { saved = null; }
  let prefs = normalizeAppearance(saved, reduceMotion);

  // The static dialog is shared by every game mode.
  dialog.innerHTML = `
    <form class="appearance-form" method="dialog">
      <header>
        <h2 id="appearance-title">Appearance</h2>
      </header>
      <div class="appearance-preview" aria-hidden="true"></div>
      <div class="appearance-selects">
        <label for="appearance-theme">Board theme
          <select id="appearance-theme">
            <option value="workshop">Workshop</option>
            <option value="walnut">Walnut</option>
            <option value="moss">Moss</option>
            <option value="slate">Slate</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label for="appearance-pieces">Pieces
          <select id="appearance-pieces">
            <option value="cburnett">Cburnett</option>
            <option value="merida">Merida</option>
            <option value="unicode">Unicode</option>
          </select>
        </label>
      </div>
      <div class="appearance-colors">
        <label for="appearance-light">Light squares <input type="color" id="appearance-light"></label>
        <label for="appearance-dark">Dark squares <input type="color" id="appearance-dark"></label>
      </div>
      <fieldset class="appearance-toggles">
        <legend>Display</legend>
        <label><input type="checkbox" id="appearance-coordinates"> Board coordinates</label>
        <label><input type="checkbox" id="appearance-dots"> Legal move dots</label>
        <label><input type="checkbox" id="appearance-animation"> Piece animations</label>
      </fieldset>
      <p class="appearance-status" role="status" hidden></p>
      <div class="appearance-actions">
        <button type="button" class="quiet" id="appearance-reset">Reset appearance</button>
        <button type="submit" class="primary">Done</button>
      </div>
    </form>`;

  const select = id => dialog.querySelector(`#appearance-${id}`);
  const controls = {
    theme: select('theme'), pieces: select('pieces'), light: select('light'), dark: select('dark'),
    coordinates: select('coordinates'), legalHints: select('dots'), animation: select('animation'),
  };
  const status = dialog.querySelector('.appearance-status');
  const preview = dialog.querySelector('.appearance-preview');
  for (const [row, side] of ['black', 'white'].entries()) {
    for (const [col, role] of ROLES.entries()) {
      const square = doc.createElement('span');
      square.className = `appearance-square${(row + col) % 2 ? ' dark' : ''}`;
      const piece = doc.createElement('span');
      piece.className = `appearance-piece ${side} ${role}`;
      square.append(piece);
      preview.append(square);
    }
  }

  const getPrefs = () => ({ ...prefs });

  function syncControls() {
    controls.theme.value = themeFor(prefs);
    for (const key of ['light', 'dark', 'pieces']) controls[key].value = prefs[key];
    for (const key of ['coordinates', 'legalHints', 'animation']) controls[key].checked = prefs[key];
  }

  function apply(previous) {
    if (previous?.light !== prefs.light) applyColors(root, 'light', prefs.light);
    if (previous?.dark !== prefs.dark) applyColors(root, 'dark', prefs.dark);
    if (previous?.pieces !== prefs.pieces) root.dataset.chessPieces = prefs.pieces;
  }

  function save() {
    try {
      browser.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      status.hidden = true;
    } catch {
      status.textContent = 'These settings apply for this visit.';
      status.hidden = false;
    }
  }

  function update(values, persist = true) {
    const previous = prefs;
    prefs = normalizeAppearance({ ...prefs, ...values }, reduceMotion);
    apply(previous);
    syncControls();
    if (persist) save();
    if (Object.keys(prefs).some(key => prefs[key] !== previous[key])) onChange?.(getPrefs());
  }

  controls.theme.addEventListener('change', () => {
    const colors = THEME_COLORS[controls.theme.value];
    if (colors) {
      update({ light: colors[0], dark: colors[1] });
    } else controls.light.focus();
  });
  controls.pieces.addEventListener('change', () => update({ pieces: controls.pieces.value }));
  for (const key of ['light', 'dark']) {
    controls[key].addEventListener('input', () => update({ [key]: controls[key].value }, false));
    controls[key].addEventListener('change', () => update({ [key]: controls[key].value }));
  }
  for (const key of ['coordinates', 'legalHints', 'animation']) {
    controls[key].addEventListener('change', () => update({ [key]: controls[key].checked }));
  }
  select('reset').addEventListener('click', () => update(normalizeAppearance(null, reduceMotion)));
  syncControls();
  apply();

  return {
    getPrefs,
    open() {
      if (!dialog.open) {
        syncControls();
        dialog.showModal();
      }
    },
  };
}
