import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

async function analyzeBulletin() {
  const filePath = 'C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\ultimo_boletim.pdf';
  const dataBuffer = fs.readFileSync(filePath);

  console.log(`Lendo arquivo PDF (${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

  const parser = new PDFParse({ data: dataBuffer });
  await parser.load();
  const numPages = parser.doc.numPages;
  console.log(`PDF carregado com sucesso. Total de páginas: ${numPages}`);

  const textRes = await parser.getText();
  
  // Split into pages using "-- X of 69 --" or getPageText
  const fullText = textRes.text;
  
  // Save full raw text for reference
  fs.writeFileSync('C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\texto_completo.txt', fullText, 'utf8');

  // Let's split pages
  const pageSections = fullText.split(/\n-- (\d+) of \d+ --\n/);
  const pages = [];
  
  // pageSections[0] is header before first page or page 1
  if (pageSections.length > 1) {
    for (let i = 1; i < pageSections.length; i += 2) {
      const pageNum = parseInt(pageSections[i], 10);
      const text = pageSections[i + 1] || '';
      pages.push({ pageNum, text });
    }
  } else {
    pages.push({ pageNum: 1, text: fullText });
  }

  console.log(`Total de páginas estruturadas: ${pages.length}`);

  // Header detection
  const first3Pages = pages.slice(0, 3).map(p => p.text).join('\n');
  const numMatch = first3Pages.match(/N[º°\.\s]*([0-9]+)[,\s]+DE\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4}|\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})/i);
  
  console.log('Identificação do Boletim:');
  console.log('Match:', numMatch ? numMatch[0] : 'N/A');

  // Specific search terms per user instructions
  const searchConfigs = [
    { key: 'usuario', label: 'Guilherme Martins Botelho', regex: /Guilherme\s+Martins\s+Botelho|Guilherme\s+Martins/i },
    { key: 'gmar', label: '2º GMar / 2º Grupamento Marítimo', regex: /2[º°\.\s]*G(?:MAR|rupamento\s+Mar[íi]timo)/i },
    { key: 'cbax', label: 'CBA X', regex: /CBA[\s\-]*(?:X|10|DEZ)/i },
    { key: 'cmd1', label: 'Ten-Cel Rafael da Silva Ferreira', regex: /Rafael\s+da\s+Silva\s+Ferreira/i },
    { key: 'cmd2', label: 'Maj Diogo Fellipe Taveira Santos', regex: /Diogo\s+Fellipe\s+Taveira\s+Santos/i },
    { key: 'cmd3', label: 'Maj Ruan Carlos Gasiglia do Amaral', regex: /Ruan\s+Carlos\s+Gasiglia(?:\s+do\s+Amaral)?/i },
    { key: 'comandantes', label: 'Comandantes de Unidade / Determinações a Comandantes', regex: /Comandantes\s+de\s+Unidade|todos\s+os\s+Comandantes|aos\s+Comandantes|Comandantes,\s+Chefes\s+e\s+Diretores/i },
    { key: 'maritimo', label: 'Salvamento Marítimo / CSMAR / Praias / Mergulho', regex: /CSMAR|Salvamento\s+Mar[íi]timo|Guarda[\s\-]Vidas|QBMP\s*10|QBMP\s*08/i }
  ];

  const matches = [];

  for (const p of pages) {
    for (const sc of searchConfigs) {
      if (sc.regex.test(p.text)) {
        // Extract paragraph/context
        const lines = p.text.split('\n');
        const matchingIndices = [];
        lines.forEach((l, idx) => {
          if (sc.regex.test(l)) matchingIndices.push(idx);
        });

        // Group nearby lines into blocks
        const contexts = matchingIndices.map(idx => {
          const start = Math.max(0, idx - 4);
          const end = Math.min(lines.length, idx + 5);
          return lines.slice(start, end).join('\n');
        });

        matches.push({
          key: sc.key,
          label: sc.label,
          page: p.pageNum,
          contexts
        });
      }
    }
  }

  console.log(`\nTotal de ocorrências encontradas no boletim: ${matches.length}`);

  // Summary by key
  const grouped = {};
  for (const m of matches) {
    if (!grouped[m.key]) grouped[m.key] = [];
    grouped[m.key].push(m);
  }

  for (const [key, list] of Object.entries(grouped)) {
    console.log(`\n======================================================`);
    console.log(`[${key}] - ${list[0].label} (Encontrado em ${list.length} página(s)):`);
    for (const item of list) {
      console.log(`--- Página ${item.page} ---`);
      for (const ctx of item.contexts) {
        console.log(ctx.replace(/\s+/g, ' ').substring(0, 250));
      }
    }
  }

  fs.writeFileSync('C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\analise_matches.json', JSON.stringify({
    numPages,
    numMatch: numMatch ? numMatch[0] : null,
    grouped
  }, null, 2));

  console.log('\nAnálise salva com sucesso em analise_matches.json');
}

analyzeBulletin().catch(console.error);

