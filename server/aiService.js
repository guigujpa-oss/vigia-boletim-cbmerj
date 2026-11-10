import fs from 'fs';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODELS = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

/**
 * Extrai cirurgicamente apenas as linhas essenciais com contexto (+/- 6 linhas),
 * garantindo economia extrema de tokens (abaixo de 2.000 tokens) para NUNCA estourar rate limit.
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

  // Limite máximo seguro: 10.000 caracteres (~2.200 tokens)
  let totalChars = 0;
  const pruned = [];
  for (const s of snippets) {
    if (totalChars + s.text.length > 10000) {
      const remaining = Math.max(0, 10000 - totalChars);
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
 * Realiza chamada à API da Groq com retry exponencial automático em caso de 429.
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
 * Gera a análise de inteligência militar no padrão ouro do usuário.
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
Total de páginas: ${totalPages}.
Tipo de publicação: Boletim ostensivo diário.
Arquivo analisado: ${fileName}.

RESUMO EXECUTIVO
Nenhuma publicação de interesse operacional ou administrativo identificada para o 2º GMar ou CBA X neste boletim.

RELAÇÃO DIRETA COM ${userName.toUpperCase()}
Não localizei menção direta a ${userName} neste boletim.

CONCLUSÃO OBJETIVA
Nenhuma providência administrativa necessária para o 2º GMar / CBA X.`;
  }

  let formattedExtracts = '';
  for (const snip of snippets) {
    formattedExtracts += `\n--- FL. ${snip.pageNum} ---\n${snip.text}\n`;
  }

  const systemPrompt = `Você é o Oficial Ajudante e Analista Militar de Inteligência Administrativa do Corpo de Bombeiros Militar do Estado do Rio de Janeiro (CBMERJ), prestando assessoria direta ao Oficial ${userName} e ao Comando do 2º GMar (Grupamento Marítimo - Barra da Tijuca) e CBA X (Comando de Bombeiro de Área X - Capital II).

Sua missão é gerar um relatório de Estado-Maior no MODELO PADRÃO OURO militar fornecido abaixo. Seja analítico, formal, minucioso e ultra-preciso. Extraia postos, nomes completos, RGs, números de processo SEI, providências objetivas, responsáveis e prazos.

DADOS OBRIGATÓRIOS DO BOLETIM:
- Órgão: Secretaria de Estado de Defesa Civil / Corpo de Bombeiros Militar do Estado do Rio de Janeiro (SEDEC/CBMERJ)
- Número do boletim: ${bulletinName}
- Total de páginas: ${totalPages}
- Arquivo analisado: ${fileName}

ESTRUTURA ESTRITA QUE VOCÊ DEVE SEGUIR:

Análise do Boletim para ${userName} — 2º GMar / CBA X

IDENTIFICAÇÃO DO DOCUMENTO
Órgão responsável: Secretaria de Estado de Defesa Civil / Corpo de Bombeiros Militar do Estado do Rio de Janeiro (SEDEC/CBMERJ).
Número do boletim: ${bulletinName}.
Tipo de publicação: Boletim ostensivo diário.
Arquivo analisado: ${fileName}.

RESUMO EXECUTIVO
[Parágrafo corrido e executivo destacando os principais pontos para o comando do 2º GMar e CBA X, impacto no efetivo, licenças, juntas de saúde, cursos, movimentação e normas gerais].

ALERTAS PRIORITÁRIOS
• Prioridade: ALTA (ou MÉDIA / BAIXA)
  Assunto: [Nome Claro e Descritivo do Assunto]
  Quem é afetado: [Militares envolvidos com Posto/Grad, Nome e RG ou Unidade]
  Providência necessária: [Ação exata a ser tomada]
  Prazo/data: [Prazo ou 'A definir' / 'Imediato']
  Local/horário: [Local de apresentação ou cumprimento]
  Página ou referência: Página [XX]

RELAÇÃO DIRETA COM ${userName.toUpperCase()}
[Informar com exatidão se foi localizada ou não menção nominal a ${userName}].

RELAÇÃO COM O 2º GMAR
[Para CADA matéria que afete o 2º GMar, detalhar rigorosamente:]
Assunto: [Título da Matéria]
O que foi publicado: [Detalhamento do ato publicado, citando os militares, RGs, pareceres médicos, etc.]
Quem é afetado: [Militares e/ou Comando do 2º GMar]
Providência: [Providência exata a ser adotada]
Responsável: [Comandante da unidade / Oficial de Dia / Militar citado]
Situação atual: [Vigente / Aguardando calendário / Em andamento / Cumprida]
Página ou referência: Página [XX]

RELAÇÃO COM O CBA X
[Matérias relativas ao CBA X, no mesmo formato acima. Se não houver, registrar 'Nenhuma matéria direta além da rotina'].

ASSUNTOS PARA O COMANDO DA UNIDADE
[Lista com marcadores das ações e decisões que cabem especificamente ao Comandante do 2º GMar ou aos Oficiais da Unidade].

ASSUNTOS GERAIS DO CBMERJ COM POSSÍVEL IMPACTO
[Portarias, alterações de normas, cursos corporativos ou diretrizes que afetam a rotina ou a instrução continuada].

PRAZOS E DATAS IMPORTANTES
[Lista de prazos ou datas citadas nas matérias com o status: Vigente / Futura / Já transcorrida / Sem prazo definido].

ASSUNTOS SEM PROVIDÊNCIA IMEDIATA
[Matérias apenas para ciência ou arquivo].

PONTOS QUE PRECISAM DE CONFIRMAÇÃO
[Dúvidas práticas ou verificações administrativas que o oficial deve checar junto à DGS, DGP ou escalão superior].

CONCLUSÃO OBJETIVA
Identifiquei providências para o 2º GMar ou para o comando da unidade.

---

Bom dia, senhores.
Seguem, abaixo, os tópicos relacionados à unidade, extraídos do Boletim da SEDEC/CBMERJ (${bulletinName}), com a indicação das respectivas páginas:

• [Título do Tópico]
Providência: [Texto conciso da ação]
Responsável: [Responsável]
Prazo/data: [Data/Prazo]
Situação: [Status]
Local/horário: [Local]
Fonte: Boletim da SEDEC/CBMERJ (${bulletinName}), página [XX].

(Repetir para todos os tópicos de interesse da unidade)

---

RESUMO ${bulletinName}

- [Assunto 1]
  [Chave]: [Valor]
  [Chave]: [Valor]

- [Assunto 2]
  [Chave]: [Valor]
  [Chave]: [Valor]`;

  const userPrompt = `Analise com precisão militar os seguintes extratos das páginas do boletim e forneça o documento completo estruturado no modelo padrão ouro:\n${formattedExtracts}`;

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

      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        console.log(`[AI Service] Sucesso com modelo ${model}! (${content.length} caracteres).`);
        return content;
      }
    } catch (err) {
      console.warn(`[AI Service] Falha com ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao processar análise do boletim com a IA.');
}
