import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Waves, 
  Compass, 
  User, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  HeartPulse, 
  Award, 
  ExternalLink,
  Brush,
  Filter
} from 'lucide-react';

export default function DiaryTab({ days, onSelectStudent, onPrintDay, onOpenDailyDetail }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDayId, setExpandedDayId] = useState(days && days.length > 0 ? days[days.length - 1].id : null);

  const filteredDays = days.filter(d => {
    const term = searchTerm.toLowerCase();
    return (
      d.date.includes(term) ||
      d.xerife.raw.toLowerCase().includes(term) ||
      d.instrucao.descricao.toLowerCase().includes(term) ||
      d.alteracoes.raw.toLowerCase().includes(term) ||
      d.mar.tamanhoOndas.toLowerCase().includes(term) ||
      d.mar.corrente.toLowerCase().includes(term)
    );
  }).reverse(); // Most recent first

  const toggleExpand = (id) => {
    setExpandedDayId(expandedDayId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      
      {/* Search Bar & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por data, xerife, praia, atividade..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Exibindo <strong className="text-cyan-400">{filteredDays.length}</strong> de {days.length} instruções registradas
        </div>
      </div>

      {/* Days List */}
      <div className="space-y-4">
        {filteredDays.map((d) => {
          const isExpanded = expandedDayId === d.id;

          return (
            <div 
              key={d.id} 
              className={`bg-slate-900/90 border rounded-2xl transition shadow-lg overflow-hidden ${
                isExpanded ? 'border-cyan-500/40 shadow-cyan-950/20' : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div 
                onClick={() => toggleExpand(d.id)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Dia</span>
                    <span className="text-base font-black font-mono-numbers text-cyan-300">#{d.id}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono-numbers">{d.date}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Xerife: {d.xerife.raw}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-blue-300 font-medium">
                        <Waves className="h-3 w-3 text-blue-400" />
                        Ondas: {d.mar.tamanhoOndas}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-indigo-300 font-medium">
                        <Compass className="h-3 w-3 text-indigo-400" />
                        Corrente: {d.mar.corrente}
                      </span>
                      {d.alteracoes.hasAlteracao && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <HeartPulse className="h-3 w-3" />
                            {d.alteracoes.affectedStudents.length} alteração(ões)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {onOpenDailyDetail && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDailyDetail(d.id);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-white transition border border-cyan-500/30 text-[11px] font-semibold"
                      title="Ver todos os parâmetros deste dia"
                    >
                      Raio-X do Dia
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrintDay(d);
                    }}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                    title="Imprimir / Salvar Boletim Diário em PDF"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                  <div className="p-1.5 rounded-lg text-slate-400">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>
              </div>

              {/* Card Body (Expanded) */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-5 animate-fade-in text-xs">
                  
                  {/* Descrição da Instrução */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Descrição Detalhada das Atividades:
                    </h4>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-line">
                      {d.instrucao.descricao || 'Sem descrição informada.'}
                    </div>
                  </div>

                  {/* Ordens Recebidas */}
                  {d.instrucao.cleanOrdens && (
                    <div>
                      <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Ordens Recebidas:
                      </h4>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 leading-relaxed whitespace-pre-line">
                        {d.instrucao.cleanOrdens}
                      </div>
                    </div>
                  )}

                  {/* Alterações & Fatos Observados */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Alterações */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <h4 className="font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                        <HeartPulse className="h-4 w-4" />
                        Alterações / Baixas Médicas
                      </h4>
                      {d.alteracoes.hasAlteracao ? (
                        <div className="space-y-2">
                          <p className="text-slate-200 whitespace-pre-line">{d.alteracoes.raw}</p>
                          {d.alteracoes.affectedStudents.length > 0 && (
                            <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-400">Alunos envolvidos:</span>
                              {d.alteracoes.affectedStudents.map(num => (
                                <button
                                  key={num}
                                  onClick={() => onSelectStudent(num)}
                                  className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-mono-numbers font-bold transition"
                                >
                                  Aluno #{num}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">Nenhuma alteração registrada neste dia.</p>
                      )}
                    </div>

                    {/* Fatos Observados */}
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                      <h4 className="font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-cyan-400" />
                        Fatos Observados (FO)
                      </h4>
                      <div className="space-y-2">
                        {d.foPositive && (
                          <div className="text-emerald-300 bg-emerald-950/20 p-2 rounded border border-emerald-500/30">
                            <strong>FO+:</strong> {d.foPositive}
                          </div>
                        )}
                        {d.foNegative && (
                          <div className="text-rose-300 bg-rose-950/20 p-2 rounded border border-rose-500/30">
                            <strong>FO-:</strong> {d.foNegative}
                          </div>
                        )}
                        {!d.foPositive && !d.foNegative && (
                          <p className="text-slate-500 italic">Sem registros de FO+ ou FO- nesta data.</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Previsão das Ondas e Link */}
                  {d.mar.previsaoUrl && (
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Waves className="h-4 w-4 text-cyan-400" />
                        <span>Previsão SurfGuru anexada pelo Xerife</span>
                      </div>
                      <a
                        href={d.mar.previsaoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        <span>Abrir imagem / link</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Faxina */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <h4 className="font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Brush className="h-4 w-4 text-cyan-400" />
                      Alunos Escalados para Faxina:
                    </h4>
                    {d.faxina.numbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {d.faxina.numbers.map(num => (
                          <button
                            key={num}
                            onClick={() => onSelectStudent(num)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono-numbers font-medium transition"
                          >
                            #{num}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400">{d.faxina.raw || 'Não informado.'}</p>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

