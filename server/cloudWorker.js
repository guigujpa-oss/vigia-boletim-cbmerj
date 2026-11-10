import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNewBulletin, keepAlive } from './boletimWatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const INTERVAL_SEC = parseInt(process.env.CHECK_INTERVAL_SEC || '30', 10);
const DATA_DIR = path.join(__dirname, '..', 'data');
const STATE_FILE = path.join(DATA_DIR, 'last_bulletin.json');

let isChecking = false;
let lastCheckTime = null;
let lastStatus = 'Iniciando';
let stats = {
  totalChecks: 0,
  bulletinsFound: 0,
  errors: 0,
  startedAt: new Date().toISOString()
};

// 1. Sincronizar estado inicial com o repositório GitHub caso o arquivo local não exista
async function syncInitialState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      const local = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (local && local.lastNumber) {
        console.log(`[CloudWorker] Estado local carregado: Último = BOL ${local.lastNumber} (${local.lastName})`);
        return;
      }
    } catch (e) {}
  }

  // Se não existir localmente (ex: novo container no Render), puxar do GitHub
  const rawUrl = 'https://raw.githubusercontent.com/guigujpa-oss/vigia-boletim-cbmerj/main/data/last_bulletin.json';
  try {
    console.log(`[CloudWorker] Sincronizando último estado do GitHub: ${rawUrl}...`);
    const res = await fetch(rawUrl);
    if (res.ok) {
      const data = await res.json();
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[CloudWorker] Estado sincronizado com sucesso: Último = BOL ${data.lastNumber} (${data.lastName})`);
    }
  } catch (err) {
    console.warn('[CloudWorker] Não foi possível sincronizar do GitHub, iniciando com estado padrão:', err.message);
  }
}

// 2. Loop de verificação blindado contra travamentos
async function runCheckLoop() {
  if (isChecking) {
    console.log(`[CloudWorker] [${new Date().toLocaleTimeString()}] Checagem anterior ainda em andamento, aguardando...`);
    return;
  }
  isChecking = true;
  lastCheckTime = new Date().toISOString();
  stats.totalChecks++;

  try {
    // Timeout rígido de 50 segundos para nunca travar a promise
    const checkPromise = checkNewBulletin();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout de 50s excedido na checagem')), 50000)
    );

    const res = await Promise.race([checkPromise, timeoutPromise]);
    if (res && res.length > 0) {
      stats.bulletinsFound += res.length;
      lastStatus = `Detectado(s) ${res.length} novo(s) boletim(ns) em ${lastCheckTime}`;
    } else {
      lastStatus = `Sem novos boletins. Última checagem: ${new Date().toLocaleTimeString()}`;
    }
  } catch (err) {
    stats.errors++;
    lastStatus = `Erro na checagem: ${err.message}`;
    console.error(`[CloudWorker] [${new Date().toLocaleTimeString()}] Erro na verificação:`, err.message);
  } finally {
    isChecking = false;
  }
}

// 3. Servidor HTTP para Health Checks (Render / Koyeb / UptimeRobot)
const server = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  if (req.url === '/check') {
    runCheckLoop().catch(console.error);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Verificação disparada manualmente!', time: new Date().toISOString() }));
    return;
  }

  // Rota principal /
  let currentState = {};
  if (fs.existsSync(STATE_FILE)) {
    try {
      currentState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {}
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Vigia Boletim CBMERJ 24/7 - Nuvem</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; max-width: 700px; margin: auto; }
    .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; margin-bottom: 1rem; }
    h1 { color: #38bdf8; font-size: 1.5rem; margin-top: 0; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.85rem; background: #22c55e; color: #052e16; }
    .metric { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #334155; }
    .metric:last-child { border-bottom: none; }
    .value { font-weight: bold; color: #e2e8f0; }
    .btn { display: inline-block; background: #0284c7; color: white; padding: 0.6rem 1.2rem; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 1rem; }
    .btn:hover { background: #0369a1; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h1>🤖 Vigia Boletim CBMERJ 24/7</h1>
      <span class="badge">ONLINE 24/7</span>
    </div>
    <p>Serviço de monitoramento contínuo em nuvem para o 2º GMar / CBA X.</p>
    
    <div class="metric">
      <span>Status da Verificação:</span>
      <span class="value">${lastStatus}</span>
    </div>
    <div class="metric">
      <span>Último Boletim Entregue:</span>
      <span class="value">${currentState.lastName || 'BOL204'} (Nº ${currentState.lastNumber || 204})</span>
    </div>
    <div class="metric">
      <span>Intervalo de Checagem:</span>
      <span class="value">A cada ${INTERVAL_SEC} segundos</span>
    </div>
    <div class="metric">
      <span>Total de Checagens Realizadas:</span>
      <span class="value">${stats.totalChecks}</span>
    </div>
    <div class="metric">
      <span>Iniciado em:</span>
      <span class="value">${new Date(stats.startedAt).toLocaleString('pt-BR')}</span>
    </div>

    <a href="/check" class="btn">Forçar Checagem Agora</a>
  </div>
</body>
</html>
  `;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});

// 4. Iniciar Serviço
async function start() {
  await syncInitialState();

  server.listen(PORT, () => {
    console.log('======================================================');
    console.log(`🚀 [CloudWorker] Vigia Boletim CBMERJ 24/7 ATIVO`);
    console.log(`   Porta HTTP: ${PORT}`);
    console.log(`   Intervalo: a cada ${INTERVAL_SEC} segundos contínuos`);
    console.log('======================================================');
  });

  // Primeira checagem imediata
  await keepAlive();
  await runCheckLoop();

  // Loop a cada X segundos
  setInterval(async () => {
    await runCheckLoop();
  }, INTERVAL_SEC * 1000);

  // Keep-alive a cada 5 minutos
  setInterval(async () => {
    await keepAlive();
  }, 5 * 60 * 1000);

  // Auto-ping para evitar hibernação no Render (a cada 4 minutos)
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
  if (selfUrl) {
    console.log(`[CloudWorker] Auto-ping ativado para: ${selfUrl}`);
    setInterval(async () => {
      try {
        await fetch(`${selfUrl}/health`);
        console.log(`[CloudWorker] Auto-ping executado em ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        console.warn('[CloudWorker] Falha no auto-ping:', err.message);
      }
    }, 4 * 60 * 1000);
  }
}

start().catch(console.error);

