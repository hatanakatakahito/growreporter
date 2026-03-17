/**
 * GROW REPORTER サイトコンテンツコレクター
 *
 * サイトの構造化コンテンツデータを自動収集するクライアントスクリプト。
 * ページロード時に1回だけ実行し、構造化JSONとして送信する。
 *
 * 設置方法:
 * <script src="https://grow-reporter.com/gr-collector.js" data-site-id="YOUR_SITE_ID" async></script>
 */
(function () {
  'use strict';

  // === 設定 ===
  var API_BASE = 'https://asia-northeast1-growgroupreporter.cloudfunctions.net';
  var CONFIG_ENDPOINT = API_BASE + '/collectorConfig';
  var COLLECT_ENDPOINT = API_BASE + '/collectSiteData';
  var CACHE_KEY_PREFIX = 'gr_collector_';
  var CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7日

  // === スクリプトタグからsiteIdを取得 ===
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('gr-collector') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!scriptTag) return;
  var siteId = scriptTag.getAttribute('data-site-id');
  if (!siteId) return;

  // === デバイス判定 ===
  function getDevice() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'pc';
  }

  // === クライアント側キャッシュ（sessionStorage） ===
  function isCached(pageUrl, device) {
    try {
      var key = CACHE_KEY_PREFIX + siteId + '_' + btoa(pageUrl + '::' + device);
      var cached = sessionStorage.getItem(key);
      if (!cached) return false;
      var ts = parseInt(cached, 10);
      return (Date.now() - ts) < CACHE_DURATION_MS;
    } catch (e) {
      return false;
    }
  }

  function setCache(pageUrl, device) {
    try {
      var key = CACHE_KEY_PREFIX + siteId + '_' + btoa(pageUrl + '::' + device);
      sessionStorage.setItem(key, String(Date.now()));
    } catch (e) {
      // sessionStorage使用不可の場合は無視
    }
  }

  // === データ抽出関数群 ===

  /** ファーストビュー要素の抽出 */
  function extractFirstView() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var result = { headline: '', subheadline: '', cta: null };

    // ファーストビュー内のh1/h2を取得
    var headings = document.querySelectorAll('h1, h2');
    for (var i = 0; i < headings.length; i++) {
      var rect = headings[i].getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        if (!result.headline && headings[i].tagName === 'H1') {
          result.headline = headings[i].textContent.trim().substring(0, 200);
        } else if (!result.subheadline) {
          result.subheadline = headings[i].textContent.trim().substring(0, 200);
        }
      }
    }

    // ファーストビュー内のCTAボタンを探す
    var links = document.querySelectorAll('a[href], button');
    for (var j = 0; j < Math.min(links.length, 50); j++) {
      var el = links[j];
      var elRect = el.getBoundingClientRect();
      if (elRect.top < vh && elRect.bottom > 0) {
        var text = el.textContent.trim();
        // CTAっぽいキーワードを含むリンク/ボタンを検出
        if (text && text.length < 50 && /お問い合わせ|資料|無料|申し込|登録|相談|見積|体験|ダウンロード|contact|free|signup|trial|start|get|try/i.test(text)) {
          result.cta = {
            text: text.substring(0, 100),
            href: el.href || '',
          };
          break;
        }
      }
    }

    // heroImageを検出
    var images = document.querySelectorAll('img');
    for (var k = 0; k < Math.min(images.length, 20); k++) {
      var imgRect = images[k].getBoundingClientRect();
      if (imgRect.top < vh && imgRect.width > 300 && imgRect.height > 150) {
        result.heroImage = images[k].src || '';
        break;
      }
    }

    return result;
  }

  /** ナビゲーション抽出 */
  function extractNavigation() {
    var nav = document.querySelector('nav, header nav, [role="navigation"]');
    if (!nav) return null;

    var items = [];
    var topLinks = nav.querySelectorAll('a[href]');
    for (var i = 0; i < Math.min(topLinks.length, 30); i++) {
      var text = topLinks[i].textContent.trim();
      if (text && text.length < 100) {
        items.push({
          text: text.substring(0, 80),
          href: topLinks[i].getAttribute('href') || '',
        });
      }
    }
    return items.length > 0 ? items : null;
  }

  /** セクション構成の抽出 */
  function extractSections() {
    var sections = [];
    var headings = document.querySelectorAll('h2, h3');

    for (var i = 0; i < Math.min(headings.length, 30); i++) {
      var h = headings[i];
      var text = h.textContent.trim();
      if (!text || text.length > 200) continue;

      var section = {
        heading: text.substring(0, 150),
        tag: h.tagName.toLowerCase(),
      };

      // 次のheading or sectionの手前までのコンテンツを要約
      var parent = h.closest('section, article, div');
      if (parent) {
        var allText = parent.textContent.trim();
        section.contentSummary = allText.substring(0, 200);

        // 画像数
        section.imageCount = parent.querySelectorAll('img').length;

        // CTA検出
        var ctas = [];
        var parentLinks = parent.querySelectorAll('a[href], button');
        for (var j = 0; j < Math.min(parentLinks.length, 10); j++) {
          var linkText = parentLinks[j].textContent.trim();
          if (linkText && linkText.length < 50 && /お問い合わせ|資料|無料|申し込|登録|相談|見積|体験|ダウンロード|詳しく|contact|free|signup|more|learn/i.test(linkText)) {
            ctas.push({
              text: linkText.substring(0, 80),
              href: parentLinks[j].href || '',
            });
          }
        }
        if (ctas.length > 0) section.ctas = ctas;
      }

      sections.push(section);
    }
    return sections;
  }

  /** フォーム情報の抽出 */
  function extractForms() {
    var forms = [];
    var formElements = document.querySelectorAll('form');

    for (var i = 0; i < Math.min(formElements.length, 5); i++) {
      var form = formElements[i];
      var fields = [];

      var inputs = form.querySelectorAll('input, select, textarea');
      for (var j = 0; j < inputs.length; j++) {
        var input = inputs[j];
        // パスワードフィールドは除外（セキュリティ）
        if (input.type === 'password' || input.type === 'hidden') continue;

        var label = '';
        if (input.id) {
          var labelEl = document.querySelector('label[for="' + input.id + '"]');
          if (labelEl) label = labelEl.textContent.trim();
        }
        if (!label) label = input.placeholder || input.name || input.type || '';
        fields.push(label.substring(0, 50));
      }

      // 送信ボタンのテキスト
      var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      var submitText = submitBtn ? (submitBtn.textContent || submitBtn.value || '').trim() : '';

      // フォームの目的を推測
      var formText = form.textContent.trim().substring(0, 200).toLowerCase();
      var purpose = 'その他';
      if (/お問い合わせ|contact|inquiry/i.test(formText)) purpose = 'お問い合わせ';
      else if (/資料|ダウンロード|download/i.test(formText)) purpose = '資料請求';
      else if (/登録|signup|register/i.test(formText)) purpose = '会員登録';
      else if (/見積|quote|estimate/i.test(formText)) purpose = 'お見積もり';
      else if (/検索|search/i.test(formText)) purpose = '検索';
      else if (/ログイン|login|signin/i.test(formText)) purpose = 'ログイン';

      if (fields.length > 0) {
        forms.push({
          purpose: purpose,
          fields: fields.slice(0, 10),
          submitText: submitText.substring(0, 50),
        });
      }
    }
    return forms;
  }

  /** フッター情報の抽出 */
  function extractFooter() {
    var footer = document.querySelector('footer, [role="contentinfo"]');
    if (!footer) return null;

    var result = {};

    // 会社情報を探す
    var footerText = footer.textContent.trim();
    var companyMatch = footerText.match(/(株式会社|有限会社|合同会社|一般社団法人|特定非営利活動法人)[^\s,。、）)]+/);
    if (companyMatch) result.companyInfo = companyMatch[0].substring(0, 100);

    // 連絡方法
    var contactMethods = [];
    if (/tel:|電話|phone/i.test(footerText)) contactMethods.push('電話');
    if (/mail|メール|email/i.test(footerText)) contactMethods.push('メール');
    if (/line\.me|line公式/i.test(footer.innerHTML)) contactMethods.push('LINE');
    if (contactMethods.length > 0) result.contactMethods = contactMethods;

    // フッターリンク
    var links = [];
    var footerLinks = footer.querySelectorAll('a[href]');
    for (var i = 0; i < Math.min(footerLinks.length, 20); i++) {
      var text = footerLinks[i].textContent.trim();
      if (text && text.length < 80) {
        links.push({
          text: text.substring(0, 60),
          href: footerLinks[i].getAttribute('href') || '',
        });
      }
    }
    if (links.length > 0) result.links = links;

    return Object.keys(result).length > 0 ? result : null;
  }

  /** メタ情報の抽出 */
  function extractMeta() {
    return {
      title: (document.title || '').substring(0, 200),
      description: (function () {
        var meta = document.querySelector('meta[name="description"]');
        return meta ? (meta.getAttribute('content') || '').substring(0, 300) : '';
      })(),
      ogImage: (function () {
        var og = document.querySelector('meta[property="og:image"]');
        return og ? (og.getAttribute('content') || '') : '';
      })(),
    };
  }

  /** デザイントークンの抽出 */
  function extractDesignTokens() {
    var tokens = {};

    try {
      var body = document.body;
      var computed = window.getComputedStyle(body);

      // フォント
      tokens.fonts = computed.fontFamily ? computed.fontFamily.split(',').slice(0, 3).map(function (f) { return f.trim().replace(/['"]/g, ''); }) : [];
      tokens.bodyFontSize = computed.fontSize || '';

      // 背景色
      tokens.bodyBgColor = computed.backgroundColor || '';

      // primaryColor を推定（最初のボタン/リンクの色）
      var primaryBtn = document.querySelector('a.btn, a.button, button.btn, button.button, .btn-primary, [class*="btn-"], [class*="button-"]');
      if (primaryBtn) {
        var btnStyle = window.getComputedStyle(primaryBtn);
        tokens.primaryColor = btnStyle.backgroundColor || '';
        tokens.primaryTextColor = btnStyle.color || '';
      }

      // max-width
      var container = document.querySelector('.container, .wrapper, main, [class*="container"]');
      if (container) {
        tokens.maxWidth = window.getComputedStyle(container).maxWidth || '';
      }
    } catch (e) {
      // スタイル取得失敗は無視
    }

    return tokens;
  }

  /** 主要要素のHTML+スタイル抽出（Phase 3のモックアップ用） */
  function extractKeyElements() {
    var elements = [];

    // hero セクション
    var hero = document.querySelector('[class*="hero"], [class*="banner"], [class*="jumbotron"], [class*="main-visual"], [class*="mv-"], section:first-of-type');
    if (hero) {
      var heroRect = hero.getBoundingClientRect();
      if (heroRect.height > 100) {
        elements.push({
          type: 'hero',
          html: sanitizeHtml(hero.outerHTML, 2000),
          styles: getComputedStyles(hero),
        });
      }
    }

    // CTAボタン（最初の主要CTA）
    var ctaSelectors = 'a.btn-primary, a[class*="cta"], button[class*="cta"], a[class*="btn-primary"], .btn-primary a, [class*="hero"] a[href]';
    var cta = document.querySelector(ctaSelectors);
    if (cta) {
      elements.push({
        type: 'cta',
        html: sanitizeHtml(cta.outerHTML, 500),
        styles: getComputedStyles(cta),
      });
    }

    // ヘッダー
    var header = document.querySelector('header');
    if (header) {
      elements.push({
        type: 'header',
        html: sanitizeHtml(header.outerHTML, 2000),
        styles: getComputedStyles(header),
      });
    }

    return elements.slice(0, 5); // 最大5要素
  }

  /** HTMLのサニタイズ（scriptタグ除去、サイズ制限） */
  function sanitizeHtml(html, maxLen) {
    if (!html) return '';
    // scriptタグ除去
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    // インラインイベントハンドラ除去
    html = html.replace(/\s+on\w+="[^"]*"/gi, '');
    html = html.replace(/\s+on\w+='[^']*'/gi, '');
    return html.substring(0, maxLen || 2000);
  }

  /** 要素の主要スタイルを取得 */
  function getComputedStyles(el) {
    try {
      var cs = window.getComputedStyle(el);
      return {
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        padding: cs.padding,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        borderRadius: cs.borderRadius,
      };
    } catch (e) {
      return {};
    }
  }

  // === メイン処理 ===
  function run() {
    var pageUrl = location.pathname;
    var device = getDevice();

    // クライアント側キャッシュチェック
    if (isCached(pageUrl, device)) return;

    // サーバー側にコレクション要否を確認
    var configUrl = CONFIG_ENDPOINT + '?siteId=' + encodeURIComponent(siteId) +
      '&pageUrl=' + encodeURIComponent(pageUrl) +
      '&device=' + encodeURIComponent(device);

    fetch(configUrl)
      .then(function (res) { return res.json(); })
      .then(function (config) {
        if (!config.collect) {
          // 収集不要 → キャッシュに記録して終了
          setCache(pageUrl, device);
          return;
        }

        // データ収集
        var data = {
          siteId: siteId,
          pageUrl: pageUrl,
          device: device,
          firstView: extractFirstView(),
          navigation: extractNavigation(),
          sections: extractSections(),
          forms: extractForms(),
          footer: extractFooter(),
          meta: extractMeta(),
          designTokens: extractDesignTokens(),
          keyElements: extractKeyElements(),
        };

        // 送信
        return fetch(COLLECT_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      })
      .then(function () {
        setCache(pageUrl, device);
      })
      .catch(function () {
        // エラー時は静かに失敗（ユーザー体験に影響しない）
      });
  }

  // DOMContentLoaded後に実行（すでにロード済みなら即実行）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    // 少し遅延させてメインコンテンツのレンダリングを優先
    setTimeout(run, 1000);
  }
})();
