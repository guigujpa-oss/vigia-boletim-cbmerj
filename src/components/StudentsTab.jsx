import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldX, 
  HeartPulse, 
  Crown, 
  Brush, 
  Award,
  ChevronRight
} from 'lucide-react';

export default function StudentsTab({ students, onSelectStudent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'ativo' | 'desligado' | 'alteracao'

  const filteredStudents = students.filter(s => {
    // Search match
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      s.number.toString().includes(term) ||
      s.formattedNumber.includes(term) ||
      s.name.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'ativo') return s.status === 'ativo';
    if (statusFilter === 'desligado') return s.status === 'desligado';
    if (statusFilter === 'alteracao') return s.totalAlteracoes > 0;
    if (statusFilter === 'xerife') return s.totalXerifados > 0;
    if (statusFilter === 'faxina') return s.totalFaxinas > 0;

    return true;
  });

  const ativosCount = students.filter(s => s.status === 'ativo').length;
  const desligadosCount = students.filter(s => s.status === 'desligado').length;
  const alteracoesCount = students.filter(s => s.totalAlteracoes > 0).length;

  return (
    <div className="space-y-6">
      
      {/* Controls & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número (ex: 46) ou nome..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              statusFilter === 'todos'
                ? 'bg-cyan-600 text-white shadow-cyan-900/40 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({students.length})
          </button>
          
          <button
            onClick={() => setStatusFilter('ativo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              statusFilter === 'ativo'
                ? 'bg-emerald-600 text-white shadow-emerald-900/40 shadow-sm'
                : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ativos ({ativosCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('desligado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              statusFilter === 'desligado'
                ? 'bg-rose-600 text-white shadow-rose-900/40 shadow-sm'
                : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
            }`}
          >
            <ShieldX className="h-3.5 w-3.5" />
            <span>Desligados ({desligadosCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('alteracao')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              statusFilter === 'alteracao'
                ? 'bg-amber-600 text-white shadow-amber-900/40 shadow-sm'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>Com Baixa / Alteração ({alteracoesCount})</span>
          </button>
        </div>

      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredStudents.map((s) => {
          const isDesligado = s.status === 'desligado';

          return (
            <div
              key={s.number}
              onClick={() => onSelectStudent(s.number)}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between shadow-md hover:scale-[1.01] active:scale-[0.99] ${
                isDesligado
                  ? 'bg-slate-900/40 border-slate-800/80 hover:border-rose-500/40 opacity-75 hover:opacity-100'
                  : 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  {/* Number Badge */}
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-black font-mono-numbers text-lg border ${
                    isDesligado
                      ? 'bg-rose-950/40 border-rose-900/40 text-rose-400'
                      : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                  }`}>
                    {s.formattedNumber}
                  </div>

                  {/* Status pill */}
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    isDesligado
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {isDesligado ? 'Desligado' : 'Ativo'}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-white tracking-tight truncate">
                    {s.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isDesligado 
                      ? (s.desligadoEm ? `Desligado em ${s.desligadoEm}` : 'Baixado do curso')
                      : 'Aluno combatente ativo'}
                  </p>
                </div>
              </div>

              {/* Badges / Metrics footer */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {s.totalAlteracoes > 0 && (
                    <span 
                      className="flex items-center gap-1 text-amber-400 font-mono-numbers font-semibold"
                      title={`${s.totalAlteracoes} baixa(s) médica(s)`}
                    >
                      <HeartPulse className="h-3.5 w-3.5" />
                      {s.totalAlteracoes}
                    </span>
                  )}
                  {s.totalXerifados > 0 && (
                    <span 
                      className="flex items-center gap-1 text-amber-300 font-mono-numbers font-semibold"
                      title={`${s.totalXerifados} vez(es) como Xerife`}
                    >
                      <Crown className="h-3.5 w-3.5" />
                      {s.totalXerifados}
                    </span>
                  )}
                  {s.totalFaxinas > 0 && (
                    <span 
                      className="flex items-center gap-1 text-cyan-400 font-mono-numbers font-semibold"
                      title={`${s.totalFaxinas} faxina(s)`}
                    >
                      <Brush className="h-3.5 w-3.5" />
                      {s.totalFaxinas}
                    </span>
                  )}
                  {s.totalAlteracoes === 0 && s.totalXerifados === 0 && s.totalFaxinas === 0 && (
                    <span className="text-[11px] text-slate-500">Sem ocorrências</span>
                  )}
                </div>

                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

