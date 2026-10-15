/* Selection metadata is browser-only, not crawler-readable game pages.
 * Keep the real portal canonical/OG URL: there is no selection deep link. */
(function () {
  'use strict';
  var title = document.title;
  var description = document.querySelector('meta[name="description"]');
  var originalDescription = description.content;
  var ogTitle = document.querySelector('meta[property="og:title"]');
  var ogDescription = document.querySelector('meta[property="og:description"]');
  var descriptions = new Map();
  // The compiled shelf omits descriptions; read the existing local catalog once.
  fetch('./games.json').then(function (response) {
    if (!response.ok) throw new Error('Catalog metadata unavailable');
    return response.json();
  }).then(function (games) {
    games.forEach(function (game) { descriptions.set(game.title, game.desc); });
    sync();
  }).catch(function () { /* Keep generic metadata when the catalog is unavailable. */ });

  function sync() {
    var detail = document.querySelector('.ux-detail');
    var frame = document.querySelector('.ux-player__frame, .game-modal__frame');
    var selectedTitle = detail ? detail.querySelector('.ux-detail__title').textContent :
      (frame ? frame.title : '');
    var selectedDescription = '';
    if (detail) {
      var text = detail.querySelector('.ux-detail__desc');
      selectedDescription = text ? text.textContent : '';
    } else if (frame) {
      selectedDescription = descriptions.get(selectedTitle) || '';
    }
    var nextTitle = selectedTitle ? selectedTitle + ' | ' + title : title;
    var nextDescription = selectedTitle ?
      selectedTitle + ': ' + (selectedDescription || 'Play in the UNBLOCKMATH arcade.') : originalDescription;
    if (document.title !== nextTitle) document.title = nextTitle;
    if (description.content !== nextDescription) description.content = nextDescription;
    if (ogTitle.content !== nextTitle) ogTitle.content = nextTitle;
    if (ogDescription.content !== nextDescription) ogDescription.content = nextDescription;
  }

  function init() {
    // Only body changes matter; head writes must not trigger another update.
    new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
