# CSMAR 02/2026 — Painel de Gestão e Livro de Registros dos Alunos

Sistema de visualização, auditoria e controle operacional desenvolvido especificamente para os dados do **CSMAR 02/2026** (Curso de Salvamento no Mar).

O aplicativo conecta-se diretamente à planilha do Google Sheets vinculada ao formulário de registro diário, sincronizando as respostas de forma 100% automática.

---

## 🚀 Como Executar

### 1. Iniciar Rápido (Windows)
Basta dar dois cliques no arquivo:
```
iniciar-app.bat
```
Ele abrirá seu navegador automaticamente em `http://localhost:3001`.

### 2. Linha de Comando
```bash
npm start
# ou
node server.js
```

---

## 🌟 Principais Recursos

1. **Sincronização 100% Automática:**
   - Sincronização periódica em segundo plano a cada 5 minutos.
   - Botão **"Sincronizar"** na barra superior para atualização sob demanda a qualquer instante.
   - Atualização automática e silenciosa da interface a cada 30 segundos.

2. **Visão Geral (Dashboard):**
   - KPIs de efetivo: Total de alunos (114), ativos (55), baixas/desligados (59) e taxa de retenção.
   - Destaque da última instrução lançada com resumo de atividades, mar e xerife.
   - Estatísticas consolidadas de ondulação e correntes marítimas registradas.
   - Feed das últimas baixas médicas.

3. **Diário de Bordo (Livro do Aluno Dia a Dia):**
   - Navegação cronológica por todas as partes de serviço.
   - Busca em texto completo por atividades, praias (ex: São Conrado, Posto 5), xerife, etc.
   - Detalhamento completo da instrução, ordens recebidas e links da previsão SurfGuru.
   - Botão para **Imprimir / Gerar PDF** formatado de qualquer boletim diário.

4. **Dossiê Individual do Aluno:**
   - Lista completa de todos os alunos da turma.
   - Filtros rápidos por: *Ativos*, *Desligados* e *Com Baixas/Alterações*.
   - Ao clicar no aluno, abre seu dossiê completo com linha do tempo de:
     - Datas em que foi **Xerife de Dia**
     - Ocorrências médicas e motivos de baixa
     - Escalas de **faxina** cumpridas
     - Fatos Observados (FO+ e FO-)
     - Data exata do desligamento (para os alunos baixados)

5. **Disciplina & Baixas:**
   - Mural unificado com todas as baixas médicas, licenças (ex: luto, cirurgias/pontos) e sindicâncias.
   - Fatos Observados Positivos e Negativos com identificação dos militares.

6. **Escalas & Faxina (Equidade da Escala):**
   - Tabela comparativa de quantas vezes cada aluno ativo foi escalado para faxina ou xerifado.
   - Identifica quem ainda não pagou faxina (0x) e quem foi escalado em excesso, facilitando a distribuição justa pelos xerifes.

---

## 🛠️ Tecnologias
- **Frontend:** React 19, Tailwind CSS, Lucide Icons, Vite
- **Backend:** Node.js, Express, Google Drive CLI integration
- **Dados:** Google Sheets ID `1QKbUcoVzsnmXQINu43AmGXr81zz5pxksd6rW8nEYmSU`

