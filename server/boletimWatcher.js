import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sendTelegramText, sendTelegramDocument } from './telegramService.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'last_bulletin.json');
const BOLETINS_DIR = path.join(DATA_DIR, 'boletins');
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1088891648';

// Cookie da sessão da Intranet CBMERJ (persistido / atualizável via env ou arquivo)
const COOKIE_FILE = path.join(DATA_DIR, 'intranet_cookie.txt');

function getCookie() {
  if (process.env.INTRANET_COOKIE) return process.env.INTRANET_COOKIE;
  if (fs.existsSync(COOKIE_FILE)) {
    return fs.readFileSync(COOKIE_FILE, 'utf8').trim();
  }
  return '';
}

function saveState(state) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {}
  }
  return { lastId: null, lastName: null, lastCheck: null };
}

// 1. Manter sessão viva (Keep-Alive)
export async function keepAlive() {
  const cookie = getCookie();
  if (!cookie) return;
  try {
    const res = await fetch('https://intranet.cbmerj.rj.gov.br/Dashboard', {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log(`[Keep-Alive] Ping executado: status ${res.status} em ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error('[Keep-Alive] Erro no ping:', err.message);
  }
}

// 2. Verificar novo boletim
export async function checkNewBulletin() {
  const cookie = getCookie();
  if (!cookie) {
    console.error('[Vigia] Cookie da Intranet não configurado!');
    return null;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12

  const listUrl = `https://intranet.cbmerj.rj.gov.br/sistemas/boletim/index.php/boletim/boletimListagem/${currentMonth}`;
  console.log(`[Vigia] Verificando novos boletins em: ${listUrl}...`);

  const res = await fetch(listUrl, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!res.ok) {
    console.error(`[Vigia] Falha ao consultar lista de boletins: HTTP ${res.status}`);
    return null;
  }

  const html = await res.text();

  // Find all boletim links: /boletim/exibirBoletim/<ID>
  const matches = [...html.matchAll(/href=['"][^'"]*\/boletim\/exibirBoletim\/(\d+)['"][^>]*>([\s\S]*?)<\/a>/gi)];

  if (matches.length === 0) {
    console.log('[Vigia] Nenhum boletim listado para este mês ou sessão expirou.');
    return null;
  }

  // First item is the latest
  const latestMatch = matches[0];
  const bulletinId = latestMatch[1];
  const bulletinName = latestMatch[2].replace(/<[^>]+>/g, '').trim();

  const state = loadState();

  if (state.lastId === bulletinId) {
    console.log(`[Vigia] Sem novidades. Último boletim processado continua sendo: ${bulletinName} (ID: ${bulletinId})`);
    return null;
  }

  console.log(`\n🎉 [Vigia] NOVO BOLETIM DETECTADO!`);
  console.log(`Nome: ${bulletinName} | ID: ${bulletinId}`);

  // 3. Baixar PDF do novo boletim
  if (!fs.existsSync(BOLETINS_DIR)) fs.mkdirSync(BOLETINS_DIR, { recursive: true });
  const pdfUrl = `https://intranet.cbmerj.rj.gov.br/sistemas/boletim/index.php/boletim/exibirBoletim/${bulletinId}`;
  const pdfDest = path.join(BOLETINS_DIR, `${bulletinName.replace(/[\s\/\\]+/g, '_')}_${bulletinId}.pdf`);

  console.log(`[Vigia] Baixando PDF de: ${pdfUrl}...`);
  const dlRes = await fetch(pdfUrl, {
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!dlRes.ok) {
    console.error(`[Vigia] Erro ao baixar PDF: ${dlRes.status}`);
    return null;
  }

  const arrayBuffer = await dlRes.arrayBuffer();
  fs.writeFileSync(pdfDest, Buffer.from(arrayBuffer));
  console.log(`[Vigia] PDF salvo com sucesso em: ${pdfDest}`);

  // 4. Analisar e Extrair Texto
  console.log('[Vigia] Extraindo e analisando conteúdo...');
  const analysis = await parseAndFilterBulletin(pdfDest, bulletinName);

  // 5. Enviar para o Telegram
  console.log('[Vigia] Enviando relatório e PDF para o Telegram...');
  await sendTelegramText(CHAT_ID, analysis);
  await sendTelegramDocument(CHAT_ID, pdfDest, `Boletim CBMERJ: ${bulletinName}`);

  // 6. Atualizar estado salvo
  saveState({
    lastId: bulletinId,
    lastName: bulletinName,
    processedAt: new Date().toISOString()
  });

  console.log(`[Vigia] Concluído com sucesso para ${bulletinName}!`);
  return bulletinId;
}

// Lógica de parser e filtros conforme as instruções do usuário
async function parseAndFilterBulletin(pdfPath, bulletinName) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  await parser.load();
  const textRes = await parser.getText();
  const fullText = textRes.text;

  // Split into pages
  const pageSections = fullText.split(/\n-- (\d+) of \d+ --\n/);
  const pages = [];
  if (pageSections.length > 1) {
    for (let i = 1; i < pageSections.length; i += 2) {
      pages.push({ pageNum: parseInt(pageSections[i], 10), text: pageSections[i + 1] || '' });
    }
  } else {
    pages.push({ pageNum: 1, text: fullText });
  }

  // Header
  const first3 = pages.slice(0, 3).map(p => p.text).join('\n');
  const numMatch = first3.match(/N[º°\.\s]*([0-9]+)[,\s]+DE\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4}|\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})/i);
  const bolHeader = numMatch ? numMatch[0] : bulletinName;

  // Search terms
  const terms = [
    { key: 'usuario', label: 'Guilherme Martins Botelho', regex: /Guilherme\s+Martins\s+Botelho|Guilherme\s+Martins/i },
    { key: 'gmar', label: '2º GMar', regex: /2[º°\.\s]*G(?:MAR|rupamento\s+Mar[íi]timo)/i },
    { key: 'cbax', label: 'CBA X', regex: /CBA[\s\-]*(?:X|10|DEZ)/i },
    { key: 'cmd1', label: 'Rafael da Silva Ferreira', regex: /Rafael\s+da\s+Silva\s+Ferreira/i },
    { key: 'cmd2', label: 'Diogo Fellipe Taveira Santos', regex: /Diogo\s+Fellipe\s+Taveira\s+Santos/i },
    { key: 'cmd3', label: 'Ruan Carlos Gasiglia do Amaral', regex: /Ruan\s+Carlos\s+Gasiglia/i },
    { key: 'maritimo', label: 'Salvamento Marítimo / CSMAR / Praias', regex: /CSMAR|Salvamento\s+Mar[íi]timo|Guarda[\s\-]Vidas/i }
  ];

  const occurrences = [];
  for (const p of pages) {
    for (const t of terms) {
      if (t.regex.test(p.text)) {
        const lines = p.text.split('\n').filter(l => t.regex.test(l));
        occurrences.push({ key: t.key, label: t.label, page: p.pageNum, snippet: lines.join(' | ').substring(0, 200) });
      }
    }
  }

  // Build formatted report
  let report = `Análise do Boletim para Guilherme Martins Botelho — 2º GMar / CBA X\n\n`;
  report += `1. IDENTIFICAÇÃO DO DOCUMENTO\n• Órgão: SEDEC / CBMERJ\n• Boletim: ${bolHeader}\n• Total de Páginas: ${pages.length}\n\n`;

  const gmarOccs = occurrences.filter(o => o.key === 'gmar' || o.key === 'cbax' || o.key === 'usuario');

  if (gmarOccs.length === 0) {
    report += `2. RESUMO EXECUTIVO\nNão foram identificadas publicações ou ordens diretamente relacionadas a Guilherme Martins Botelho, ao 2º GMar ou ao CBA X neste boletim.\n\n`;
    report += `MENSAGEM PRONTA PARA ENCAMINHAMENTO:\n\nBom dia, senhores.\n\nNão identifiquei, neste boletim, tópicos diretamente relacionados a Guilherme Martins Botelho, ao 2º GMar, ao CBA X ou ao comando da unidade.`;
    return report;
  }

  report += `2. RESUMO EXECUTIVO\nForam localizadas ${gmarOccs.length} menções de interesse ao 2º GMar / CBA X no ${bolHeader}, abrangendo notas e atos com impacto operacional e administrativo.\n\n`;

  report += `3. ALERTAS PRIORITÁRIOS:\n`;
  for (const o of occurrences.slice(0, 6)) {
    report += `• [Pág. ${o.page}] ${o.label}: ${o.snippet}\n`;
  }

  report += `\n---\n\nMENSAGEM PRONTA PARA ENCAMINHAMENTO:\n\nBom dia, senhores.\n\nSeguem, abaixo, os tópicos relacionados à unidade, extraídos do Boletim da SEDEC/CBMERJ (${bolHeader}), com a indicação das respectivas páginas:\n\n`;

  for (const o of gmarOccs.slice(0, 5)) {
    report += `• [${o.label}]\n  - Assunto / Trecho: ${o.snippet}\n  - Fonte: Boletim da SEDEC/CBMERJ, página ${o.page}.\n\n`;
  }

  return report;
}

// Iniciar vigia contínuo ou execução pontual (CI / GitHub Actions)
if (process.argv[1] && process.argv[1].endsWith('boletimWatcher.js')) {
  const isOnce = process.argv.includes('--once') || process.env.GITHUB_ACTIONS === 'true';

  console.log('======================================================');
  console.log(`🤖 ROBÔ VIGIA DE BOLETINS CBMERJ INICIADO [Modo: ${isOnce ? 'Único / CI' : '24/7 Loop'}]`);
  console.log('======================================================');

  if (isOnce) {
    (async () => {
      try {
        await keepAlive();
        await checkNewBulletin();
        console.log('[Vigia] Execução pontual concluída com sucesso.');
        process.exit(0);
      } catch (err) {
        console.error('[Vigia] Erro fatal durante a execução:', err);
        process.exit(1);
      }
    })();
  } else {
    // Primeira checagem imediata
    keepAlive();
    checkNewBulletin();

    // Loop a cada 10 minutos (600.000 ms)
    setInterval(async () => {
      await keepAlive();
      await checkNewBulletin();
    }, 10 * 60 * 1000);
  }
}

