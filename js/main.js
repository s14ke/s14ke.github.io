/* s14ke — firmware lab
   Motion is driven by anime.js v4 (window.anime, UMD build loaded before this file).
   Everything degrades: without anime or with prefers-reduced-motion the page is simply static. */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var A = window.anime;
    var html = document.documentElement;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var motion = !!(A && A.animate && !reduce && html.classList.contains('anim'));
    if (!motion) html.classList.remove('anim');

    initNavActive();
    initCodeBlocks(A, motion);
    initTables();
    initLightbox(A, motion);
    initTOC();
    initProgress();

    var page = document.body.getAttribute('data-page') || 'page';
    if (page === 'notfound') {
      var np = document.getElementById('nf-path');
      if (np) np.textContent = window.location.pathname || '/404';
    }

    if (!motion) return;

    initLogoScramble(A);
    initTagBars(A);
    if (page === 'notfound') init404(A);

    /* pin the initial hidden state inline so it no longer depends on the .anim class */
    var pinned = $all('[data-reveal]');
    if (pinned.length) A.utils.set(pinned, { opacity: 0 });

    var lazy = initIntro(A, page);
    initScrollReveals(A, lazy);
  });

  /* ------------------------------------------------------------------ helpers */

  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function inViewport(el) {
    var r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  }

  /* Split the text nodes of a heading into per-character spans.
     Words are wrapped in inline-block spans so line wrapping still happens at word boundaries.
     Child elements (e.g. the KR badge) are left intact. */
  function splitChars(el) {
    var chars = [];
    var nodes = Array.prototype.slice.call(el.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === 1 && !node.classList.contains('lang-badge')) { chars.push.apply(chars, splitChars(node)); return; }
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      var parts = node.textContent.split(/(\s+)/);
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        var word = document.createElement('span');
        word.className = 'split-word';
        word.style.display = 'inline-block';
        Array.prototype.forEach.call(part, function (ch) {
          var c = document.createElement('span');
          c.className = 'split-char';
          c.textContent = ch;
          word.appendChild(c);
          chars.push(c);
        });
        frag.appendChild(word);
      });
      el.replaceChild(frag, node);
    });
    return chars;
  }

  /* Typewriter: reveal a line left-to-right, quantised to whole characters, by clipping. */
  function typeLine(A, tl, el, at) {
    var len = Math.max(1, el.textContent.length);
    var duration = Math.min(600, 80 + len * 6);
    var proxy = { p: 0 };
    el.style.clipPath = 'inset(0 100% 0 0)';
    el.style.opacity = '1';
    tl.add(proxy, {
      p: 1,
      duration: duration,
      ease: 'linear',
      onUpdate: function () {
        var s = Math.floor(proxy.p * len) / len;
        el.style.clipPath = 'inset(0 ' + ((1 - s) * 100).toFixed(2) + '% 0 0)';
      },
      onComplete: function () { el.style.clipPath = ''; }
    }, at);
    return at + duration + 70;
  }

  /* ------------------------------------------------------------------ intro timeline */

  function initIntro(A, page) {
    var tl = A.createTimeline({ defaults: { ease: 'outCubic', duration: 520 } });
    var stagger = A.stagger;
    var t = 60;
    var lazy = [];

    /* 2. command line (archive / tags / about / 404) */
    var cmd = document.querySelector('.list-cmd[data-reveal], .nf-cmd[data-reveal]');
    if (cmd) { t = typeLine(A, tl, cmd, t); }

    /* 3. back link on articles */
    var back = document.querySelector('.back-link[data-reveal]');
    if (back) { tl.add(back, { opacity: [0, 1], x: [-8, 0], duration: 380 }, t); t += 60; }

    /* 4. title characters */
    var title = document.querySelector('[data-split="title"]');
    if (title) {
      var chars = splitChars(title);
      if (chars.length) {
        A.utils.set(chars, { opacity: 0 });
        if (inViewport(title)) {
          tl.add(chars, { opacity: [0, 1], y: [12, 0], duration: 460, delay: stagger(14) }, t);
          t += Math.min(700, 120 + chars.length * 14);
        } else {
          title._chars = chars;
          lazy.push(title);
        }
      }
    }

    /* 5. remaining tagged elements: in view -> timeline, below the fold -> lazy */
    var rest = $all('[data-reveal]').filter(function (el) { return el !== cmd && el !== back; });
    var visible = [], entries = [];
    rest.forEach(function (el) {
      if (!inViewport(el)) { lazy.push(el); return; }
      if (el.getAttribute('data-reveal') === 'entry') entries.push(el); else visible.push(el);
    });
    if (visible.length) { tl.add(visible, { opacity: [0, 1], y: [8, 0], delay: stagger(70) }, t); t += 120; }
    if (entries.length) { tl.add(entries, { opacity: [0, 1], x: [-12, 0], duration: 560, delay: stagger(80) }, t); t += 120; }

    /* 6. article body blocks: first screen staggers in, rest reveal on scroll */
    if (page === 'post' || page === 'about' || page === 'page') {
      var blocks = $all('#post-content > *');
      var firstScreen = [];
      blocks.forEach(function (el) { (inViewport(el) ? firstScreen : lazy).push(el); });
      if (firstScreen.length) {
        A.utils.set(firstScreen, { opacity: 0 });
        tl.add(firstScreen, { opacity: [0, 1], y: [10, 0], delay: stagger(55) }, t);
      }
      var toc = document.getElementById('toc-sidebar');
      if (toc) {
        var tocItems = [toc.querySelector('.toc-label')].concat($all('.toc-link', toc)).filter(Boolean);
        A.utils.set(tocItems, { opacity: 0 });
        tl.add(tocItems, { opacity: [0, 1], x: [-6, 0], duration: 380, delay: stagger(30) }, t);
      }
    }

    /* 7. tag rows on the tags page */
    if (page === 'tags') {
      var bars = $all('.tag-bar-fill');
      if (bars.length) {
        bars.forEach(function (bar, i) {
          tl.add(bar, { scaleX: [0, 1], duration: 700, ease: 'outExpo' }, t + 200 + i * 80);
        });
      }
      $all('.tag-count[data-count]').forEach(function (el, i) {
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var proxy = { v: 0 };
        tl.add(proxy, {
          v: target, duration: 700, ease: 'outExpo',
          onUpdate: function () { el.textContent = Math.round(proxy.v); }
        }, t + 200 + i * 80);
      });
    }

    var pin = lazy.filter(function (el) { return !el._chars; });
    if (pin.length) A.utils.set(pin, { opacity: 0 });
    return lazy;
  }

  /* ------------------------------------------------------------------ scroll reveals */

  function initScrollReveals(A, lazy) {
    if (!lazy.length) return;
    if (!('IntersectionObserver' in window)) {
      A.utils.set(lazy, { opacity: 1 });
      return;
    }
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (item) {
        if (!item.isIntersecting) return;
        io.unobserve(item.target);
        var el = item.target;
        if (el._chars) {
          A.animate(el._chars, { opacity: [0, 1], y: [12, 0], duration: 460, ease: 'outCubic', delay: A.stagger(14) });
          return;
        }
        var isEntry = el.getAttribute('data-reveal') === 'entry';
        A.animate(el, {
          opacity: [0, 1],
          x: isEntry ? [-12, 0] : 0,
          y: isEntry ? 0 : [14, 0],
          duration: 560,
          ease: 'outCubic'
        });
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    lazy.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ logo scramble */

  function initLogoScramble(A) {
    var logo = document.querySelector('.logo');
    var el = logo && logo.querySelector('.logo-user');
    if (!el) return;

    var CHARS = '0123456789abcdef<>[]{}/\\|+-=~*#';
    var finalText = el.textContent;
    var n = finalText.length;
    var lockStart = 160, lockStep = 80, duration = lockStart + lockStep * n + 60;
    var anim = null;

    function reset() {
      if (anim) { anim.pause(); anim = null; }
      el.textContent = finalText;
      logo.classList.remove('is-scrambling');
      logo.classList.remove('is-decoded');
    }

    logo.addEventListener('mouseenter', function () {
      reset();
      var proxy = { t: 0 };
      logo.classList.add('is-scrambling');
      anim = A.animate(proxy, {
        t: 1,
        duration: duration,
        ease: 'linear',
        onUpdate: function () {
          var elapsed = proxy.t * duration;
          var frame = Math.floor(elapsed / 42);
          var out = '';
          for (var i = 0; i < n; i++) {
            var locked = elapsed >= lockStart + i * lockStep;
            out += locked ? finalText[i] : CHARS[(frame * 7 + i * 5) % CHARS.length];
          }
          el.textContent = out;
        },
        onComplete: function () {
          el.textContent = finalText;
          logo.classList.remove('is-scrambling');
          logo.classList.add('is-decoded');
        }
      });
    });

    logo.addEventListener('mouseleave', reset);
    document.addEventListener('visibilitychange', function () { if (document.hidden) reset(); });
  }

  /* ------------------------------------------------------------------ tag bars hover */

  function initTagBars(A) {
    $all('.tag-row').forEach(function (row) {
      var addr = row.querySelector('.entry-addr');
      if (!addr) return;
      row.addEventListener('mouseenter', function () {
        A.animate(addr, { x: [0, 4], duration: 220, ease: 'outQuad' });
      });
      row.addEventListener('mouseleave', function () {
        A.animate(addr, { x: 0, duration: 220, ease: 'outQuad' });
      });
    });
  }

  /* ------------------------------------------------------------------ 404 glitch */

  function init404(A) {
    var a = document.querySelector('.nf-layer-a');
    var b = document.querySelector('.nf-layer-b');
    var main = document.querySelector('.nf-main');
    if (!a || !b || !main) return;
    var r = A.utils.random;

    function burst() {
      var tl = A.createTimeline({ defaults: { ease: 'linear' }, onComplete: schedule });
      tl.add(a, { opacity: [0, 0.85], x: [0, r(-10, -4)], duration: 70 }, 0)
        .add(a, { opacity: 0, x: 0, duration: 50 }, 130)
        .add(b, { opacity: [0, 0.85], x: [0, r(4, 10)], duration: 70 }, 30)
        .add(b, { opacity: 0, x: 0, duration: 50 }, 170)
        .add(main, { x: r(-3, 3), duration: 60 }, 20)
        .add(main, { x: 0, duration: 60 }, 110);
    }
    function schedule() { setTimeout(burst, r(900, 2600)); }
    setTimeout(burst, 500);
  }

  /* ------------------------------------------------------------------ reading progress */

  function initProgress() {
    var bar = document.getElementById('progress-bar');
    if (!bar || document.body.getAttribute('data-page') !== 'post') return;
    var ticking = false;
    function update() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------ nav */

  function initNavActive() {
    var path = window.location.pathname;
    $all('.nav-link').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      var isHome = href === '/' && (path === '/' || path === '/index.html');
      var isOther = href !== '/' && path.indexOf(href) === 0;
      if (isHome || isOther) link.classList.add('active');
    });
  }

  /* ------------------------------------------------------------------ code blocks */

  function initCodeBlocks(A, motion) {
    $all('.post-content pre').forEach(function (pre) {
      if (pre.closest('.code-block')) return;
      var code = pre.querySelector('code');

      var wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      var copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy';
      copyBtn.type = 'button';
      copyBtn.textContent = 'copy';
      copyBtn.setAttribute('aria-label', 'Copy code');

      copyBtn.addEventListener('click', function () {
        var text = code ? code.innerText : pre.innerText;
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = 'copied';
          copyBtn.classList.add('is-copied');
          if (motion) {
            A.animate(copyBtn, { scale: [1, 1.12], duration: 120, ease: 'outQuad',
              onComplete: function () { A.animate(copyBtn, { scale: 1, duration: 200, ease: 'outQuad' }); } });
          }
          setTimeout(function () {
            copyBtn.textContent = 'copy';
            copyBtn.classList.remove('is-copied');
          }, 1400);
        });
      });

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(copyBtn);
    });
  }

  /* ------------------------------------------------------------------ tables */

  function initTables() {
    $all('.post-content table').forEach(function (table) {
      if (table.parentNode.classList.contains('table-wrapper')) return;
      var wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  /* ------------------------------------------------------------------ lightbox */

  function initLightbox(A, motion) {
    $all('.post-content img').forEach(function (img) {
      var anchor = img.closest('a');
      if (anchor) anchor.addEventListener('click', function (e) { e.preventDefault(); });
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () { openLightbox(A, motion, img.currentSrc || img.src); });
    });
  }

  function openLightbox(A, motion, src) {
    var overlay = document.createElement('div');
    overlay.className = 'lb-overlay';
    var imgEl = document.createElement('img');
    imgEl.className = 'lb-img';
    imgEl.src = src;
    overlay.appendChild(imgEl);
    document.body.appendChild(overlay);

    var BG = 'rgba(6, 7, 8, 0.94)';
    if (motion) {
      A.animate(overlay, { backgroundColor: ['rgba(6, 7, 8, 0)', BG], duration: 220, ease: 'outQuad' });
      A.animate(imgEl, { opacity: [0, 1], scale: [0.96, 1], duration: 260, ease: 'outCubic' });
    } else {
      overlay.style.backgroundColor = BG;
      imgEl.style.opacity = '1';
    }

    var zoomed = false, tx = 0, ty = 0, skipClick = false;

    function clamp(x, y) {
      var maxX = Math.max(0, imgEl.offsetWidth - overlay.clientWidth / 2);
      var maxY = Math.max(0, imgEl.offsetHeight - overlay.clientHeight / 2);
      return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
    }

    function applyTransform(animated) {
      imgEl.style.transition = animated ? 'transform 0.22s ease' : 'none';
      imgEl.style.transform = zoomed ? 'translate(' + tx + 'px, ' + ty + 'px) scale(2)' : 'scale(1)';
      if (animated) imgEl.style.cursor = zoomed ? 'grab' : 'zoom-in';
    }

    imgEl.addEventListener('click', function (e) {
      e.stopPropagation();
      if (skipClick) { skipClick = false; return; }
      zoomed = !zoomed;
      if (!zoomed) { tx = 0; ty = 0; }
      applyTransform(true);
    });

    imgEl.addEventListener('mousedown', function (e) {
      if (!zoomed) return;
      e.preventDefault();
      var moved = false, ox = e.clientX - tx, oy = e.clientY - ty;
      imgEl.style.cursor = 'grabbing';
      function onMove(e) { moved = true; var c = clamp(e.clientX - ox, e.clientY - oy); tx = c.x; ty = c.y; applyTransform(false); }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        imgEl.style.cursor = 'grab';
        if (moved) skipClick = true;
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    var t0x, t0y, t0tx, t0ty;
    imgEl.addEventListener('touchstart', function (e) {
      if (!zoomed || e.touches.length !== 1) return;
      t0x = e.touches[0].clientX; t0y = e.touches[0].clientY; t0tx = tx; t0ty = ty;
    }, { passive: true });
    imgEl.addEventListener('touchmove', function (e) {
      if (!zoomed || e.touches.length !== 1) return;
      e.preventDefault();
      var c = clamp(t0tx + e.touches[0].clientX - t0x, t0ty + e.touches[0].clientY - t0y);
      tx = c.x; ty = c.y; applyTransform(false);
    }, { passive: false });

    function remove() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    function close() {
      document.removeEventListener('keydown', onKey);
      if (motion) {
        A.animate(overlay, { opacity: 0, duration: 180, ease: 'outQuad', onComplete: remove });
      } else {
        remove();
      }
    }
    overlay.addEventListener('click', function (e) { if (e.target !== imgEl) close(); });
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
  }

  /* ------------------------------------------------------------------ TOC */

  function initTOC() {
    var tocLinks = $all('.toc-sidebar .toc-link');
    if (!tocLinks.length) return;
    var headings = $all('.post-content h1, .post-content h2, .post-content h3');
    if (!headings.length) return;

    function update() {
      var y = window.scrollY + 120;
      var active = null;
      headings.forEach(function (h) { if (h.offsetTop <= y) active = h; });
      var id = active ? active.getAttribute('id') : null;
      tocLinks.forEach(function (link) {
        link.classList.toggle('active', !!id && link.getAttribute('href') === '#' + id);
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
