/* UNBLOCKMATH // ARCADE — portal UX layer (vanilla JS, offline, defer).
 * A11y/keyboard enhancements over the minified React bundle. */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function textOf(el) { return el ? (el.textContent || '').trim() : ''; }

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
      if (!card.getAttribute('aria-label')) {
        card.setAttribute(
          'aria-label',
          title + (cat ? ', ' + cat + ' game' : '') + '. Press Enter to play.'
        );
      }
    });
  }

  function openCard(card) {
    var play = card && card.querySelector('.game-card__play');
    if (play && !play.disabled) play.click();
  }

  function focusCard(card) {
    if (card && card.focus) card.focus();
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
    var cards = $$('.bento-grid .game-card');
    var idx = cards.indexOf(ae);
    if (idx === -1) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusCard(cards[(idx + 1) % cards.length]);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusCard(cards[(idx - 1 + cards.length) % cards.length]);
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

  ready(function () {
    ensureSkipLink();
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
