/**
 * Smart Natural Language Processor for CSMAR Operational Alterations.
 * Analyzes natural text in Portuguese and identifies actions, students, dates, and justifications.
 */

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getTodayString() {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

function getYesterdayString() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  return `${d}/${m}/${y}`;
}

export function parseNaturalAlteration(rawText, studentsCatalog = []) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const clean = rawText.trim();
  const normalized = normalizeText(clean);

  // 1. Detect Action / Type
  let type = 'observacao';
  if (/deslig|desist|saiu do curso|baixa definitiva|cancelamento/.test(normalized)) {
    type = 'desligamento';
  } else if (/fo\s*\+|\bfo\s*positivo\b|elogio|destaque|parabens/.test(normalized)) {
    type = 'fo_positivo';
  } else if (/fo\s*\-|\bfo\s*negativo\b|punicao|falta disciplinar|atraso|infracao/.test(normalized)) {
    type = 'fo_negativo';
  } else if (/faxina|limpeza|adoçamento|guarnecer/.test(normalized)) {
    type = 'faxina';
  } else if (/baixa|dor|medico|medica|hospital|licenca|luto|joelho|ombro|perna|atestado|dispensa|sindicancia/.test(normalized)) {
    type = 'baixa_medica';
  }

  // 2. Detect Student
  let studentNumber = null;
  let studentName = null;

  // Try matching numbers explicitly associated with "aluno" or standalone numbers
  const alunoNumMatch = clean.match(/(?:aluno|n[º°]|#)?\s*(\b\d{1,3}\b)/i);
  if (alunoNumMatch) {
    studentNumber = parseInt(alunoNumMatch[1], 10);
  }

  // If no number, or to complement name, search students catalog by name
  if (studentsCatalog && studentsCatalog.length > 0) {
    if (studentNumber) {
      const match = studentsCatalog.find(s => s.number === studentNumber);
      if (match) studentName = match.nomeCompleto;
    } else {
      // Try finding student by name mentioned in text
      for (const s of studentsCatalog) {
        if (s.nomeCompleto) {
          const sNorm = normalizeText(s.nomeCompleto);
          const firstLast = sNorm.split(' ');
          const firstName = firstLast[0];
          const lastName = firstLast[firstLast.length - 1];

          if (sNorm.length > 5 && normalized.includes(sNorm)) {
            studentNumber = s.number;
            studentName = s.nomeCompleto;
            break;
          } else if (firstName.length >= 4 && lastName.length >= 4 && normalized.includes(firstName) && normalized.includes(lastName)) {
            studentNumber = s.number;
            studentName = s.nomeCompleto;
            break;
          }
        }
      }
    }
  }

  // 3. Detect Date
  let date = getTodayString();
  if (/\bhoje\b/.test(normalized)) {
    date = getTodayString();
  } else if (/\bontem\b/.test(normalized)) {
    date = getYesterdayString();
  } else {
    const dateMatch = clean.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dateMatch) {
      const day = String(parseInt(dateMatch[1], 10)).padStart(2, '0');
      const month = String(parseInt(dateMatch[2], 10)).padStart(2, '0');
      const year = dateMatch[3] ? (dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]) : '2026';
      date = `${day}/${month}/${year}`;
    }
  }

  // 4. Extract Reason / Justification
  let reason = clean;
  // Clean common phrases like "o aluno 12 foi desligado por..." or "lancar baixa no aluno 12..."
  const cleanRegex = /(?:o\s+)?aluno\s+\d{1,3}\s+(?:foi\s+)?(?:desligado|baixado|de\s+baixa|de\s+licen[cç]a|recebeu\s+fo[+-]?)\s+(?:por|motivo|devido|por\s+motivo\s+de)?\s*/i;
  reason = clean.replace(cleanRegex, '').trim();
  if (!reason || reason === clean) {
    reason = clean;
  }
  // Capitalize first letter
  reason = reason.charAt(0).toUpperCase() + reason.slice(1);

  return {
    studentNumber,
    studentName: studentName || (studentNumber ? `Aluno ${studentNumber < 10 ? '0' : ''}${studentNumber}` : 'Não identificado'),
    type,
    date,
    reason,
    rawText: clean,
    confidence: studentNumber ? 'alta' : 'media',
  };
}

