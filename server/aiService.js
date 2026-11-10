import fs from 'fs';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

/**
 * Extrai cirurgicamente apenas as linhas essenciais com contexto (+/- 6 linhas),
 * garantindo economia extrema de tokens para NUNCA estourar rate limit.
 */
export function extractRelevantContext(pages, userName = 'Guilherme Martins Botelho') {
  const snippets = [];

  for (const page of pages) {
    if (page.pageNum <= 3) continue; // Pular sumário
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

  // Limite máximo seguro: 9.000 caracteres (~2.000 tokens)
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
 * Limpa qualquer resquício de sintaxe markdown inadequada para WhatsApp
 */
function cleanWhatsAppText(text) {
  return text
    // Remove cabeçalhos markdown ### ou ##
    .replace(/^#{1,6}\s+/gm, '')
    // Substitui **negrito** por *negrito*
    .replace(/\*\*([^*]+)\*\*/g, '*$1*')
    // Remove linhas horizontais markdown --- ou ___
    .replace(/^[-_]{3,}\s*$/gm, '')
    // Remove tabelas markdown caso a IA tente gerar
    .replace(/\|[^\n]+\|/g, '')
    // Limpa excesso de quebras de linha consecutivas
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Gera a análise de inteligência militar 100% otimizada para WhatsApp e Telegram Mobile.
 */
export async function analyzeBulletinWithAI({ bulletinName, totalPages, pages, fileName = 'boletim.pdf', userName = 'Guilherme Martins Botelho' }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada no ambiente.');
  }

  const snippets = extractRelevantContext(pages, userName);

  if (snippets.length === 0) {
    return `Análise do Boletim para ${userName} — 2º GMar / CBA X

IDENTIFICAÇÃO DO DOCUMENTO
Órgão responsável: Secretaria de Estado de Defesa Civil / Corpo de Bombeiros Militar do Estado do Rio de Janeiro (SEDEC/CBMERJ).
Número do boletim: ${bulletinName}.
Tipo de publicação: Boletim ostensivo diário.
Arquivo analisado: ${fileName}.

RESUMO EXECUTIVO
Nenhuma publicação de interesse direto identificada para o 2º GMar ou CBA X neste boletim.

RELAÇÃO DIRETA COM ${userName.toUpperCase()}
Não localizei menção direta a ${userName} neste boletim.

CONCLUSÃO OBJETIVA
Nenhuma providência administrativa necessária para o 2º GMar / CBA X.`;
  }

  let formattedExtracts = '';
  for (const snip of snippets) {
    formattedExtracts += `\n[PÁGINA ${snip.pageNum}]\n${snip.text}\n`;
  }

  const systemPrompt = `Você é o Oficial Ajudante e Analista Militar de Inteligência Administrativa do CBMERJ, prestando assessoria ao Oficial ${userName} e ao Comando do 2º GMar / CBA X.

SUA MENSAGEM SERÁ LIDA DIRETAMENTE NO SMARTPHONE VIA WHATSAPP E TELEGRAM.
É TERMINANTEMENTE PROIBIDO:
1. NÃO use tabelas com barras verticais (| coluna 1 | coluna 2 |). Tabelas quebram totalmente e ficam ilegíveis no WhatsApp.
2. NÃO use linhas horizontais tracejadas (--- ou ___).
3. NÃO use cabeçalhos de markdown com cerquilha (### ou ##).
4. NÃO use asterisco duplo (**texto**). Para negrito no WhatsApp use apenas UM asterisco (*texto*).

ESTRUTURA EXATA PARA WHATSAPP:

Análise do Boletim para ${userName} — 2º GMar / CBA X

IDENTIFICAÇÃO DO DOCUMENTO
Órgão responsável: Secretaria de Estado de Defesa Civil / Corpo de Bombeiros Militar do Estado do Rio de Janeiro (SEDEC/CBMERJ).
Número do boletim: ${bulletinName}.
Tipo de publicação: Boletim ostensivo diário.
Arquivo analisado: ${fileName}.

RESUMO EXECUTIVO
[Parágrafo corrido e objetivo destacando os principais tópicos do boletim de impacto para o 2º GMar e CBA X].

ALERTAS PRIORITÁRIOS
• Prioridade: ALTA (ou MÉDIA / BAIXA)
  Assunto: [Nome do Assunto]
  Quem é afetado: [Militares com Posto/Grad, Nome e RG]
  Providência necessária: [Ação objetiva]
  Prazo/data: [Prazo ou Imediato / A definir]
  Local/horário: [Local]
  Página ou referência: Página [XX]

RELAÇÃO DIRETA COM ${userName.toUpperCase()}
[Informar se foi localizada ou não menção nominal a ${userName}].

RELAÇÃO COM O 2º GMAR
Assunto: [Título da Matéria]
O que foi publicado: [Texto detalhado citando militares e números]
Quem é afetado: [Militares e unidade]
Providência: [Ação exata]
Responsável: [Responsável]
Situação atual: [Vigente / Aguardando calendário / Em andamento]
Página ou referência: Página [XX]

RELAÇÃO COM O CBA X
[Mesmo formato acima para matérias do CBA X].

ASSUNTOS PARA O COMANDO DA UNIDADE
• [Ação 1]
• [Ação 2]

ASSUNTOS GERAIS DO CBMERJ COM POSSÍVEL IMPACTO
[Portarias gerais, alterações de normas, etc.]

PRAZOS E DATAS IMPORTANTES
• [Data/Período]: [Assunto] (Situação: Vigente / Futura)

ASSUNTOS SEM PROVIDÊNCIA IMEDIATA
• [Matérias apenas para ciência ou arquivo]

PONTOS QUE PRECISAM DE CONFIRMAÇÃO
• [Verificações com DGS, DGP ou escalão superior]

CONCLUSÃO OBJETIVA
Identifiquei providências para o 2º GMar ou para o comando da unidade.

Bom dia, senhores.
Seguem, abaixo, os tópicos relacionados à unidade, extraídos do Boletim SEDEC/CBMERJ ${bulletinName}, com a indicação das respectivas páginas:

• [Título da Matéria]
Providência: [Ação concisa]
Responsável: [Responsável]
Prazo/data: [Data]
Situação: [Status]
Local/horário: [Local]
Fonte: Boletim SEDEC/CBMERJ ${bulletinName}, página [XX].

RESUMO ${bulletinName}
- [Tópico 1]: [Resumo direto em 1 linha]
- [Tópico 2]: [Resumo direto em 1 linha]`;

  const userPrompt = `Analise com extremo rigor militar os extratos e gere o relatório estritamente no formato de texto limpo para WhatsApp:\n${formattedExtracts}`;

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
        max_tokens: 2800
      });

      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (rawContent) {
        const cleaned = cleanWhatsAppText(rawContent);
        console.log(`[AI Service] Sucesso com modelo ${model}! (${cleaned.length} caracteres prontos para WhatsApp).`);
        return cleaned;
      }
    } catch (err) {
      console.warn(`[AI Service] Falha com ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao processar análise do boletim com a IA.');
}
