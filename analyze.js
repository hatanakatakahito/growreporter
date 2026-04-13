const JSZip = require('jszip');
const fs = require('fs');

async function extractText(xml) {
  return xml;
}

function extractColorFromXml(xml, tagName) {
  const regex = new RegExp(`<a:${tagName}>\s*<a:srgbClr val="([0-9A-Fa-f]{6})"`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extractAttribute(xml, path) {
  const regex = new RegExp(`${path}="([^"]+)"`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

async function analyze() {
  const pptxPath = 'public/lp/pptx/c-slide_営業資料テンプレート.pptx';
  console.log('Opening:', pptxPath, '\n');
  
  const buffer = fs.readFileSync(pptxPath);
  const zip = new JSZip();
  const pptx = await zip.loadAsync(buffer);

  // List all files in PPTX
  console.log('=== PPTX STRUCTURE ===\n');
  const files = Object.keys(pptx.files).filter(f => !f.endsWith('/'));
  console.log('Total files:', files.length);
  
  const xmlFiles = files.filter(f => f.endsWith('.xml'));
  console.log('XML files:', xmlFiles.length);
  
  const themeFiles = xmlFiles.filter(f => f.includes('theme'));
  const slideFiles = xmlFiles.filter(f => f.includes('/slide') && !f.includes('Layouts'));
  const masterFiles = xmlFiles.filter(f => f.includes('Master'));
  const layoutFiles = xmlFiles.filter(f => f.includes('Layouts'));
  
  console.log('Theme files:', themeFiles.length);
  console.log('Slide files:', slideFiles.length);
  console.log('Master files:', masterFiles.length);
  console.log('Layout files:', layoutFiles.length);

  // 1. Theme analysis
  console.log('\n=== THEME & COLOR PALETTE ===\n');
  const themeXml = await pptx.file('ppt/theme/theme1.xml').async('text');
  
  const colors = {};
  ['dk1','lt1','dk2','lt2','accent1','accent2','accent3','accent4','accent5','accent6','hlink','folHlink'].forEach(c => {
    const hex = extractColorFromXml(themeXml, c);
    if(hex) colors[c] = '#' + hex.toUpperCase();
  });
  
  console.log('Color Scheme Colors:');
  Object.entries(colors).forEach(([k,v]) => console.log(`  ${k}: ${v}`));

  // Extract fonts
  console.log('\nFont Definitions:');
  const majorMatch = themeXml.match(/<a:majorFont>[\s\S]*?<a:latin typeface="([^"]+)"/);
  const minorMatch = themeXml.match(/<a:minorFont>[\s\S]*?<a:latin typeface="([^"]+)"/);
  if(majorMatch) console.log(`  Major (Headings): ${majorMatch[1]}`);
  if(minorMatch) console.log(`  Minor (Body): ${minorMatch[1]}`);

  // 2. Slide analysis
  console.log('\n=== SLIDE ANALYSIS ===\n');
  const slidesToAnalyze = [1, 4, 5, 9, 12];
  
  for(const slideNum of slidesToAnalyze) {
    const slideFile = `ppt/slides/slide${slideNum}.xml`;
    const file = pptx.file(slideFile);
    
    if(!file) {
      console.log(`Slide ${slideNum}: NOT FOUND`);
      continue;
    }

    const slideXml = await file.async('text');
    console.log(`\n--- SLIDE ${slideNum} ---`);
    
    // Count shapes
    const shapeMatches = slideXml.match(/<p:sp>/g) || [];
    console.log(`Shapes: ${shapeMatches.length}`);
    
    // Background
    if(slideXml.includes('<p:bg>')) {
      const bgHex = extractColorFromXml(slideXml, 'srgbClr');
      const schemeColor = extractAttribute(slideXml, '<a:schemeClr val');
      if(bgHex) console.log(`Background Color: #${bgHex.toUpperCase()}`);
      if(schemeColor) console.log(`Background: Scheme Color - ${schemeColor}`);
    }
    
    // Extract shape details
    const shapeRegex = /<p:sp>([\s\S]*?)<\/p:sp>/g;
    let shapeMatch;
    let shapeCount = 0;
    
    while((shapeMatch = shapeRegex.exec(slideXml)) && shapeCount < 3) {
      const shapeXml = shapeMatch[1];
      const shapeName = extractAttribute(shapeXml, 'p:cNvPr name');
      
      if(shapeName) {
        console.log(`\n  Shape: ${shapeName}`);
        
        // Position and size
        const xMatch = extractAttribute(shapeXml, 'a:off x');
        const yMatch = extractAttribute(shapeXml, 'a:off y');
        const cxMatch = extractAttribute(shapeXml, 'a:ext cx');
        const cyMatch = extractAttribute(shapeXml, 'a:ext cy');
        
        if(xMatch && yMatch) console.log(`    Position: (${xMatch}, ${yMatch}) EMU`);
        if(cxMatch && cyMatch) {
          const w = Math.round(parseInt(cxMatch) / 914400 * 100) / 100;
          const h = Math.round(parseInt(cyMatch) / 914400 * 100) / 100;
          console.log(`    Size: ${w}" x ${h}"`);
        }
        
        // Fill color
        const fillHex = extractColorFromXml(shapeXml, 'srgbClr');
        if(fillHex) console.log(`    Fill: #${fillHex.toUpperCase()}`);
        
        // Text content and formatting
        const textMatch = shapeXml.match(/<a:t>([^<]+)<\/a:t>/);
        if(textMatch) {
          const text = textMatch[1].substring(0, 50);
          console.log(`    Text: "${text}"`);
        }
        
        // Font info
        const fontMatch = shapeXml.match(/<a:latin typeface="([^"]+)"/);
        if(fontMatch) console.log(`    Font: ${fontMatch[1]}`);
        
        const sizeMatch = shapeXml.match(/sz="(\d+)"/);
        if(sizeMatch) {
          const sizePt = parseInt(sizeMatch[1]) / 100;
          console.log(`    Font Size: ${sizePt}pt`);
        }
      }
      shapeCount++;
    }
  }

  console.log('\n\n=== ANALYSIS COMPLETE ===');
}

analyze().catch(e => console.error('ERROR:', e.message));
