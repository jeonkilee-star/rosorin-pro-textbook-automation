// build/*.html → output/*.pdf, headless Chrome --print-to-pdf 사용.
// 사용법: node export_pdf.js build_a_jeondae.html  (build/ 안의 파일명만 넘기면 됨)
//        node export_pdf.js --all   (build/ 안의 모든 build_*.html 처리)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const BUILD_DIR = path.join(ROOT, 'build');
const OUTPUT_DIR = path.join(ROOT, 'output');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function findChrome() {
  const found = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  if (!found) throw new Error('Chrome/Edge 실행파일을 찾을 수 없습니다. CHROME_CANDIDATES 경로를 확인하세요.');
  return found;
}

function exportOne(chrome, htmlName) {
  const htmlPath = path.join(BUILD_DIR, htmlName);
  if (!fs.existsSync(htmlPath)) throw new Error(`build/${htmlName} 이(가) 없습니다`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const pdfName = htmlName.replace(/^build_/, '텍스트북_').replace(/\.html$/, '.pdf');
  const pdfPath = path.join(OUTPUT_DIR, pdfName);

  // file:/// 는 반드시 Windows 절대경로여야 함 — 상대경로는 조용히 ERR_FILE_NOT_FOUND로 실패한 전례 있음
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfPath}`,
    '--print-to-pdf-no-header',
    '--no-sandbox',
    fileUrl,
  ], { stdio: 'inherit', timeout: 120000 });

  console.log(`wrote ${pdfPath}`);
}

function main() {
  const chrome = findChrome();
  const args = process.argv.slice(2);
  const targets = args[0] === '--all'
    ? fs.readdirSync(BUILD_DIR).filter(f => f.startsWith('build_') && f.endsWith('.html'))
    : args;
  if (!targets.length) throw new Error('build/ 안의 html 파일명을 지정하거나 --all 을 사용하세요');
  targets.forEach(t => exportOne(chrome, t));
}

main();
