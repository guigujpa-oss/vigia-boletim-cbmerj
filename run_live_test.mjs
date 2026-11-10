import { initWhatsApp, sendWhatsApp } from './server/whatsappService.js';
import path from 'path';

const TARGET_PHONE = '5521998722360';
const PDF_PATH = 'C:\\Users\\GMartins\\.gemini\\antigravity\\scratch\\boletins\\ultimo_boletim.pdf';

const MESSAGE_TEXT = `*Análise do Boletim para Guilherme Martins Botelho — 2º GMar / CBA X*

*1. IDENTIFICAÇÃO DO DOCUMENTO*
• Órgão: SEDEC / CBMERJ
• Boletim: Nº 203, de 06 de novembro de 2026 (Boletim Ostensivo Geral)
• Arquivo: ultimo_boletim.pdf (69 páginas)

*2. RESUMO EXECUTIVO*
O Boletim nº 203 traz determinações imediatas para o 2º GMar e CBA X: determinação obrigatória do Chefe do EMG para apresentação de todos os alunos do Curso de Salvamento Marítimo e de viatura da unidade (V4-045) em apoio ao WRC 2026 no Riocentro; escalação de oficiais, praças, viaturas (2 Quadriciclos e 2 Motos Aquáticas) e material pelo CBA X com prazo de envio da relação até 11/11/2026; matrícula de oficial do 2º GMar em curso de piloto; e a transferência de 4 soldados do 2º GMar para outras unidades. Não há menção nominal a Guilherme Martins Botelho.

*3. ALERTAS PRIORITÁRIOS:*
🚨 *PRIORIDADE MÁXIMA* | Apresentação de alunos do CSMar ao CIEB (09 a 27/11) | Fl. 9
🚨 *PRIORIDADE MÁXIMA* | Apresentação da viatura V4-045 do 2º GMar (até 27/11) | Fl. 10
⚠️ *ALTA* | Prazo de envio de efetivo/recursos do CBA X ao EMG (até 11/11 às 17h) | Fl. 39
⚠️ *ALTA* | Transferência de 4 soldados do 2º GMar (PABM 1/22 e 21º GBM) | Fls. 50-51
ℹ️ *MÉDIA* | Matrícula de Cap BM do 2º GMar em Curso de Piloto | Fl. 40

---

*MENSAGEM PRONTA PARA ENCAMINHAMENTO:*

Bom dia, senhores.

Seguem, abaixo, os tópicos relacionados à unidade, extraídos do Boletim da SEDEC/CBMERJ nº 203, de 06 de novembro de 2026, com a indicação das respectivas páginas:

• *Emprego dos Alunos do CSMar no WRC 2026 (CIEB / Riocentro)*
  - Providência: Apresentar todos os alunos do Curso de Salvamento Marítimo ao CIEB para apoio ao evento; atividades letivas suspensas no período.
  - Responsável: 2º GMar.
  - Prazo/data: Apresentação em 09/11/2026 (às 09h) e reapresentação ao 2º GMar em 27/11/2026 (às 09h).
  - Situação: Vigente.
  - Local/horário: CIEB, às 09h00.
  - Fonte: Boletim da SEDEC/CBMERJ nº 203, de 06/11/2026, página 9 (Nota CHEMG 1090/2026).

• *Apresentação de Viatura Operacional (V4-045)*
  - Providência: Apresentar a viatura prefixo V4-045 à Ajudância-Geral em apoio ao translado do WRC 2026.
  - Responsável: 2º GMar.
  - Prazo/data: Até 27/11/2026.
  - Situação: Vigente.
  - Local/horário: Ajudância-Geral (QCG).
  - Fonte: Boletim da SEDEC/CBMERJ nº 203, de 06/11/2026, página 10 (Nota CHEMG 1092/2026).

• *Escalação de Meios e Efetivo para o WRC 2026 (CBA X)*
  - Providência: Envio à Chefia do EMG da relação dos militares e recursos empregados na exposição (1 Oficial, 1 Praça, 2 Quadriciclos, 2 Motos Aquáticas e material de salvamento).
  - Responsável: CBA X (com reflexo na unidade).
  - Prazo/data: Até o final do expediente do dia 11/11/2026. Entrega das viaturas em 17/11/2026 (às 12h) e materiais às 07h45 nos dias de evento.
  - Situação: Futura.
  - Local/horário: Riocentro (Pavilhão 3).
  - Fonte: Boletim da SEDEC/CBMERJ nº 203, de 06/11/2026, páginas 25, 26, 37, 38 e 39.

• *Transferência de Praças do 2º GMar*
  - Providência: Adotar medidas administrativas de desligamento dos militares movimentados por necessidade do serviço.
  - Responsável: 2º GMar (B/1).
  - Militares:
    - Para o PABM 1/22 (Pinheiral): Sd BM Q01/26 Caio Rimulo Gonçalves Rodrigues dos Santos (RG 61.691) e Sd BM Q01/26 Julio Gabriel de Faria Duarte (RG 61.659).
    - Para o 21º GBM (Itaperuna): Sd BM Q01/26 Leandro Meireles Cardoso (RG 61.603) e Sd BM Q01/26 Matheus Silva Vasconcelos Carvalho (RG 61.685).
  - Prazo/data: A contar da publicação.
  - Situação: Vigente.
  - Fonte: Boletim da SEDEC/CBMERJ nº 203, de 06/11/2026, páginas 50 e 51 (Proc. SEI-270006/033577/2026).

• *Matrícula no Curso de Formação de Piloto Privado de Helicóptero*
  - Providência: Para ciência da unidade referente à matrícula do Cap BM QOC/17 Rafael Nascimento Loureiro (RG 53.373).
  - Responsável: 2º GMar.
  - Prazo/data: Conforme calendário da DGEI.
  - Situação: Vigente.
  - Fonte: Boletim da SEDEC/CBMERJ nº 203, de 06/11/2026, página 40.`;

async function runTest() {
  console.log(`[TESTE] Conectando ao WhatsApp para enviar mensagem e anexo a ${TARGET_PHONE}...`);
  await initWhatsApp(TARGET_PHONE);

  try {
    await sendWhatsApp(TARGET_PHONE, MESSAGE_TEXT, PDF_PATH);
    console.log('>>> [SUCESSO] Mensagem e Boletim PDF enviados com sucesso ao seu WhatsApp!');
    setTimeout(() => process.exit(0), 4000);
  } catch (err) {
    console.error('Erro no envio:', err);
    process.exit(1);
  }
}

runTest();

