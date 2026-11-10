import fs from 'fs';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
// qwen3.8-27b tem alto limite de tokens e responde com extrema precisão formal militar em < 1s
const PRIMARY_MODEL = 'qwen/qwen3.8-27b';
const FALLBACK_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

/**
 * Filtra e extrai apenas as janelas de texto relevantes das páginas,
 * eliminando ruídos e garantindo que o contexto caiba com perfeição na janela de contexto da IA.
 */
export function extractRelevantContext(pages, userName = 'Guilherme Martins Botelho') {
  const relevantSnippets = [];

  for (const page of pages) {
    if (page.pageNum <= 3) continue; // Pular sumário inicial
    if (page.text.includes('ESTATÍSTICA DE SOCORROS PRESTADOS') || page.text.includes('MÉDIA DE EVENTOS POR HORA')) {
      continue; // Pular estatísticas gerais
    }

    const lines = page.text.split('\n');
    const matchedLineIdxs = [];

    lines.forEach((line, idx) => {
      const isHeader = line.includes('BOLETIM DA SEDEC') || line.includes('*FONTE:') || line.includes('DGCCO/CBA X/GOA');
      if (isHeader) return;

      const hasUser = /Guilherme\s+Martins\s+Botelho|Guilherme\s+Martins/i.test(line);
      const hasGmar = /2[º°\.\s]*G(?:MAR|rupamento\s+Mar[íi]timo)/i.test(line);
      const hasCbax = /CBA[\s\-]*(?:X|10|DEZ)/i.test(line);
      const hasCsmar = /CSMAR|Salvamento\s+no\s+Mar/i.test(line);

      if (hasUser || hasGmar || hasCbax || hasCsmar) {
        matchedLineIdxs.push(idx);
      }
    });

    if (matchedLineIdxs.length > 0) {
      // Coletar janela de contexto (+/- 12 linhas)
      const lineSet = new Set();
      matchedLineIdxs.forEach(idx => {
        const start = Math.max(0, idx - 12);
        const end = Math.min(lines.length - 1, idx + 14);
        for (let i = start; i <= end; i++) {
          lineSet.add(i);
        }
      });

      const sortedIndices = Array.from(lineSet).sort((a, b) => a - b);
      const cleanedText = sortedIndices
        .map(i => lines[i].trim())
        .filter(l => l && !l.includes('BOLETIM DA SEDEC') && !l.includes('DGCCO/CBA X/GOA') && !l.includes('voltar_ao_sumário'))
        .join('\n');

      relevantSnippets.push({
        pageNum: page.pageNum,
        text: cleanedText
      });
    }
  }

  return relevantSnippets;
}

/**
 * Gera a análise de inteligência do boletim utilizando o modelo de IA da Groq.
 */
export async function analyzeBulletinWithAI({ bulletinName, totalPages, pages, userName = 'Guilherme Martins Botelho' }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY não configurada no ambiente.');
  }

  // Extrair janelas contextuais focadas
  const snippets = extractRelevantContext(pages, userName);

  if (snippets.length === 0) {
    return `Análise do Boletim para ${userName} — 2º GMar / CBA X

1. IDENTIFICAÇÃO DO DOCUMENTO
• Órgão: SEDEC / CBMERJ
• Boletim: ${bulletinName}
• Total de Páginas: ${totalPages}

2. RESUMO EXECUTIVO
• Publicação Nominal: Não há menção nominal ao militar ${userName}.
• Unidade / Comando: Nenhuma publicação de interesse direto identificada para o 2º GMar ou CBA X neste boletim.

---
Nenhuma providência administrativa necessária para o 2º GMar / CBA X.`;
  }

  let formattedExtracts = '';
  for (const snip of snippets) {
    formattedExtracts += `\n\n--- [PÁGINA / FL. ${snip.pageNum}] ---\n${snip.text}`;
  }

  const systemPrompt = `Você é o Oficial Ajudante e Analista Militar de Inteligência Administrativa do Corpo de Bombeiros Militar do Estado do Rio de Janeiro (CBMERJ), prestando assessoria direta ao Oficial ${userName} e ao Comando do 2º GMar (Grupamento Marítimo - Barra da Tijuca) e CBA X (Comando de Bombeiro de Área X - Capital II).

Sua missão é ler com extremo rigor os extratos do Boletim da SEDEC/CBMERJ e redigir uma ANÁLISE IMPECÁVEL, em linguagem militar formal brasileira, altamente executiva, sem nenhum título cortado ou frases repetitivas sem sentido.

DIRETRIZES FUNDAMENTAIS:
1. NUNCA invente informações. Utilize apenas o que consta nos extratos.
2. NUNCA use tabelas com barras verticais (| Coluna 1 | Coluna 2 |), pois no Telegram em telas de celular elas ficam truncadas e ilegíveis. Utilize SEMPRE listas verticais estruturadas com marcadores (•) e negrito.
3. NUNCA use fragmentos de frases, nomes soltos ou pedaços de tabela como título da matéria. O título deve ser claro, militar e representativo da Diretoria/Órgão e do assunto (Exemplos: "[DGS / Junta Médica - Inspeção de Saúde]", "[DGP / Concessão de Licença LTIP]", "[DGP / DPA - Classificação e Movimentação de Sargentos]", "[DGEI - Convocação de Coordenadores CEEE / CSMar]").
4. Ao citar militares envolvidos em tabelas de saúde, movimentação ou requerimento: indique Posto/Graduação, Nome Completo, RG e Lotação. Para juntas médicas, reporte a conclusão oficial exata (Apto, Apto com Diagnóstico, Exames Pendentes, etc.).
5. Verifique com rigor se há menção nominal a "${userName}".

Siga RIGOROSAMENTE esta estrutura:

1. IDENTIFICAÇÃO DO DOCUMENTO
• Órgão: SEDEC / CBMERJ
• Boletim: ${bulletinName}
• Total de Páginas: ${totalPages}

2. RESUMO EXECUTIVO
• Publicação Nominal: [Informar com clareza se há ou não menção nominal a ${userName}]
• Unidade / Comando: [Síntese executiva em 2 a 3 linhas dos assuntos tratados de interesse do 2º GMar / CBA X]

3. ALERTAS PRIORITÁRIOS E DETALHAMENTO:
[Para cada matéria encontrada de interesse do 2º GMar / CBA X:]
⚠️ PRIORIDADE ALTA (ou ℹ️ NOTA INFORMATIVA) | Fl. [Número da Página]
• Matéria: [Título Executivo e Descritivo da Matéria]
• Militares Envolvidos: [Posto/Graduação, Nome Completo, RG, Lotação ou "Efetivo / Unidade"]
• Providência / Resumo: [Explicação articulada, completa e profissional do ato publicado e das providências administrativas]

---

MENSAGEM PRONTA PARA ENCAMINHAMENTO:

Bom dia, senhores.

Seguem, abaixo, os tópicos relacionados à unidade, extraídos do Boletim da SEDEC/CBMERJ (${bulletinName}), com a indicação das respectivas páginas:

• [[Título Executivo da Matéria]]
  - Providência / Resumo: [Resumo conciso de 1 a 3 linhas com os militares envolvidos e a determinação/decisão]
  - Fonte: Boletim da SEDEC/CBMERJ, página [XX].

(Repetir para todas as matérias de forma executiva, impecável para ser encaminhada no grupo de Oficiais via WhatsApp/Telegram)`;

  const userPrompt = `Analise os seguintes extratos de páginas do boletim e forneça o relatório executivo:\n${formattedExtracts}`;

  const allModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastError = null;

  for (const model of allModels) {
    try {
      console.log(`[AI Service] Enviando para Groq (${model})...`);
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[AI Service] Falha na chamada da Groq (${model}): HTTP ${response.status} - ${errText}`);
        lastError = new Error(`Groq HTTP ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        console.log(`[AI Service] Sucesso com modelo ${model}! Tamanho: ${content.length} caracteres.`);
        return content;
      }
    } catch (err) {
      console.warn(`[AI Service] Erro de rede ou execução com ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Falha ao processar análise do boletim com os modelos da Groq.');
}
