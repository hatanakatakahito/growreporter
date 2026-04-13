const JSZip = require('jszip');
const fs = require('fs');

function extractAttribute(xml, pattern) {
  const regex = new RegExp(pattern);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function emuToInches(emu) {
  return (parseInt(emu) / 914400).toFixed(2);
}

function extractShapes(slideXml, slideNum) {
  const shapes = [];
  const shapeRegex = /<p:sp>([\s\S]*?)<\/p:sp>/g;
  let match;
  
  while((match = shapeRegex.exec(slideXml))) {
    const shapeXml = match[1];
    const name = extractAttribute(shapeXml, 'p:cNvPr name="([^"]+)"');
    
    if(!name) continue;
    
    const shape = { name, slideNum, data: {} };
    
    // Position
    const x = extractAttribute(shapeXml, 'a:off x="([^"]+)"');
    const y = extractAttribute(shapeXml, 'a:off y="([^"]+)"');
    if(x && y) shape.data.position = { x: x.toString(), y: y.toString(), x_inches: emuToInches(x), y_inches: emuToInches(y) };
    
    // Size
    const cx = extractAttribute(shapeXml, 'a:ext cx="([^"]+)"');
    const cy = extractAttribute(shapeXml, 'a:ext cy="([^"]+)"');
    if(cx && cy) shape.data.size = { cx: cx.toString(), cy: cy.toString(), width_inches: emuToInches(cx), height_inches: emuToInches(cy) };
    
    // Fill color
    const fillHex = extractAttribute(shapeXml, '<a:srgbClr val="([0-9A-Fa-f]{6})"');
    const schemeColor = extractAttribute(shapeXml, '<a:schemeClr val="([^"]+)"');
    if(fillHex) shape.data.fillColor = '#' + fillHex.toUpperCase();
    if(schemeColor) shape.data.fillSchemeColor = schemeColor;
    
    // Line/border
    const lineWidth = extractAttribute(shapeXml, 'w="([0-9]+)"');
    if(lineWidth) shape.data.lineWidth = Math.round(parseInt(lineWidth) / 12700) + 'pt';
    
    // Text content
    const textMatch = shapeXml.match(/<a:t>([^<]+)<\/a:t>/);
    if(textMatch) shape.data.text = textMatch[1].substring(0, 100);
    
    // Font info
    const fontMatch = shapeXml.match(/<a:latin typeface="([^"]+)"/);
    if(fontMatch) shape.data.font = fontMatch[1];
    
    const sizeMatch = shapeXml.match(/sz="(\d+)"/);
    if(sizeMatch) shape.data.fontSize = (parseInt(sizeMatch[1]) / 100) + 'pt';
    
    // Bold, Italic
    if(shapeXml.includes('b="1"')) shape.data.bold = true;
    if(shapeXml.includes('i="1"')) shape.data.italic = true;
    
    // Text color
    const textColorHex = extractAttribute(shapeXml.match(/<a:rPr[^>]*>([\s\S]*?)<\/a:rPr>/)?.[1] || '', '<a:srgbClr val="([0-9A-Fa-f]{6})"');
    if(textColorHex) shape.data.textColor = '#' + textColorHex.toUpperCase();
    
    // Shape type (rectangle, circle, etc)
    if(shapeXml.includes('<p:prstSp')) {
      const typeMatch = shapeXml.match(/<p:prstSp prst="([^"]+)"/);
      if(typeMatch) shape.data.shapeType = typeMatch[1];
    }
    
    shapes.push(shape);
  }
  
  return shapes;
}

async function analyze() {
  const pptxPath = 'public/lp/pptx/c-slide_営業資料テンプレート.pptx';
  const buffer = fs.readFileSync(pptxPath);
  const zip = new JSZip();
  const pptx = await zip.loadAsync(buffer);

  // Theme
  console.log('=== COMPLETE DESIGN SYSTEM ANALYSIS ===\n');
  const themeXml = await pptx.file('ppt/theme/theme1.xml').async('text');
  
  console.log('THEME COLORS:');
  const colorNames = ['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'];
  const allColors = {};
  
  colorNames.forEach(c => {
    const hex = extractAttribute(themeXml, `<a:${c}>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"`);
    const sys = extractAttribute(themeXml, `<a:${c}>\s*<a:sysClr val="([^"]+)"`);
    if(hex) {
      const hexVal = '#' + hex.toUpperCase();
      allColors[c] = hexVal;
      console.log(`  ${c.padEnd(12)} ${hexVal}`);
    } else if(sys) {
      allColors[c] = sys;
      console.log(`  ${c.padEnd(12)} ${sys}`);
    }
  });

  // Fonts
  console.log('\nTHEME FONTS:');
  const majorFont = extractAttribute(themeXml, /<a:majorFont>[\s\S]*?<a:latin typeface="([^"]+)"/);
  const minorFont = extractAttribute(themeXml, /<a:minorFont>[\s\S]*?<a:latin typeface="([^"]+)"/);
  console.log(`  Major (H1-H6): ${majorFont}`);
  console.log(`  Minor (Body):  ${minorFont}`);

  // Analyze slides
  console.log('\n\n=== SLIDE DETAILS ===\n');
  const slidesToAnalyze = [1, 4, 5, 9, 12];
  
  for(const slideNum of slidesToAnalyze) {
    const slideFile = `ppt/slides/slide${slideNum}.xml`;
    const file = pptx.file(slideFile);
    
    if(!file) {
      console.log(`SLIDE ${slideNum}: NOT FOUND\n`);
      continue;
    }

    const slideXml = await file.async('text');
    const shapes = extractShapes(slideXml, slideNum);
    
    console.log(`SLIDE ${slideNum} (${shapes.length} shapes)`);
    console.log('─'.repeat(80));
    
    // Background
    if(slideXml.includes('<p:bg>')) {
      const bgHex = extractAttribute(slideXml, '<p:bg>[\s\S]*?<a:srgbClr val="([0-9A-Fa-f]{6})"');
      const bgScheme = extractAttribute(slideXml, '<p:bg>[\s\S]*?<a:schemeClr val="([^"]+)"');
      if(bgHex) console.log(`Background: #${bgHex.toUpperCase()}`);
      if(bgScheme) console.log(`Background: ${bgScheme} scheme color`);
    }
    
    // Top 5 shapes
    shapes.slice(0, 5).forEach((shape, idx) => {
      console.log(`\n  [Shape ${idx + 1}] ${shape.name}`);
      if(shape.data.shapeType) console.log(`    Type: ${shape.data.shapeType}`);
      if(shape.data.position) {
        console.log(`    Position: ${shape.data.position.x_inches}" x ${shape.data.position.y_inches}" (${shape.data.position.x}, ${shape.data.position.y} EMU)`);
      }
      if(shape.data.size) {
        console.log(`    Size: ${shape.data.size.width_inches}" x ${shape.data.size.height_inches}" (${shape.data.size.cx}, ${shape.data.size.cy} EMU)`);
      }
      if(shape.data.fillColor) console.log(`    Fill: ${shape.data.fillColor}`);
      if(shape.data.fillSchemeColor) console.log(`    Fill: Scheme Color - ${shape.data.fillSchemeColor}`);
      if(shape.data.lineWidth) console.log(`    Line Width: ${shape.data.lineWidth}`);
      if(shape.data.text) console.log(`    Text: "${shape.data.text}"`);
      if(shape.data.font) console.log(`    Font: ${shape.data.font}`);
      if(shape.data.fontSize) console.log(`    Size: ${shape.data.fontSize}`);
      if(shape.data.bold) console.log(`    Bold: yes`);
      if(shape.data.textColor) console.log(`    Text Color: ${shape.data.textColor}`);
    });
    
    console.log('\n');
  }
}

analyze().catch(e => {
  console.error('ERROR:', e.message);
  console.error(e.stack);
});
