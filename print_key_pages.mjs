import fs from 'node:fs';

const fullText = fs.readFileSync('C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\texto_completo.txt', 'utf8');

const rawPages = fullText.split(/\n-- (\d+) of \d+ --\n/);
const pages = {};

for (let i = 1; i < rawPages.length; i += 2) {
  const pNum = parseInt(rawPages[i], 10);
  pages[pNum] = rawPages[i + 1];
}

const keyPages = [9, 10, 25, 26, 37, 38, 39, 40, 50, 51];

for (const k of keyPages) {
  console.log(`\n============================= PÁGINA ${k} =============================`);
  console.log(pages[k] || 'Página não encontrada');
}
