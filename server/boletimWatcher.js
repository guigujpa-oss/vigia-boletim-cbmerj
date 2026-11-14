import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { sendTelegramText, sendTelegramDocument } from './telegramService.js';
import { analyzeBulletinWithAI } from './aiService.js';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'last_bulletin.json');
const BOLETINS_DIR = path.join(DATA_DIR, 'boletins');
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '1088891648';

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
    } catch (e) { }
  }
  return { lastId: null, lastName: null, lastCheck: null };
}

// 1. Manter sessão viva (Keep-Alive)
export async function keepAlive() {
  const cookie = getCookie();
  if (!cookie) return;
  try {
    const res = await fetch('https://intranet.cbmerj.rj.gov.br/Dashboard', {
      signal: AbortSignal.timeout(15000),
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

// 2. Verificar novos boletins (com suporte a múltiplos boletins em ordem crescente)
export async function checkNewBulletin() {
  const cookie = getCookie();
  if (!cookie) {
    console.error('[Vigia] Cookie da Intranet não configurado!');
    return null;
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12

  const listUrl = `https://intranet.cbmerj.rj.gov.br/sistemas/boletim/index.php/boletim/boletimListagem/${currentMonth}`;
  console.log(`[Vigia] [${new Date().toLocaleTimeString()}] Verificando novos boletins em: ${listUrl}...`);

  const res = await fetch(listUrl, {
    signal: AbortSignal.timeout(25000),
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

  // Procurar todos os links de boletim: /boletim/exibirBoletim/<ID>
  const matches = [...html.matchAll(/href=['"][^'"]*\/boletim\/exibirBoletim\/(\d+)['"][^>]*>([\s\S]*?)<\/a>/gi)];

  if (matches.length === 0) {
    console.log('[Vigia] Nenhum boletim listado para este mês ou sessão expirou.');
    return null;
  }

  const allBulletins = matches.map(m => {
    const id = m[1];
    const name = m[2].replace(/<[^>]+>/g, '').trim();
    const numMatch = name.match(/BOL\s*([0-9]+)/i);
    const num = numMatch ? parseInt(numMatch[1], 10) : parseInt(id, 10);
    return { id, name, num };
  });

  const state = loadState();

  // Determinar o último número processado (ex: BOL 203)
  let lastNum = state.lastNumber;
  if (!lastNum && state.lastName) {
    const nm = state.lastName.match(/BOL\s*([0-9]+)/i);
    if (nm) lastNum = parseInt(nm[1], 10);
  }
  if (!lastNum && state.lastId === '913165') {
    lastNum = 203;
  }

  // Filtrar apenas boletins mais recentes que o último processado
  const newBulletins = allBulletins.filter(b => {
    if (lastNum && b.num) return b.num > lastNum;
    return b.id !== state.lastId;
  });

  if (newBulletins.length === 0) {
    console.log(`[Vigia] [${new Date().toLocaleTimeString('pt-BR')}] Sem novos boletins na Intranet. Último processado: ${state.lastName || 'BOL204'} (ID: ${state.lastId || '913564'}).`);
    return null;
  }

  // ORDENAÇÃO ESTRITA: Sempre em ordem crescente de número (ex: BOL 204, depois BOL 205)
  newBulletins.sort((a, b) => a.num - b.num);

  console.log(`\n🎉 [Vigia] ${newBulletins.length} NOVO(S) BOLETIM(NS) DETECTADO(S)!`);
  console.log(`Fila de envio em ordem crescente: ${newBulletins.map(b => b.name).join(' ➡️ ')}`);

  // Processar cada boletim individualmente e sequencialmente
  for (let idx = 0; idx < newBulletins.length; idx++) {
    const b = newBulletins[idx];
    console.log(`\n--- [Vigia] (${idx + 1}/${newBulletins.length}) Processando ${b.name} (ID: ${b.id}) ---`);

    // Baixar PDF do boletim
    if (!fs.existsSync(BOLETINS_DIR)) fs.mkdirSync(BOLETINS_DIR, { recursive: true });
    const pdfUrl = `https://intranet.cbmerj.rj.gov.br/sistemas/boletim/index.php/boletim/exibirBoletim/${b.id}`;
    const pdfDest = path.join(BOLETINS_DIR, `${b.name.replace(/[\s\/\\]+/g, '_')}_${b.id}.pdf`);

    console.log(`[Vigia] Baixando PDF de: ${pdfUrl}...`);
    const dlRes = await fetch(pdfUrl, {
      signal: AbortSignal.timeout(60000),
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!dlRes.ok) {
      console.error(`[Vigia] Erro ao baixar PDF do ${b.name}: ${dlRes.status}`);
      continue;
    }

    const arrayBuffer = await dlRes.arrayBuffer();
    fs.writeFileSync(pdfDest, Buffer.from(arrayBuffer));
    console.log(`[Vigia] PDF salvo com sucesso em: ${pdfDest}`);

    // Analisar com triagem contextual
    console.log(`[Vigia] Analisando conteúdo do ${b.name}...`);
    const analysis = await parseAndFilterBulletin(pdfDest, b.name);

    // Enviar para o Telegram (Texto detalhado + PDF anexo)
    console.log(`[Vigia] Enviando ${b.name} para o Telegram...`);
    await sendTelegramText(CHAT_ID, analysis);
    await sendTelegramDocument(CHAT_ID, pdfDest, `Boletim da SEDEC/CBMERJ: ${b.name}`);

    // Atualizar estado salvo com número do boletim
    saveState({
      lastId: b.id,
      lastName: b.name,
      lastNumber: b.num,
      processedAt: new Date().toISOString()
    });

    console.log(`[Vigia] ${b.name} processado e entregue com sucesso!`);

    // Pausa de 3 segundos entre envios para o Telegram entregar em ordem cronológica perfeita
    if (idx < newBulletins.length - 1) {
      console.log('[Vigia] Aguardando 3 segundos para o próximo boletim da fila...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  return newBulletins.map(b => b.id);
}

// Parser contextual e inteligente com garantia de qualidade militar via IA
export async function parseAndFilterBulletin(pdfPath, bulletinName) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  await parser.load();
  const textRes = await parser.getText();
  const fullText = textRes.text;

  // Separar páginas
  const pageSections = fullText.split(/\n-- (\d+) of \d+ --\n/);
  const pages = [];
  if (pageSections.length > 1) {
    for (let i = 1; i < pageSections.length; i += 2) {
      pages.push({ pageNum: parseInt(pageSections[i], 10), text: pageSections[i + 1] || '' });
    }
  } else {
    pages.push({ pageNum: 1, text: fullText });
  }

  // Header do boletim
  const first3 = pages.slice(0, 3).map(p => p.text).join('\n');
  const numMatch = first3.match(/N[º°\.\s]*([0-9]+)[,\s]+DE\s+([0-9]{2}\/[0-9]{2}\/[0-9]{4}|\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4})/i);
  const bolHeader = numMatch ? numMatch[0] : bulletinName;

  // 1. Tentar análise de altíssimo padrão por Inteligência Artificial (Groq / Qwen / GPT-OSS)
  try {
    console.log(`[Vigia] Gerando análise militar via IA de alta performance para ${bolHeader}...`);
    const aiAnalysis = await analyzeBulletinWithAI({
      bulletinName: bolHeader,
      totalPages: pages.length,
      pages,
      userName: 'Guilherme Martins Botelho'
    });
    if (aiAnalysis && aiAnalysis.length > 50) {
      console.log(`[Vigia] Análise por IA concluída com sucesso (${aiAnalysis.length} caracteres).`);
      return aiAnalysis;
    }
  } catch (err) {
    console.warn(`[Vigia] Erro na análise por IA (${err.message}). Gerando relatório de contingência limpo.`);
  }

  // 2. Relatório de Contingência Limpo (Zero frases truncadas, zero tabelas despedaçadas)
  const matchedPages = new Set();
  let hasUser = false;

  for (const page of pages) {
    if (page.pageNum <= 3) continue;
    if (page.text.includes('ESTATÍSTICA DE SOCORROS PRESTADOS')) continue;

    const text = page.text;
    if (/Guilherme\s+Martins\s+Botelho|Guilherme\s+Martins/i.test(text)) {
      hasUser = true;
      matchedPages.add(page.pageNum);
    }
    if (/2[º°\.\s]*G(?:MAR|rupamento\s+Mar[íi]timo)|CBA[\s\-]*(?:X|10|DEZ)|CSMAR|Salvamento\s+no\s+Mar/i.test(text)) {
      if (!text.includes('*FONTE: DGCCO/CBA X/GOA')) {
        matchedPages.add(page.pageNum);
      }
    }
  }

  const pagesList = Array.from(matchedPages).sort((a, b) => a - b);
  const pagesStr = pagesList.length > 0 ? pagesList.map(p => `Fl. ${p}`).join(', ') : 'Nenhuma página identificada';

  let contingencyReport = `*BOLETIM ${bolHeader}*\n\n`;
  contingencyReport += `*1. ATENÇÃO DO COMANDO*\n`;
  if (hasUser) {
    contingencyReport += `- *Assunto:* Publicação Nominal — Guilherme Martins Botelho\n`;
    contingencyReport += `- *O que aconteceu:* Localizada publicação nominal citando seu nome no boletim.\n`;
    contingencyReport += `- *Providência:* Leitura imediata da página indicada no PDF anexo.\n`;
    contingencyReport += `- *Página:* ${pagesStr}\n\n`;
  } else if (pagesList.length > 0) {
    contingencyReport += `- *Assunto:* Publicações de Interesse do 2º GMar / CBA X\n`;
    contingencyReport += `- *O que aconteceu:* Foram identificadas publicações citando o 2º GMar ou CBA X nas páginas: ${pagesStr}.\n`;
    contingencyReport += `- *Providência:* Consultar o PDF anexo nestas páginas para verificação integral.\n`;
    contingencyReport += `- *Página:* ${pagesStr}\n\n`;
  } else {
    contingencyReport += `Nenhuma providência administrativa ou operacional identificada para o 2º GMar ou CBA X.\n\n`;
  }

  contingencyReport += `*2. REUNIÕES, CONVOCAÇÕES E COMPROMISSOS*\n`;
  contingencyReport += `Nenhuma reunião ou convocação confirmada no modo de contingência. Verificar PDF anexo (${pagesStr}).\n\n`;

  contingencyReport += `*3. ALTERAÇÕES RELACIONADAS AO 2º GMAR / CBA X*\n`;
  contingencyReport += `Publicações de interesse registradas nas páginas: ${pagesStr}.\n\n`;

  contingencyReport += `*4. OUTROS ASSUNTOS IMPORTANTES*\n`;
  contingencyReport += `Consultar o arquivo PDF na íntegra.\n\n`;

  contingencyReport += `*5. PRAZOS A ACOMPANHAR*\n`;
  contingencyReport += `Verificar prazos regimentais diretamente nas matérias das páginas: ${pagesStr}.`;

  return contingencyReport;
}

// Iniciar vigia contínuo, execução pontual ou modo instantâneo
if (process.argv[1] && process.argv[1].endsWith('boletimWatcher.js')) {
  const args = process.argv.slice(2);
  const isOnce = args.includes('--once');

  let intervalSec = 30;
  const intervalArg = args.find(a => a.startsWith('--interval='));
  if (intervalArg) {
    intervalSec = parseInt(intervalArg.split('=')[1], 10) || 30;
  }

  let durationMin = null;
  const durationArg = args.find(a => a.startsWith('--duration='));
  if (durationArg) {
    durationMin = parseInt(durationArg.split('=')[1], 10);
  }

  console.log('======================================================');
  console.log(`🤖 ROBÔ VIGIA DE BOLETINS CBMERJ INICIADO`);
  console.log(`   Modo: ${isOnce ? 'Único (One-off)' : `Instantâneo (Checagem a cada ${intervalSec}s)`}`);
  if (durationMin) console.log(`   Duração desta sessão: ${durationMin} minutos`);
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
    (async () => {
      await keepAlive();
      await checkNewBulletin();

      let secondsElapsed = 0;
      const intervalMs = intervalSec * 1000;

      const timer = setInterval(async () => {
        secondsElapsed += intervalSec;

        if (secondsElapsed % 300 === 0) {
          await keepAlive();
        }

        try {
          await checkNewBulletin();
        } catch (err) {
          console.error('[Vigia] Erro na checagem:', err.message);
        }

        if (durationMin && secondsElapsed >= durationMin * 60) {
          console.log(`[Vigia] Tempo da sessão de ${durationMin} minutos atingido. Finalizando ciclo com sucesso.`);
          clearInterval(timer);
          process.exit(0);
        }
      }, intervalMs);
    })();
  }
}
