/* Quick exit, one history entry per visit, confirmation focus, background forms.
 *  - Tapping a "Leave quickly" control pauses every audio and video, clears every
 *    field, changes the tab title, then replaces the current page with an ordinary
 *    site. One tap is enough.
 *  - Pressing Escape TWICE within one second does the same. A single Escape
 *    does nothing, so a stray key press never throws away a half-written story.
 *  - Every internal link on every page (header, navigation, footer, doors,
 *    buttons, pagination, panel) navigates with location.replace, and every form
 *    is sent in the background and the page replaced by the answer. A visit of
 *    any length therefore occupies ONE entry in the browser history; the exit
 *    replaces that entry too, so Back on the exit site lands wherever the visitor
 *    was before this site. Ctrl/Cmd/Shift-click and middle-click are left to the
 *    browser (they open a new tab, which is what the visitor asked for).
 *  - A form with a data-error-empty note refuses an empty box and says so; a
 *    network failure keeps the words on screen and shows the data-error-network
 *    note, or lets the browser submit normally when there is no note.
 *  - A confirmation heading marked data-focus-on-load receives focus, so a
 *    screen reader announces it without a gesture.
 *  Without JavaScript the controls are plain links and the forms are plain POSTs.
 *  Nothing here is stored, sent elsewhere or counted; the only state is one
 *  timestamp in memory that dies with the page.
 */
(function () {
  'use strict';

  var focusTarget = document.querySelector('[data-focus-on-load]');
  if (focusTarget && typeof focusTarget.focus === 'function') {
    try { focusTarget.focus({ preventScroll: true }); } catch (e) { focusTarget.focus(); }
  }

  var exits = document.querySelectorAll('[data-quick-exit]');
  if (!exits.length) return;
  var target = exits[0].getAttribute('href');
  var DOUBLE_PRESS_MS = 1000;
  var lastEscapeAt = 0;

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
    pauseMedia();
    clearText();
    try { document.title = 'Google'; } catch (e) { /* ignore */ }
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

  // Internal links replace the current entry instead of adding one.
  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('data-quick-exit') || a.hasAttribute('download') || a.target) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) !== '/' || href.charAt(1) === '/') return; // same site only, never "//host"
    ev.preventDefault();
    window.location.replace(href);
  });

  // Forms are sent in the background and the page replaced by the answer.
  document.addEventListener('submit', function (ev) {
    var form = ev.target;
    if (!form || !form.getAttribute || (form.getAttribute('method') || 'get').toLowerCase() !== 'post') return;
    if (!window.fetch || !window.FormData || !window.URL) return;
    if (ev.submitter === undefined) return; // old browser: a plain POST is better than losing the button's value
    var textarea = form.querySelector('textarea');
    var emptyNote = form.querySelector('[data-error-empty]');
    var networkNote = form.querySelector('[data-error-network]');
    var button = ev.submitter || form.querySelector('button[type="submit"]');

    if (emptyNote && textarea && textarea.value.trim() === '') {
      ev.preventDefault();
      emptyNote.hidden = false;
      textarea.focus();
      return;
    }
    if (emptyNote) emptyNote.hidden = true;
    if (networkNote) networkNote.hidden = true;

    ev.preventDefault();
    var body = new FormData(form);
    if (ev.submitter && ev.submitter.name) body.append(ev.submitter.name, ev.submitter.value);
    if (button) button.disabled = true;

    fetch(form.getAttribute('action') || window.location.pathname, {
      method: 'POST',
      body: body,
      credentials: 'same-origin',
      redirect: 'follow'
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      var url = new URL(res.url, window.location.href);
      clearText();
      window.location.replace(url.pathname + url.search);
    }).catch(function () {
      // Keep the words on screen; say so under the button, or hand over to a plain POST.
      if (button) button.disabled = false;
      if (networkNote) networkNote.hidden = false;
      else HTMLFormElement.prototype.submit.call(form);
    });
  });
})();
