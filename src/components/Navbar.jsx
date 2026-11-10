import React from 'react';
import { 
  Waves, 
  RefreshCw, 
  FileSpreadsheet, 
  ExternalLink,
  ShieldAlert,
  Clock,
  Sparkles,
  Bot
} from 'lucide-react';

export default function Navbar({ 
  lastSync, 
  isSyncing, 
  onSync, 
  activeTab, 
  setActiveTab,
  totalAlunos,
  alunosAtivos,
  onOpenAlterationModal
}) {
  const tabs = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'dailyDetail', label: 'Raio-X do Dia' },
    { id: 'diary', label: 'Diário de Bordo' },
    { id: 'students', label: 'Dossiê dos Alunos' },
    { id: 'discipline', label: 'Disciplina & Baixas' },
    { id: 'duty', label: 'Escalas & Faxina' },
  ];

  const formatLastSync = (isoString) => {
    if (!isoString) return 'Nunca';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-900/30 border border-cyan-400/30">
              <Waves className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">CSMAR 02/2026</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Salvamento no Mar
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Efetivo: <strong className="text-slate-200">{alunosAtivos}</strong>/{totalAlunos} alunos</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Auto-Sync Ativo
                </span>
              </p>
            </div>
          </div>

          {/* Actions & Live Sync */}
          <div className="flex items-center gap-2.5">
            <a 
              href="https://docs.google.com/spreadsheets/d/1QKbUcoVzsnmXQINu43AmGXr81zz5pxksd6rW8nEYmSU/edit" 
              target="_blank" 
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
              title="Abrir Planilha de Respostas no Google Sheets"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Planilha</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>

            <div className="hidden md:flex flex-col items-end text-[11px] text-slate-400 pr-1">
              <span className="text-slate-500">Última checagem:</span>
              <span className="font-mono text-slate-300 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                {formatLastSync(lastSync)}
              </span>
            </div>

            <button
              onClick={onOpenAlterationModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm border border-cyan-400/30 transition active:scale-95"
              title="Adicionar Alteração ou Desligamento com IA"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nova Alteração (IA)</span>
              <span className="sm:hidden">+ Alteração</span>
            </button>

            <button
              onClick={onSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition border shadow-sm ${
                isSyncing 
                  ? 'bg-cyan-950/60 border-cyan-700/50 text-cyan-300 cursor-not-allowed' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400/40 shadow-cyan-900/40 hover:shadow-cyan-600/20 active:scale-95'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-cyan-300' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 overflow-x-auto border-t border-slate-800/60 py-2 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}

