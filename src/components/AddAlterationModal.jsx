import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Bot, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  HeartPulse, 
  Award, 
  Brush, 
  Trash2, 
  Calendar, 
  User, 
  FileEdit,
  ArrowRight,
  Loader2
} from 'lucide-react';

export default function AddAlterationModal({ 
  students, 
  onClose, 
  onAlterationAdded, 
  existingAlterations = [],
  onDeleteAlteration
}) {
  const [mode, setMode] = useState('agent'); // 'agent' | 'manual' | 'list'
  
  // Agent input state
  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

  // Form fields (prefilled by agent or manually entered)
  const [selectedStudentNumber, setSelectedStudentNumber] = useState('');
  const [type, setType] = useState('desligamento');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  });
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Quick prompt examples
  const examplePrompts = [
    "Aluno 12 foi desligado hoje por lesão no ombro",
    "Lançar FO- no aluno 22 por atraso na formatura",
    "Aluno 07 baixou na enfermaria com corte no pé",
    "FO+ para aluno 46 pelo excelente resgate no mar",
  ];

  // Auto-parse on user text change with a debounce
  useEffect(() => {
    if (!rawText.trim()) {
      setParsedResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const res = await fetch('/api/agent/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText }),
        });
        const json = await res.json();
        if (json.success && json.parsed) {
          setParsedResult(json.parsed);
          if (json.parsed.studentNumber) {
            setSelectedStudentNumber(json.parsed.studentNumber.toString());
          }
          if (json.parsed.type) {
            setType(json.parsed.type);
          }
          if (json.parsed.date) {
            setDate(json.parsed.date);
          }
          if (json.parsed.reason) {
            setReason(json.parsed.reason);
          }
        }
      } catch (err) {
        console.error('Agent parse error:', err);
      } finally {
        setIsAnalyzing(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [rawText]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedStudentNumber || !reason.trim()) {
      alert('Selecione um aluno e informe o motivo.');
      return;
    }

    const studentObj = students.find(s => s.number === parseInt(selectedStudentNumber, 10));

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/alterations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: selectedStudentNumber,
          studentName: studentObj ? studentObj.name : `Aluno ${selectedStudentNumber}`,
          type,
          date,
          reason,
          rawText: rawText || '',
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: 'Alteração lançada com sucesso no sistema!' });
        if (onAlterationAdded) {
          onAlterationAdded(json.data);
        }
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setStatusMessage({ type: 'error', text: json.message || 'Erro ao registrar.' });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Falha na comunicação com o servidor.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionBadge = (actionType) => {
    switch (actionType) {
      case 'desligamento':
        return { label: 'Desligamento / Baixa Definitiva', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: ShieldAlert };
      case 'baixa_medica':
        return { label: 'Baixa Médica / Licença', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', icon: HeartPulse };
      case 'fo_positivo':
        return { label: 'Fato Observado Positivo (FO+)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: Award };
      case 'fo_negativo':
        return { label: 'Fato Observado Negativo (FO-)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', icon: AlertTriangle };
      case 'faxina':
        return { label: 'Escala de Faxina', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', icon: Brush };
      default:
        return { label: 'Observação Geral', color: 'bg-slate-700 text-slate-300 border-slate-600', icon: FileEdit };
    }
  };

  const currentBadge = getActionBadge(type);
  const ActionIcon = currentBadge.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-900/30 border border-cyan-400/30">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Agente de Alterações & Lançamentos</span>
                  <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    IA Gratuita & Local
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lance desligamentos, baixas médicas e FOs esquecidos pelo xerife em linguagem natural.
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

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => setMode('agent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                mode === 'agent'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Linguagem Natural (IA)</span>
            </button>

            <button
              onClick={() => setMode('manual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                mode === 'manual'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Formulário Direto</span>
            </button>

            <button
              onClick={() => setMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ml-auto flex items-center gap-1.5 ${
                mode === 'list'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <span>Lançamentos Ativos ({existingAlterations.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {statusMessage && (
            <div className={`p-3 rounded-2xl text-xs font-medium border flex items-center gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' 
                : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
            }`}>
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* MODE 1: AGENT / NATURAL LANGUAGE */}
          {mode === 'agent' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Digite a ocorrência como preferir:
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Ex.: Aluno 12 foi desligado hoje por lesão no ombro na arrebentação..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl p-3.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition leading-relaxed resize-none font-sans"
                  />
                  {isAnalyzing && (
                    <div className="absolute right-3.5 bottom-3.5 flex items-center gap-1.5 text-[11px] text-cyan-400 bg-slate-900/90 px-2 py-0.5 rounded-md border border-cyan-500/20 font-mono-numbers">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Agente analisando...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Examples */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Exemplos rápidos (clique para testar):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {examplePrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRawText(p)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] transition text-left"
                    >
                      "{p}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Interpretation Box */}
              {parsedResult && (
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-cyan-500/40 space-y-3 animate-fade-in shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                      <Bot className="h-4 w-4 text-cyan-400" />
                      Interpretação do Agente
                    </span>
                    <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Confiança: {parsedResult.confidence}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Ação Detectada</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border mt-0.5 ${currentBadge.color}`}>
                        <ActionIcon className="h-3.5 w-3.5" />
                        <span>{currentBadge.label}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Militar Afetado</span>
                      <span className="font-bold text-white block mt-1">
                        #{selectedStudentNumber ? (parseInt(selectedStudentNumber, 10) < 10 ? `0${selectedStudentNumber}` : selectedStudentNumber) : '??'} — {parsedResult.studentName}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Data de Vigência</span>
                      <span className="font-mono-numbers text-slate-200 font-bold block mt-1">
                        {date}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Motivo Extraído</span>
                      <span className="text-slate-200 block mt-1 leading-snug">
                        {reason || 'Sem motivo identificado'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: FORM / REFINEMENT (also shown in agent mode to refine) */}
          {(mode === 'manual' || parsedResult) && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Aluno */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Militar / Aluno:
                  </label>
                  <select
                    value={selectedStudentNumber}
                    onChange={(e) => setSelectedStudentNumber(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="">Selecione o aluno...</option>
                    {students.map((s) => (
                      <option key={s.number} value={s.number}>
                        #{s.formattedNumber} — {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Ocorrência */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Tipo de Ocorrência:
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none"
                  >
                    <option value="desligamento">🚨 Desligamento / Baixa Definitiva</option>
                    <option value="baixa_medica">🏥 Baixa Médica / Licença</option>
                    <option value="fo_positivo">⭐ Fato Observado Positivo (FO+)</option>
                    <option value="fo_negativo">⚠️ Fato Observado Negativo (FO-)</option>
                    <option value="faxina">🧹 Escala de Faxina</option>
                    <option value="observacao">📝 Observação Geral</option>
                  </select>
                </div>

                {/* Data */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Data da Ocorrência (DD/MM/AAAA):
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl py-2 px-3 text-xs text-slate-100 font-mono-numbers focus:outline-none"
                  />
                </div>

                {/* Motivo */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Justificativa / Motivo Detalhado:
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    placeholder="Ex.: Lesão no joelho esquerdo durante instrução de transposição..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none"
                  />
                </div>

              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedStudentNumber || !reason.trim()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition shadow-lg shadow-cyan-950 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Gravando no Sistema...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirmar e Aplicar Alteração</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: ACTIVE ALTERATIONS LIST */}
          {mode === 'list' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Lançamentos Manuais da Coordenação ({existingAlterations.length})
              </h3>
              
              {existingAlterations.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/60 rounded-2xl border border-slate-800">
                  Nenhuma alteração manual lançada até o momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {existingAlterations.map((alt) => {
                    const b = getActionBadge(alt.type);
                    const BIcon = b.icon;

                    return (
                      <div 
                        key={alt.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`p-2 rounded-xl border shrink-0 ${b.color}`}>
                            <BIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                #{alt.studentNumber < 10 ? `0${alt.studentNumber}` : alt.studentNumber} — {alt.studentName}
                              </span>
                              <span className="font-mono-numbers text-[10px] text-slate-400">
                                ({alt.date})
                              </span>
                            </div>
                            <p className="text-slate-300 mt-0.5 leading-snug">{alt.reason}</p>
                          </div>
                        </div>

                        {onDeleteAlteration && (
                          <button
                            onClick={() => onDeleteAlteration(alt.id)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition shrink-0"
                            title="Excluir alteração e reverter efeito"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Alterações gravadas têm efeito imediato no painel e nos dossiês.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

