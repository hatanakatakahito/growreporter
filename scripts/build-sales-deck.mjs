/**
 * GrowReporter 営業資料生成スクリプト
 * c-slide_営業資料テンプレートをベースに、テキスト差し替え＋画像埋め込み
 */
import JSZip from "jszip";
import fs from "fs";
import path from "path";
import imageSize from "image-size";

const TEMPLATE = "public/lp/pptx/c-slide_営業資料テンプレート.pptx";
const OUTPUT   = "public/lp/GrowReporter_営業資料.pptx";
const IMG_DIR  = "public/lp/assets/images";

// ── EMU helpers ──
const emu = (inches) => Math.round(inches * 914400);

// ── Replace text in a shape's <a:t> elements ──
// Puts ALL new text into the first <a:t>, empties the rest
function replaceShapeText(xml, shapeName, newText) {
  // Escape for regex
  const escaped = shapeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Find the <p:sp> containing this shape name
  const spRegex = new RegExp(
    `(<p:sp>(?:(?!<p:sp>)[\\s\\S])*?name="${escaped}"[\\s\\S]*?<\\/p:sp>)`,
    "g"
  );
  return xml.replace(spRegex, (spBlock) => {
    // Replace <a:t> elements: first one gets the new text, rest get emptied
    let first = true;
    return spBlock.replace(/<a:t>([^<]*)<\/a:t>/g, (_match, _oldText) => {
      if (first) {
        first = false;
        return `<a:t>${escXml(newText)}</a:t>`;
      }
      return `<a:t></a:t>`;
    });
  });
}

// ── Replace all occurrences of exact text across all shapes ──
function replaceAllText(xml, oldText, newText) {
  const escaped = escXml(oldText);
  return xml.split(escaped).join(escXml(newText));
}

// ── Replace text in table cells (works for <a:tbl>) ──
// cellMap: array of { row, col, text } (0-indexed)
function replaceTableCells(xml, cellMap) {
  // Find all rows
  const rows = [];
  let rowRegex = /<a:tr [^>]*>([\s\S]*?)<\/a:tr>/g;
  let rowMatch;
  let modified = xml;

  // Collect all row matches
  while ((rowMatch = rowRegex.exec(xml)) !== null) {
    rows.push({ start: rowMatch.index, end: rowMatch.index + rowMatch[0].length, content: rowMatch[0] });
  }

  // Process replacements in reverse order to preserve indices
  for (const cell of cellMap.sort((a, b) => b.row - a.row || b.col - a.col)) {
    if (cell.row >= rows.length) continue;
    const row = rows[cell.row];

    // Find cells in this row
    const cells = [];
    const cellRegex = /<a:tc>([\s\S]*?)<\/a:tc>/g;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row.content)) !== null) {
      cells.push({ start: cellMatch.index, end: cellMatch.index + cellMatch[0].length, content: cellMatch[0] });
    }

    if (cell.col >= cells.length) continue;
    const tc = cells[cell.col];

    // Replace all <a:t> in this cell
    let first = true;
    const newTc = tc.content.replace(/<a:t>([^<]*)<\/a:t>/g, () => {
      if (first) { first = false; return `<a:t>${escXml(cell.text)}</a:t>`; }
      return `<a:t></a:t>`;
    });

    const newRow = row.content.substring(0, tc.start) + newTc + row.content.substring(tc.end);
    modified = modified.substring(0, row.start) + modified.substring(row.start).replace(row.content, newRow);
  }

  return modified;
}

// ── Add image to a slide (aspect-ratio aware) ──
// maxW/maxH define the bounding box; the image is fit inside preserving ratio, centered
function addImageToSlide(zip, slideNum, imgPath, rId, areaX, areaY, maxW, maxH, picId) {
  const dim = imageSize(imgPath);
  const ratio = dim.width / dim.height;
  let w, h;
  if (maxW / maxH > ratio) {
    // area is wider than image → fit by height
    h = maxH;
    w = h * ratio;
  } else {
    // area is taller than image → fit by width
    w = maxW;
    h = w / ratio;
  }
  const x = areaX + (maxW - w) / 2;  // center horizontally
  const y = areaY + (maxH - h) / 2;  // center vertically
  const imgData = fs.readFileSync(imgPath);
  const ext = path.extname(imgPath).slice(1);
  const mediaName = `image_slide${slideNum}_${picId}.${ext}`;

  // Add image to ppt/media/
  zip.file(`ppt/media/${mediaName}`, imgData);

  // Add relationship to slide rels
  const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
  if (zip.files[relsPath]) {
    let rels = null; // will be set async
    return {
      mediaName,
      rId,
      async apply() {
        rels = await zip.files[relsPath].async("string");
        const newRel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName}"/>`;
        rels = rels.replace("</Relationships>", `${newRel}</Relationships>`);
        zip.file(relsPath, rels);
      },
      // Return pic XML to insert into slide
      picXml: `<p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${picId}" name="Picture ${picId}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="${rId}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="${emu(x)}" y="${emu(y)}"/>
            <a:ext cx="${emu(w)}" cy="${emu(h)}"/>
          </a:xfrm>
          <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 16000"/></a:avLst></a:prstGeom>
        </p:spPr>
      </p:pic>`,
    };
  }
  return null;
}

function escXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ══════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════
async function main() {
  const data = fs.readFileSync(TEMPLATE);
  const zip = await JSZip.loadAsync(data);

  // ── Global: Replace copyright ──
  for (const f of Object.keys(zip.files)) {
    if (f.startsWith("ppt/slides/slide") && f.endsWith(".xml")) {
      let xml = await zip.files[f].async("string");
      xml = replaceAllText(xml, "© 2022 CONE inc.", "© Grow Group株式会社");
      zip.file(f, xml);
    }
  }

  // ══ Slide 1: Cover ══
  {
    let xml = await zip.files["ppt/slides/slide1.xml"].async("string");
    xml = replaceShapeText(xml, "テキスト ボックス 1",
      '「GrowReporter」サービスご紹介');
    xml = replaceShapeText(xml, "テキスト ボックス 4",
      "Grow Group株式会社");
    zip.file("ppt/slides/slide1.xml", xml);
  }

  // ══ Slide 2: サービス概要（実績）→ ダッシュボード画面紹介 ══
  {
    let xml = await zip.files["ppt/slides/slide2.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "サービス画面イメージ");
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 2",
      "GA4/Search Consoleのデータを、AIが自動で分析。直感的なダッシュボードですべてを把握できます。");
    // Replace chart area texts with empty
    for (const name of ["角丸四角形 28", "角丸四角形 36"]) {
      xml = replaceShapeText(xml, name, "");
    }
    for (let i = 62; i <= 93; i++) {
      xml = replaceShapeText(xml, `角丸四角形 ${i}`, "");
      xml = replaceShapeText(xml, `円/楕円 ${i}`, "");
    }
    // Add dashboard screenshot
    const img = addImageToSlide(zip, 2, `${IMG_DIR}/screenshot-dashboard.png`, "rId10", 1.5, 2.5, 10.3, 4.3, 200);
    if (img) {
      await img.apply();
      xml = xml.replace("</p:spTree>", `${img.picXml}</p:spTree>`);
    }
    zip.file("ppt/slides/slide2.xml", xml);
  }

  // ══ Slide 3: サービス概要（3つの価値）══
  {
    let xml = await zip.files["ppt/slides/slide3.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "GrowReporter とは");
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 2",
      "GA4 / Search Console × AI で、分析・改善・評価を一気通貫。専門知識がなくても、データに基づいた意思決定ができる環境をつくります。");
    xml = replaceShapeText(xml, "角丸四角形 6",
      "アクセス解析 × AI で Web サイトに次の打ち手を");
    xml = replaceShapeText(xml, "角丸四角形 11", "AI がデータを自動で読み解き、日本語レポートに");
    xml = replaceShapeText(xml, "角丸四角形 12", "改善提案からモックアップ画像まで AI が自動生成");
    xml = replaceShapeText(xml, "角丸四角形 13", "施策の効果を自動計測し、改善の精度を継続向上");
    zip.file("ppt/slides/slide3.xml", xml);
  }

  // ══ Slide 4: 課題提起 ══
  {
    let xml = await zip.files["ppt/slides/slide4.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "こんなお悩み、ありませんか？");
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 6",
      "Web サイトのアクセスデータ活用において、多くの企業が同じ課題を抱えています。");
    // 3 main problem cards
    xml = replaceShapeText(xml, "角丸四角形 9",
      "GA4が難しい\nGA4の画面が複雑でどこを見ればいいかわからない。結局アクセス数だけ見て終わり。");
    xml = replaceShapeText(xml, "角丸四角形 8",
      "改善策が出ない\n数値を見ても具体的な改善策が浮かばない。レポート作成に毎回半日かかる。");
    xml = replaceShapeText(xml, "角丸四角形 10",
      "コストが高い\n外注すると月数十万。改善のPDCAが続かず、サイトの異変にも気づけない。");
    // Detail boxes below
    xml = replaceShapeText(xml, "角丸四角形 24",
      "Web担当者・マーケターの声");
    xml = replaceShapeText(xml, "角丸四角形 21",
      "経営者・管理者の声");
    xml = replaceShapeText(xml, "角丸四角形 22",
      "制作会社・代理店の声");
    zip.file("ppt/slides/slide4.xml", xml);
  }

  // ══ Slide 5: サービス紹介（3つの柱）══
  {
    let xml = await zip.files["ppt/slides/slide5.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "GrowReporter の 3 つの価値");
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 2",
      "分析・改善・評価のサイクルをひとつのツールで完結。サイト運用を「続けられるもの」に変えます。");
    // 3 columns - headers
    xml = replaceShapeText(xml, "角丸四角形 6", "AI 分析\nデータを自動で読み解く");
    xml = replaceShapeText(xml, "角丸四角形 5", "AI 改善提案\n次にやるべきことを提示");
    xml = replaceShapeText(xml, "角丸四角形 7", "効果測定\n施策の成果を見える化");
    // 3 columns - details
    xml = replaceShapeText(xml, "角丸四角形 10",
      "GA4/GSCの複雑なデータをAIが自動分析。15以上の分析ビューで多角的に可視化。各ビューにAI考察付き。");
    xml = replaceShapeText(xml, "角丸四角形 9",
      "改善内容と改善前後のモックアップ画像まで自動生成。AIチャットで自由に質問も可能。");
    xml = replaceShapeText(xml, "角丸四角形 8",
      "完了した施策にフィードバック。どの施策が効果的だったかを振り返り、次の精度を高めます。");
    zip.file("ppt/slides/slide5.xml", xml);
  }

  // ══ Slide 6-8: 特徴①②③ + screenshots ══
  const features = [
    {
      slide: 6,
      title: "特長 ① ｜ AI が分析して届けてくれる",
      subtitle: "GA4を開いてデータを読み解く必要はありません。サイトを登録するだけでAIが自動分析。変化があればメールで通知。必要な情報は向こうから届きます。",
      detail: "",
      img: `${IMG_DIR}/about01.png`,
    },
    {
      slide: 7,
      title: '特長 ② ｜「次に何をすべきか」まで提案',
      subtitle: "一般的なツールはデータを見せるだけ。GrowReporterはAIが考察・改善提案・モックアップ画像まで一気通貫で生成。「数字は見た、で、どうすればいい？」に答えます。",
      detail: "",
      img: `${IMG_DIR}/about02.png`,
    },
    {
      slide: 8,
      title: "特長 ③ ｜ 分析→改善→評価が途切れない",
      subtitle: "分析して終わり、改善して終わりにさせません。改善施策の効果測定までをひとつのツールで完結。担当者が継続的に成果を積み上げていける仕組みです。",
      detail: "",
      img: `${IMG_DIR}/about03.png`,
    },
  ];

  for (const f of features) {
    let xml = await zip.files[`ppt/slides/slide${f.slide}.xml`].async("string");
    xml = replaceShapeText(xml, "タイトル 1", f.title);
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 2", f.subtitle);
    xml = replaceShapeText(xml, "角丸四角形 9", f.detail);

    // Add screenshot image
    const img = addImageToSlide(zip, f.slide, f.img, "rId10", 1.0, 2.8, 11.3, 4.0, 300);
    if (img) {
      await img.apply();
      xml = xml.replace("</p:spTree>", `${img.picXml}</p:spTree>`);
    }
    zip.file(`ppt/slides/slide${f.slide}.xml`, xml);
  }

  // ══ Slide 9: 競合比較 ══
  {
    let xml = await zip.files["ppt/slides/slide9.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "他のツールとの違い");
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 54",
      "GA4やLooker Studioでは実現できない、AIによる分析・改善・評価の一気通貫を実現します。");
    // 3 product columns
    xml = replaceShapeText(xml, "角丸四角形 8", "GrowReporter");
    xml = replaceShapeText(xml, "角丸四角形 6", "GA4");
    xml = replaceShapeText(xml, "角丸四角形 7", "Looker Studio");
    // GrowReporter axes (left column)
    xml = replaceShapeText(xml, "角丸四角形 11", "◎ AI分析");
    xml = replaceShapeText(xml, "角丸四角形 15", "◎ 改善提案");
    xml = replaceShapeText(xml, "角丸四角形 13", "◎ 効果測定");
    xml = replaceShapeText(xml, "角丸四角形 12", "◎ 自動通知");
    xml = replaceShapeText(xml, "角丸四角形 14", "◎ 知識不要");
    // GA4 axes (center column)
    xml = replaceShapeText(xml, "角丸四角形 26", "△ 表示のみ");
    xml = replaceShapeText(xml, "角丸四角形 29", "✕ 非対応");
    xml = replaceShapeText(xml, "角丸四角形 28", "✕ 非対応");
    xml = replaceShapeText(xml, "角丸四角形 27", "△ 複雑");
    xml = replaceShapeText(xml, "角丸四角形 30", "要 専門知識");
    // Looker Studio axes (right column)
    xml = replaceShapeText(xml, "角丸四角形 39", "△ 可視化のみ");
    xml = replaceShapeText(xml, "角丸四角形 42", "✕ 非対応");
    xml = replaceShapeText(xml, "角丸四角形 41", "✕ 非対応");
    xml = replaceShapeText(xml, "角丸四角形 40", "✕ なし");
    xml = replaceShapeText(xml, "角丸四角形 43", "要 専門知識");
    // Bottom detail
    xml = replaceShapeText(xml, "角丸四角形 50",
      "AI分析・改善提案・効果測定・自動通知を標準搭載。専門知識ゼロで、データに基づいた改善PDCAを回せます。");
    xml = replaceShapeText(xml, "角丸四角形 51",
      "データ表示は強力だが、分析・改善提案機能はなく、専門知識が必要。");
    xml = replaceShapeText(xml, "角丸四角形 52",
      "可視化ツールとしては優秀だが、AI分析・改善提案は非対応。接続設定にも知識が必要。");
    zip.file("ppt/slides/slide9.xml", xml);
  }

  // ══ Slide 10: 導入効果 ══
  {
    let xml = await zip.files["ppt/slides/slide10.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "導入効果");
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 2",
      "GrowReporter の導入により、レポート作成工数と分析コストを大幅に削減。改善サイクルを加速します。");
    // Left metric
    xml = replaceShapeText(xml, "角丸四角形 13", "レポート作成時間の削減");
    xml = replaceShapeText(xml, "角丸四角形 20", "半日");
    xml = replaceShapeText(xml, "角丸四角形 37", "導入後");
    xml = replaceShapeText(xml, "角丸四角形 18", "数秒");
    xml = replaceShapeText(xml, "角丸四角形 19", "導入前");
    xml = replaceShapeText(xml, "角丸四角形 43", "99%削減");
    xml = replaceShapeText(xml, "角丸四角形 15",
      "Excel/PowerPoint形式にワンクリックで変換。グラフやAIコメント入りの報告資料が数秒で完成。");
    // Right metric
    xml = replaceShapeText(xml, "角丸四角形 14", "月額コストの削減");
    xml = replaceShapeText(xml, "角丸四角形 10", "10万円〜");
    xml = replaceShapeText(xml, "角丸四角形 11", "導入後");
    xml = replaceShapeText(xml, "角丸四角形 8", "49,800円");
    xml = replaceShapeText(xml, "角丸四角形 9", "導入前");
    xml = replaceShapeText(xml, "角丸四角形 22", "50%以上削減");
    xml = replaceShapeText(xml, "角丸四角形 16",
      "コンサル外注（月10万円〜）と比較して、AI無制限・チーム無制限で月額49,800円。");
    zip.file("ppt/slides/slide10.xml", xml);
  }

  // ══ Slide 11: 事例紹介 → 主要機能一覧 ══
  {
    let xml = await zip.files["ppt/slides/slide11.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "主要機能");
    xml = replaceShapeText(xml, "角丸四角形 8",
      "9つの主要機能\nAIチャット / AI総合分析 / AI改善提案+モックアップ\n異変の自動通知+定期レポート / 改善の効果測定 / レポート出力\n15以上の分析ビュー / コンバージョン逆引き分析 / チーム管理・複数サイト対応");
    xml = replaceShapeText(xml, "角丸四角形 12",
      "AI機能（Businessプラン）\n・AIチャット：対話形式でサイトデータを分析\n・AI総合分析：複雑なデータを日本語レポートに\n・AI改善提案：モックアップ画像まで自動生成\n・効果測定：施策の成果をフィードバック");
    xml = replaceShapeText(xml, "角丸四角形 13",
      "基本機能（全プラン）\n・15以上の分析ビュー：多角的にデータを可視化\n・異変の自動通知：大きな変化をメール通知\n・コンバージョン逆引き分析：成果の導線を可視化\n・チーム管理：メンバー招待＆権限設定");
    xml = replaceShapeText(xml, "角丸四角形 2", "");
    for (const n of [11, 23, 29, 32, 35]) {
      xml = replaceShapeText(xml, `角丸四角形 ${n}`, "");
    }
    // Add feature screenshot
    const img = addImageToSlide(zip, 11, `${IMG_DIR}/about.png`, "rId10", 0.6, 4.2, 5.0, 2.8, 400);
    if (img) {
      await img.apply();
      xml = xml.replace("</p:spTree>", `${img.picXml}</p:spTree>`);
    }
    zip.file("ppt/slides/slide11.xml", xml);
  }

  // ══ Slide 12: 料金 ══
  {
    let xml = await zip.files["ppt/slides/slide12.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "シンプルな料金体系");
    xml = replaceShapeText(xml, "コンテンツ プレースホルダー 2",
      "無料プランでアクセスデータを確認。ビジネスプランでAIの力を最大限活用。お申し込み月は無料。翌月1日から課金開始。");
    // Table cells - replace via table manipulation
    xml = replaceTableCells(xml, [
      // Header row
      { row: 0, col: 0, text: "" },
      { row: 0, col: 1, text: "無料プラン" },
      { row: 0, col: 2, text: "ビジネスプラン" },
      // Rows
      { row: 1, col: 0, text: "月額料金" },
      { row: 1, col: 1, text: "¥0" },
      { row: 1, col: 2, text: "¥49,800（税別）" },
      { row: 2, col: 0, text: "サイト登録" },
      { row: 2, col: 1, text: "1件" },
      { row: 2, col: 2, text: "3件" },
      { row: 3, col: 0, text: "メンバー" },
      { row: 3, col: 1, text: "3名" },
      { row: 3, col: 2, text: "無制限" },
      { row: 4, col: 0, text: "AI分析・改善提案" },
      { row: 4, col: 1, text: "—" },
      { row: 4, col: 2, text: "無制限" },
      { row: 5, col: 0, text: "レポート出力" },
      { row: 5, col: 1, text: "—" },
      { row: 5, col: 2, text: "無制限" },
    ]);
    zip.file("ppt/slides/slide12.xml", xml);
  }

  // ══ Slide 13: ご利用の流れ ══
  {
    let xml = await zip.files["ppt/slides/slide13.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "ご利用の流れ");
    xml = replaceShapeText(xml, "角丸四角形 5",
      "STEP 1：無料アカウント登録　メールアドレスまたはGoogleアカウントで簡単に登録（約1分）");
    xml = replaceShapeText(xml, "角丸四角形 6",
      "STEP 2：サイト情報入力・GA4/GSC連携　URLを入力し、Googleアカウントでワンクリック連携（約3分）");
    xml = replaceShapeText(xml, "角丸四角形 11",
      "STEP 3：分析スタート！　過去データが即座に反映。AI分析をすぐにお試しいただけます");
    xml = replaceShapeText(xml, "角丸四角形 12",
      "AI分析・改善提案　データに基づいたAI考察と具体的な改善提案が自動生成されます");
    xml = replaceShapeText(xml, "角丸四角形 13",
      "改善実行・効果測定　施策を実行し、効果測定で成果を振り返り。次の改善精度を向上");
    xml = replaceShapeText(xml, "角丸四角形 14",
      "定期レポート自動配信　週次・月次レポートがメールで届き、継続的にサイトを改善");
    xml = replaceShapeText(xml, "角丸四角形 25",
      "最短5分で分析開始できます");
    zip.file("ppt/slides/slide13.xml", xml);
  }

  // ══ Slide 14: コストシミュレーション → コスト比較 ══
  {
    let xml = await zip.files["ppt/slides/slide14.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "コスト比較");
    // Left column
    xml = replaceShapeText(xml, "角丸四角形 2", "GrowReporter ビジネスプラン");
    xml = replaceShapeText(xml, "角丸四角形 8", "月額 ¥49,800（税別）");
    xml = replaceShapeText(xml, "角丸四角形 9", "AI分析サマリー 無制限");
    xml = replaceShapeText(xml, "角丸四角形 11", "AI改善提案・AIチャット 無制限");
    xml = replaceShapeText(xml, "角丸四角形 12", "効果測定・レポート出力 無制限");
    xml = replaceShapeText(xml, "角丸四角形 13", "チームメンバー 無制限");
    // Right column
    xml = replaceShapeText(xml, "角丸四角形 7", "外部コンサルタント");
    xml = replaceShapeText(xml, "角丸四角形 17", "月額 ¥100,000〜（相場）");
    xml = replaceShapeText(xml, "角丸四角形 19", "月1回のレポート");
    xml = replaceShapeText(xml, "角丸四角形 25", "改善提案は別料金");
    xml = replaceShapeText(xml, "角丸四角形 28", "施策の実行支援なし");
    xml = replaceShapeText(xml, "角丸四角形 29", "担当者の属人性");
    xml = replaceShapeText(xml, "角丸四角形 31",
      "GrowReporterなら、コンサルの半額以下で好きなときにAI分析+改善提案+モックアップまで");
    zip.file("ppt/slides/slide14.xml", xml);
  }

  // ══ Slide 15: FAQ ══
  {
    let xml = await zip.files["ppt/slides/slide15.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "よくあるご質問");
    xml = replaceShapeText(xml, "角丸四角形 10",
      "Q. GA4の専門知識がなくても使えますか？\nはい、まったく問題ありません。サイトURLを登録してGoogleアカウントで接続するだけ。AIがわかりやすい日本語で教えてくれます。");
    xml = replaceShapeText(xml, "角丸四角形 11",
      "Q. データのセキュリティは大丈夫ですか？\nご安心ください。Googleのセキュリティ基盤上で動作し、データは暗号化保管。GA4のパスワードをお預かりすることは一切ありません。");
    xml = replaceShapeText(xml, "角丸四角形 12",
      "Q. 解約はいつでもできますか？\nはい、いつでも即日解約可能です。その月の末日までご利用いただけます。チームでの利用も可能で、ビジネスプランはメンバー無制限です。");
    zip.file("ppt/slides/slide15.xml", xml);
  }

  // ══ Slide 16: 会社概要 ══
  {
    let xml = await zip.files["ppt/slides/slide16.xml"].async("string");
    xml = replaceShapeText(xml, "タイトル 1", "会社概要");
    xml = replaceShapeText(xml, "角丸四角形 5", "GrowReporter");
    // Table
    xml = replaceTableCells(xml, [
      { row: 0, col: 0, text: "会社名" },     { row: 0, col: 1, text: "Grow Group株式会社" },
      { row: 1, col: 0, text: "所在地" },     { row: 1, col: 1, text: "東京都新宿区西新宿3-3-13 西新宿水間ビル2F" },
      { row: 2, col: 0, text: "代表" },       { row: 2, col: 1, text: "代表取締役　畑中 貴仁" },
      { row: 3, col: 0, text: "資本金" },     { row: 3, col: 1, text: "500万円" },
      { row: 4, col: 0, text: "事業内容" },   { row: 4, col: 1, text: "Webサイト制作・Webマーケティング支援 / アクセス解析AIツール「GrowReporter」開発・運営" },
      { row: 5, col: 0, text: "URL" },        { row: 5, col: 1, text: "https://and-suspended.com/" },
    ]);
    zip.file("ppt/slides/slide16.xml", xml);
  }

  // ══ Slide 17: CTA ══
  {
    let xml = await zip.files["ppt/slides/slide17.xml"].async("string");
    xml = replaceShapeText(xml, "角丸四角形 3",
      "ご不明点はお気軽にご相談ください。\n無料プランからすぐにお試しいただけます。");
    xml = replaceShapeText(xml, "角丸四角形 9", "無料で登録");
    xml = replaceShapeText(xml, "角丸四角形 11", "お問い合わせ");
    zip.file("ppt/slides/slide17.xml", xml);
  }

  // ── Save ──
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(OUTPUT, buf);
  console.log(`✅ 生成完了: ${OUTPUT} (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch(console.error);
