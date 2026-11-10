import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Waves, 
  Compass, 
  User, 
  Printer, 
  HeartPulse, 
  Award, 
  Brush, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  Clock, 
  Mail, 
  AlertTriangle,
  FileText
} from 'lucide-react';

export default function DailyDetailTab({ 
  days, 
  selectedDayId, 
  onSelectDayId, 
  onSelectStudent, 
  onPrintDay 
}) {
  if (!days || days.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
        Nenhum dia de instrução cadastrado.
      </div>
    );
  }

  // Find currently selected day or fallback to latest
  const activeDay = days.find(d => d.id === selectedDayId) || days[days.length - 1];
  const currentIndex = days.findIndex(d => d.id === activeDay.id);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < days.length - 1;

  const goToPrev = () => {
    if (hasPrev) onSelectDayId(days[currentIndex - 1].id);
  };

  const goToNext = () => {
    if (hasNext) onSelectDayId(days[currentIndex + 1].id);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Selector & Navigation Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Dropdown (Lista Suspensa) */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="h-10 w-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm">
            <Calendar className="h-5 w-5" />
          </div>
          
          <div className="flex-1 sm:max-w-md">
            <label htmlFor="day-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Selecionar Dia de Instrução (Lista Suspensa):
            </label>
            <div className="relative">
              <select
                id="day-select"
                value={activeDay.id}
                onChange={(e) => onSelectDayId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 hover:border-cyan-500/60 focus:border-cyan-400 rounded-xl py-2 pl-3.5 pr-10 text-xs font-semibold text-slate-100 shadow-inner appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition"
              >
                {[...days].reverse().map((d) => (
                  <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200 py-1.5">
                    Dia #{d.id} — {d.date} • Xerife: {d.xerife.raw}
                    {d.desligados.novosDesligados && d.desligados.novosDesligados.length > 0 ? ' (⚠️ Nova Baixa)' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Prev / Next & Print Actions */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto justify-end">
          <button
            onClick={goToPrev}
            disabled={!hasPrev}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition border border-slate-700 text-xs font-medium"
            title="Dia Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          
          <button
            onClick={goToNext}
            disabled={!hasNext}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition border border-slate-700 text-xs font-medium"
            title="Próximo Dia"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => onPrintDay(activeDay)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-700 hover:bg-cyan-600 text-white transition shadow-sm border border-cyan-500/30 ml-1"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Imprimir / PDF</span>
          </button>
        </div>

      </div>

      {/* Main Day Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          
          {/* Day & Date badge */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-cyan-950 to-slate-900 border border-cyan-500/40 flex flex-col items-center justify-center text-center shadow-lg shadow-cyan-950/40 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Instrução</span>
              <span className="text-2xl sm:text-3xl font-black font-mono-numbers text-white">#{activeDay.id}</span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-white font-mono-numbers tracking-tight">
                  {activeDay.date}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
                  Parte Diária Oficial
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Envio: {activeDay.timestamp}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  {activeDay.email}
                </span>
              </p>
            </div>
          </div>

          {/* Xerife Highlight Box */}
          <div className="bg-slate-800/40 border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 max-w-md w-full lg:w-auto">
            <div className="h-12 w-12 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-300 font-black font-mono-numbers text-lg shrink-0">
              {activeDay.xerife.formattedNumber || 'XR'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Xerife de Dia
              </span>
              <h4 className="text-sm font-bold text-white truncate">
                {activeDay.xerife.raw}
              </h4>
              {activeDay.xerife.number && (
                <button
                  onClick={() => onSelectStudent(activeDay.xerife.number)}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold mt-0.5"
                >
                  Abrir dossiê do Xerife →
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Quick Parameters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          
          {/* Ondas */}
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Waves className="h-3.5 w-3.5 text-cyan-400" />
              Ondulação (07h00)
            </span>
            <span className="text-base sm:text-lg font-bold font-mono-numbers text-cyan-300">
              {activeDay.mar.tamanhoOndas}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Instrutor mais antigo</span>
          </div>

          {/* Corrente */}
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Compass className="h-3.5 w-3.5 text-indigo-400" />
              Corrente Marítima
            </span>
            <span className="text-base sm:text-lg font-bold font-mono-numbers text-indigo-300">
              {activeDay.mar.corrente}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Sentido da praia</span>
          </div>

          {/* Efetivo Ativo no Dia */}
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Users className="h-3.5 w-3.5 text-emerald-400" />
              Efetivo Ativo
            </span>
            <span className="text-base sm:text-lg font-bold font-mono-numbers text-emerald-400">
              {activeDay.desligados.ativosNoDia || (114 - activeDay.desligados.count)} alunos
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {activeDay.desligados.count} desligados acumulados
            </span>
          </div>

          {/* Alterações do Dia */}
          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <HeartPulse className="h-3.5 w-3.5 text-amber-400" />
              Baixas / Alterações
            </span>
            <span className={`text-base sm:text-lg font-bold font-mono-numbers ${
              activeDay.alteracoes.hasAlteracao ? 'text-amber-300' : 'text-slate-400'
            }`}>
              {activeDay.alteracoes.hasAlteracao ? `${activeDay.alteracoes.affectedStudents.length} afetado(s)` : 'Nenhuma'}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {activeDay.alteracoes.hasAlteracao ? 'Requer atenção médica' : 'Turma 100% pronta'}
            </span>
          </div>

        </div>

      </div>

      {/* Alert if new dropouts happened on this specific day */}
      {activeDay.desligados.novosDesligados && activeDay.desligados.novosDesligados.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                Novo(s) Desligamento(s) Registrado(s) Neste Dia ({activeDay.desligados.novosDesligados.length})
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Os seguintes alunos entraram na lista de baixas a partir desta data:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {activeDay.desligados.novosDesligados.map(num => (
              <button
                key={num}
                onClick={() => onSelectStudent(num)}
                className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 text-xs font-mono-numbers font-bold transition"
              >
                Aluno #{num}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Instructions & Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 cols): Instruction Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Instrução Detalhada */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              Descrição Detalhada das Atividades da Instrução
            </h3>
            
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed text-sm whitespace-pre-line font-sans">
              {activeDay.instrucao.descricao || 'Nenhuma descrição informada pelo xerife.'}
            </div>
          </div>

          {/* Ordens Recebidas */}
          {activeDay.instrucao.cleanOrdens && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Ordens Recebidas dos Instrutores / Coordenação
              </h3>
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-100 leading-relaxed text-xs whitespace-pre-line font-sans">
                {activeDay.instrucao.cleanOrdens}
              </div>
            </div>
          )}

          {/* Alterações Médicas & Baixas do Dia */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <HeartPulse className="h-4 w-4" />
                Alterações dos Alunos & Justificativas do Dia
              </h3>
              <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {activeDay.alteracoes.hasAlteracao ? `${activeDay.alteracoes.affectedStudents.length} aluno(s) citado(s)` : 'Sem alterações'}
              </span>
            </div>

            {activeDay.alteracoes.hasAlteracao ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-xs whitespace-pre-line leading-relaxed">
                  {activeDay.alteracoes.raw}
                </div>

                {activeDay.alteracoes.affectedStudents.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    <span className="text-xs text-slate-400 font-medium">Fichas individuais dos alunos citados:</span>
                    {activeDay.alteracoes.affectedStudents.map(num => (
                      <button
                        key={num}
                        onClick={() => onSelectStudent(num)}
                        className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono-numbers font-bold transition flex items-center gap-1.5"
                      >
                        <User className="h-3 w-3" />
                        <span>Aluno #{num}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-500 text-xs italic">
                Nenhuma alteração, queixa médica ou baixa registrada para este dia de instrução.
              </div>
            )}
          </div>

        </div>

        {/* Right (1 col): Sea conditions, FOs, Faxina */}
        <div className="space-y-6">
          
          {/* Previsão das Ondas SurfGuru */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Waves className="h-4 w-4 text-cyan-400" />
              Previsão Marítima (SurfGuru)
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Tamanho das Ondas:</span>
                <span className="font-bold font-mono-numbers text-cyan-300">{activeDay.mar.tamanhoOndas}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Correnteza:</span>
                <span className="font-bold font-mono-numbers text-indigo-300">{activeDay.mar.corrente}</span>
              </div>

              {activeDay.mar.previsaoUrl ? (
                <a
                  href={activeDay.mar.previsaoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-semibold transition text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ver Print Anexado da Previsão</span>
                </a>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-center text-xs italic">
                  Nenhum link de anexo fornecido.
                </div>
              )}
            </div>
          </div>

          {/* Fatos Observados */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Award className="h-4 w-4 text-cyan-400" />
              Fatos Observados (FO) do Dia
            </h3>

            <div className="space-y-2 text-xs">
              {activeDay.foPositive ? (
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
                  <span className="font-bold block text-[10px] uppercase text-emerald-400 mb-0.5">FO+ (Positivo):</span>
                  <p>{activeDay.foPositive}</p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 italic">
                  Sem FO+ positivo registrado neste dia.
                </div>
              )}

              {activeDay.foNegative ? (
                <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-200">
                  <span className="font-bold block text-[10px] uppercase text-rose-400 mb-0.5">FO- (Negativo):</span>
                  <p>{activeDay.foNegative}</p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 italic">
                  Sem FO- negativo registrado neste dia.
                </div>
              )}
            </div>
          </div>

          {/* Escala de Faxina */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Brush className="h-4 w-4 text-cyan-400" />
                Escala de Faxina do Dia
              </h3>
              <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                {activeDay.faxina.numbers.length} alunos
              </span>
            </div>

            {activeDay.faxina.numbers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {activeDay.faxina.numbers.map(num => (
                    <button
                      key={num}
                      onClick={() => onSelectStudent(num)}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono-numbers font-medium transition"
                      title="Clique para ver o dossiê do aluno"
                    >
                      #{num}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  Texto original: "{activeDay.faxina.raw.replace(/\r?\n/g, ', ')}"
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                {activeDay.faxina.raw || 'Nenhum aluno registrado na faxina deste dia.'}
              </div>
            )}
          </div>

          {/* Desligados até esta data */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Desligados Acumulados
              </h3>
              <span className="text-[11px] font-mono-numbers px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40">
                {activeDay.desligados.count} baixas
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Total de combatentes que deixaram o curso até a data de {activeDay.date}.
            </p>

            <div className="max-h-40 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-1">
                {activeDay.desligados.numbers.map(num => {
                  const isNew = activeDay.desligados.novosDesligados?.includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => onSelectStudent(num)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono-numbers transition ${
                        isNew
                          ? 'bg-rose-600 text-white font-bold animate-pulse'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                      title={isNew ? 'Desligado nesta data!' : `Aluno #${num}`}
                    >
                      #{num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

