import React, { useState } from 'react';
import { 
  HeartPulse, 
  Award, 
  AlertTriangle, 
  Calendar, 
  User, 
  ShieldAlert,
  Search,
  CheckCircle,
  XCircle
} from 'lucide-react';

export default function DisciplineTab({ days, students, onSelectStudent }) {
  const [filterType, setFilterType] = useState('todos'); // 'todos' | 'alteracoes' | 'fo'
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all events into a unified chronological log
  const events = [];

  days.forEach(d => {
    // Alterações
    if (d.alteracoes.hasAlteracao) {
      d.alteracoes.items.forEach((item, idx) => {
        events.push({
          id: `alt-${d.id}-${idx}`,
          dayId: d.id,
          date: d.date,
          xerife: d.xerife.raw,
          category: 'alteracao',
          title: 'Alteração / Baixa Médica / Administrativa',
          content: item.text,
          students: item.studentNumbers,
        });
      });
    }

    // FO+
    if (d.foPositive) {
      events.push({
        id: `fo-pos-${d.id}`,
        dayId: d.id,
        date: d.date,
        xerife: d.xerife.raw,
        category: 'fo_positivo',
        title: 'Fato Observado Positivo (FO+)',
        content: d.foPositive,
        students: [],
      });
    }

    // FO-
    if (d.foNegative) {
      events.push({
        id: `fo-neg-${d.id}`,
        dayId: d.id,
        date: d.date,
        xerife: d.xerife.raw,
        category: 'fo_negativo',
        title: 'Fato Observado Negativo (FO-)',
        content: d.foNegative,
        students: [],
      });
    }
  });

  // Filter events
  const filteredEvents = events.filter(e => {
    if (filterType === 'alteracoes' && e.category !== 'alteracao') return false;
    if (filterType === 'fo' && e.category === 'alteracao') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchText = e.content.toLowerCase().includes(q) || e.date.includes(q) || e.xerife.toLowerCase().includes(q);
      const matchStudent = e.students.some(s => s.toString().includes(q));
      if (!matchText && !matchStudent) return false;
    }

    return true;
  }).reverse();

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por motivo, aluno ou data..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterType === 'todos'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos os Registros ({events.length})
          </button>
          <button
            onClick={() => setFilterType('alteracoes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              filterType === 'alteracoes'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <HeartPulse className="h-3.5 w-3.5" />
            <span>Baixas Médicas ({events.filter(e => e.category === 'alteracao').length})</span>
          </button>
          <button
            onClick={() => setFilterType('fo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              filterType === 'fo'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-indigo-300 hover:bg-slate-700'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Fatos Observados ({events.filter(e => e.category !== 'alteracao').length})</span>
          </button>
        </div>

      </div>

      {/* Events List */}
      <div className="space-y-3.5">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
            Nenhum registro encontrado com os filtros selecionados.
          </div>
        ) : (
          filteredEvents.map(event => {
            const isAlteracao = event.category === 'alteracao';
            const isFOPos = event.category === 'fo_positivo';
            const isFONeg = event.category === 'fo_negativo';

            return (
              <div 
                key={event.id}
                className={`p-5 rounded-2xl border transition shadow-lg ${
                  isAlteracao
                    ? 'bg-slate-900/90 border-amber-500/30 hover:border-amber-500/60'
                    : isFOPos
                    ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/60'
                    : 'bg-slate-900/90 border-rose-500/30 hover:border-rose-500/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    {isAlteracao && <HeartPulse className="h-5 w-5 text-amber-400" />}
                    {isFOPos && <CheckCircle className="h-5 w-5 text-emerald-400" />}
                    {isFONeg && <XCircle className="h-5 w-5 text-rose-400" />}
                    
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isAlteracao ? 'text-amber-300' : isFOPos ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      {event.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono-numbers text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      {event.date} (Dia #{event.dayId})
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">Xerife: {event.xerife}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">{event.content}</p>
                </div>

                {/* Affected students tags */}
                {event.students && event.students.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-xs">
                    <span className="text-slate-400 font-medium">Alunos envolvidos:</span>
                    {event.students.map(num => (
                      <button
                        key={num}
                        onClick={() => onSelectStudent(num)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono-numbers font-bold text-xs transition"
                      >
                        Aluno #{num}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

