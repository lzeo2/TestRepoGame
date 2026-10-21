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
  let theme = 'light';

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
    const height = document.querySelector('.ocean').clientHeight;
    $('guide').style.top = (185 + total / 700 * Math.max(0, height - 330)) + 'px';
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
    $('daily-date').textContent = core.utcDate() + ' · UTC · same prompts for everyone';
  }
  function launch() {
    stopClock(); run = null; screen('launch'); depth(); refreshDate(); showLast();
    $('guide-copy').textContent = 'Your little survey drone. Bring an unexpected answer. We will take it deeper.';
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
    $('guide-copy').textContent = 'No rush to the next prompt. Each reveal is a chance to find something new.';
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
    $('result-title').textContent = result.recognized ? result.answer : result.timedOut ? 'The clock ran out.' : result.input ? 'Not in this answer key.' : 'A quiet stretch of water.';
    $('result-copy').textContent = result.recognized ? '+' + (result.points * 10).toLocaleString('en') + ' metres. Editorial rarity, not a live popularity statistic.' : result.timedOut ? 'No answer was accepted before the 25-second deadline. Explore the key, then keep diving.' : result.input ? 'Your answer: “' + result.input + '”. An unlisted answer may be valid, but this curated key cannot score it.' : 'Passed. No points lost. Explore a few possibilities below.';
    $('key-groups').replaceChildren(...run.prompts[run.index].groups.slice().sort((a, b) => a.tier - b.tier).map(group => {
      const p = node('p');
      p.append(node('b', tiers[group.tier] + ' · ' + points[group.tier] + ' points: '), document.createTextNode(group.answers.map(a => a.text).join(', ')));
      return p;
    }));
    $('next').textContent = run.index === 6 ? 'See field notes' : 'Next question';
    $('guide-copy').textContent = result.recognized ? 'A useful find. Your depth is now ' + (run.total * 10).toLocaleString('en') + ' metres.' : 'There is always another question. Take a look at the key before we move on.';
    depth(); $('next').focus();
  }
  function finish() {
    stopClock(); screen('finish');
    $('finish-total').textContent = (run.total * 10).toLocaleString('en') + ' metres';
    $('finish-caption').textContent = run.total + ' / 700 points · ' + run.records.filter(r => r.recognized).length + ' of 7 answers recognized. Revisit the dive to try a different route.';
    $('results').replaceChildren(...run.records.map((result, i) => {
      const li = node('li');
      li.append(node('div', run.prompts[i].text), node('strong', result.answer || (result.timedOut ? 'Time expired' : result.input || 'Passed')), node('span', result.points + ' points · ' + (result.recognized ? tiers[result.tier] : 'No recognized answer')));
      return li;
    }));
    const label = selection.mode === 'daily' ? 'Daily ' + selection.key : selection.mode === 'numbered' ? 'Dive ' + selection.key : data.packs.find(p => p.id === selection.key).title;
    $('save-status').textContent = save('dive-trivia:last:v1', JSON.stringify({ label, total: run.total })) ? 'Last completed result saved on this device only. Replays are practice.' : 'Storage is unavailable. Your result is shown here but will not be saved.';
    $('guide-copy').textContent = 'Survey complete. A small collection of unexpected things, brought back to the surface.';
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
  $('tiers').replaceChildren(...tiers.map((tier, i) => { const chip = node('div', undefined, 'tier-chip'); chip.append(node('span', tier), node('b', String(points[i]))); return chip; }));
  $('version').textContent = 'Key ' + data.version + '.';
  setTheme(stored('dive-trivia:theme') === 'dark' ? 'dark' : 'light');
  $('theme').addEventListener('click', () => { setTheme(theme === 'dark' ? 'light' : 'dark'); save('dive-trivia:theme', theme); });
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
