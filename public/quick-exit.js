/* Quick exit.
 *  - Clicking the "Leave quickly" control or pressing Escape clears every
 *    textarea, then replaces the current page with a weather site.
 *  - Because we use location.replace, the current page disappears from the
 *    browser history: pressing Back on the weather site goes to wherever the
 *    visitor was before Tea Talks, not back here.
 *  - Internal links and the story form also navigate with location.replace,
 *    so a visit to several Tea Talks pages still occupies one history entry.
 *  Without JavaScript the control is a plain link; everything else still works.
 */
(function () {
  'use strict';

  var exitEl = document.querySelector('[data-quick-exit]');
  if (!exitEl) return;
  var target = exitEl.getAttribute('href');

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

  exitEl.addEventListener('click', function (ev) {
    ev.preventDefault();
    leave();
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' || ev.key === 'Esc') {
      ev.preventDefault();
      leave();
    }
  });

  // Internal links: replace instead of push, so there is no trail to walk back through.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[data-replace]') : null;
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    window.location.replace(a.getAttribute('href'));
  });

  // The story form: submit in the background, then replace this page with the
  // confirmation. The form itself works without this (it falls back to a normal POST).
  var form = document.querySelector('form[data-replace-submit]');
  if (form && window.fetch && window.FormData) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      fetch(form.getAttribute('action') || window.location.pathname, {
        method: 'POST',
        body: new FormData(form),
        credentials: 'same-origin',
        redirect: 'follow'
      }).then(function (res) {
        var url = new URL(res.url, window.location.href);
        clearText();
        window.location.replace(url.pathname + url.search);
      }).catch(function () {
        // Network hiccup: fall back to a normal submit so nothing is lost.
        if (button) button.disabled = false;
        form.removeAttribute('data-replace-submit');
        form.submit();
      });
    });
  }
})();
