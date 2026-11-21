// Supplied-clock captions only. The controller owns cameras, input and missions.
const MAX_LINES = 6;
const MAX_DURATION = 24;
const DEFAULT_LINE_DURATION = 3;
const boundedText = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value);

function copyScene(scene) {
  if (!scene || !validId(scene.id) || !boundedText(scene.title, 96) ||
      !Array.isArray(scene.lines) || scene.lines.length < 1 || scene.lines.length > MAX_LINES) return null;
  const lines = [];
  let duration = 0;
  for (const line of scene.lines) {
    if (!line || !boundedText(line.speaker, 48) || !boundedText(line.text, 280)) return null;
    const seconds = line.duration === undefined ? DEFAULT_LINE_DURATION : line.duration;
    if (!Number.isFinite(seconds) || seconds < 1 || seconds > 8) return null;
    duration += seconds;
    if (duration > MAX_DURATION) return null;
    lines.push(Object.freeze({ speaker: line.speaker, text: line.text, duration: seconds }));
  }
  return Object.freeze({ id: scene.id, title: scene.title, lines: Object.freeze(lines), duration });
}

export function createCutscenes() {
  let session = null, serial = 0, cached = null;
  const events = [];
  const active = () => session?.status === 'playing';

  function snapshot() {
    if (cached) return cached;
    if (!session) {
      cached = Object.freeze({ active: false, status: 'idle', id: null, title: '', character: null,
        missionId: null, runId: 0, lineIndex: -1, speaker: '', text: '', elapsed: 0, duration: 0,
        progress: 0, lineProgress: 0, cameraProgress: 0, cameraShotIndex: -1 });
      return cached;
    }
    const { scene, elapsed } = session;
    let lineIndex = 0, lineStart = 0;
    while (lineIndex < scene.lines.length - 1 && elapsed >= lineStart + scene.lines[lineIndex].duration) {
      lineStart += scene.lines[lineIndex++].duration;
    }
    const line = scene.lines[lineIndex];
    const lineProgress = Math.min(1, (elapsed - lineStart) / line.duration);
    cached = Object.freeze({ active: active(), status: session.status, id: scene.id, title: scene.title,
      character: session.character, missionId: session.missionId, runId: session.runId,
      lineIndex, speaker: line.speaker, text: line.text, elapsed, duration: scene.duration,
      progress: elapsed / scene.duration, lineProgress, cameraProgress: lineProgress, cameraShotIndex: lineIndex });
    return cached;
  }

  function finish(status, reason) {
    if (!active()) return false;
    session.status = status;
    if (status === 'completed') session.elapsed = session.scene.duration;
    cached = null;
    events.push(Object.freeze({ type: status, reason, id: session.scene.id, character: session.character,
      missionId: session.missionId, runId: session.runId }));
    return true;
  }

  function play(scene, context = {}) {
    const copy = copyScene(scene);
    if (!copy || !context || typeof context !== 'object' || Array.isArray(context) ||
        (context.character !== undefined && !validId(context.character)) ||
        (context.missionId !== undefined && !validId(context.missionId))) return false;
    finish('cancelled', 'replaced');
    session = { scene: copy, elapsed: 0, status: 'playing', character: context.character ?? null,
      missionId: context.missionId ?? null, runId: ++serial };
    cached = null;
    return true;
  }

  function step(dt, context = {}) {
    if (!active() || context?.paused === true || !Number.isFinite(dt) || dt <= 0) return snapshot();
    session.elapsed = Math.min(session.scene.duration, session.elapsed + dt);
    cached = null;
    if (session.elapsed >= session.scene.duration) finish('completed', 'elapsed');
    return snapshot();
  }

  return Object.freeze({ play, step, snapshot,
    skip: () => finish('completed', 'skipped'),
    cancel: () => finish('cancelled', 'cancelled'),
    drainEvents: () => Object.freeze(events.splice(0)) });
}
