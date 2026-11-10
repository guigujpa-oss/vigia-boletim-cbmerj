import React from 'react';
import { 
  Users, 
  Calendar, 
  HeartPulse, 
  Waves, 
  TrendingDown, 
  Award, 
  ShieldCheck, 
  ShieldAlert,
  ArrowRight,
  Wind,
  Compass,
  Sparkles
} from 'lucide-react';

export default function OverviewTab({ 
  data, 
  onSelectStudent, 
  onSelectDay, 
  setActiveTab 
}) {
  const { kpis, days, students, wavesBreakdown } = data;
  const latestDay = days && days.length > 0 ? days[days.length - 1] : null;

  // Recent medical alerts
  const recentAlterations = days
    ?.filter(d => d.alteracoes.hasAlteracao)
    ?.slice(-3)
    ?.reverse();

  return (
    <div className="space-y-6">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ativos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-cyan-500/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Efetivo Ativo</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono-numbers text-white">{kpis.alunosAtivos}</span>
            <span className="text-xs text-slate-400">de {kpis.totalAlunos} alunos</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span>{kpis.taxaRetencao} taxa de retenção</span>
          </div>
        </div>

        {/* Desligados */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-rose-500/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Baixas / Desligados</span>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono-numbers text-rose-400">{kpis.alunosDesligados}</span>
            <span className="text-xs text-slate-400">baixas acumuladas</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span>Última turma: 55 combatentes ativos</span>
          </div>
        </div>

        {/* Total Instruções */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-cyan-500/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dias Registrados</span>
            <div className="h-8 w-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono-numbers text-white">{kpis.totalDias}</span>
            <span className="text-xs text-slate-400">partes de serviço</span>
          </div>
          <div className="mt-2 text-xs text-cyan-400 font-medium">
            <span>{latestDay ? `Última em ${latestDay.date}` : 'Sem registros'}</span>
          </div>
        </div>

        {/* Alterações Médicas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg shadow-black/20 hover:border-amber-500/30 transition group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alterações / Saúde</span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HeartPulse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono-numbers text-amber-300">{kpis.totalAlteracoes}</span>
            <span className="text-xs text-slate-400">ocorrências / licenças</span>
          </div>
          <div className="mt-2 text-xs text-amber-400/90 font-medium">
            <span>Acompanhamento clínico ativo</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Latest Day & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latest Instruction Card (2 cols) */}
        {latestDay && (
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Último Registro do Livro (Dia #{latestDay.id})
                  </span>
                </div>
                <span className="text-xs font-mono-numbers text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                  {latestDay.date}
                </span>
              </div>

              {/* Xerife info */}
              <div className="mt-4 flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold font-mono-numbers">
                    {latestDay.xerife.formattedNumber || 'XR'}
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-medium">Xerife de Dia</span>
                    <h4 className="text-sm font-bold text-slate-100">{latestDay.xerife.raw}</h4>
                  </div>
                </div>

                {/* Sea condition badges */}
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-1.5 font-medium">
                    <Waves className="h-3.5 w-3.5 text-blue-400" />
                    <span>Ondas: {latestDay.mar.tamanhoOndas}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-1.5 font-medium">
                    <Compass className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Corrente: {latestDay.mar.corrente}</span>
                  </div>
                </div>
              </div>

              {/* Instruction preview */}
              <div className="mt-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Atividades Executadas:</span>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 line-clamp-3">
                  {latestDay.instrucao.descricao}
                </p>
              </div>

              {/* Alterations summary */}
              {latestDay.alteracoes.hasAlteracao && (
                <div className="mt-3 p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-xs flex items-start gap-2.5">
                  <HeartPulse className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 font-semibold">Alterações do dia: </strong>
                    <span className="text-slate-300">{latestDay.alteracoes.raw}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Faxina escalada: <strong className="text-slate-200">{latestDay.faxina.numbers.length} alunos</strong>
              </span>
              <button
                onClick={() => onSelectDay(latestDay)}
                className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition"
              >
                <span>Ver registro completo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Side Panel: Maritime & Medical Alerts (1 col) */}
        <div className="space-y-6">
          
          {/* Waves distribution */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Waves className="h-4 w-4 text-cyan-400" />
              Condições do Mar (Ondulação)
            </h3>
            <div className="space-y-2">
              {Object.entries(wavesBreakdown || {}).map(([cond, count]) => (
                <div key={cond} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/40 border border-slate-800">
                  <span className="text-slate-300 font-medium">{cond}</span>
                  <span className="font-mono-numbers px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50 font-bold">
                    {count} {count === 1 ? 'dia' : 'dias'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Medical Alterations */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <HeartPulse className="h-4 w-4" />
                Últimas Baixas / Alterações
              </h3>
              <button 
                onClick={() => setActiveTab('discipline')} 
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Ver todas
              </button>
            </div>
            <div className="space-y-2.5">
              {recentAlterations?.map((d) => (
                <div key={d.id} className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono-numbers">
                    <span className="font-semibold text-slate-300">{d.date} (Dia #{d.id})</span>
                    <span className="text-amber-400">Xerife: #{d.xerife.formattedNumber}</span>
                  </div>
                  <p className="text-slate-300 text-xs line-clamp-2">{d.alteracoes.raw}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

