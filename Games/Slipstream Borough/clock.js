// ponytail: catch up at most 250ms per visible frame; longer stalls lose time,
// not an unbounded backlog. Pause/blur/hidden/start reset the previous timestamp.
export const frameDelta = (now, previous) => previous ? Math.min(.25, Math.max(0, (now - previous) / 1000)) : 0;
