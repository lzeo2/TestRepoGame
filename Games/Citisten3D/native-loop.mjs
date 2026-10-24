// No timer runs while hidden or asleep. Inputs must call wake().
export function createNativeLoop({ update, isHidden, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let frame = null, last = null, idleSince = null, stopped = false;
  function suspend() {
    if (frame !== null) cancelFrame(frame);
    frame = last = idleSince = null;
  }
  function wake() {
    if (stopped) return;
    if (isHidden()) { suspend(); return; }
    idleSince = null;
    if (frame === null) { last = null; frame = requestFrame(tick); }
  }
  function tick(now) {
    if (stopped || isHidden()) { suspend(); return; }
    const dt = last === null ? 0 : Math.max(0, (now - last) / 1000);
    last = now;
    const busy = update(dt);
    frame = null;
    if (stopped || isHidden()) { suspend(); return; }
    if (busy || idleSince === null) idleSince = now;
    if (busy || now - idleSince < 2000) frame = requestFrame(tick);
    else last = null;
  }
  return { wake, suspend, stop() { stopped = true; suspend(); } };
}
