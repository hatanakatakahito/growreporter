const JSZip = require('jszip');
const fs = require('fs');

async function analyze() {
  const pptxPath = 'public/lp/pptx/c-slide_営業資料テンプレート.pptx';
  const buffer = fs.readFileSync(pptxPath);
  const zip = new JSZip();
  const pptx = await zip.loadAsync(buffer);

  // Get first slide XML and print structure
  const slide1Xml = await pptx.file('ppt/slides/slide1.xml').async('text');
  
  console.log('=== SLIDE 1 RAW XML (first 2000 chars) ===\n');
  console.log(slide1Xml.substring(0, 3000));
  
  console.log('\n\n=== LOOKING FOR SHAPE TAGS ===\n');
  const shapeMatches = slide1Xml.match(/<(p:[a-z]+)/g) || [];
  const uniqueTags = [...new Set(shapeMatches)];
  console.log('Unique tags:', uniqueTags.join(', '));
  
  // Look for text
  console.log('\n\n=== TEXT CONTENT ===\n');
  const textRegex = /<a:t>([^<]+)<\/a:t>/g;
  let match;
  while((match = textRegex.exec(slide1Xml))) {
    console.log(match[1]);
  }
}

analyze().catch(e => console.error(e.message));
