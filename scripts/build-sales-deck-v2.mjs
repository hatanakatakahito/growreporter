/**
 * GrowReporter 営業資料 v2 — 完全オリジナル
 * LPスクショを主役にしたクリーンなデザイン
 */
import pptxgen from "pptxgenjs";
import imageSize from "image-size";
import path from "path";

const pptx = new pptxgen();
pptx.layout = "LAYOUT_16x9"; // 13.33 x 7.5 inches

const IMG = "public/lp/assets/images";

// ── Brand ──
const C = {
  primary: "3758F9",
  secondary: "13C296",
  dark: "1B2336",
  text: "333D4B",
  sub: "6B7280",
  light: "F8FAFC",
  white: "FFFFFF",
  border: "E5E7EB",
  red: "EF4444",
  purple: "8B5CF6",
};

const FONT = "Yu Gothic";
const FONT_EN = "Inter";

// ── Helpers ──
function fitImage(imgPath, maxW, maxH) {
  const d = imageSize(imgPath);
  const ratio = d.width / d.height;
  let w, h;
  if (maxW / maxH > ratio) { h = maxH; w = h * ratio; }
  else { w = maxW; h = w / ratio; }
  return { w, h, path: imgPath };
}

function pageNum(slide, n) {
  slide.addText(`${n}`, { x: 12.5, y: 7.05, w: 0.5, h: 0.3, fontSize: 8, color: C.sub, fontFace: FONT, align: "right" });
}

function copyright(slide) {
  slide.addText("© Grow Group株式会社", { x: 0.6, y: 7.05, w: 3, h: 0.3, fontSize: 7, color: C.sub, fontFace: FONT });
}

function accentBar(slide) {
  slide.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.33, h: 0.04, fill: { color: C.primary } });
}

let pg = 0;

// ════════════════════════════════════════════════════════
// 1. COVER
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.dark };

  s.addText("GrowReporter", {
    x: 0.8, y: 0.6, w: 5, h: 0.5,
    fontSize: 15, bold: true, color: C.primary, fontFace: FONT_EN,
  });

  s.addText("アクセス解析 × AI で\nWebサイトに次の打ち手を。", {
    x: 0.8, y: 2.0, w: 6, h: 2.0,
    fontSize: 34, bold: true, color: C.white, fontFace: FONT,
    lineSpacingMultiple: 1.4,
  });

  s.addText("GA4 / Search Console のデータを AI が自動で分析。\n改善提案からモックアップ、効果測定まで一気通貫。", {
    x: 0.8, y: 4.3, w: 5.5, h: 1.2,
    fontSize: 13, color: C.sub, fontFace: FONT,
    lineSpacingMultiple: 1.7,
  });

  s.addText("サービスご紹介資料", {
    x: 0.8, y: 6.0, w: 3, h: 0.4,
    fontSize: 10, color: C.sub, fontFace: FONT,
  });
  s.addText("Grow Group 株式会社", {
    x: 0.8, y: 6.4, w: 3, h: 0.4,
    fontSize: 10, color: C.sub, fontFace: FONT,
  });

  // Dashboard screenshot on right
  const img = fitImage(`${IMG}/screenshot-dashboard.png`, 5.8, 5.0);
  s.addImage({ path: img.path, x: 13.33 - img.w - 0.4, y: (7.5 - img.h) / 2, w: img.w, h: img.h, rounding: true });
}

// ════════════════════════════════════════════════════════
// 2. 課題提起
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("こんなお悩み、ありませんか？", {
    x: 0.8, y: 0.5, w: 10, h: 0.8,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });

  const problems = [
    { title: "GA4が難しい", body: "画面が複雑でどこを見ればいいか\nわからない。結局アクセス数だけ\n見て終わってしまう。" },
    { title: "改善策が出ない", body: "数値を見ても具体的な改善策が\n浮かばない。レポート作成に\n毎回半日かかる。" },
    { title: "コストが合わない", body: "外注すると月数十万円。\n改善のPDCAが続かず、\nサイトの異変にも気づけない。" },
  ];

  problems.forEach((p, i) => {
    const x = 0.8 + i * 4.0;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.8, w: 3.6, h: 4.2, rectRadius: 0.15,
      fill: { color: C.light }, line: { color: C.border, width: 0.75 },
    });
    s.addText(p.title, {
      x: x + 0.3, y: 2.2, w: 3.0, h: 0.6,
      fontSize: 17, bold: true, color: C.dark, fontFace: FONT,
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: x + 0.3, y: 2.85, w: 1.5, h: 0.03, fill: { color: C.primary },
    });
    s.addText(p.body, {
      x: x + 0.3, y: 3.2, w: 3.0, h: 2.4,
      fontSize: 12.5, color: C.text, fontFace: FONT,
      lineSpacingMultiple: 1.65,
    });
  });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 3.0, y: 6.3, w: 7.3, h: 0.55, rectRadius: 0.08,
    fill: { color: C.primary },
  });
  s.addText("GrowReporter なら、すべて解決いたします", {
    x: 3.0, y: 6.3, w: 7.3, h: 0.55,
    fontSize: 15, bold: true, color: C.white, fontFace: FONT, align: "center",
  });
}

// ════════════════════════════════════════════════════════
// 3. GrowReporter とは
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("GrowReporter とは", {
    x: 0.8, y: 0.4, w: 10, h: 0.7,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });
  s.addText("GA4 / Search Console × AI で、分析・改善・評価を一気通貫。\n専門知識がなくても、データに基づいた意思決定ができる環境をつくります。", {
    x: 0.8, y: 1.1, w: 11, h: 0.8,
    fontSize: 12, color: C.sub, fontFace: FONT, lineSpacingMultiple: 1.6,
  });

  // Main product screenshot
  const img = fitImage(`${IMG}/about.png`, 11.5, 4.8);
  s.addImage({
    path: img.path,
    x: (13.33 - img.w) / 2, y: 2.2,
    w: img.w, h: img.h, rounding: true,
    shadow: { type: "outer", blur: 10, offset: 3, color: "00000018" },
  });
}

// ════════════════════════════════════════════════════════
// 4-6. 特長①②③  — 左テキスト右スクショ / 交互レイアウト
// ════════════════════════════════════════════════════════
const strengths = [
  {
    num: "01", title: "AI が分析して届けてくれる",
    body: "GA4 を開いてデータを読み解く必要はありません。\nサイトを登録するだけで、AI が自動で分析し、\n変化があればメールで通知。\n必要な情報は向こうから届きます。",
    note: "※ GA4やLooker Studioは自分でデータを見に行く必要があります",
    img: `${IMG}/about01.png`, imgRight: true,
  },
  {
    num: "02", title: "「次に何をすべきか」まで提案",
    body: "一般的なツールはデータを見せるだけ。\nGrowReporter は AI が考察・改善提案・\nモックアップ画像まで一気通貫で生成。\n「数字は見た、で、どうすれば？」に答えます。",
    note: "※ GA4やLooker Studioでは改善提案はできません",
    img: `${IMG}/about02.png`, imgRight: false,
  },
  {
    num: "03", title: "分析→改善→評価が途切れない",
    body: "分析して終わり、改善して終わりにさせません。\n改善施策の効果測定までをひとつのツールで完結。\n担当者が継続的に成果を積み上げていける\n仕組みを提供します。",
    note: "※ 他のツールでは分析と改善が別々になりがちです",
    img: `${IMG}/about03.png`, imgRight: true,
  },
];

strengths.forEach((st) => {
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  const textX = st.imgRight ? 0.8 : 7.0;
  const imgX  = st.imgRight ? 5.8 : 0.5;

  // Number badge
  s.addShape(pptx.shapes.OVAL, {
    x: textX, y: 0.6, w: 0.65, h: 0.65,
    fill: { color: C.primary },
  });
  s.addText(st.num, {
    x: textX, y: 0.6, w: 0.65, h: 0.65,
    fontSize: 17, bold: true, color: C.white, fontFace: FONT_EN,
    align: "center", valign: "middle",
  });

  s.addText(st.title, {
    x: textX + 0.85, y: 0.55, w: 5, h: 0.8,
    fontSize: 21, bold: true, color: C.dark, fontFace: FONT,
  });

  s.addText(st.body, {
    x: textX, y: 1.8, w: 5.2, h: 3.0,
    fontSize: 13, color: C.text, fontFace: FONT,
    lineSpacingMultiple: 1.75,
  });

  s.addText(st.note, {
    x: textX, y: 5.0, w: 5.2, h: 0.5,
    fontSize: 9.5, italic: true, color: C.sub, fontFace: FONT,
  });

  // Screenshot
  const img = fitImage(st.img, 6.8, 5.5);
  s.addImage({
    path: img.path,
    x: imgX + (6.8 - img.w) / 2,
    y: 1.2 + (5.5 - img.h) / 2,
    w: img.w, h: img.h,
    rounding: true,
    shadow: { type: "outer", blur: 8, offset: 2, color: "00000012" },
  });
});

// ════════════════════════════════════════════════════════
// 7. 主要機能
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("主要な機能", {
    x: 0.8, y: 0.4, w: 10, h: 0.7,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });
  s.addText("分析から改善、効果測定まで。サイト運用を「続けられるもの」に変える機能群。", {
    x: 0.8, y: 1.0, w: 11, h: 0.4,
    fontSize: 11, color: C.sub, fontFace: FONT,
  });

  const funcs = [
    { name: "AIチャット", desc: "対話形式でサイトデータを分析", biz: true },
    { name: "AI総合分析", desc: "複雑なデータを日本語レポートに", biz: true },
    { name: "AI改善提案+\nモックアップ", desc: "改善前後の画像まで自動生成", biz: true },
    { name: "異変の自動通知", desc: "AI原因仮説つきでメール通知", biz: false },
    { name: "改善の効果測定", desc: "施策の成果をフィードバック", biz: true },
    { name: "レポート出力", desc: "Excel/PPTXにワンクリック変換", biz: true },
    { name: "15以上の分析ビュー", desc: "多角的に可視化+AI考察", biz: false },
    { name: "CV逆引き分析", desc: "成果への導線を可視化", biz: false },
    { name: "チーム管理", desc: "メンバー招待・権限設定", biz: false },
  ];

  funcs.forEach((fn, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.6 + col * 4.1;
    const y = 1.65 + row * 1.82;

    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y, w: 3.8, h: 1.6, rectRadius: 0.12,
      fill: { color: C.white },
      line: { color: C.border, width: 0.75 },
    });

    if (fn.biz) {
      s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
        x: x + 2.6, y: y + 0.15, w: 1.0, h: 0.28, rectRadius: 0.05,
        fill: { color: C.primary },
      });
      s.addText("Business", {
        x: x + 2.6, y: y + 0.15, w: 1.0, h: 0.28,
        fontSize: 7.5, bold: true, color: C.white, fontFace: FONT_EN, align: "center",
      });
    }

    s.addText(fn.name, {
      x: x + 0.25, y: y + 0.2, w: 2.3, h: 0.65,
      fontSize: 13, bold: true, color: C.dark, fontFace: FONT,
      lineSpacingMultiple: 1.15,
    });
    s.addText(fn.desc, {
      x: x + 0.25, y: y + 0.9, w: 3.3, h: 0.5,
      fontSize: 10.5, color: C.sub, fontFace: FONT,
    });
  });
}

// ════════════════════════════════════════════════════════
// 8. 競合比較
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("他のツールとの違い", {
    x: 0.8, y: 0.4, w: 10, h: 0.7,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });

  const rows = [
    ["", "GA4", "Looker Studio", "GrowReporter"],
    ["AI分析・考察", "△ データ表示のみ", "△ 可視化のみ", "◎ AIが自動考察"],
    ["改善提案", "✕ 非対応", "✕ 非対応", "◎ 提案+モックアップ"],
    ["AIチャット", "✕ 非対応", "✕ 非対応", "◎ 対話形式で質問"],
    ["効果測定", "✕ 非対応", "✕ 非対応", "◎ 施策の振り返り"],
    ["異変の通知", "△ 設定が複雑", "✕ なし", "◎ AI原因仮説つき"],
    ["専門知識", "必要", "必要", "◎ 不要"],
  ];

  const tableData = rows.map((row, ri) =>
    row.map((cell, ci) => ({
      text: cell,
      options: {
        bold: ri === 0 || ci === 0,
        fontSize: ri === 0 ? 11 : 10.5,
        color: ci === 3 && ri > 0 ? C.primary : (cell.startsWith("✕") ? C.sub : C.text),
        fill: ri === 0 ? { color: C.dark } : (ci === 3 ? { color: "F0F4FF" } : undefined),
        ...(ri === 0 ? { color: C.white } : {}),
        ...(ci === 3 && ri === 0 ? { color: C.white, fill: { color: C.primary } } : {}),
        align: ci === 0 ? "left" : "center",
        valign: "middle",
      },
    }))
  );

  s.addTable(tableData, {
    x: 0.6, y: 1.4, w: 12.1,
    fontFace: FONT,
    border: { type: "solid", pt: 0.5, color: C.border },
    colW: [2.2, 2.8, 2.8, 4.3],
    rowH: [0.55, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65],
    autoPage: false,
  });
}

// ════════════════════════════════════════════════════════
// 9. 料金プラン
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("シンプルな料金体系", {
    x: 0.8, y: 0.4, w: 10, h: 0.7,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });
  s.addText("お申し込み月は無料。翌月1日から課金開始。", {
    x: 0.8, y: 1.0, w: 10, h: 0.35,
    fontSize: 11, color: C.sub, fontFace: FONT,
  });

  // Free plan card
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.8, y: 1.65, w: 5.6, h: 5.1, rectRadius: 0.15,
    line: { color: C.border, width: 1 },
  });
  s.addText("無料プラン", { x: 0.8, y: 1.9, w: 5.6, h: 0.5, fontSize: 16, bold: true, color: C.dark, fontFace: FONT, align: "center" });
  s.addText("まずはデータを確認", { x: 0.8, y: 2.35, w: 5.6, h: 0.35, fontSize: 10, color: C.sub, fontFace: FONT, align: "center" });
  s.addText("¥0", { x: 0.8, y: 2.85, w: 5.6, h: 0.7, fontSize: 38, bold: true, color: C.dark, fontFace: FONT_EN, align: "center" });
  s.addText("/月", { x: 3.8, y: 3.1, w: 1, h: 0.3, fontSize: 11, color: C.sub, fontFace: FONT });

  const freeItems = ["サイト登録　1件", "メンバー　3名まで", "GA4/GSCデータ閲覧", "分析画面（15以上のビュー）", "アラート通知（数値のみ）"];
  freeItems.forEach((item, i) => {
    s.addText(`✓  ${item}`, { x: 1.5, y: 3.85 + i * 0.45, w: 4.2, h: 0.4, fontSize: 11, color: C.text, fontFace: FONT });
  });

  // Business plan card
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.9, y: 1.65, w: 5.6, h: 5.1, rectRadius: 0.15,
    line: { color: C.primary, width: 1.5 },
  });
  // Header bar
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.9, y: 1.65, w: 5.6, h: 0.45, rectRadius: 0.15,
    fill: { color: C.primary },
  });
  s.addText("おすすめ", { x: 6.9, y: 1.65, w: 5.6, h: 0.45, fontSize: 10, bold: true, color: C.white, fontFace: FONT, align: "center" });
  s.addText("ビジネスプラン", { x: 6.9, y: 2.25, w: 5.6, h: 0.5, fontSize: 16, bold: true, color: C.primary, fontFace: FONT, align: "center" });
  s.addText("¥49,800", { x: 6.9, y: 2.85, w: 5.6, h: 0.7, fontSize: 38, bold: true, color: C.primary, fontFace: FONT_EN, align: "center" });
  s.addText("/月（税別）", { x: 10.2, y: 3.1, w: 2, h: 0.3, fontSize: 10, color: C.sub, fontFace: FONT });

  const bizItems = ["サイト登録　3件", "メンバー　無制限", "全分析機能", "AI分析サマリー　無制限", "AI改善提案・AIチャット　無制限", "効果測定・レポート出力　無制限", "週次/月次レポートメール"];
  bizItems.forEach((item, i) => {
    s.addText(`✓  ${item}`, { x: 7.6, y: 3.7 + i * 0.4, w: 4.2, h: 0.38, fontSize: 11, color: C.text, fontFace: FONT });
  });
}

// ════════════════════════════════════════════════════════
// 10. ご利用の流れ
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("ご利用の流れ", {
    x: 0.8, y: 0.4, w: 10, h: 0.7,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });

  const steps = [
    { num: "1", title: "無料アカウント登録", desc: "メールアドレスまたは\nGoogleアカウントで\n簡単に登録", time: "約1分" },
    { num: "2", title: "サイト情報を入力\nGA4/GSCを連携", desc: "URLを入力し\nGoogleアカウントで\nワンクリック連携", time: "約3分" },
    { num: "3", title: "分析スタート！", desc: "過去データが即座に反映\nAI分析をすぐに\nお試しいただけます", time: "即日" },
  ];

  steps.forEach((st, i) => {
    const x = 0.8 + i * 4.1;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.6, w: 3.7, h: 4.8, rectRadius: 0.15,
      fill: { color: C.light }, line: { color: C.border, width: 0.75 },
    });

    s.addShape(pptx.shapes.OVAL, {
      x: x + 1.35, y: 2.0, w: 1.0, h: 1.0,
      fill: { color: C.primary },
    });
    s.addText(st.num, {
      x: x + 1.35, y: 2.0, w: 1.0, h: 1.0,
      fontSize: 28, bold: true, color: C.white, fontFace: FONT_EN,
      align: "center", valign: "middle",
    });

    s.addText(st.title, {
      x: x + 0.3, y: 3.3, w: 3.1, h: 0.9,
      fontSize: 14, bold: true, color: C.dark, fontFace: FONT,
      align: "center", lineSpacingMultiple: 1.3,
    });
    s.addText(st.desc, {
      x: x + 0.3, y: 4.3, w: 3.1, h: 1.2,
      fontSize: 11.5, color: C.sub, fontFace: FONT,
      align: "center", lineSpacingMultiple: 1.5,
    });

    // time badge
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: x + 1.2, y: 5.7, w: 1.3, h: 0.35, rectRadius: 0.05,
      fill: { color: "EBF0FE" },
    });
    s.addText(st.time, {
      x: x + 1.2, y: 5.7, w: 1.3, h: 0.35,
      fontSize: 10, bold: true, color: C.primary, fontFace: FONT, align: "center",
    });

    // Arrow between steps
    if (i < 2) {
      s.addText("→", {
        x: x + 3.6, y: 3.5, w: 0.6, h: 0.6,
        fontSize: 22, color: C.sub, fontFace: FONT_EN, align: "center",
      });
    }
  });
}

// ════════════════════════════════════════════════════════
// 11. FAQ
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("よくあるご質問", {
    x: 0.8, y: 0.4, w: 10, h: 0.7,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });

  const faqs = [
    { q: "GA4の専門知識がなくても使えますか？", a: "はい。サイトURLを登録してGoogleアカウントで接続するだけ。AIがわかりやすい日本語で教えてくれます。" },
    { q: "無料プランと有料プランの違いは？", a: "無料プランはデータ閲覧+アラート。ビジネスプランでAI分析・改善提案・チャットが無制限に使えます。" },
    { q: "データのセキュリティは大丈夫ですか？", a: "Googleのセキュリティ基盤上で動作。データは暗号化保管。GA4のパスワードはお預かりしません。" },
    { q: "外部コンサルタントとの違いは？", a: "コンサルは月10万円〜で月1回レポート。本サービスは月49,800円で好きなときにAI分析+改善提案まで。" },
    { q: "解約はいつでもできますか？", a: "はい、いつでも即日解約可能。その月の末日までご利用いただけます。" },
  ];

  faqs.forEach((faq, i) => {
    const y = 1.3 + i * 1.15;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.55, y, w: 0.5, h: 0.5, rectRadius: 0.08,
      fill: { color: C.primary },
    });
    s.addText("Q", {
      x: 0.55, y, w: 0.5, h: 0.5,
      fontSize: 15, bold: true, color: C.white, fontFace: FONT_EN,
      align: "center", valign: "middle",
    });
    s.addText(faq.q, {
      x: 1.25, y, w: 11, h: 0.5,
      fontSize: 13, bold: true, color: C.dark, fontFace: FONT, valign: "middle",
    });
    s.addText(faq.a, {
      x: 1.25, y: y + 0.5, w: 11, h: 0.5,
      fontSize: 11, color: C.sub, fontFace: FONT, valign: "top",
    });
  });
}

// ════════════════════════════════════════════════════════
// 12. 会社概要
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.white };
  accentBar(s); copyright(s); pageNum(s, pg);

  s.addText("会社概要", {
    x: 0.8, y: 0.4, w: 10, h: 0.7,
    fontSize: 24, bold: true, color: C.dark, fontFace: FONT,
  });

  const info = [
    ["会社名", "Grow Group 株式会社"],
    ["所在地", "東京都新宿区西新宿3-3-13 西新宿水間ビル2F"],
    ["代表", "代表取締役　畑中 貴仁"],
    ["資本金", "500万円"],
    ["事業内容", "Webサイト制作・Webマーケティング支援\nアクセス解析AIツール「GrowReporter」開発・運営"],
    ["URL", "https://and-suspended.com/"],
  ];

  const tableData = info.map(([label, val]) => [
    { text: label, options: { bold: true, color: C.dark, fill: { color: C.light }, align: "left", valign: "middle" } },
    { text: val, options: { color: C.text, align: "left", valign: "middle" } },
  ]);

  s.addTable(tableData, {
    x: 0.8, y: 1.6, w: 11.7,
    fontSize: 12, fontFace: FONT,
    border: { type: "solid", pt: 0.5, color: C.border },
    colW: [2.2, 9.5],
    rowH: [0.6, 0.6, 0.6, 0.6, 0.8, 0.6],
    autoPage: false,
  });
}

// ════════════════════════════════════════════════════════
// 13. CTA
// ════════════════════════════════════════════════════════
{
  pg++;
  const s = pptx.addSlide();
  s.background = { color: C.dark };

  s.addText("無料登録で今すぐ試そう", {
    x: 1.5, y: 2.0, w: 10.3, h: 1.0,
    fontSize: 34, bold: true, color: C.white, fontFace: FONT, align: "center",
  });
  s.addText("アカウント・サイト登録まで最短 5 分。\n過去データもその日から分析やサイト改善が可能です。", {
    x: 2.5, y: 3.3, w: 8.3, h: 1.0,
    fontSize: 13, color: C.sub, fontFace: FONT, align: "center", lineSpacingMultiple: 1.7,
  });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 3.4, y: 4.8, w: 2.8, h: 0.65, rectRadius: 0.1,
    fill: { color: C.primary },
  });
  s.addText("無料で登録", {
    x: 3.4, y: 4.8, w: 2.8, h: 0.65,
    fontSize: 15, bold: true, color: C.white, fontFace: FONT, align: "center",
  });

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 7.1, y: 4.8, w: 2.8, h: 0.65, rectRadius: 0.1,
    fill: { color: C.secondary },
  });
  s.addText("ビジネスプランに申し込む", {
    x: 7.1, y: 4.8, w: 2.8, h: 0.65,
    fontSize: 11.5, bold: true, color: C.white, fontFace: FONT, align: "center",
  });

  s.addText("https://grow-reporter.com", {
    x: 1, y: 5.9, w: 11.3, h: 0.5,
    fontSize: 13, color: C.primary, fontFace: FONT_EN, align: "center",
  });
  s.addText("Grow Group 株式会社", {
    x: 1, y: 6.5, w: 11.3, h: 0.4,
    fontSize: 10, color: C.sub, fontFace: FONT, align: "center",
  });
}

// ── Save ──
const outPath = "public/lp/GrowReporter_営業資料.pptx";
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log(`✅ 生成完了: ${outPath}`);
}).catch(console.error);
