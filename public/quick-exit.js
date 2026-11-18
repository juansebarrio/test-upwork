/* Quick exit, background forms, confirmation focus.
 *  - Tapping a "Leave quickly" control pauses every audio and video, clears every
 *    field, changes the tab title, then leaves for an ordinary site. One tap is enough.
 *  - Pressing Escape TWICE within one second does the same. A single Escape does
 *    nothing, so a stray key press never throws away a half-written story.
 *  - Moving between pages is handled by the client router (one history entry per
 *    page, Back and Forward work as usual, the document stays). The router keeps
 *    the number of pages this document has opened in history.state.index. On exit
 *    the script rewinds that many entries in one step and, the moment the browser
 *    lands on the first one, replaces it with the exit site: every page of the
 *    visit is gone from Back, and Back from the exit site lands before the site.
 *    (Chromium keeps the entries after a replaced one, so Forward from the exit
 *    site can still reach the pages of the visit; see docs/VERIFICATION.md.)
 *  - The story and contact forms are sent in the background and the page moved to
 *    the confirmation with the router (history "replace"), so the document and its
 *    index survive. An empty box shows a note; a network failure keeps the words
 *    and shows a note under the button.
 *  - A confirmation heading marked data-focus-on-load receives focus, on first
 *    load and after each router navigation, so a screen reader announces it.
 *  Limits, written down in docs/VERIFICATION.md: with JavaScript off the controls
 *  are plain links and the forms plain POSTs (Back can return); a visit that came
 *  from a search goes back to that search; after a page reload, the pages opened
 *  before the reload belong to the old document and cannot be rewound, so the exit
 *  rewinds only what came after it; a browser without view-transition support gets
 *  ordinary page loads and the exit replaces the current page only.
 *  Nothing here is stored, sent elsewhere or counted; the only state is a timestamp
 *  and a flag in memory that die with the page.
 */
(function () {
  'use strict';

  var DOUBLE_PRESS_MS = 1000;
  var lastEscapeAt = 0;
  var exiting = false;
  // Entries this document can rewind. After a reload the router keeps the old index,
  // but the earlier entries belong to the previous document: only what comes after
  // this point is ours to rewind.
  var baseIndex = (history.state && typeof history.state.index === 'number') ? history.state.index : 0;

  function focusConfirmation() {
    var el = document.querySelector('[data-focus-on-load]');
    if (el && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }
  }
  focusConfirmation();
  document.addEventListener('astro:page-load', focusConfirmation);

  function exitTarget() {
    var a = document.querySelector('[data-quick-exit]');
    return a ? a.getAttribute('href') : null;
  }

  function pauseMedia() {
    var media = document.querySelectorAll('audio, video');
    for (var i = 0; i < media.length; i++) {
      try { media[i].pause(); } catch (e) { /* ignore */ }
    }
  }

  function clearText() {
    var areas = document.querySelectorAll('textarea');
    for (var i = 0; i < areas.length; i++) areas[i].value = '';
    var inputs = document.querySelectorAll('input[type="password"], input[type="text"]');
    for (var j = 0; j < inputs.length; j++) inputs[j].value = '';
  }

  function leave() {
    var target = exitTarget();
    if (!target || exiting) return;
    exiting = true;
    pauseMedia();
    clearText();
    try { document.title = 'Google'; } catch (e) { /* ignore */ }
    var index = (history.state && typeof history.state.index === 'number') ? history.state.index : 0;
    var n = index - baseIndex;
    if (n <= 0) { window.location.replace(target); return; }
    // Rewind the whole visit in one step, then replace its first entry with the exit
    // site. The popstate is stopped before the router sees it, so the router neither
    // fetches the first page nor (its reaction to a cancelled navigation) reloads it.
    var done = false;
    function go(ev) {
      if (ev && ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      if (done) return;
      done = true;
      window.location.replace(target);
    }
    window.addEventListener('popstate', go, true);
    setTimeout(go, 1500); // if the browser never fires popstate, leave from here
    history.go(-n);
  }

  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('[data-quick-exit]') : null;
    if (!a) return;
    ev.preventDefault();
    leave();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape' && ev.key !== 'Esc') return;
    if (ev.repeat) return; // holding the key down is not two presses
    var now = Date.now();
    if (now - lastEscapeAt <= DOUBLE_PRESS_MS) {
      lastEscapeAt = 0;
      ev.preventDefault();
      leave();
    } else {
      lastEscapeAt = now;
    }
  });

  // Story and contact forms: sent in the background, then the confirmation replaces
  // the page through the router. Captured before the router's own form handler.
  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    if (!form || !form.hasAttribute || !form.hasAttribute('data-replace-submit')) return;
    if (!window.fetch || !window.FormData || !window.URL) return; // plain POST
    var textarea = form.querySelector('textarea');
    var emptyNote = form.querySelector('[data-error-empty]');
    var networkNote = form.querySelector('[data-error-network]');
    var button = form.querySelector('button[type="submit"]');
    ev.preventDefault();
    if (networkNote) networkNote.hidden = true;
    if (textarea && textarea.value.trim() === '') {
      if (emptyNote) emptyNote.hidden = false;
      textarea.focus();
      return;
    }
    if (emptyNote) emptyNote.hidden = true;
    if (button) button.disabled = true;

    fetch(form.getAttribute('action') || window.location.pathname, {
      method: 'POST',
      body: new FormData(form),
      credentials: 'same-origin',
      redirect: 'follow'
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      var url = new URL(res.url, window.location.href);
      var next = url.pathname + url.search;
      clearText();
      if (typeof window.teaTalksNavigate === 'function') window.teaTalksNavigate(next);
      else window.location.replace(next);
    }).catch(function () {
      // Keep the words on screen; say so under the button.
      if (button) button.disabled = false;
      if (networkNote) networkNote.hidden = false;
    });
  }, true);
})();
