import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

async function extractBulletinText() {
  const filePath = 'C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\ultimo_boletim.pdf';
  const dataBuffer = fs.readFileSync(filePath);

  console.log(`Lendo arquivo PDF (${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB)...`);

  const pages = [];
  
  // Custom pager to keep track of page numbers
  let pageNum = 1;
  function render_page(pageData) {
    let render_options = {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    };

    return pageData.getTextContent(render_options)
      .then(function(textContent) {
        let lastY, text = '';
        for (let item of textContent.items) {
          if (lastY == item.transform[5] || !lastY){
            text += item.str + ' ';
          } else {
            text += '\n' + item.str + ' ';
          }
          lastY = item.transform[5];
        }
        pages.push({ pageNum: pageNum++, text });
        return text;
      });
  }

  const options = {
    pagerender: render_page
  };

  const data = await pdf(dataBuffer, options);

  console.log(`Total de páginas extraídas: ${pages.length}`);
  console.log(`Total de caracteres: ${data.text.length}`);

  // Header info from first 2 pages
  const firstPagesText = pages.slice(0, 3).map(p => p.text).join('\n');
  const numBolMatch = firstPagesText.match(/BOLETIM\s+(?:DA\s+)?(?:SEDEC|CBMERJ|DO\s+CORPO)[^\n\d]*N[º°\.\s]*([0-9\.\-\/]+)/i) ||
                      firstPagesText.match(/BOLETIM\s+OSTENSIVO[^\n\d]*N[º°\.\s]*([0-9\.\-\/]+)/i) ||
                      firstPagesText.match(/N[º°\.\s]+([0-9]+)\s+[-–—]\s+(\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})/i);

  const dataBolMatch = firstPagesText.match(/(\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})/i) ||
                       firstPagesText.match(/RIO DE JANEIRO[^\n\d]*(\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})/i);

  console.log('--- Identificação ---');
  console.log('Número do Boletim:', numBolMatch ? numBolMatch[0] : 'Não identificado automaticamente');
  console.log('Data do Boletim:', dataBolMatch ? dataBolMatch[0] : 'Não identificada automaticamente');

  // Search terms
  const terms = [
    { label: 'Guilherme Martins Botelho', regex: /Guilherme\s+Martins\s+Botelho/i },
    { label: 'Guilherme Martins', regex: /Guilherme\s+Martins/i },
    { label: '2º GMar', regex: /2[º°\.\s]*G(?:MAR|rupamento\s+Mar[íi]timo)/i },
    { label: 'CBA X', regex: /CBA[\s\-]*(?:X|10|DEZ)/i },
    { label: 'Rafael da Silva Ferreira', regex: /Rafael\s+da\s+Silva\s+Ferreira/i },
    { label: 'Diogo Fellipe Taveira Santos', regex: /Diogo\s+Fellipe\s+Taveira\s+Santos/i },
    { label: 'Ruan Carlos Gasiglia do Amaral', regex: /Ruan\s+Carlos\s+Gasiglia(?:\s+do\s+Amaral)?/i },
    { label: 'Comandantes de Unidade', regex: /Comandantes\s+de\s+Unidade|todos\s+os\s+Comandantes|aos\s+Comandantes/i },
    { label: 'CSMAR / Salvamento Marítimo', regex: /CSMAR|Salvamento\s+Mar[íi]timo|Guarda[\s\-]Vidas/i }
  ];

  const findings = [];

  for (const page of pages) {
    for (const term of terms) {
      if (term.regex.test(page.text)) {
        // Extract matching lines
        const lines = page.text.split('\n');
        const matchingLines = lines.filter(l => term.regex.test(l));
        findings.push({
          term: term.label,
          page: page.pageNum,
          snippet: matchingLines.join(' | ').substring(0, 300),
          fullPageSnippet: page.text.substring(0, 500)
        });
      }
    }
  }

  console.log(`\nOcorrências encontradas: ${findings.length}`);
  
  // Group by term
  const grouped = {};
  for (const f of findings) {
    if (!grouped[f.term]) grouped[f.term] = [];
    grouped[f.term].push(f);
  }

  for (const [t, list] of Object.entries(grouped)) {
    console.log(`\n=================== [${t}] (${list.length} menções) ===================`);
    for (const item of list.slice(0, 5)) {
      console.log(`Página ${item.page}: ${item.snippet}`);
    }
  }

  // Save full json of findings and header info
  fs.writeFileSync('C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\findings.json', JSON.stringify({
    header: {
      firstPagesText: firstPagesText.substring(0, 1000),
      totalPages: pages.length
    },
    findings,
    grouped
  }, null, 2));

  // Also save complete pages text for detailed inspection
  fs.writeFileSync('C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\pages.json', JSON.stringify(pages));

  console.log('\nDados salvos em findings.json e pages.json com sucesso!');
}

extractBulletinText().catch(console.error);
