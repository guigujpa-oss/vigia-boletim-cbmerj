import fs from 'fs';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];

/**
 * Converte e higieniza qualquer texto para exibição limpa no WhatsApp/Telegram:
 * - Converte **negrito** para *negrito* nativo do WhatsApp.
 * - Remove marcadores markdown pesados (###, ---, |).
 */
function sanitizeForWhatsApp(rawText) {
  return rawText
    // Remove cabeçalhos markdown ###, ##, # mantendo o texto em negrito
    .replace(/^#{1,6}\s*(.*)$/gm, '*$1*')
    // Converte negrito duplo **texto** para negrito de WhatsApp *texto*
    .replace(/\*\*([^*]+)\*\*/g, '*$1*')
    // Remove linhas horizontais divisórias --- ou ___
    .replace(/^[-_]{3,}\s*$/gm, '')
    // Remove barras de tabelas se houver
    .replace(/^\||\|$/gm, '')
    // Remove espaços excessivos
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extrai cirurgicamente apenas as linhas essenciais com contexto (+/- 6 linhas).
 */
export function extractRelevantContext(pages, userName = 'Guilherme Martins Botelho') {
  const snippets = [];

  for (const page of pages) {
    if (page.pageNum <= 3) continue; // Pular sumário inicial
    if (page.text.includes('ESTATÍSTICA DE SOCORROS PRESTADOS') || page.text.includes('MÉDIA DE EVENTOS POR HORA')) {
      if (!page.text.includes('2º GMar') && !page.text.includes('Guilherme Martins')) {
        continue;
      }
    }

    const lines = page.text.split('\n');
    const matchedIdxs = [];

    lines.forEach((line, idx) => {
      if (line.includes('BOLETIM DA SEDEC') || line.includes('DGCCO/CBA X/GOA')) return;

      const hasUser = /Guilherme\s+Martins\s+Botelho|Guilherme\s+Martins/i.test(line);
      const hasGmar = /2[º°\.\s]*G(?:MAR|rupamento\s+Mar[íi]timo)/i.test(line);
      const hasCbax = /CBA[\s\-]*(?:X|10|DEZ)/i.test(line);
      const hasCsmar = /CSMAR|Salvamento\s+no\s+Mar/i.test(line);
      const hasMajorRule = /REGULAMENTO\s+DE\s+UNIFORMES|ALTERAÇÃO\s+DE\s+UNIFORME|DISTINTIVO\s+DE\s+OBM/i.test(line);

      if (hasUser || hasGmar || hasCbax || hasCsmar || hasMajorRule) {
        matchedIdxs.push(idx);
      }
    });

    if (matchedIdxs.length > 0) {
      const lineSet = new Set();
      matchedIdxs.forEach(idx => {
        const start = Math.max(0, idx - 6);
        const end = Math.min(lines.length - 1, idx + 8);
        for (let i = start; i <= end; i++) {
          lineSet.add(i);
        }
      });

      const sorted = Array.from(lineSet).sort((a, b) => a - b);
      const cleaned = sorted
        .map(i => lines[i].trim())
        .filter(l => l && !l.includes('BOLETIM DA SEDEC') && !l.includes('voltar_ao_sumário'))
        .join('\n');

      snippets.push({
        pageNum: page.pageNum,
        text: cleaned
      });
    }
  }

  // Limite máximo seguro: 9.000 caracteres
  let totalChars = 0;
  const pruned = [];
  for (const s of snippets) {
    if (totalChars + s.text.length > 9000) {
      const remaining = Math.max(0, 9000 - totalChars);
      if (remaining > 200) {
        pruned.push({ pageNum: s.pageNum, text: s.text.substring(0, remaining) });
      }
      break;
    }
    pruned.push(s);
    totalChars += s.text.length;
  }

  return pruned;
}

/**
 * Chamada com retry à Groq
 */
async function callGroqWithRetry(apiKey, payload, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 429 && attempt < maxRetries) {
      console.warn(`[AI Service] Rate limit momentâneo (429). Aguardando 15s antes de retentar tentativa ${attempt + 1}/${maxRetries}...`);
      await new Promise(r => setTimeout(r, 15000));
      continue;
    }

    const errText = await res.text();
    throw new Error(`Groq HTTP ${res.status}: ${errText}`);
  }
}

/**
 * Gera a análise de inteligência do boletim conforme as DIRETRIZES OBRIGATÓRIAS do usuário.
 */
export async function analyzeBulletinWithAI({ bulletinName, totalPages, pages, fileName = 'boletim.pdf', userName = 'Guilherme Martins Botelho' }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada no ambiente.');
  }

  const snippets = extractRelevantContext(pages, userName);

  if (snippets.length === 0) {
    return `*BOLETIM ${bulletinName}*

*1. ATENÇÃO DO COMANDO*
Nenhuma providência administrativa ou operacional identificada para o 2º GMar ou CBA X.

*2. REUNIÕES, CONVOCAÇÕES E COMPROMISSOS*
Nenhuma reunião ou convocação relevante identificada.

*3. ALTERAÇÕES RELACIONADAS AO 2º GMAR / CBA X*
Sem alterações publicadas para o efetivo da unidade.

*4. OUTROS ASSUNTOS IMPORTANTES*
Sem assuntos gerais com impacto na unidade.

*5. PRAZOS A ACOMPANHAR*
Nenhum prazo a acompanhar.`;
  }

  let formattedExtracts = '';
  for (const snip of snippets) {
    formattedExtracts += `\n[PÁGINA / FL. ${snip.pageNum}]\n${snip.text}\n`;
  }

  const systemPrompt = `Você é um assessor administrativo e operacional especializado na análise de boletins ostensivos e reservados do Corpo de Bombeiros Militar do Estado do Rio de Janeiro (CBMERJ).

Sua função é identificar, filtrar e apresentar SOMENTE as informações relevantes para o Oficial ${userName}, considerando sua atuação no 2º GMar – Barra da Tijuca, no CBA X e suas atribuições de comando.

O objetivo NÃO é reproduzir o boletim. É permitir que o usuário saiba rapidamente:
- O que aconteceu?
- O que foi determinado?
- Quem está envolvido?
- O que precisa ser feito?
- Qual é o prazo?
- Quando e onde acontecerá uma reunião, instrução, evento ou atividade?
- O que exige atenção do comando?

DIRETRIZES OBRIGATÓRIAS DE EXECUÇÃO:
1. SEJA OBJETIVO: Resumo curto, direto e sem linguiça (preferencialmente de 10 a 25 linhas no total).
- Não reproduza informações desnecessárias.
- Não repita o mesmo assunto em seções diferentes.
- Não crie introduções extensas ou conclusões genéricas.
- Não liste dezenas de militares sem relevância prática. Agrupe informações repetitivas e destaque somente as exceções e ações.
- Não invente providências, responsabilidades ou prazos.
2. REUNIÕES, EVENTOS E COMPROMISSOS – NÃO OMITIR DATAS:
Sempre que houver reunião, convocação, encontro, instrução, curso, solenidade, formatura, evento ou inspeção, extraia OBRIGATORIAMENTE:
- Atividade / Finalidade
- Data completa (dia/mês/ano)
- Horário
- Local
- Participantes
- Determinação
- Página
*Se algum dado não estiver no boletim, informe "Não especificado no boletim".
*Diferencie: data de publicação vs data do evento vs prazo de cumprimento.
3. PRAZOS E DETERMINAÇÕES:
- Diferencie rigorosamente prazo expressamente determinado no boletim de prazo anterior/vencido.
- Se não houver prazo expresso, informe "Não especificado no boletim" ou "Sem prazo definido". NUNCA invente prazos.
4. FORMATAÇÃO LIMPA PARA WHATSAPP / TELEGRAM:
- NÃO use tabelas Markdown com barras (|).
- NÃO use linhas horizontais tracejadas (---).
- Use apenas *negrito simples* (*texto*) e marcadores de hífen (-).

ESTRUTURA ESTRITA DA RESPOSTA:

*BOLETIM ${bulletinName}*

*1. ATENÇÃO DO COMANDO*
(Apresente somente os assuntos que exigem conhecimento, decisão ou providência do usuário/comando. Se não houver providências, omita esta seção)
Para cada assunto:
- *Assunto:* [Nome direto do assunto]
- *O que aconteceu:* [Resumo factual em 1-2 linhas]
- *Providência:* [Ação exigida]
- *Responsável:* [Quem precisa agir]
- *Prazo:* [Data/Prazo real publicado ou 'Não especificado no boletim']
- *Página:* [Pág. XX]

*2. REUNIÕES, CONVOCAÇÕES E COMPROMISSOS*
(Liste as atividades encontradas ou informe: "Nenhuma reunião ou convocação relevante identificada.")
Formato para cada atividade:
- *Atividade:* [Nome/finalidade]
- *Data:* [Data completa ou 'Não especificada no boletim']
- *Horário:* [Horário ou 'Não especificado no boletim']
- *Local:* [Local ou 'Não especificado no boletim']
- *Participantes:* [Militares convocados]
- *Determinação:* [Objetivo da convocação]
- *Página:* [Pág. XX]

*3. ALTERAÇÕES RELACIONADAS AO 2º GMAR / CBA X*
(Apresente movimentações, licenças, designações, inspeções de saúde com diagnóstico/pendência. NÃO repita assuntos da seção 1).

*4. OUTROS ASSUNTOS IMPORTANTES*
(Apenas assuntos gerais do CBMERJ que possam ter impacto na unidade. Se não houver, informe: "Nenhum assunto geral com impacto direto").

*5. PRAZOS A ACOMPANHAR*
(Lista cronológica objetiva de prazos reais identificados):
- DD/MM/AAAA – Assunto – Responsável – Providência.
(Se não houver prazos com data fixada, informe: "Nenhum prazo fixado identificado").`;

  const userPrompt = `Analise os seguintes extratos do boletim com rigor absoluto e gere o resumo seguindo estritamente as diretrizes e a estrutura acima:\n${formattedExtracts}`;

  const models = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[AI Service] Enviando para Groq (${model})...`);
      const data = await callGroqWithRetry(apiKey, {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2200
      });

      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (rawContent) {
        const cleaned = sanitizeForWhatsApp(rawContent);
        console.log(`[AI Service] Sucesso com modelo ${model}! (${cleaned.length} caracteres, formato estrito).`);
        return cleaned;
      }
    } catch (err) {
      console.warn(`[AI Service] Falha com ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao processar análise do boletim com a IA.');
}
