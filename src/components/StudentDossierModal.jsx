import React from 'react';
import { 
  X, 
  Award, 
  AlertTriangle, 
  Activity, 
  Sparkles, 
  ShieldCheck, 
  ShieldX, 
  Calendar, 
  Brush, 
  Crown,
  FileText,
  Droplet,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  GraduationCap,
  Users
} from 'lucide-react';

export default function StudentDossierModal({ student, onClose }) {
  if (!student) return null;

  const isDesligado = student.status === 'desligado';
  const hasCadastral = !!student.cadastral;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-6 border-b ${isDesligado ? 'bg-rose-950/20 border-rose-900/40' : 'bg-slate-800/40 border-slate-700'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl flex items-center justify-center border text-2xl sm:text-3xl font-black font-mono-numbers shadow-lg shrink-0 ${
                isDesligado 
                  ? 'bg-rose-950/60 border-rose-500/40 text-rose-300' 
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
              }`}>
                {student.formattedNumber}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{student.name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    isDesligado
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {isDesligado ? 'Desligado' : 'Ativo'}
                  </span>

                  {student.tipoSanguineo && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Droplet className="h-3 w-3 fill-rose-500 text-rose-500" />
                      <span>{student.tipoSanguineo}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-2">
                  <span>Aluno Número: <strong className="text-slate-200">#{student.number}</strong></span>
                  {student.rg && (
                    <>
                      <span>•</span>
                      <span>RG: <strong className="text-slate-200">{student.rg}</strong></span>
                    </>
                  )}
                  {student.idFuncional && (
                    <>
                      <span>•</span>
                      <span>ID: <strong className="text-slate-200">{student.idFuncional}</strong></span>
                    </>
                  )}
                  {isDesligado && student.desligadoEm && (
                    <>
                      <span>•</span>
                      <span className="text-rose-400 font-semibold">Baixa registrada em: {student.desligadoEm}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 sm:p-6 bg-slate-900/60 border-b border-slate-800">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60 text-center">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">FOs Positivos</span>
            <span className="text-xl font-bold font-mono-numbers text-emerald-400">{student.totalFOPos}</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60 text-center">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">FOs Negativos</span>
            <span className="text-xl font-bold font-mono-numbers text-rose-400">{student.totalFONeg}</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60 text-center">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Baixas / Alterações</span>
            <span className="text-xl font-bold font-mono-numbers text-amber-400">{student.totalAlteracoes}</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/60 text-center">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Faxinas Cumpridas</span>
            <span className="text-xl font-bold font-mono-numbers text-cyan-400">{student.totalFaxinas}</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Ficha Cadastral Militar (Dados dos Alunos) */}
          {hasCadastral && (
            <div className="bg-slate-800/30 rounded-2xl p-4 sm:p-5 border border-slate-700/60 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-cyan-400" />
                Dados Cadastrais & Contato
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {student.dataNascimento && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nascimento</span>
                    <span className="text-slate-100 font-mono-numbers font-medium">{student.dataNascimento}</span>
                  </div>
                )}
                {student.celular && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Celular / Contato</span>
                    <a 
                      href={`https://wa.me/55${student.celular.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-cyan-400 hover:text-cyan-300 font-mono-numbers font-medium flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      <span>{student.celular}</span>
                    </a>
                  </div>
                )}
                {student.email && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">E-mail</span>
                    <a 
                      href={`mailto:${student.email}`} 
                      className="text-slate-200 hover:text-cyan-300 truncate block font-medium"
                      title={student.email}
                    >
                      {student.email}
                    </a>
                  </div>
                )}
                {student.cpf && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">CPF</span>
                    <span className="text-slate-200 font-mono-numbers font-medium">{student.cpf}</span>
                  </div>
                )}
                {student.escolaridade && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Escolaridade</span>
                    <span className="text-slate-200 font-medium">{student.escolaridade}</span>
                  </div>
                )}
                {student.filiacao && (student.filiacao.mae || student.filiacao.pai) && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 sm:col-span-2 md:col-span-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Filiação</span>
                    <span className="text-slate-200 text-[11px] block truncate" title={`Mãe: ${student.filiacao.mae || 'N/D'} | Pai: ${student.filiacao.pai || 'N/D'}`}>
                      Mãe: {student.filiacao.mae || 'N/D'}
                    </span>
                  </div>
                )}
                {student.endereco && (
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 sm:col-span-2 md:col-span-3">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-500" />
                      Endereço
                    </span>
                    <span className="text-slate-200 font-medium">{student.endereco}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Histórico Cronológico no Curso */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-cyan-400" />
              Histórico Operacional no Curso
            </h3>

            {/* Xerifados */}
            {student.xerifados.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-3.5 border border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-2">
                  <Crown className="h-4 w-4 text-amber-400" />
                  <span>Atuação como Xerife de Dia ({student.xerifados.length}x)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {student.xerifados.map((x, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono-numbers">
                      {x.date} (Dia #{x.dayIndex})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Alterações / Ocorrências Médicas */}
            {student.alteracoes.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400">Ocorrências / Licenças / Baixas Médicas:</h4>
                {student.alteracoes.map((alt, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs">
                    <div className="flex items-center justify-between text-amber-300 font-medium mb-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Data: {alt.date} (Dia #{alt.dayIndex})
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Alteração Registrada
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{alt.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-800/20 rounded-xl border border-slate-800">
                Nenhuma alteração ou baixa médica registrada para este combatente.
              </div>
            )}

            {/* Escalas de Faxina */}
            {student.faxinas.length > 0 && (
              <div className="bg-slate-800/30 rounded-xl p-3.5 border border-cyan-500/20">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs mb-2">
                  <Brush className="h-4 w-4 text-cyan-400" />
                  <span>Escalas de Faxina Cumpridas ({student.faxinas.length}x)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {student.faxinas.map((f, i) => (
                    <span key={i} className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs font-mono-numbers">
                      {f.date} (Dia #{f.dayIndex})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fatos Observados */}
            {student.foList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400">Fatos Observados (FO):</h4>
                {student.foList.map((fo, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl text-xs border ${
                      fo.type === 'positivo' 
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
                        : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span>{fo.type === 'positivo' ? 'FO+ (Positivo)' : 'FO- (Negativo)'}</span>
                      <span className="text-[10px] font-mono-numbers">{fo.date}</span>
                    </div>
                    <p className="text-slate-300">{fo.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Fechar Dossiê
          </button>
        </div>
      </div>
    </div>
  );
}
