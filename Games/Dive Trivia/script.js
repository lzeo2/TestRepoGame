/* Original rare-answer trivia genre clone. Solo never initializes a network transport. */
(function () {
  'use strict';
  const core = globalThis.DiveCore;
  const data = globalThis.DiveQuestions;
  const $ = id => document.getElementById(id);
  const tiers = ['Shallows', 'Side current', 'Open water', 'Hidden reef', 'Midnight zone', 'Trench find'];
  const points = [10, 15, 30, 60, 85, 100];
  let run = null;
  let selection = null;
  let timer = null;
  let theme = 'dark';
  let audio = null;
  let sonarEnabled = false;

  function sonar() {
    if (!sonarEnabled || !audio || audio.state !== 'running') return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.18);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(now); oscillator.stop(now + 0.24);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function stored(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  }
  function setTheme(value) {
    theme = value;
    document.body.classList.toggle('dark', theme === 'dark');
    document.body.classList.toggle('light', theme === 'light');
    document.documentElement.style.colorScheme = theme;
    $('theme').textContent = theme === 'dark' ? 'Light theme' : 'Dark theme';
    $('theme').setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme');
  }
  function stopClock() { clearInterval(timer); timer = null; }
  function screen(id) {
    for (const name of ['launch', 'game', 'finish']) $(name).hidden = name !== id;
  }
  function depth() {
    const total = run ? run.total : 0;
    $('depth').textContent = (total * 10).toLocaleString('en');
    const metres = total * 10;
    $('depth-mood').textContent = metres === 0 ? 'signal at the surface' : metres < 1000 ? 'the last ripples travel with us' : metres < 3000 ? 'tiny lights measure the silence' : metres < 7000 ? 'the dark keeps a wider sky' : 'a signal from the floor of the world';
    $('guide').style.top = (total / 700 * 100) + '%';
    $('score').textContent = total + ' / 700 points';
  }
  function showLast() {
    let last;
    try { last = JSON.parse(stored('dive-trivia:last:v1')); } catch { return; }
    if (last && typeof last.label === 'string' && last.label.length < 100 &&
        Number.isInteger(last.total) && last.total >= 0 && last.total <= 700) {
      $('last-result').textContent = 'Last completed: ' + last.label + ' · ' + (last.total * 10).toLocaleString('en') + ' m';
    }
  }
  function refreshDate() {
    $('daily-date').textContent = core.utcDate() + ' UTC';
  }
  function launch() {
    stopClock(); run = null; screen('launch'); depth(); refreshDate(); showLast();
    $('guide-copy').textContent = 'Ready to dive.';
    $('playBtn').focus();
  }
  function start(mode, key) {
    try {
      const prompts = core.selectPrompts(data, { mode, key });
      selection = { mode, key };
      stopClock();
      run = core.createRun(prompts, performance.now());
      $('launch-error').textContent = '';
      screen('game');
      $('run-label').textContent = mode === 'daily' ? 'DAILY / ' + key : mode === 'numbered' ? 'DIVE / ' + key : 'PACK / ' + data.packs.find(p => p.id === key).title;
      showQuestion();
    } catch (error) {
      $('launch-error').textContent = 'Cannot start this dive: ' + error.message;
    }
  }
  function tick() {
    if (!run || run.phase !== 'question') return;
    const now = performance.now();
    const remaining = Math.max(0, (run.deadline - now) / 1000);
    $('timer').textContent = Math.ceil(remaining) + ' s';
    $('timer').classList.toggle('urgent', remaining <= 5);
    $('time-bar').value = remaining;
    if (core.expire(run, now)) showReveal();
  }
  function showQuestion() {
    stopClock();
    const prompt = run.prompts[run.index];
    $('round-count').textContent = String(run.index + 1).padStart(2, '0') + ' / 07';
    $('round-dots').replaceChildren(...run.prompts.map((_, i) => node('span', '', i < run.index ? 'done' : i === run.index ? 'current' : '')));
    $('round-dots').setAttribute('aria-label', 'Question ' + (run.index + 1) + ' of 7');
    $('category').textContent = data.packs.find(p => p.id === prompt.pack).title;
    $('question').textContent = prompt.text;
    $('answer-form').hidden = false;
    $('reveal').hidden = true;
    $('answer').value = '';
    $('answer-key').open = false;
    $('guide-copy').textContent = 'What did you find?';
    depth(); tick();
    timer = setInterval(tick, 150);
    $('answer').focus();
  }
  function lock(input) {
    if (!run || run.phase !== 'question') return;
    if (core.submit(run, input, performance.now())) showReveal();
  }
  function showReveal() {
    stopClock();
    const result = run.records[run.index];
    $('answer-form').hidden = true;
    $('reveal').hidden = false;
    $('timer').textContent = result.timedOut ? 'Time up' : 'Locked';
    $('timer').classList.remove('urgent');
    $('time-bar').value = 0;
    $('result-tier').textContent = result.recognized ? tiers[result.tier] + ' / +' + result.points + ' POINTS' : 'THIS ROUND / 0 POINTS';
    $('result-title').textContent = result.recognized ? result.answer : result.timedOut ? 'Time up.' : result.input ? 'Unlisted answer.' : 'Passed.';
    $('result-copy').textContent = result.recognized ? 'Depth: ' + (run.total * 10).toLocaleString('en') + ' m' : result.timedOut ? 'No answer locked.' : result.input ? '“' + result.input + '” · 0 pts' : 'Passed. 0 pts';
    $('key-groups').replaceChildren(...run.prompts[run.index].groups.slice().sort((a, b) => a.tier - b.tier).map(group => {
      const p = node('p');
      p.append(node('b', tiers[group.tier] + ' · ' + points[group.tier] + ' points: '), document.createTextNode(group.answers.map(a => a.text).join(', ')));
      return p;
    }));
    $('next').textContent = run.index === 6 ? 'See results' : 'Next question';
    $('guide-copy').textContent = result.recognized ? 'A little deeper.' : 'Keep looking.';
    depth();
    if (result.points > 0) sonar();
    $('next').focus();
  }
  function finish() {
    stopClock(); screen('finish');
    $('finish-total').textContent = (run.total * 10).toLocaleString('en') + ' metres';
    const best = run.records.reduce((pick, result) => result.recognized && (!pick || result.points > pick.points) ? result : pick, null);
    $('finish-caption').textContent = best ? 'Best find: ' + best.answer + ' · ' + best.points + ' pts' : 'Best find: none';
    const label = selection.mode === 'daily' ? 'Daily ' + selection.key : selection.mode === 'numbered' ? 'Dive ' + selection.key : data.packs.find(p => p.id === selection.key).title;
    $('save-status').textContent = save('dive-trivia:last:v1', JSON.stringify({ label, total: run.total })) ? '' : 'Could not save on this device.';
    $('guide-copy').textContent = 'Dive complete.';
    $('replay').focus();
  }

  try { core.validateData(data); } catch {
    $('launch-error').textContent = 'The local question files could not be loaded. Reopen the complete game folder.';
    for (const id of ['playBtn', 'start-pack', 'start-number']) $(id).disabled = true;
    return;
  }
  for (const pack of data.packs) {
    const option = node('option', pack.title); option.value = pack.id; $('pack').append(option);
  }
  $('tiers').replaceChildren(...tiers.map((tier, i) => { const chip = node('div', undefined, 'tier-chip'); chip.append(node('span', tier), node('b', points[i] + ' pts')); return chip; }));
  $('version').textContent = 'Key ' + data.version + '.';
  // The old key stored glow intensity, not a light-color preference.
  setTheme(stored('dive-trivia:color-theme') === 'light' ? 'light' : 'dark');
  $('theme').addEventListener('click', () => { setTheme(theme === 'dark' ? 'light' : 'dark'); save('dive-trivia:color-theme', theme); });
  $('sonar').addEventListener('click', async () => {
    const button = $('sonar');
    button.disabled = true;
    try {
      if (sonarEnabled) {
        if (audio) await audio.suspend();
        sonarEnabled = false;
      } else {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error('Audio unavailable');
        if (!audio) audio = new Audio();
        await audio.resume();
        sonarEnabled = true;
        sonar();
      }
      button.textContent = sonarEnabled ? 'Sonar on' : 'Sonar off';
      button.setAttribute('aria-pressed', String(sonarEnabled));
    } catch {
      sonarEnabled = false;
      button.textContent = 'Sonar unavailable';
      button.setAttribute('aria-pressed', 'false');
    } finally { button.disabled = false; }
  });
  $('playBtn').addEventListener('click', () => start('daily', core.utcDate()));
  $('start-pack').addEventListener('click', () => start('pack', $('pack').value));
  $('start-number').addEventListener('click', () => {
    const number = $('number').valueAsNumber;
    if (!$('number').reportValidity() || !Number.isInteger(number) || number < 1 || number > 999999) { $('launch-error').textContent = 'Choose a whole dive number from 1 to 999999.'; return; }
    start('numbered', String(number));
  });
  $('answer-form').addEventListener('submit', event => { event.preventDefault(); lock($('answer').value); });
  $('pass').addEventListener('click', () => lock(''));
  $('next').addEventListener('click', () => { if (core.next(run, performance.now())) { if (run.phase === 'finished') finish(); else showQuestion(); } });
  $('quit').addEventListener('click', () => { if (confirm('Leave this dive? This unfinished result will not be saved.')) launch(); });
  $('home').addEventListener('click', launch);
  $('replay').addEventListener('click', () => start(selection.mode, selection.key));
  window.addEventListener('resize', depth);
  window.addEventListener('pagehide', stopClock);
  window.addEventListener('pageshow', () => { if (run && run.phase === 'question' && timer === null) { tick(); if (run.phase === 'question') timer = setInterval(tick, 150); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); refreshDate(); } });
  refreshDate(); showLast(); depth();
}());
