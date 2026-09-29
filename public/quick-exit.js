/* Quick exit and the story form.
 *  - Tapping a "Leave quickly" control clears every textarea, then replaces
 *    the current page with a weather site. One tap is enough.
 *  - Pressing Escape TWICE within one second does the same. A single Escape
 *    does nothing, so a stray key press never throws away a half-written story.
 *  - Because we use location.replace, the current page disappears from the
 *    browser history: pressing Back on the weather site goes to wherever the
 *    visitor was before Tea Talks, not back here.
 *  - Internal links and the story form also navigate with location.replace,
 *    so a visit to several Tea Talks pages still occupies one history entry.
 *  - The form is sent in the background. An empty box shows a note under the
 *    textarea; a network failure keeps the text and shows a note under the button.
 *  Without JavaScript the controls are plain links and the form is a plain POST.
 *  Nothing here is stored, sent elsewhere or counted; the only state is one
 *  timestamp in memory that dies with the page.
 */
(function () {
  'use strict';

  var exits = document.querySelectorAll('[data-quick-exit]');
  if (!exits.length) return;
  var target = exits[0].getAttribute('href');
  var DOUBLE_PRESS_MS = 1000;
  var lastEscapeAt = 0;

  function clearText() {
    var areas = document.querySelectorAll('textarea');
    for (var i = 0; i < areas.length; i++) areas[i].value = '';
    var inputs = document.querySelectorAll('input[type="password"], input[type="text"]');
    for (var j = 0; j < inputs.length; j++) inputs[j].value = '';
  }

  function leave() {
    clearText();
    try { document.title = 'Weather'; } catch (e) { /* ignore */ }
    window.location.replace(target);
  }

  for (var k = 0; k < exits.length; k++) {
    exits[k].addEventListener('click', function (ev) {
      ev.preventDefault();
      leave();
    });
  }

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

  // Internal links: replace instead of push, so there is no trail to walk back through.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-replace]') : null;
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    window.location.replace(a.getAttribute('href'));
  });

  var form = document.querySelector('form[data-replace-submit]');
  if (form && window.fetch && window.FormData) {
    var textarea = form.querySelector('textarea');
    var button = form.querySelector('button[type="submit"]');
    var emptyNote = form.querySelector('[data-error-empty]');
    var networkNote = form.querySelector('[data-error-network]');

    form.addEventListener('submit', function (ev) {
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
        clearText();
        window.location.replace(url.pathname + url.search);
      }).catch(function () {
        // Keep the words on screen; say so under the button.
        if (button) button.disabled = false;
        if (networkNote) networkNote.hidden = false;
      });
    });
  }
})();
