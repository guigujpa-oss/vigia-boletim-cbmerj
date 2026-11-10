import React, { useState } from 'react';
import { 
  Brush, 
  Crown, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  ArrowUpDown,
  UserCheck
} from 'lucide-react';

export default function DutyTab({ students, onSelectStudent }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('faxinaDesc'); // 'faxinaDesc' | 'faxinaAsc' | 'xerifeDesc' | 'numberAsc'

  // Only consider active students for duty rotation fairness
  const activeStudents = students.filter(s => s.status === 'ativo');

  const filtered = activeStudents.filter(s => {
    const term = searchTerm.toLowerCase();
    return s.number.toString().includes(term) || s.name.toLowerCase().includes(term);
  });

  const sortedStudents = [...filtered].sort((a, b) => {
    if (sortBy === 'faxinaDesc') return b.totalFaxinas - a.totalFaxinas;
    if (sortBy === 'faxinaAsc') return a.totalFaxinas - b.totalFaxinas;
    if (sortBy === 'xerifeDesc') return b.totalXerifados - a.totalXerifados;
    return a.number - b.number;
  });

  // Fairness stats
  const totalFaxinasDuty = activeStudents.reduce((acc, s) => acc + s.totalFaxinas, 0);
  const avgFaxinas = activeStudents.length > 0 ? (totalFaxinasDuty / activeStudents.length).toFixed(1) : 0;
  const zeroFaxinaCount = activeStudents.filter(s => s.totalFaxinas === 0).length;

  return (
    <div className="space-y-6">
      
      {/* Quick rotation metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Média de Faxinas</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Brush className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-white">{avgFaxinas}</span>
            <span className="text-xs text-slate-400">por combatente ativo</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ainda Não Pagaram Faxina</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-amber-300">{zeroFaxinaCount}</span>
            <span className="text-xs text-slate-400">alunos com 0 faxinas</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Xerifados Registrados</span>
            <div className="h-8 w-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono-numbers text-yellow-300">
              {activeStudents.filter(s => s.totalXerifados > 0).length}
            </span>
            <span className="text-xs text-slate-400">alunos já tiraram serviço</span>
          </div>
        </div>

      </div>

      {/* Control bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar aluno ativo..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Ordenar por:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="faxinaDesc">Mais Faxinas primeiro</option>
            <option value="faxinaAsc">Menos Faxinas primeiro</option>
            <option value="xerifeDesc">Mais Xerifados primeiro</option>
            <option value="numberAsc">Número de chamada</option>
          </select>
        </div>

      </div>

      {/* Duty Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Número</th>
                <th className="py-3.5 px-4">Aluno Combatente</th>
                <th className="py-3.5 px-4 text-center">Xerife de Dia</th>
                <th className="py-3.5 px-4 text-center">Total Faxinas</th>
                <th className="py-3.5 px-4">Equilíbrio da Escala</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedStudents.map(student => {
                const isOverworked = student.totalFaxinas >= 2;
                const isUnassigned = student.totalFaxinas === 0;

                return (
                  <tr 
                    key={student.number}
                    className="hover:bg-slate-800/40 transition cursor-pointer"
                    onClick={() => onSelectStudent(student.number)}
                  >
                    <td className="py-3 px-4 font-mono-numbers font-bold text-cyan-300">
                      #{student.formattedNumber}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-center font-mono-numbers">
                      {student.totalXerifados > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 font-bold">
                          {student.totalXerifados}x
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono-numbers">
                      <span className={`px-2.5 py-0.5 rounded font-bold ${
                        isOverworked 
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : isUnassigned
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {student.totalFaxinas}x
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isOverworked && (
                        <span className="text-cyan-400 flex items-center gap-1 font-medium text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Escalado frequentemente
                        </span>
                      )}
                      {isUnassigned && (
                        <span className="text-amber-400 flex items-center gap-1 font-medium text-[11px]">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Prioridade para próxima escala
                        </span>
                      )}
                      {!isOverworked && !isUnassigned && (
                        <span className="text-slate-400 text-[11px]">Dentro da média</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStudent(student.number);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        Ver Dossiê
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

