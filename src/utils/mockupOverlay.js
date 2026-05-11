/**
 * モックアップ用 overlay marker UI のクライアント側注入
 *
 * 役割:
 *   1. iframe (改善モックアップ) load 後、contentDocument に overlay CSS + helper script を注入
 *   2. helper script が data-changed 要素の rect を実測し、body 直下の overlay layer に
 *      <div class="__mockup-overlay"> を絶対配置で描画
 *   3. badge は data-changed 要素ごとに毎回付与 (重複ありで全箇所マーキング)
 *   4. ハイライト・枠線なし、badge のみで改善箇所を示す
 *   5. スマート fallback: rect=0 要素は親要素を辿って visible な祖先に表示
 *
 * 設計方針 (2026-05-09 / Y 案):
 *   - **分岐廃止 (品質振れ幅ゼロ)**: tiny / large / fixed-ancestor / clipping / clamp 等の
 *     条件分岐を全廃。コンテンツに依らず「全要素同じ単一動作」で振れ幅ゼロ。
 *   - **5/8 朝の視覚スタイル踏襲**: outline は要素内側 10px 引っ込ませ + badge は内側 14;14
 *     位置 28px。「要素にぴたっと寄り添う」見た目をオリジナル仕様で再現。
 *   - **架構維持**: server embedded → client injection の Stage 1-3 責務分離は継続。
 *     CSS / helper を変えても HTML 再生成不要で UI iteration 可能。
 *   - **生成処理本体は触らない**: BR retry / L2 fallback / AI prompt rule / semaphore 等
 *     5/8 中以降の改善はすべて維持。
 *
 * 後方互換:
 *   - 旧サーバで生成されたモックアップ (id="__mockup-outline" or "__mockup-helper") には注入しない
 *
 * postMessage 互換:
 *   - __mockup_size / __mockup_changed_positions / __mockup_changed_clicked /
 *     __mockup_changed_hovered / __mockup_changed_deselected
 */

// 5/8 朝の視覚スタイル (inset:10 outline + 内側 14;14 badge 28px) を overlay-layer 上で再現
const MOCKUP_OVERLAY_CSS = `
#__mockup-overlay-layer {
  position: absolute !important; top: 0 !important; left: 0 !important;
  width: 100% !important; height: 0 !important;
  pointer-events: none !important; z-index: 2147483647 !important;
}
.__mockup-overlay {
  position: absolute !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  /* badge のみ方式: ハイライト・枠線なし。badge クリック領域だけを担う */
  background: transparent !important;
  box-sizing: border-box !important;
}
.__mockup-badge {
  position: absolute !important;
  box-sizing: border-box !important;
  padding: 0 !important; margin: 0 !important;
  top: 14px !important; left: 14px !important;
  width: 28px !important; height: 28px !important;
  min-width: 28px !important; max-width: 28px !important;
  min-height: 28px !important; max-height: 28px !important;
  background: #3758F9 !important; color: #fff !important;
  border: 2px solid #fff !important;
  border-radius: 50% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 13px !important;
  font-weight: 800 !important;
  box-shadow: 0 2px 6px rgba(55,88,249,0.4) !important;
  z-index: 1 !important;
  line-height: 1 !important;
  letter-spacing: 0 !important;
  text-indent: 0 !important;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif !important;
  flex-shrink: 0 !important; flex-grow: 0 !important;
}
`;

// helper script: 単一動作のみ (分岐ゼロ)
const MOCKUP_OVERLAY_HELPER = `(function(){
  var active = null;

  function ensureLayer(){
    var l = document.getElementById('__mockup-overlay-layer');
    if(!l){
      l = document.createElement('div');
      l.id = '__mockup-overlay-layer';
      document.body.appendChild(l);
    }
    return l;
  }

  // スマート fallback: data-changed 要素自身が rect=0 (空 span 等で見えない) 場合、
  // 親を最大 6 階層辿って visible な祖先を探し、そこに overlay を表示する。
  // これにより AI が <span><br></span> 等の無意味要素で patch を埋めても、
  // 親要素 (例: <td>, <p>, <div>) に badge が表示されて「ここが改善箇所」と分かる。
  function findRenderableRect(el){
    var r = el.getBoundingClientRect();
    if(r.width > 0 && r.height > 0) return r;
    var p = el.parentElement;
    var depth = 0;
    while(p && p !== document.body && depth < 6){
      r = p.getBoundingClientRect();
      if(r.width > 0 && r.height > 0) return r;
      p = p.parentElement;
      depth++;
    }
    return null;
  }

  function postSize(){
    try{
      var d = document, b = d.body, de = d.documentElement;
      var sh = de.scrollHeight || 0;
      var bb = b ? ((b.offsetTop || 0) + (b.offsetHeight || 0)) : 0;
      var h = (sh > 0 && bb > 0) ? Math.min(sh, bb) : (sh || bb || 0);
      parent.postMessage({type: '__mockup_size', height: h, width: de.scrollWidth}, '*');
    }catch(_){}
  }

  function postChangedPositions(){
    try{
      var els = document.querySelectorAll('[data-changed]');
      if(els.length === 0) return;
      var positions = [];
      for(var i = 0; i < els.length; i++){
        var el = els[i];
        var rect = findRenderableRect(el);  // スマート fallback (rect=0 なら親を使う)
        if(!rect) continue;
        positions.push({
          top: rect.top + window.pageYOffset,
          left: rect.left + window.pageXOffset,
          height: rect.height, width: rect.width,
          label: el.getAttribute('data-changed') || '',
          num: el.getAttribute('data-num') || ''
        });
      }
      parent.postMessage({type: '__mockup_changed_positions', positions: positions}, '*');
    }catch(_){}
  }

  // 全要素同一動作 (分岐ゼロ): rect 取って overlay 配置 + badge dedup のみ
  function renderOverlays(){
    try{
      var layer = ensureLayer();
      layer.innerHTML = '';
      layer.style.height = document.documentElement.scrollHeight + 'px';
      var els = document.querySelectorAll('[data-changed]');

      for(var i = 0; i < els.length; i++){
        var el = els[i];
        // スマート fallback: 自要素が rect=0 なら親を辿って visible な祖先を使う
        var r = findRenderableRect(el);
        if(!r) continue;  // 全祖先が不可視なら skip (極稀)

        var ov = document.createElement('div');
        ov.className = '__mockup-overlay';
        var num = el.getAttribute('data-num') || '';
        var label = el.getAttribute('data-changed') || '';
        ov.dataset.num = num;
        ov.dataset.label = label;

        // overlay 位置 = 要素 rect (document absolute)
        ov.style.top = (r.top + window.pageYOffset) + 'px';
        ov.style.left = (r.left + window.pageXOffset) + 'px';
        ov.style.width = r.width + 'px';
        ov.style.height = r.height + 'px';

        // badge は data-changed 要素ごとに毎回付ける (dedup なし)
        // ハイライト/枠線がないため、各箇所に必ずマーカーが必要
        if(num){
          var b = document.createElement('span');
          b.className = '__mockup-badge';
          b.textContent = num;
          ov.appendChild(b);
        }

        // click / hover ハンドラ
        (function(ovEl, n, lbl){
          ovEl.addEventListener('click', function(e){
            e.preventDefault();
            e.stopPropagation();
            if(active && active !== ovEl) active.classList.remove('__mockup-active');
            ovEl.classList.toggle('__mockup-active');
            active = ovEl.classList.contains('__mockup-active') ? ovEl : null;
            try{
              var rr = ovEl.getBoundingClientRect();
              parent.postMessage({
                type: '__mockup_changed_clicked',
                num: n, label: lbl,
                rect: {top: rr.top, left: rr.left, right: rr.right, bottom: rr.bottom, width: rr.width, height: rr.height},
                active: ovEl.classList.contains('__mockup-active')
              }, '*');
            }catch(_){}
          });
          ovEl.addEventListener('mouseenter', function(){
            try{ parent.postMessage({type: '__mockup_changed_hovered', num: n, label: lbl}, '*'); }catch(_){}
          });
        })(ov, num, label);

        layer.appendChild(ov);
      }
    }catch(_){}
  }

  document.addEventListener('click', function(e){
    var inOverlay = e.target && (
      (e.target.classList && (e.target.classList.contains('__mockup-overlay') || e.target.classList.contains('__mockup-badge'))) ||
      (e.target.closest && e.target.closest('.__mockup-overlay'))
    );
    if(!inOverlay && active){
      active.classList.remove('__mockup-active');
      active = null;
      try{ parent.postMessage({type: '__mockup_changed_deselected'}, '*'); }catch(_){}
    }
  });

  function waitImagesThenRender(){
    try{
      var imgs = Array.prototype.slice.call(document.images);
      var pending = 0;
      for(var i = 0; i < imgs.length; i++){ if(!imgs[i].complete) pending++; }
      var done = false;
      var finish = function(){
        if(done) return;
        done = true;
        postSize(); renderOverlays(); postChangedPositions();
      };
      if(pending === 0){ finish(); return; }
      imgs.forEach(function(img){
        if(img.complete) return;
        var on = function(){ if(--pending === 0) finish(); };
        img.addEventListener('load', on);
        img.addEventListener('error', on);
      });
      setTimeout(finish, 4000);
    }catch(_){}
  }

  function observe(){
    try{
      if(typeof ResizeObserver !== 'undefined'){
        var ro = new ResizeObserver(function(){ postSize(); renderOverlays(); });
        ro.observe(document.body);
        ro.observe(document.documentElement);
      }
      window.addEventListener('scroll', function(){
        requestAnimationFrame(renderOverlays);
      }, {passive: true});
    }catch(_){}
  }

  function init(){
    try{
      postSize(); renderOverlays(); postChangedPositions(); observe();
      setTimeout(function(){ postSize(); renderOverlays(); postChangedPositions(); }, 300);
      setTimeout(function(){ postSize(); renderOverlays(); postChangedPositions(); }, 1200);
      setTimeout(renderOverlays, 3000);
      waitImagesThenRender();
    }catch(_){}
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', function(){
    try{ postSize(); renderOverlays(); }catch(_){}
  });
})();`;

/**
 * iframe.contentDocument に overlay CSS + helper script を注入する。
 * 旧サーバ embedded marker がある場合はスキップ (後方互換)。
 *
 * @param {HTMLIFrameElement} iframe
 */
export function injectMockupOverlay(iframe) {
  try {
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;

    // 既に新方式で注入済ならスキップ
    if (doc.getElementById('__mockup-overlay-css')) return;

    // 旧サーバ版の marker (embedded helper) があればスキップ - 重複を避ける
    if (doc.getElementById('__mockup-helper') || doc.getElementById('__mockup-overlay-helper')) return;

    // CSS 注入
    const style = doc.createElement('style');
    style.id = '__mockup-overlay-css';
    style.textContent = MOCKUP_OVERLAY_CSS;
    if (doc.head) {
      doc.head.appendChild(style);
    } else {
      doc.documentElement.insertBefore(style, doc.documentElement.firstChild);
    }

    // Helper script 注入
    const script = doc.createElement('script');
    script.id = '__mockup-overlay-helper';
    script.textContent = MOCKUP_OVERLAY_HELPER;
    if (doc.body) {
      doc.body.appendChild(script);
    } else {
      doc.documentElement.appendChild(script);
    }
  } catch (err) {
    // sandbox 制約で contentDocument にアクセスできない場合などは silent fail
    console.warn('[mockupOverlay] inject failed:', err.message);
  }
}
