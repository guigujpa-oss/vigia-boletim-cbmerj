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
    console.log(`[Vigia] Sem novidades. Último boletim processado continua sendo: ${state.lastName || 'BOL203'} (ID: ${state.lastId || '913165'})`);
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
    if (aiAnalysis && aiAnalysis.length > 100) {
      console.log(`[Vigia] Análise por IA concluída com sucesso (${aiAnalysis.length} caracteres).`);
      return aiAnalysis;
    }
  } catch (err) {
    console.warn(`[Vigia] Aviso: Análise por IA indisponível ou com erro (${err.message}). Utilizando parser de contingência.`);
  }

  // 2. Parser de Contingência Heurístico (Caso a API de IA esteja indisponível)
  const rawMatters = [];

  for (const page of pages) {
    // 1. Ignorar páginas de sumário/índice (1 a 3 com linhas pontilhadas)
    if (page.pageNum <= 3) continue;

    // 2. Ignorar páginas e tabelas de estatísticas diárias de socorro
    if (page.text.includes('ESTATÍSTICA DE SOCORROS PRESTADOS') || page.text.includes('MÉDIA DE EVENTOS POR HORA') || page.text.includes('TOTAL DE EVENTOS ACUMULADOS')) {
      continue;
    }

    const lines = page.text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Descartar linhas de cabeçalho padrão, rodapés estatísticos e fontes genéricas
      if (!line || line.startsWith('BOLETIM DA SEDEC') || line.includes('*FONTE:') || line.includes('DGCCO/CBA X/GOA') || line.startsWith('FL.') || line.includes('Corpo de Bombeiros Militar do Estado')) {
        continue;
      }

      const hasUser = /Guilherme\s+Martins\s+Botelho|Guilherme\s+Martins/i.test(line);
      const hasGmar = /2[º°\.\s]*G(?:MAR|rupamento\s+Mar[íi]timo)/i.test(line);
      const hasCbax = /CBA[\s\-]*(?:X|10|DEZ)/i.test(line);
      const hasCmd = /Rafael\s+da\s+Silva\s+Ferreira|Diogo\s+Fellipe\s+Taveira|Ruan\s+Carlos\s+Gasiglia/i.test(line);
      const hasCsmar = /CSMAR|Curso\s+de\s+Salvamento\s+no\s+Mar/i.test(line);

      if (hasUser || hasGmar || hasCbax || hasCmd || (hasCsmar && page.pageNum > 3)) {
        // Limpar ruídos da Intranet e do texto
        let cleanLine = line.replace(/voltar_ao_sum[aá]rio/gi, '').trim();
        
        // Encontrar título da matéria / nota olhando para trás
        let title = '';
        for (let k = i; k >= Math.max(0, i - 25); k--) {
          const l = lines[k].replace(/voltar_ao_sum[aá]rio/gi, '').trim();
          if (/^(?:[0-9]+\.|\bEDITAL\b|\bNOTA\b|\bPORTARIA\b|[I|V|X]+\s*[-–]|\bANEXO\b|[A-ZÇÃÕ\s]{6,})/i.test(l) && l.length > 5 && l.length < 130 && !l.includes('BOLETIM DA SEDEC')) {
            title = l;
            break;
          }
        }

        // Títulos claros e semânticos se o cabeçalho for genérico
        if (!title || title.length < 8 || title.includes('TORNA PÚBLICA')) {
          if (hasCsmar || /CSMAR|Salvamento\s+no\s+Mar/i.test(cleanLine)) {
            title = 'Edital do Curso de Salvamento no Mar (CSMar)';
          } else if (/movimenta|transfer|apresenta|classifica|designa/i.test(cleanLine)) {
            title = 'Movimentação / Transferência de Militares';
          } else if (/escala|apoio|evento|riocentro|wrc/i.test(cleanLine)) {
            title = 'Emprego Operacional / Escalação de Meios e Efetivo';
          } else if (hasUser) {
            title = 'Publicação Nominal — Guilherme Martins Botelho';
          } else if (hasGmar) {
            title = 'Nota de Interesse do 2º GMar (Barra da Tijuca)';
          } else {
            title = 'Determinação / Nota de Interesse do CBA X';
          }
        }

        // Capturar contexto completo do parágrafo
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 9);
        const contextLines = lines.slice(start, end)
          .map(l => l.replace(/voltar_ao_sum[aá]rio/gi, '').trim())
          .filter(l => l.length > 0 && !l.startsWith('BOLETIM DA SEDEC') && !l.includes('*FONTE:') && !l.startsWith('FL.'));

        const snippet = contextLines.join(' ').replace(/\s{2,}/g, ' ');

        // Garantir qualidade mínima: o trecho precisa ter pelo menos 40 caracteres e conteúdo substantivo
        if (snippet.length >= 40 && !snippet.includes('*FONTE: DGCCO')) {
          rawMatters.push({
            page: page.pageNum,
            isUser: hasUser,
            isGmar: hasGmar,
            isCbax: hasCbax,
            isCmd: hasCmd,
            title: title.replace(/[_]{2,}/g, '').trim(),
            snippet: snippet
          });

          i += 10; // Pular para evitar pegar múltiplos fragmentos da mesma nota
        }
      }
    }
  }

  // Agrupar matérias para eliminar repetições na mesma página ou tema contíguo
  const distinctMatters = [];
  for (const m of rawMatters) {
    const isDuplicate = distinctMatters.some(d => {
      const samePage = d.page === m.page;
      const sameTheme = (d.title.includes('CSMar') && m.title.includes('CSMar')) || (d.title.includes('Movimentação') && m.title.includes('Movimentação'));
      return samePage || (sameTheme && Math.abs(d.page - m.page) <= 2);
    });

    if (!isDuplicate) {
      distinctMatters.push(m);
    }
  }

  // Ordenar priorizando publicações nominais primeiro, depois GMar e CBA X
  distinctMatters.sort((a, b) => {
    if (a.isUser && !b.isUser) return -1;
    if (!a.isUser && b.isUser) return 1;
    return a.page - b.page;
  });

  // Montar Relatório Executivo Estruturado
  let report = `Análise do Boletim para Guilherme Martins Botelho — 2º GMar / CBA X\n\n`;
  report += `1. IDENTIFICAÇÃO DO DOCUMENTO\n• Órgão: SEDEC / CBMERJ\n• Boletim: ${bolHeader}\n• Total de Páginas: ${pages.length}\n\n`;

  const userMentions = distinctMatters.filter(m => m.isUser);

  if (distinctMatters.length === 0) {
    report += `2. RESUMO EXECUTIVO\nNão foram identificadas publicações ou ordens diretamente relacionadas a Guilherme Martins Botelho, ao 2º GMar ou ao CBA X neste boletim.\n\n`;
    report += `MENSAGEM PRONTA PARA ENCAMINHAMENTO:\n\nBom dia, senhores.\n\nNão identifiquei, neste boletim (${bolHeader}), tópicos diretamente relacionados a Guilherme Martins Botelho, ao 2º GMar, ao CBA X ou ao comando da unidade.`;
    return report;
  }

  report += `2. RESUMO EXECUTIVO\n`;
  if (userMentions.length > 0) {
    report += `🚨 ATENÇÃO: Identificada publicação nominal referente a Guilherme Martins Botelho (Fl. ${userMentions.map(u => u.page).join(', ')}).\n`;
  } else {
    report += `• Publicação Nominal: Não há menção nominal a Guilherme Martins Botelho.\n`;
  }
  report += `• Unidade / Comando: Foram localizadas ${distinctMatters.length} matérias de interesse operacional e administrativo para o 2º GMar / CBA X.\n\n`;

  report += `3. ALERTAS PRIORITÁRIOS E DETALHAMENTO:\n`;
  for (const m of distinctMatters.slice(0, 5)) {
    const tag = m.isUser ? '🚨 PRIORIDADE MÁXIMA' : '⚠️ PRIORIDADE ALTA';
    report += `${tag} | Fl. ${m.page}\n• Matéria: ${m.title}\n• Providência / Resumo: ${m.snippet.substring(0, 320)}...\n\n`;
  }

  report += `---\n\nMENSAGEM PRONTA PARA ENCAMINHAMENTO:\n\nBom dia, senhores.\n\nSeguem, abaixo, os tópicos relacionados à unidade, extraídos do Boletim da SEDEC/CBMERJ (${bolHeader}), com a indicação das respectivas páginas:\n\n`;

  for (const m of distinctMatters.slice(0, 5)) {
    report += `• [${m.title}]\n  - Providência / Resumo: ${m.snippet.substring(0, 260)}...\n  - Fonte: Boletim da SEDEC/CBMERJ, página ${m.page}.\n\n`;
  }

  return report;
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
