import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { parseCSV, processCSMARData, parseStudentsCatalog } from './server/parser.js';
import { parseNaturalAlteration } from './server/agentParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const SHEET_ID = '1QKbUcoVzsnmXQINu43AmGXr81zz5pxksd6rW8nEYmSU';
const CSV_PATH = path.join(__dirname, 'data', 'sheet.csv');

const STUDENTS_SHEET_ID = '13P910w8C8TxYkJgyfqe1uL_BjMYxuhNjNyFXe98appc';
const STUDENTS_CSV_PATH = path.join(__dirname, 'data', 'dados_alunos.csv');
const ALTERATIONS_PATH = path.join(__dirname, 'data', 'manual_alterations.json');

function loadManualAlterations() {
  try {
    if (fs.existsSync(ALTERATIONS_PATH)) {
      const raw = fs.readFileSync(ALTERATIONS_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[CSMAR] Erro ao ler manual_alterations.json:', err);
  }
  return [];
}

function saveManualAlterations(alterations) {
  try {
    fs.writeFileSync(ALTERATIONS_PATH, JSON.stringify(alterations, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[CSMAR] Erro ao salvar manual_alterations.json:', err);
    return false;
  }
}

app.use(cors());
app.use(express.json());

// Serve static frontend files if dist folder exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

let cachedData = null;
let lastSyncTimestamp = null;
let isSyncing = false;

/**
 * Loads CSV from disk and updates in-memory parsed data
 */
function reloadDataFromDisk() {
  try {
    let studentsCatalog = [];
    if (fs.existsSync(STUDENTS_CSV_PATH)) {
      const catalogContent = fs.readFileSync(STUDENTS_CSV_PATH, 'utf-8');
      studentsCatalog = parseStudentsCatalog(catalogContent);
    }

    const manualAlterations = loadManualAlterations();

    if (fs.existsSync(CSV_PATH)) {
      const content = fs.readFileSync(CSV_PATH, 'utf-8');
      const records = parseCSV(content);
      cachedData = processCSMARData(records, studentsCatalog, manualAlterations);
      const stat = fs.statSync(CSV_PATH);
      lastSyncTimestamp = stat.mtime.toISOString();
      console.log(`[CSMAR] Processed ${cachedData.days.length} days, ${cachedData.students.length} students and ${manualAlterations.length} manual alterations.`);
      return true;
    }
  } catch (err) {
    console.error('[CSMAR] Error reloading data from disk:', err);
  }
  return false;
}

/**
 * Executes gdrive CLI to export latest spreadsheets directly from Google Sheets
 */
function syncGoogleSheets() {
  return new Promise((resolve, reject) => {
    if (isSyncing) {
      return resolve({ status: 'already_syncing', message: 'Sincronização já em andamento.' });
    }
    isSyncing = true;
    console.log('[CSMAR] Sincronizando com Google Sheets...');

    const cmd1 = `gdrive readonly export ${SHEET_ID} "${CSV_PATH}" --format csv`;
    const cmd2 = `gdrive readonly export ${STUDENTS_SHEET_ID} "${STUDENTS_CSV_PATH}" --format csv`;

    exec(cmd1, (error, stdout, stderr) => {
      if (error) {
        isSyncing = false;
        console.error('[CSMAR] Erro na sincronização das respostas:', stderr || error.message);
        return reject({ error: stderr || error.message });
      }

      // Sync students catalog
      exec(cmd2, (err2, stdout2, stderr2) => {
        isSyncing = false;
        if (err2) {
          console.warn('[CSMAR] Aviso: Falha ao atualizar catálogo de alunos, usando cache:', stderr2 || err2.message);
        } else {
          console.log('[CSMAR] Catálogo de alunos atualizado.');
        }

        reloadDataFromDisk();
        resolve({ 
          status: 'success', 
          syncedAt: new Date().toISOString(), 
          days: cachedData?.days?.length,
          students: cachedData?.students?.length 
        });
      });
    });
  });
}

// Initial load
reloadDataFromDisk();

// Schedule periodic automatic sync every 5 minutes (300,000 ms)
setInterval(() => {
  console.log('[CSMAR] Sincronização periódica em segundo plano...');
  syncGoogleSheets().catch(err => console.error('[CSMAR] Falha no sync periódico:', err));
}, 5 * 60 * 1000);

// API Endpoints
app.get('/api/data', (req, res) => {
  if (!cachedData) {
    reloadDataFromDisk();
  }
  res.json({
    success: true,
    data: cachedData,
    lastSync: lastSyncTimestamp,
    isSyncing,
  });
});

app.post('/api/sync', async (req, res) => {
  try {
    const result = await syncGoogleSheets();
    res.json({
      success: true,
      result,
      data: cachedData,
      lastSync: lastSyncTimestamp,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.error || 'Erro ao sincronizar com Google Sheets.',
    });
  }
});

// Single student dossier endpoint
app.get('/api/student/:number', (req, res) => {
  if (!cachedData) reloadDataFromDisk();
  const num = parseInt(req.params.number, 10);
  const student = cachedData?.students?.find(s => s.number === num);
  if (!student) {
    return res.status(404).json({ success: false, message: 'Aluno não encontrado' });
  }
  res.json({ success: true, student });
});

// AI / Agent natural language parser endpoint (Free, Local, Zero external API needed)
app.post('/api/agent/parse', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ success: false, message: 'Texto não informado' });
  }
  let studentsCatalog = [];
  if (fs.existsSync(STUDENTS_CSV_PATH)) {
    studentsCatalog = parseStudentsCatalog(fs.readFileSync(STUDENTS_CSV_PATH, 'utf-8'));
  }
  const parsed = parseNaturalAlteration(text, studentsCatalog);
  res.json({ success: true, parsed });
});

// Manual Alterations endpoints
app.get('/api/alterations', (req, res) => {
  const alterations = loadManualAlterations();
  res.json({ success: true, alterations });
});

app.post('/api/alterations', (req, res) => {
  const { studentNumber, studentName, type, date, reason, rawText } = req.body;
  if (!studentNumber || !type || !reason) {
    return res.status(400).json({ success: false, message: 'Preencha o aluno, tipo e motivo da alteração' });
  }

  const list = loadManualAlterations();
  const newAlt = {
    id: `alt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    studentNumber: parseInt(studentNumber, 10),
    studentName: studentName || `Aluno ${studentNumber}`,
    type, // 'desligamento' | 'baixa_medica' | 'fo_positivo' | 'fo_negativo' | 'faxina' | 'observacao'
    date: date || new Date().toLocaleDateString('pt-BR'),
    reason: reason.trim(),
    rawText: rawText || '',
    author: 'Coordenação CSMAR',
  };

  list.push(newAlt);
  saveManualAlterations(list);
  reloadDataFromDisk();

  res.json({ success: true, alteration: newAlt, data: cachedData });
});

app.delete('/api/alterations/:id', (req, res) => {
  const { id } = req.params;
  let list = loadManualAlterations();
  const beforeCount = list.length;
  list = list.filter(a => a.id !== id);
  if (list.length === beforeCount) {
    return res.status(404).json({ success: false, message: 'Alteração não encontrada' });
  }
  saveManualAlterations(list);
  reloadDataFromDisk();
  res.json({ success: true, data: cachedData });
});

// Fallback to index.html for SPA routing if dist exists
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 [CSMAR Server] Rodando na porta http://localhost:${PORT}`);
});

