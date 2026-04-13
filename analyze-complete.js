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

async function analyze() {
  const pptxPath = 'public/lp/pptx/c-slide_営業資料テンプレート.pptx';
  const buffer = fs.readFileSync(pptxPath);
  const zip = new JSZip();
  const pptx = await zip.loadAsync(buffer);

  console.log('=== DESIGN SYSTEM - COMPLETE ANALYSIS ===\n');
  
  // THEME
  const themeXml = await pptx.file('ppt/theme/theme1.xml').async('text');
  
  console.log('1. THEME COLORS');
  console.log('──────────────────────────────────────');
  
  const colorMap = {
    'dk1': 'Dark 1',
    'lt1': 'Light 1',
    'dk2': 'Dark 2',
    'lt2': 'Light 2',
    'accent1': 'Accent 1',
    'accent2': 'Accent 2',
    'accent3': 'Accent 3',
    'accent4': 'Accent 4',
    'accent5': 'Accent 5',
    'accent6': 'Accent 6',
    'hlink': 'Hyperlink',
    'folHlink': 'Followed Hyperlink'
  };
  
  const colors = {};
  Object.entries(colorMap).forEach(([key, label]) => {
    const hex = extractAttribute(themeXml, `<a:${key}>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"`);
    if(hex) {
      const hexVal = '#' + hex.toUpperCase();
      colors[key] = hexVal;
      console.log(`  ${label.padEnd(20)} ${hexVal}`);
    }
  });
  
  // FONTS
  console.log('\n2. THEME FONTS');
  console.log('──────────────────────────────────────');
  
  const majorFont = extractAttribute(themeXml, /<a:majorFont>[\s\S]*?<a:latin typeface="([^"]+)"/);
  const minorFont = extractAttribute(themeXml, /<a:minorFont>[\s\S]*?<a:latin typeface="([^"]+)"/);
  
  console.log(`  Heading Font (Major):  ${majorFont}`);
  console.log(`  Body Font (Minor):     ${minorFont}`);
  
  // SLIDES DETAIL
  console.log('\n3. SLIDE-BY-SLIDE DESIGN SPECS');
  console.log('──────────────────────────────────────\n');
  
  const slidesToCheck = [1, 4, 5, 9, 12];
  
  for(const slideNum of slidesToCheck) {
    const slideFile = `ppt/slides/slide${slideNum}.xml`;
    const file = pptx.file(slideFile);
    
    if(!file) {
      console.log(`SLIDE ${slideNum}: NOT FOUND\n`);
      continue;
    }
    
    const slideXml = await file.async('text');
    console.log(`SLIDE ${slideNum}`);
    console.log('─'.repeat(50));
    
    // Background
    if(slideXml.includes('<p:bg>')) {
      const bgMatch = slideXml.match(/<p:bg>([\s\S]*?)<\/p:bg>/);
      if(bgMatch) {
        const bgXml = bgMatch[1];
        const bgHex = extractAttribute(bgXml, '<a:srgbClr val="([0-9A-Fa-f]{6})"');
        const bgScheme = extractAttribute(bgXml, '<a:schemeClr val="([^"]+)"');
        
        if(bgHex) console.log(`Background: #${bgHex.toUpperCase()}`);
        if(bgScheme) console.log(`Background: ${bgScheme} (scheme color)`);
      }
    }
    
    // Extract all shapes
    const spRegex = /<p:sp>([\s\S]*?)<\/p:sp>/g;
    const picRegex = /<p:pic>([\s\S]*?)<\/p:pic>/g;
    
    let spMatch;
    let shapeCount = 0;
    const shapes = [];
    
    while((spMatch = spRegex.exec(slideXml)) && shapeCount < 8) {
      const shapeXml = spMatch[1];
      const shape = {};
      
      shape.name = extractAttribute(shapeXml, 'p:cNvPr id="\d+" name="([^"]*)"');
      
      // Position
      const x = extractAttribute(shapeXml, '<a:off x="([0-9]+)"');
      const y = extractAttribute(shapeXml, '<a:off y="([0-9]+)"');
      if(x && y) {
        shape.position = `(${emuToInches(x)}", ${emuToInches(y)}")`;
        shape.positionEMU = `(${x}, ${y})`;
      }
      
      // Size
      const cx = extractAttribute(shapeXml, '<a:ext cx="([0-9]+)"');
      const cy = extractAttribute(shapeXml, '<a:ext cy="([0-9]+)"');
      if(cx && cy) {
        shape.size = `${emuToInches(cx)}" x ${emuToInches(cy)}"`;
        shape.sizeEMU = `${cx} x ${cy}`;
      }
      
      // Shape type
      const shapeType = extractAttribute(shapeXml, '<a:prstGeom prst="([^"]+)"');
      if(shapeType) shape.type = shapeType;
      
      // Fill
      if(shapeXml.includes('<a:solidFill>')) {
        const fillHex = extractAttribute(shapeXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/)?.[1] || '', '<a:srgbClr val="([0-9A-Fa-f]{6})"');
        const fillScheme = extractAttribute(shapeXml.match(/<a:solidFill>([\s\S]*?)<\/a:solidFill>/)?.[1] || '', '<a:schemeClr val="([^"]+)"');
        if(fillHex) shape.fill = `#${fillHex.toUpperCase()}`;
        if(fillScheme) shape.fill = `${fillScheme} (scheme)`;
      } else if(shapeXml.includes('<a:noFill>')) {
        shape.fill = 'none';
      }
      
      // Line width
      const lineWidth = extractAttribute(shapeXml, '<a:ln[^>]*w="([0-9]+)"');
      if(lineWidth) shape.lineWidth = Math.round(parseInt(lineWidth) / 12700) + 'pt';
      
      // Text
      const textContent = [];
      const textRegex = /<a:t>([^<]+)<\/a:t>/g;
      let textMatch;
      while((textMatch = textRegex.exec(shapeXml))) {
        textContent.push(textMatch[1]);
      }
      if(textContent.length > 0) shape.text = textContent.join('');
      
      // Font
      const fontMatch = shapeXml.match(/<a:latin typeface="([^"]+)"/);
      if(fontMatch) shape.font = fontMatch[1];
      
      // Font size (from rPr sz attribute)
      const sizeMatch = shapeXml.match(/sz="(\d+)"/);
      if(sizeMatch) shape.fontSize = (parseInt(sizeMatch[1]) / 100) + 'pt';
      
      // Bold
      if(shapeXml.includes('b="1"')) shape.bold = true;
      
      // Text color
      const rPrMatch = shapeXml.match(/<a:rPr[^>]*>([\s\S]*?)<\/a:rPr>/);
      if(rPrMatch) {
        const rPrXml = rPrMatch[1];
        const textColorHex = extractAttribute(rPrXml, '<a:srgbClr val="([0-9A-Fa-f]{6})"');
        const textColorScheme = extractAttribute(rPrXml, '<a:schemeClr val="([^"]+)"');
        if(textColorHex) shape.textColor = `#${textColorHex.toUpperCase()}`;
        if(textColorScheme) shape.textColor = textColorScheme;
      }
      
      shapes.push(shape);
      shapeCount++;
    }
    
    if(shapes.length > 0) {
      console.log(`Total Shapes: ${shapes.length}\n`);
      
      shapes.forEach((shape, idx) => {
        console.log(`  Shape ${idx + 1}: ${shape.name || '(unnamed)'}`);
        if(shape.type) console.log(`    Type: ${shape.type}`);
        if(shape.position) console.log(`    Position: ${shape.position} [EMU: ${shape.positionEMU}]`);
        if(shape.size) console.log(`    Size: ${shape.size} [EMU: ${shape.sizeEMU}]`);
        if(shape.fill) console.log(`    Fill: ${shape.fill}`);
        if(shape.lineWidth) console.log(`    Border: ${shape.lineWidth}`);
        if(shape.text) console.log(`    Text: "${shape.text.substring(0, 60)}"`);
        if(shape.font) console.log(`    Font: ${shape.font}`);
        if(shape.fontSize) console.log(`    Size: ${shape.fontSize}`);
        if(shape.bold) console.log(`    Bold: yes`);
        if(shape.textColor) console.log(`    Text Color: ${shape.textColor}`);
        console.log();
      });
    } else {
      console.log('No shapes found\n');
    }
  }
  
  console.log('\n=== END OF ANALYSIS ===');
}

analyze().catch(e => {
  console.error('ERROR:', e.message);
  console.error(e.stack);
});
