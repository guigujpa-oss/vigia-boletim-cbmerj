import fs from 'fs';
import path from 'path';

/**
 * Standard RFC-4180 CSV parser that properly handles multiline values,
 * quoted fields, and escaped quotes.
 */
export function parseCSV(text) {
  const lines = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current);
      if (row.length > 1 || row[0].trim() !== '') {
        lines.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current !== '' || row.length > 0) {
    row.push(current);
    lines.push(row);
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map(h => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    const obj = {};
    headers.forEach((h, index) => {
      obj[h] = values[index] ? values[index].trim() : '';
    });
    records.push(obj);
  }

  return records;
}

/**
 * Extracts numbers like 05, 46, 114 from text strings
 */
function extractStudentNumbers(text) {
  if (!text) return [];
  const matches = text.match(/\b\d{1,3}\b/g) || [];
  return Array.from(new Set(matches.map(n => parseInt(n, 10)))).sort((a, b) => a - b);
}

/**
 * Formats a student number with leading zero (e.g. 5 -> "05", 102 -> "102")
 */
export function formatStudentNumber(num) {
  return num < 10 ? `0${num}` : `${num}`;
}

export function parseStudentsCatalog(csvText) {
  if (!csvText) return [];
  const records = parseCSV(csvText);
  return records
    .filter(r => r['ALUNO'] && r['ALUNO'].trim() !== '')
    .map(r => {
      const num = parseInt(r['ALUNO'].trim(), 10);
      return {
        number: num,
        nomeCompleto: r['NOME COMPLETO'] ? r['NOME COMPLETO'].trim() : '',
        tipoSanguineo: (r['TIPO SANGUINEO '] || r['TIPO SANGUINEO'] || '').trim(),
        dataNascimento: (r['DATA DE NASCINEMTNO'] || r['DATA DE NASCIMENTO'] || '').trim(),
        pai: (r['NOME DO PAI'] || '').trim(),
        mae: (r['NOME DA MÃE'] || '').trim(),
        escolaridade: (r['ESCOLARIDADE'] || '').trim(),
        rg: (r['RG'] || '').trim(),
        idFuncional: (r['ID FUNCIONAL'] || '').trim(),
        cpf: (r['CPF'] || '').trim(),
        endereco: (r['ENDEREÇO'] || '').trim(),
        email: (r['EMAIL'] || '').trim(),
        celular: (r['CELULAR'] || '').trim(),
        sexo: (r['SEXO'] || '').trim(),
      };
    });
}

/**
 * Parses raw Google Sheets records into structured domain data
 */
export function processCSMARData(records, studentsCatalog = [], manualAlterations = []) {
  const days = [];
  const studentsMap = new Map();

  // Build catalog map
  const catalogMap = new Map();
  studentsCatalog.forEach(c => {
    if (c.number) {
      catalogMap.set(c.number, c);
    }
  });

  // Initialize students pool up to at least 114
  let maxCohort = 114;

  // First pass to discover highest student number
  records.forEach(row => {
    const allText = Object.values(row).join(' ');
    const nums = extractStudentNumbers(allText);
    nums.forEach(n => {
      if (n > maxCohort && n < 300) maxCohort = n;
    });
  });

  for (let i = 1; i <= maxCohort; i++) {
    const cad = catalogMap.get(i);
    studentsMap.set(i, {
      number: i,
      formattedNumber: formatStudentNumber(i),
      name: cad?.nomeCompleto || `Aluno ${formatStudentNumber(i)}`,
      cadastral: cad || null,
      tipoSanguineo: cad?.tipoSanguineo || null,
      dataNascimento: cad?.dataNascimento || null,
      celular: cad?.celular || null,
      email: cad?.email || null,
      rg: cad?.rg || null,
      idFuncional: cad?.idFuncional || null,
      cpf: cad?.cpf || null,
      endereco: cad?.endereco || null,
      filiacao: {
        pai: cad?.pai || null,
        mae: cad?.mae || null,
      },
      escolaridade: cad?.escolaridade || null,
      status: 'ativo', // 'ativo' | 'desligado'
      desligadoEm: null,
      alteracoes: [],
      foList: [],
      xerifados: [],
      faxinas: [],
    });
  }

  // Track previous desligados set to detect new dropouts per day
  let previousDesligados = new Set();

  // Process day by day chronologically
  records.forEach((row, index) => {
    const date = row['DATA'] || '';
    const timestamp = row['Carimbo de data/hora'] || '';
    const email = row['Endereço de e-mail'] || '';
    const xerifeRaw = row['XERIFE DE DIA: ALUNO...'] || '';
    const foPosRaw = row['FO + E JUSTIFICATIVA'] || '';
    const foNegRaw = row['FO - E JUSTIFICATIVA'] || '';
    const altRaw = row['ALTERAÇÕES DOS ALUNOS E JUSTIFICATIVA:'] || '';
    const desligadosRaw = row['ALUNOS DESLIGADOS DO CURSO'] || '';
    const previsaoUrl = row['PREVISÃO DAS ONDAS DO DIA - (SITE: SURFGURU NA PRAIA EM QUE ACONTECEU A INSTRUÇÃO)'] || '';
    const tamanhoOndas = row['TAMANHO DAS ONDAS ÀS 07H00 - SEGUNDO O INSTRUTOR MAIS ANTIGO DO DIA'] || 'Não informado';
    const correnteMaritima = row['CORRENTE MARÍTIMA'] || 'Não informada';
    const instrucao = row['DESCREVA A INSTRUÇÃO (Detalhadamente )'] || '';
    const ordens = row['ORDENS RECEBIDAS'] || '';
    const faxinaRaw = row['ALUNOS ESCALADOS PRA FAXINA'] || '';

    // Parse Xerife
    let xerifeNum = null;
    let xerifeName = xerifeRaw;
    const xerifeMatch = xerifeRaw.match(/^(\d{1,3})\s*[-–]\s*(.+)$/);
    if (xerifeMatch) {
      xerifeNum = parseInt(xerifeMatch[1], 10);
      xerifeName = xerifeMatch[2].trim();
    } else {
      const n = extractStudentNumbers(xerifeRaw);
      if (n.length > 0) xerifeNum = n[0];
    }

    if (xerifeNum && studentsMap.has(xerifeNum)) {
      const st = studentsMap.get(xerifeNum);
      if (xerifeName && (!st.name || st.name.startsWith('Aluno '))) {
        st.name = xerifeName;
      }
      st.xerifados.push({
        dayIndex: index + 1,
        date,
      });
    }

    // Parse Desligados
    const desligadosNums = extractStudentNumbers(desligadosRaw);
    desligadosNums.forEach(num => {
      if (studentsMap.has(num)) {
        const st = studentsMap.get(num);
        if (st.status !== 'desligado') {
          st.status = 'desligado';
          st.desligadoEm = date || `Dia ${index + 1}`;
        }
      }
    });

    // Parse Faxina
    const faxinaNums = extractStudentNumbers(faxinaRaw);
    faxinaNums.forEach(num => {
      if (studentsMap.has(num)) {
        const st = studentsMap.get(num);
        st.faxinas.push({
          dayIndex: index + 1,
          date,
        });
      }
    });

    // Parse Alterações
    const altClean = altRaw.trim();
    const hasAlteracao = altClean !== '' && !altClean.toLowerCase().includes('não há') && !altClean.toLowerCase().includes('nao ha');
    const dayAlteracoes = [];

    if (hasAlteracao) {
      // Split alterations by newline or semicolon
      const altLines = altClean.split(/\r?\n|;/).map(l => l.trim()).filter(Boolean);
      altLines.forEach(line => {
        const numsInLine = extractStudentNumbers(line);
        dayAlteracoes.push({
          text: line,
          studentNumbers: numsInLine,
        });

        numsInLine.forEach(num => {
          if (studentsMap.has(num)) {
            studentsMap.get(num).alteracoes.push({
              dayIndex: index + 1,
              date,
              description: line,
            });
          }
        });
      });
    }

    // Parse FO+ and FO-
    const cleanFO = (text) => {
      if (!text) return null;
      const lower = text.trim().toLowerCase();
      if (lower === 'não há' || lower === 'nao ha' || lower === 'não ha' || lower === 'sem alterações' || lower === 'sem alteração') {
        return null;
      }
      return text.trim();
    };

    const parsedFOPos = cleanFO(foPosRaw);
    const parsedFONeg = cleanFO(foNegRaw);

    if (parsedFOPos) {
      const nums = extractStudentNumbers(parsedFOPos);
      nums.forEach(num => {
        if (studentsMap.has(num)) {
          studentsMap.get(num).foList.push({
            dayIndex: index + 1,
            date,
            type: 'positivo',
            text: parsedFOPos,
          });
        }
      });
    }

    if (parsedFONeg) {
      const nums = extractStudentNumbers(parsedFONeg);
      nums.forEach(num => {
        if (studentsMap.has(num)) {
          studentsMap.get(num).foList.push({
            dayIndex: index + 1,
            date,
            type: 'negativo',
            text: parsedFONeg,
          });
        }
      });
    }

    // Compute newly desligados on this specific day
    const newlyDesligados = index === 0 
      ? [] 
      : desligadosNums.filter(n => !previousDesligados.has(n));
    previousDesligados = new Set(desligadosNums);
    const ativosNoDia = maxCohort - desligadosNums.length;

    // Build structured Day object
    days.push({
      id: index + 1,
      date,
      timestamp,
      email,
      xerife: {
        raw: xerifeRaw,
        number: xerifeNum,
        formattedNumber: xerifeNum ? formatStudentNumber(xerifeNum) : null,
        name: xerifeName,
      },
      foPositive: parsedFOPos,
      foNegative: parsedFONeg,
      alteracoes: {
        raw: altRaw,
        hasAlteracao,
        items: dayAlteracoes,
        affectedStudents: extractStudentNumbers(altRaw),
      },
      desligados: {
        raw: desligadosRaw,
        count: desligadosNums.length,
        numbers: desligadosNums,
        novosDesligados: newlyDesligados,
        ativosNoDia,
      },
      mar: {
        tamanhoOndas,
        corrente: correnteMaritima,
        previsaoUrl,
      },
      instrucao: {
        descricao: instrucao,
        ordens: ordens,
        cleanOrdens: cleanFO(ordens),
      },
      faxina: {
        raw: faxinaRaw,
        numbers: faxinaNums,
        count: faxinaNums.length,
      },
    });
  });

  // Apply Manual Alterations (Aditamentos da Coordenação / IA)
  manualAlterations.forEach(alt => {
    const num = alt.studentNumber;
    if (num && studentsMap.has(num)) {
      const st = studentsMap.get(num);
      st.manualAlterations = st.manualAlterations || [];
      st.manualAlterations.push(alt);

      if (alt.type === 'desligamento') {
        st.status = 'desligado';
        st.desligadoEm = alt.date;
        st.desligadoManualmente = true;
        st.desligamentoMotivo = alt.reason;

        // Also reflect on matching day if present
        const matchingDay = days.find(d => d.date === alt.date);
        if (matchingDay) {
          if (!matchingDay.desligados.numbers.includes(num)) {
            matchingDay.desligados.numbers.push(num);
            matchingDay.desligados.count = matchingDay.desligados.numbers.length;
          }
          if (!matchingDay.desligados.novosDesligados.includes(num)) {
            matchingDay.desligados.novosDesligados.push(num);
          }
        }
      } else if (alt.type === 'baixa_medica') {
        st.alteracoes.push({
          dayIndex: 'Coordenação',
          date: alt.date,
          description: `[Coordenação] ${alt.reason}`,
          isManual: true,
          id: alt.id,
        });

        const matchingDay = days.find(d => d.date === alt.date);
        if (matchingDay) {
          matchingDay.manualAlterations = matchingDay.manualAlterations || [];
          matchingDay.manualAlterations.push(alt);
        }
      } else if (alt.type === 'fo_positivo') {
        st.foList.push({
          dayIndex: 'Coordenação',
          date: alt.date,
          type: 'positivo',
          text: `[Coordenação] ${alt.reason}`,
          isManual: true,
          id: alt.id,
        });
      } else if (alt.type === 'fo_negativo') {
        st.foList.push({
          dayIndex: 'Coordenação',
          date: alt.date,
          type: 'negativo',
          text: `[Coordenação] ${alt.reason}`,
          isManual: true,
          id: alt.id,
        });
      } else if (alt.type === 'faxina') {
        st.faxinas.push({
          dayIndex: 'Coordenação',
          date: alt.date,
          isManual: true,
          id: alt.id,
        });
      }
    }
  });

  // Calculate student totals and summaries
  const studentsList = Array.from(studentsMap.values()).map(st => {
    return {
      ...st,
      totalAlteracoes: st.alteracoes.length,
      totalFO: st.foList.length,
      totalFOPos: st.foList.filter(f => f.type === 'positivo').length,
      totalFONeg: st.foList.filter(f => f.type === 'negativo').length,
      totalXerifados: st.xerifados.length,
      totalFaxinas: st.faxinas.length,
    };
  });

  // Global KPIs
  const totalAlunos = studentsList.length;
  const alunosDesligados = studentsList.filter(s => s.status === 'desligado').length;
  const alunosAtivos = totalAlunos - alunosDesligados;
  const taxaRetencao = totalAlunos > 0 ? ((alunosAtivos / totalAlunos) * 100).toFixed(1) : 0;
  const totalDias = days.length;
  const totalAlteracoes = studentsList.reduce((acc, s) => acc + s.totalAlteracoes, 0);
  const totalFOPositivos = studentsList.reduce((acc, s) => acc + s.totalFOPos, 0);
  const totalFONegativos = studentsList.reduce((acc, s) => acc + s.totalFONeg, 0);

  // Sea wave summary
  const wavesBreakdown = {};
  days.forEach(d => {
    const wave = d.mar.tamanhoOndas;
    wavesBreakdown[wave] = (wavesBreakdown[wave] || 0) + 1;
  });

  return {
    kpis: {
      totalDias,
      totalAlunos,
      alunosAtivos,
      alunosDesligados,
      taxaRetencao: `${taxaRetencao}%`,
      totalAlteracoes,
      totalFOPositivos,
      totalFONegativos,
    },
    wavesBreakdown,
    days,
    students: studentsList,
    manualAlterations,
    lastSync: new Date().toISOString(),
  };
}

