import pptxgen from "pptxgenjs";

const pptx = new pptxgen();

// ── Brand tokens ──────────────────────────────────────
const C = {
  primary:    "3758F9",
  primaryDk:  "2A42C8",
  secondary:  "13C296",
  dark:       "1B2336",
  text:       "44546A",
  textLight:  "637381",
  lightBg:    "F4F7FF",
  white:      "FFFFFF",
  border:     "DEE2E6",
  accent:     "8B5CF6",  // purple for gradient feel
  red:        "EF4444",
  gray:       "9CA3AF",
};

const F = {
  head: "Yu Gothic",
  body: "Yu Gothic",
  accent: "Century Gothic",
};

// ── Helpers ───────────────────────────────────────────
function addFooter(slide, num, total) {
  slide.addText(`© Grow Group株式会社`, { x: 0.5, y: 6.85, w: 4, h: 0.3, fontSize: 8, color: C.gray, fontFace: F.body });
  slide.addText(`${num}`, { x: 9.0, y: 6.85, w: 0.7, h: 0.3, fontSize: 8, color: C.gray, align: "right", fontFace: F.body });
}

function addSectionDivider(title, subtitle, num, total) {
  const slide = pptx.addSlide();
  slide.background = { color: C.primary };
  slide.addText(title, { x: 1, y: 2.4, w: 8, h: 1.2, fontSize: 32, bold: true, color: C.white, fontFace: F.head, align: "center" });
  if (subtitle) {
    slide.addText(subtitle, { x: 1.5, y: 3.7, w: 7, h: 0.8, fontSize: 14, color: "FFFFFFCC", fontFace: F.body, align: "center" });
  }
  slide.addText(`${num}`, { x: 9.0, y: 6.85, w: 0.7, h: 0.3, fontSize: 8, color: "FFFFFF80", align: "right", fontFace: F.body });
  return slide;
}

function roundedCard(slide, x, y, w, h, opts = {}) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h,
    rectRadius: 0.15,
    fill: { color: opts.fill || C.white },
    shadow: opts.shadow !== false ? { type: "outer", blur: 6, offset: 2, color: "00000015" } : undefined,
    line: opts.border ? { color: opts.border, width: 1.2 } : undefined,
  });
}

let slideNum = 0;

// ══════════════════════════════════════════════════════
// SLIDE 1: Cover
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  // gradient-like background
  s.background = { color: C.dark };
  // decorative accent bar
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.primary } });
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0.06, w: 5, h: 0.03, fill: { color: C.secondary } });

  s.addText("GrowReporter", { x: 0.7, y: 0.4, w: 4, h: 0.5, fontSize: 14, color: C.primary, bold: true, fontFace: F.accent });

  s.addText([
    { text: "アクセス解析 × AI で\n", options: { fontSize: 36, bold: true, color: C.white, fontFace: F.head, breakType: "none" } },
    { text: 'Web サイトに "次の打ち手" を。', options: { fontSize: 36, bold: true, color: C.primary, fontFace: F.head } },
  ], { x: 0.7, y: 1.8, w: 8.5, h: 2.2, lineSpacingMultiple: 1.3 });

  s.addText(
    "GA4 や Search Console のデータに AI を掛け合わせて\n分析・改善・評価のサイクルで、サイトを着実に成長させます。",
    { x: 0.7, y: 4.2, w: 7, h: 1, fontSize: 14, color: C.gray, fontFace: F.body, lineSpacingMultiple: 1.6 }
  );

  s.addText("サービスご紹介資料", { x: 0.7, y: 5.8, w: 4, h: 0.4, fontSize: 11, color: C.textLight, fontFace: F.body });
  s.addText("Grow Group 株式会社", { x: 0.7, y: 6.2, w: 4, h: 0.4, fontSize: 11, color: C.textLight, fontFace: F.body });
}

// ══════════════════════════════════════════════════════
// SLIDE 2: 課題提起
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("こんなお悩み、ありませんか？", { x: 0.7, y: 0.4, w: 8, h: 0.7, fontSize: 26, bold: true, color: C.dark, fontFace: F.head });

  const problems = [
    { role: "Web担当者", icon: "💻", items: ["GA4の画面が複雑で\nどこを見ればいいかわからない", "結局アクセス数だけ見て\n終わってしまう"] },
    { role: "マーケター", icon: "📊", items: ["数値を見ても具体的な\n改善策が浮かばない", "レポート作成に\n毎回半日かかる"] },
    { role: "経営者", icon: "👔", items: ["外注すると月数十万、\nコストが見合わない", "Web の成果が見えにくい"] },
    { role: "制作会社", icon: "🏢", items: ["改善の PDCA が続かない", "サイトの異変に気づけない"] },
  ];

  problems.forEach((p, i) => {
    const x = 0.5 + i * 2.3;
    roundedCard(s, x, 1.4, 2.1, 4.2, { border: C.border });
    s.addText(p.role, { x, y: 1.6, w: 2.1, h: 0.5, fontSize: 13, bold: true, color: C.primary, fontFace: F.body, align: "center" });
    s.addShape(pptx.shapes.RECTANGLE, { x: x + 0.3, y: 2.15, w: 1.5, h: 0.02, fill: { color: C.primary } });

    p.items.forEach((item, j) => {
      s.addText("✕", { x: x + 0.15, y: 2.5 + j * 1.5, w: 0.4, h: 0.4, fontSize: 16, color: C.red, fontFace: F.body, align: "center", valign: "top" });
      s.addText(item, { x: x + 0.45, y: 2.5 + j * 1.5, w: 1.5, h: 1.2, fontSize: 11, color: C.text, fontFace: F.body, lineSpacingMultiple: 1.4 });
    });
  });

  // resolution banner
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 1.5, y: 5.9, w: 7, h: 0.65, rectRadius: 0.1, fill: { color: C.primary } });
  s.addText("グローレポーターなら すべて解決 いたします！", { x: 1.5, y: 5.9, w: 7, h: 0.65, fontSize: 16, bold: true, color: C.white, fontFace: F.head, align: "center" });
}

// ══════════════════════════════════════════════════════
// SLIDE 3: サービス概要
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("GrowReporter とは", { x: 0.7, y: 0.4, w: 8, h: 0.7, fontSize: 26, bold: true, color: C.dark, fontFace: F.head });
  s.addText("GA4 / Search Console × AI で、分析・改善・評価を一気通貫", { x: 0.7, y: 1.0, w: 8, h: 0.5, fontSize: 13, color: C.textLight, fontFace: F.body });

  // 3 pillars
  const pillars = [
    { label: "分析", desc: "GA4/GSCのデータを\nAIが自動で読み解き\n日本語レポートに", color: C.primary },
    { label: "改善", desc: "改善提案から\nモックアップ画像まで\nAIが自動生成", color: C.secondary },
    { label: "評価", desc: "施策の効果を自動計測\n次の改善精度を\n継続的に向上", color: C.accent },
  ];

  pillars.forEach((p, i) => {
    const x = 0.7 + i * 3.1;
    roundedCard(s, x, 1.8, 2.8, 3.2);
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x + 0.8, y: 2.1, w: 1.2, h: 1.2, rectRadius: 0.6, fill: { color: p.color, transparency: 90 } });
    s.addText(p.label, { x: x + 0.8, y: 2.1, w: 1.2, h: 1.2, fontSize: 20, bold: true, color: p.color, fontFace: F.head, align: "center", valign: "middle" });
    s.addText(p.desc, { x: x + 0.2, y: 3.5, w: 2.4, h: 1.2, fontSize: 12, color: C.text, fontFace: F.body, align: "center", lineSpacingMultiple: 1.5 });
  });

  // flow arrows
  s.addText("→", { x: 3.35, y: 2.9, w: 0.6, h: 0.6, fontSize: 24, color: C.gray, fontFace: F.accent, align: "center" });
  s.addText("→", { x: 6.45, y: 2.9, w: 0.6, h: 0.6, fontSize: 24, color: C.gray, fontFace: F.accent, align: "center" });

  // bottom note
  s.addText("専門知識がなくても、データに基づいた意思決定ができる環境をつくります。", { x: 0.7, y: 5.4, w: 8.5, h: 0.5, fontSize: 12, color: C.textLight, fontFace: F.body, align: "center" });

  // key numbers
  const stats = [
    { num: "最短5分", label: "登録完了" },
    { num: "15+", label: "分析ビュー" },
    { num: "無制限", label: "AI分析 (Business)" },
  ];
  stats.forEach((st, i) => {
    const x = 1.2 + i * 2.9;
    s.addText(st.num, { x, y: 5.9, w: 2, h: 0.45, fontSize: 20, bold: true, color: C.primary, fontFace: F.accent, align: "center" });
    s.addText(st.label, { x, y: 6.3, w: 2, h: 0.3, fontSize: 10, color: C.textLight, fontFace: F.body, align: "center" });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 4-6: 3つの特長
// ══════════════════════════════════════════════════════
const features3 = [
  {
    num: "01",
    title: "アクセス解析を見に行かなくていい。\nAI が届けてくれる。",
    body: "GA4 を開いてデータを読み解く必要はありません。\nサイトを登録するだけで、AI が自動で分析し、変化があれば\nメールで通知。必要な情報は自分から取りに行くのではなく、\n向こうから届きます。",
    note: "※ GA4やLooker Studioは自分でデータを見に行く必要があり、専門知識がないと読み解けません。",
  },
  {
    num: "02",
    title: "数値だけでなく「次に何をすべきか」\nまで改善を提案",
    body: "一般的なアクセス解析ツールはデータを見せるだけ。\nグローレポーターは AI が考察・改善提案・モックアップ画像\nまで一気通貫で生成。\n「数字は見た、で、どうすればいい？」にそのまま答えます。",
    note: "※ GA4やLooker Studioでは「次に何をすべきか」までは教えてくれません。",
  },
  {
    num: "03",
    title: "分析 → 改善 → 評価の\nサイクルが途切れない。",
    body: "分析して終わり、改善して終わりにさせません。\n改善施策の効果測定までをひとつのツールで完結。\nサイト運用の形骸化を防ぎ、担当者が継続的に\n成果を積み上げていける仕組みを提供します。",
    note: "※ 他のツールでは分析と改善が別々のツールになり、PDCAサイクルが途切れがちです。",
  },
];

features3.forEach((f, i) => {
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("グローレポーターが選ばれる理由", { x: 0.7, y: 0.4, w: 6, h: 0.5, fontSize: 12, color: C.textLight, fontFace: F.body });

  // number circle
  s.addShape(pptx.shapes.OVAL, { x: 0.7, y: 1.2, w: 0.9, h: 0.9, fill: { color: C.primary } });
  s.addText(f.num, { x: 0.7, y: 1.2, w: 0.9, h: 0.9, fontSize: 22, bold: true, color: C.white, fontFace: F.accent, align: "center", valign: "middle" });

  s.addText(f.title, { x: 1.85, y: 1.15, w: 7.5, h: 1.0, fontSize: 22, bold: true, color: C.dark, fontFace: F.head, lineSpacingMultiple: 1.35 });

  // description card
  roundedCard(s, 0.7, 2.6, 8.6, 2.6, { fill: C.lightBg });
  s.addText(f.body, { x: 1.2, y: 2.9, w: 7.6, h: 2.0, fontSize: 14, color: C.text, fontFace: F.body, lineSpacingMultiple: 1.7 });

  s.addText(f.note, { x: 0.7, y: 5.5, w: 8.6, h: 0.5, fontSize: 10, color: C.gray, fontFace: F.body, italic: true });
});

// ══════════════════════════════════════════════════════
// SLIDE 7: 主要機能（9機能）
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("主要な機能", { x: 0.7, y: 0.3, w: 8, h: 0.6, fontSize: 24, bold: true, color: C.dark, fontFace: F.head });
  s.addText("分析から改善、効果測定まで。サイト運用を「続けられるもの」に変える機能を揃えています。", { x: 0.7, y: 0.85, w: 8.5, h: 0.4, fontSize: 11, color: C.textLight, fontFace: F.body });

  const funcs = [
    { name: "AIチャット", desc: "ChatGPT型UIで\nサイトデータを対話分析", biz: true },
    { name: "AI総合分析", desc: "複雑なデータをAIが\n日本語レポートに", biz: true },
    { name: "AI改善提案\n+モックアップ", desc: "改善内容とビフォー\nアフター画像を自動生成", biz: true },
    { name: "異変の自動通知\n+定期レポート", desc: "変化をAI原因仮説つきで\nメール通知", biz: false },
    { name: "改善の効果測定", desc: "施策に星評価で\nフィードバック", biz: true },
    { name: "レポート出力", desc: "Excel/PowerPointに\nワンクリック変換", biz: true },
    { name: "15以上の\n分析ビュー", desc: "多角的に可視化\n各ビューにAI考察", biz: false },
    { name: "コンバージョン\n逆引き分析", desc: "成果に至った行動を\n逆引きで可視化", biz: false },
    { name: "チーム管理\n複数サイト対応", desc: "メンバー招待と\n権限設定に対応", biz: false },
  ];

  funcs.forEach((fn, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 3.15;
    const y = 1.45 + row * 1.72;

    roundedCard(s, x, y, 2.95, 1.55, { border: C.border });

    // business badge
    if (fn.biz) {
      s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x + 1.85, y: y + 0.1, w: 0.95, h: 0.28, rectRadius: 0.05, fill: { color: C.primary } });
      s.addText("Business", { x: x + 1.85, y: y + 0.1, w: 0.95, h: 0.28, fontSize: 7.5, bold: true, color: C.white, fontFace: F.accent, align: "center" });
    }

    s.addText(fn.name, { x: x + 0.15, y: y + 0.15, w: 1.7, h: 0.65, fontSize: 12, bold: true, color: C.dark, fontFace: F.body, lineSpacingMultiple: 1.2 });
    s.addText(fn.desc, { x: x + 0.15, y: y + 0.82, w: 2.65, h: 0.6, fontSize: 10, color: C.textLight, fontFace: F.body, lineSpacingMultiple: 1.35 });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 8: 競合比較
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("他のツールとの違い", { x: 0.7, y: 0.3, w: 8, h: 0.6, fontSize: 24, bold: true, color: C.dark, fontFace: F.head });

  const tableRows = [
    [{ text: "", options: {} }, { text: "GA4", options: { bold: true, align: "center" } }, { text: "Looker Studio", options: { bold: true, align: "center" } }, { text: "GrowReporter", options: { bold: true, color: C.white, align: "center", fill: { color: C.primary } } }],
    [{ text: "AI分析・考察", options: { bold: true } }, { text: "△ データ表示のみ", options: {} }, { text: "△ 可視化のみ", options: {} }, { text: "◎ AIが自動で読み解き", options: { bold: true, color: C.primary } }],
    [{ text: "改善提案", options: { bold: true } }, { text: "✕ 非対応", options: { color: C.gray } }, { text: "✕ 非対応", options: { color: C.gray } }, { text: "◎ 提案+モックアップ", options: { bold: true, color: C.primary } }],
    [{ text: "AIチャット", options: { bold: true } }, { text: "✕ 非対応", options: { color: C.gray } }, { text: "✕ 非対応", options: { color: C.gray } }, { text: "◎ 対話形式で質問", options: { bold: true, color: C.primary } }],
    [{ text: "効果測定", options: { bold: true } }, { text: "✕ 非対応", options: { color: C.gray } }, { text: "✕ 非対応", options: { color: C.gray } }, { text: "◎ 施策の振り返り", options: { bold: true, color: C.primary } }],
    [{ text: "異変の自動通知", options: { bold: true } }, { text: "△ 設定が複雑", options: {} }, { text: "✕ なし", options: { color: C.gray } }, { text: "◎ AI原因仮説つき", options: { bold: true, color: C.primary } }],
    [{ text: "専門知識", options: { bold: true } }, { text: "必要", options: {} }, { text: "必要", options: {} }, { text: "◎ 不要", options: { bold: true, color: C.primary } }],
  ];

  s.addTable(tableRows, {
    x: 0.5, y: 1.1, w: 9.0,
    fontSize: 11,
    fontFace: F.body,
    color: C.text,
    border: { type: "solid", pt: 0.5, color: C.border },
    colW: [1.8, 2.1, 2.1, 3.0],
    rowH: [0.55, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7],
    autoPage: false,
  });

  s.addText("GA4やLooker Studioでは実現できない、AIによる分析・改善・評価の一気通貫を実現します。", {
    x: 0.7, y: 6.2, w: 8.5, h: 0.4, fontSize: 10, color: C.textLight, fontFace: F.body, italic: true, align: "center",
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 9: 導入効果
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("導入効果", { x: 0.7, y: 0.4, w: 8, h: 0.6, fontSize: 24, bold: true, color: C.dark, fontFace: F.head });

  const effects = [
    { title: "レポート作成工数", before: "半日 / 回", after: "数秒", desc: "Excel/PPTX をワンクリック出力" },
    { title: "改善サイクル", before: "月1回（外注頼み）", after: "毎日可能", desc: "AIが常時分析＋改善提案" },
    { title: "分析コスト", before: "月10万円〜（コンサル）", after: "月49,800円で全機能", desc: "AI無制限・チーム無制限" },
    { title: "異変への対応", before: "気づけない", after: "即日メール通知", desc: "AI原因仮説つきアラート" },
  ];

  effects.forEach((e, i) => {
    const y = 1.3 + i * 1.3;
    // label
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 1.8, h: 0.9, rectRadius: 0.08, fill: { color: C.dark } });
    s.addText(e.title, { x: 0.5, y, w: 1.8, h: 0.9, fontSize: 11, bold: true, color: C.white, fontFace: F.body, align: "center", valign: "middle" });

    // before
    roundedCard(s, 2.5, y, 2.3, 0.9, { fill: "FEF2F2", shadow: false, border: "FECACA" });
    s.addText("Before", { x: 2.6, y: y + 0.05, w: 1, h: 0.25, fontSize: 8, bold: true, color: C.red, fontFace: F.accent });
    s.addText(e.before, { x: 2.6, y: y + 0.3, w: 2.1, h: 0.5, fontSize: 13, bold: true, color: C.dark, fontFace: F.body });

    // arrow
    s.addText("→", { x: 4.85, y, w: 0.5, h: 0.9, fontSize: 18, color: C.primary, fontFace: F.accent, align: "center", valign: "middle" });

    // after
    roundedCard(s, 5.4, y, 2.3, 0.9, { fill: "F0FDF4", shadow: false, border: "BBF7D0" });
    s.addText("After", { x: 5.5, y: y + 0.05, w: 1, h: 0.25, fontSize: 8, bold: true, color: C.secondary, fontFace: F.accent });
    s.addText(e.after, { x: 5.5, y: y + 0.3, w: 2.1, h: 0.5, fontSize: 13, bold: true, color: C.dark, fontFace: F.body });

    // detail
    s.addText(e.desc, { x: 7.9, y, w: 1.9, h: 0.9, fontSize: 10, color: C.textLight, fontFace: F.body, valign: "middle" });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 10: 料金プラン
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("シンプルな料金体系", { x: 0.7, y: 0.3, w: 8, h: 0.6, fontSize: 24, bold: true, color: C.dark, fontFace: F.head });
  s.addText("お申し込み月は無料。翌月1日から課金開始。", { x: 0.7, y: 0.85, w: 8, h: 0.35, fontSize: 11, color: C.textLight, fontFace: F.body });

  // Free plan
  roundedCard(s, 0.5, 1.4, 4.2, 5.0, { border: C.border });
  s.addText("無料プラン", { x: 0.5, y: 1.6, w: 4.2, h: 0.5, fontSize: 18, bold: true, color: C.dark, fontFace: F.head, align: "center" });
  s.addText("まずはデータを確認", { x: 0.5, y: 2.05, w: 4.2, h: 0.35, fontSize: 10, color: C.textLight, fontFace: F.body, align: "center" });
  s.addText("¥0", { x: 0.5, y: 2.5, w: 4.2, h: 0.7, fontSize: 36, bold: true, color: C.dark, fontFace: F.accent, align: "center" });
  s.addText("/ 月", { x: 2.9, y: 2.7, w: 1, h: 0.4, fontSize: 12, color: C.gray, fontFace: F.body });

  const freeFeatures = ["サイト登録 1件", "メンバー 3名", "GA4/GSC データ閲覧", "分析画面（15以上のビュー）", "アラート通知（数値のみ）"];
  freeFeatures.forEach((f, i) => {
    s.addText(`✓  ${f}`, { x: 1.0, y: 3.4 + i * 0.42, w: 3.5, h: 0.38, fontSize: 11, color: C.text, fontFace: F.body });
  });

  // Business plan
  roundedCard(s, 5.3, 1.4, 4.2, 5.0, { border: C.primary });
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 5.3, y: 1.4, w: 4.2, h: 0.5, rectRadius: 0.15, fill: { color: C.primary } });
  // top-left and top-right radius only emulation - just color the top bar
  s.addText("おすすめ", { x: 5.3, y: 1.4, w: 4.2, h: 0.5, fontSize: 11, bold: true, color: C.white, fontFace: F.body, align: "center" });

  s.addText("ビジネスプラン", { x: 5.3, y: 2.0, w: 4.2, h: 0.5, fontSize: 18, bold: true, color: C.primary, fontFace: F.head, align: "center" });
  s.addText("¥49,800", { x: 5.3, y: 2.5, w: 4.2, h: 0.7, fontSize: 36, bold: true, color: C.primary, fontFace: F.accent, align: "center" });
  s.addText("/ 月（税別）", { x: 8.0, y: 2.7, w: 1.5, h: 0.4, fontSize: 11, color: C.gray, fontFace: F.body });

  const bizFeatures = ["サイト登録 3件", "メンバー 無制限", "GA4/GSC データ閲覧", "分析画面（15以上のビュー）", "アラート通知（AI分析付き）", "AI分析サマリー 無制限", "AI改善提案・AIチャット 無制限", "効果測定・レポート出力 無制限", "週次/月次レポートメール"];
  bizFeatures.forEach((f, i) => {
    s.addText(`✓  ${f}`, { x: 5.8, y: 3.2 + i * 0.36, w: 3.5, h: 0.34, fontSize: 10.5, color: C.text, fontFace: F.body });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 11: ご利用の流れ
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("ご利用の流れ", { x: 0.7, y: 0.4, w: 8, h: 0.6, fontSize: 24, bold: true, color: C.dark, fontFace: F.head });
  s.addText("アカウント・サイト登録まで最短5分。過去データもその日から分析が可能です。", { x: 0.7, y: 0.95, w: 8, h: 0.4, fontSize: 11, color: C.textLight, fontFace: F.body });

  const steps = [
    { num: "STEP 1", title: "無料アカウント登録", desc: "メールアドレスまたは\nGoogleアカウントで\n簡単に登録", time: "約1分" },
    { num: "STEP 2", title: "サイト情報を入力\nGA4/GSC を連携", desc: "URLを入力し\nGoogleアカウントで\nワンクリック連携", time: "約3分" },
    { num: "STEP 3", title: "分析スタート！", desc: "過去データが即座に反映\nAI分析をすぐに\nお試しいただけます", time: "すぐ" },
  ];

  steps.forEach((st, i) => {
    const x = 0.7 + i * 3.2;
    roundedCard(s, x, 1.7, 2.8, 3.8);

    s.addShape(pptx.shapes.OVAL, { x: x + 0.9, y: 1.95, w: 1.0, h: 1.0, fill: { color: C.primary } });
    s.addText(`${i + 1}`, { x: x + 0.9, y: 1.95, w: 1.0, h: 1.0, fontSize: 28, bold: true, color: C.white, fontFace: F.accent, align: "center", valign: "middle" });

    s.addText(st.num, { x, y: 3.15, w: 2.8, h: 0.35, fontSize: 10, bold: true, color: C.primary, fontFace: F.accent, align: "center" });
    s.addText(st.title, { x: x + 0.2, y: 3.5, w: 2.4, h: 0.7, fontSize: 13, bold: true, color: C.dark, fontFace: F.body, align: "center", lineSpacingMultiple: 1.25 });
    s.addText(st.desc, { x: x + 0.2, y: 4.25, w: 2.4, h: 0.9, fontSize: 11, color: C.textLight, fontFace: F.body, align: "center", lineSpacingMultiple: 1.4 });

    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x + 0.85, y: 5.15, w: 1.1, h: 0.3, rectRadius: 0.05, fill: { color: C.lightBg } });
    s.addText(st.time, { x: x + 0.85, y: 5.15, w: 1.1, h: 0.3, fontSize: 10, bold: true, color: C.primary, fontFace: F.body, align: "center" });

    if (i < 2) {
      s.addText("→", { x: x + 2.75, y: 2.8, w: 0.5, h: 0.6, fontSize: 24, color: C.gray, fontFace: F.accent, align: "center" });
    }
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 12: FAQ
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("よくあるご質問", { x: 0.7, y: 0.3, w: 8, h: 0.6, fontSize: 24, bold: true, color: C.dark, fontFace: F.head });

  const faqs = [
    { q: "GA4の専門知識がなくても使えますか？", a: "はい。サイトURLを登録してGoogleアカウントで接続するだけ。AIがわかりやすい日本語で教えてくれます。" },
    { q: "無料プランと有料プランの違いは？", a: "無料プランはデータ閲覧+アラート。ビジネスプランでAI分析・改善提案・チャットが無制限に。" },
    { q: "データのセキュリティは大丈夫ですか？", a: "Googleのセキュリティ基盤上で動作。データは暗号化保管。GA4のパスワードはお預かりしません。" },
    { q: "外部コンサルタントとの違いは？", a: "コンサルは月10万円〜で月1回のレポート。本サービスは月49,800円で好きなときにAI分析+改善提案+モックアップまで。" },
    { q: "解約はいつでもできますか？", a: "はい、いつでも即日解約可能。その月の末日までご利用いただけます。" },
    { q: "チームで利用できますか？", a: "メール招待で共有可能。閲覧/編集の権限分けも対応。ビジネスプランはメンバー無制限です。" },
  ];

  faqs.forEach((faq, i) => {
    const y = 1.05 + i * 0.92;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.45, y, w: 0.45, h: 0.45, rectRadius: 0.08, fill: { color: C.primary } });
    s.addText("Q", { x: 0.45, y, w: 0.45, h: 0.45, fontSize: 14, bold: true, color: C.white, fontFace: F.accent, align: "center", valign: "middle" });
    s.addText(faq.q, { x: 1.05, y, w: 4, h: 0.45, fontSize: 12, bold: true, color: C.dark, fontFace: F.body, valign: "middle" });
    s.addText(faq.a, { x: 1.05, y: y + 0.4, w: 8.5, h: 0.45, fontSize: 10.5, color: C.textLight, fontFace: F.body, valign: "top" });
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 13: 会社概要
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  addFooter(s, slideNum, 14);

  s.addText("会社概要", { x: 0.7, y: 0.4, w: 8, h: 0.6, fontSize: 24, bold: true, color: C.dark, fontFace: F.head });

  const info = [
    ["会社名", "Grow Group 株式会社"],
    ["所在地", "東京都新宿区西新宿3-3-13 西新宿水間ビル2F"],
    ["代表", "代表取締役　畑中 貴仁"],
    ["資本金", "500万円"],
    ["事業内容", "Web サイト制作・Web マーケティング支援\nアクセス解析AIツール「GrowReporter」開発・運営"],
    ["URL", "https://and-suspended.com/"],
  ];

  const tableData = info.map(([label, val]) => [
    { text: label, options: { bold: true, color: C.dark, fill: { color: C.lightBg } } },
    { text: val, options: { color: C.text } },
  ]);

  s.addTable(tableData, {
    x: 0.7, y: 1.4, w: 8.6,
    fontSize: 12,
    fontFace: F.body,
    border: { type: "solid", pt: 0.5, color: C.border },
    colW: [2.0, 6.6],
    rowH: [0.6, 0.6, 0.6, 0.6, 0.8, 0.6],
    autoPage: false,
  });
}

// ══════════════════════════════════════════════════════
// SLIDE 14: CTA
// ══════════════════════════════════════════════════════
{
  slideNum++;
  const s = pptx.addSlide();
  s.background = { color: C.dark };

  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.primary } });
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0.06, w: 5, h: 0.03, fill: { color: C.secondary } });

  s.addText("無料登録で今すぐ試そう", { x: 1, y: 2.0, w: 8, h: 1, fontSize: 36, bold: true, color: C.white, fontFace: F.head, align: "center" });
  s.addText("アカウント・サイト登録まで最短 5 分。\n過去データもその日から分析やサイト改善が可能です。", {
    x: 1.5, y: 3.2, w: 7, h: 1, fontSize: 14, color: C.gray, fontFace: F.body, align: "center", lineSpacingMultiple: 1.7,
  });

  // CTA buttons
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 2.2, y: 4.6, w: 2.5, h: 0.7, rectRadius: 0.1, fill: { color: C.primary } });
  s.addText("無料で登録", { x: 2.2, y: 4.6, w: 2.5, h: 0.7, fontSize: 16, bold: true, color: C.white, fontFace: F.body, align: "center" });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 5.3, y: 4.6, w: 2.5, h: 0.7, rectRadius: 0.1, fill: { color: C.secondary } });
  s.addText("ビジネスプランに申し込む", { x: 5.3, y: 4.6, w: 2.5, h: 0.7, fontSize: 12, bold: true, color: C.white, fontFace: F.body, align: "center" });

  s.addText("https://grow-reporter.com", { x: 1, y: 5.7, w: 8, h: 0.5, fontSize: 14, color: C.primary, fontFace: F.accent, align: "center" });
  s.addText("Grow Group 株式会社", { x: 1, y: 6.2, w: 8, h: 0.4, fontSize: 11, color: C.gray, fontFace: F.body, align: "center" });
}

// ── Save ──────────────────────────────────────────────
const outPath = "public/lp/GrowReporter_営業資料.pptx";
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log(`✅ 生成完了: ${outPath}`);
}).catch(err => {
  console.error("Error:", err);
});
