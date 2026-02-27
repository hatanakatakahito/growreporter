/**
 * GrowReporter ヒートマップ トラッキングスクリプト
 * ユーザーサイトに設置し、クリック座標・スクロール深度を収集する軽量スクリプト
 *
 * 設置例:
 * <script src="https://grow-reporter.com/gr-heatmap.js"
 *         data-site-id="YOUR_SITE_ID" async></script>
 */
(function () {
  'use strict';

  // DNT 対応
  if (navigator.doNotTrack === '1') return;

  // data-site-id 取得
  var scripts = document.querySelectorAll('script[data-site-id]');
  var scriptEl = null;
  for (var i = 0; i < scripts.length; i++) {
    if (scripts[i].src && scripts[i].src.indexOf('gr-heatmap') !== -1) {
      scriptEl = scripts[i];
      break;
    }
  }
  if (!scriptEl) return;

  var siteId = scriptEl.getAttribute('data-site-id');
  if (!siteId) return;

  // 定数
  var ENDPOINT = 'https://asia-northeast1-growgroupreporter.cloudfunctions.net/collectHeatmapData';
  var CONFIG_ENDPOINT = 'https://asia-northeast1-growgroupreporter.cloudfunctions.net/heatmapConfig';
  var CLICK_BATCH_SIZE = 10;
  var CLICK_FLUSH_INTERVAL = 10000; // 10秒
  var SCROLL_THROTTLE = 200; // ms

  // ── サンプリング判定 ──
  // サーバーから設定を取得し、セッション単位でサンプリング判定を行う
  var sessionRand = Math.random();

  function initSampling(callback) {
    var cacheKey = 'gr_hm_cfg_' + siteId;
    var cached = null;

    // sessionStorage キャッシュ確認（5分間有効）
    try {
      var raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        cached = JSON.parse(raw);
        if (cached && cached.ts && (Date.now() - cached.ts < 300000)) {
          if (cached.enabled && sessionRand < (cached.samplingRate || 0)) {
            callback();
          }
          return;
        }
      }
    } catch (e) { /* sessionStorage 利用不可 */ }

    // サーバーから設定取得
    try {
      fetch(CONFIG_ENDPOINT + '?siteId=' + encodeURIComponent(siteId))
        .then(function (r) { return r.json(); })
        .then(function (cfg) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              samplingRate: cfg.samplingRate,
              enabled: cfg.enabled,
              ts: Date.now()
            }));
          } catch (e) { /* sessionStorage 書き込み不可 */ }

          if (cfg.enabled && sessionRand < (cfg.samplingRate || 0)) {
            callback();
          }
        })
        .catch(function () {
          // 設定取得失敗時はデフォルトで収集（後方互換）
          callback();
        });
    } catch (e) {
      // fetch 利用不可時もデフォルトで収集
      callback();
    }
  }

  // ── サンプリング判定後にトラッキング初期化 ──
  initSampling(function () {
    // デバイス判定
    var device = window.innerWidth < 768 ? 'mobile' : 'pc';

    // URL 正規化: パスのみ（クエリパラメータ・ハッシュ除去、末尾スラッシュ除去）
    function normalizePath(path) {
      var p = path || '/';
      if (p !== '/' && p.charAt(p.length - 1) === '/') {
        p = p.slice(0, -1);
      }
      return p;
    }

    var pageUrl = normalizePath(location.pathname);

    // セッション ID（匿名、永続化なし）
    var sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : 'r' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    // ── セクションマップ収集 ──
    var sectionsSent = false;

    function collectSections() {
      if (sectionsSent) return;
      var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) return;
      var sections = [];
      for (var i = 0; i < headings.length; i++) {
        var h = headings[i];
        var text = (h.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 100) continue;
        var rect = h.getBoundingClientRect();
        var yPos = Math.round(window.scrollY + rect.top);
        sections.push({ y: yPos, tag: h.tagName.toLowerCase(), text: text });
      }
      if (sections.length === 0) return;
      sectionsSent = true;
      send({
        siteId: siteId,
        type: 'sections',
        device: device,
        pageUrl: pageUrl,
        pageHeight: document.documentElement.scrollHeight,
        sessionId: sessionId,
        sections: sections
      });
    }

    // DOM 安定後にセクション収集（1秒後）
    setTimeout(collectSections, 1000);

    // ── クリック時のセクション特定 ──
    function getNearestHeading(y) {
      var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      var best = null;
      var bestDist = Infinity;
      for (var i = 0; i < headings.length; i++) {
        var rect = headings[i].getBoundingClientRect();
        var hY = Math.round(window.scrollY + rect.top);
        if (hY <= y) {
          var dist = y - hY;
          if (dist < bestDist) {
            bestDist = dist;
            best = (headings[i].textContent || '').replace(/\s+/g, ' ').trim();
          }
        }
      }
      return best ? best.slice(0, 50) : null;
    }

    // ── クリック収集 ──
    var clickBuffer = [];
    var clickTimer = null;

    function flushClicks() {
      if (clickBuffer.length === 0) return;
      var payload = {
        siteId: siteId,
        type: 'clicks',
        device: device,
        pageUrl: pageUrl,
        viewportWidth: window.innerWidth,
        pageHeight: document.documentElement.scrollHeight,
        sessionId: sessionId,
        clicks: clickBuffer.slice()
      };
      clickBuffer = [];
      send(payload);
    }

    function scheduleFlush() {
      if (clickTimer) return;
      clickTimer = setTimeout(function () {
        clickTimer = null;
        flushClicks();
      }, CLICK_FLUSH_INTERVAL);
    }

    document.addEventListener('click', function (e) {
      var x = Math.round((e.clientX / window.innerWidth) * 10000);
      var y = Math.round(window.scrollY + e.clientY);
      var section = getNearestHeading(y);
      var clickData = { x: x, y: y };
      if (section) clickData.section = section;
      clickBuffer.push(clickData);
      if (clickBuffer.length >= CLICK_BATCH_SIZE) {
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
        flushClicks();
      } else {
        scheduleFlush();
      }
    }, true);

    // ── スクロール収集 ──
    var maxScrollPercent = 0;
    var scrollThrottleTimer = null;

    function updateScroll() {
      var scrollTop = window.scrollY || window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight;
      var viewportHeight = window.innerHeight;
      if (docHeight <= viewportHeight) {
        maxScrollPercent = 100;
        return;
      }
      var percent = Math.round(((scrollTop + viewportHeight) / docHeight) * 100);
      if (percent > maxScrollPercent) maxScrollPercent = percent;
    }

    window.addEventListener('scroll', function () {
      if (scrollThrottleTimer) return;
      scrollThrottleTimer = setTimeout(function () {
        scrollThrottleTimer = null;
        updateScroll();
      }, SCROLL_THROTTLE);
    }, { passive: true });

    // 初期スクロール位置
    updateScroll();

    function flushScroll() {
      if (maxScrollPercent <= 0) return;
      var payload = {
        siteId: siteId,
        type: 'scroll',
        device: device,
        pageUrl: pageUrl,
        viewportHeight: window.innerHeight,
        pageHeight: document.documentElement.scrollHeight,
        sessionId: sessionId,
        maxScrollPercent: maxScrollPercent
      };
      send(payload);
    }

    // ── 送信 ──
    function send(payload) {
      var data = JSON.stringify(payload);
      // sendBeacon + text/plain でプリフライト(OPTIONS)を回避
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([data], { type: 'text/plain' }));
      } else {
        try {
          fetch(ENDPOINT, {
            method: 'POST',
            body: data,
            headers: { 'Content-Type': 'text/plain' },
            keepalive: true
          });
        } catch (e) { /* 無視 */ }
      }
    }

    // ── ページ離脱時にフラッシュ ──
    function onUnload() {
      flushClicks();
      flushScroll();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') onUnload();
    });
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
  });
})();
