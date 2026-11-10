import React from 'react';
import { X, Printer, Calendar, User, Waves, ShieldAlert, Award } from 'lucide-react';

export default function PrintReportModal({ day, onClose }) {
  if (!day) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
      <div 
        className="bg-white text-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Actions bar */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between no-print">
          <span className="text-sm font-bold text-slate-700">Relatório Oficial de Instrução</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-700 hover:bg-cyan-800 text-white shadow transition"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 font-sans print:p-0">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
              Corpo de Bombeiros Militar / Salvamento no Mar
            </h1>
            <h2 className="text-base font-bold text-slate-700">
              LIVRO DOS ALUNOS - CSMAR 02/2026
            </h2>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold text-slate-600 mt-2">
              <span>DATA: {day.date}</span>
              <span>•</span>
              <span>DIA DE INSTRUÇÃO: #{day.id}</span>
              <span>•</span>
              <span>XERIFE: {day.xerife.raw}</span>
            </div>
          </div>

          {/* Mar Section */}
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
            <h3 className="text-xs font-black uppercase text-slate-700 border-b border-slate-200 pb-1 mb-2">
              Condições Marítimas do Dia
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-500">Tamanho das Ondas (07h00): </span>
                <span className="font-bold text-slate-900">{day.mar.tamanhoOndas}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Correnteza: </span>
                <span className="font-bold text-slate-900">{day.mar.corrente}</span>
              </div>
            </div>
          </div>

          {/* Instrução Detalhada */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Descrição Detalhada da Instrução
            </h3>
            <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
              {day.instrucao.descricao || 'Nenhuma descrição detalhada informada.'}
            </p>
          </div>

          {/* Ordens Recebidas */}
          {day.instrucao.cleanOrdens && (
            <div>
              <h3 className="text-xs font-black uppercase text-slate-700 border-b border-slate-300 pb-1 mb-2">
                Ordens Recebidas
              </h3>
              <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                {day.instrucao.cleanOrdens}
              </p>
            </div>
          )}

          {/* Alterações e Fatos Observados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-700 border-b border-slate-300 pb-1 mb-2">
                Alterações de Alunos
              </h3>
              <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded border border-slate-200 min-h-[60px]">
                {day.alteracoes.hasAlteracao ? day.alteracoes.raw : 'Sem alterações registradas.'}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase text-slate-700 border-b border-slate-300 pb-1 mb-2">
                Fatos Observados (FO)
              </h3>
              <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded border border-slate-200 min-h-[60px] space-y-1">
                {day.foPositive ? <div><strong className="text-emerald-700">FO+:</strong> {day.foPositive}</div> : null}
                {day.foNegative ? <div><strong className="text-rose-700">FO-:</strong> {day.foNegative}</div> : null}
                {!day.foPositive && !day.foNegative && <div className="text-slate-500">Sem FOs registrados.</div>}
              </div>
            </div>
          </div>

          {/* Faxina */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-700 border-b border-slate-300 pb-1 mb-2">
              Escala de Faxina
            </h3>
            <p className="text-xs font-mono text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200">
              {day.faxina.raw || 'Nenhum aluno escalado para faxina registrado.'}
            </p>
          </div>

          {/* Assinatura */}
          <div className="pt-8 flex justify-end">
            <div className="text-center w-64 border-t border-slate-800 pt-2">
              <p className="text-xs font-bold">{day.xerife.raw}</p>
              <p className="text-[10px] text-slate-600 uppercase">Xerife de Dia - CSMAR 02/2026</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

