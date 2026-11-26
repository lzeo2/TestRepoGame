// The archive contains no audio tracks. Keep the game's no-audio launch path
// and its usual achievement registration without requesting missing media.
(() => {
  const silent = Object.freeze({play() {}, load() {}});
  window.soundManager = {
    setup(options) {
      options.onready();
      options.ontimeout();
    },
    createSound() { return silent; },
    getSoundById() { return silent; },
    play() {},
    stop() {},
    mute() {},
    unmute() {},
  };
})();
