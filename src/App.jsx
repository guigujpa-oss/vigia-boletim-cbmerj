import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import OverviewTab from './components/OverviewTab.jsx';
import DailyDetailTab from './components/DailyDetailTab.jsx';
import DiaryTab from './components/DiaryTab.jsx';
import StudentsTab from './components/StudentsTab.jsx';
import DisciplineTab from './components/DisciplineTab.jsx';
import DutyTab from './components/DutyTab.jsx';
import StudentDossierModal from './components/StudentDossierModal.jsx';
import PrintReportModal from './components/PrintReportModal.jsx';
import AddAlterationModal from './components/AddAlterationModal.jsx';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [activeTab, setActiveTab] = useState('dailyDetail');
  const [selectedDayId, setSelectedDayId] = useState(null);
  
  // Modals state
  const [selectedStudentNumber, setSelectedStudentNumber] = useState(null);
  const [selectedPrintDay, setSelectedPrintDay] = useState(null);
  const [isAlterationModalOpen, setIsAlterationModalOpen] = useState(false);

  // Fetch data
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Falha ao comunicar com o servidor');
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastSync(json.lastSync);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados do CSMAR.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Manual sync with Google Sheets
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setLastSync(json.lastSync);
      } else {
        alert(json.error || 'Erro na sincronização');
      }
    } catch (err) {
      console.error(err);
      alert('Falha ao conectar com o serviço de sincronização');
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete manual alteration
  const handleDeleteAlteration = async (id) => {
    if (!window.confirm('Deseja realmente remover esta alteração da coordenação?')) {
      return;
    }
    try {
      const res = await fetch(`/api/alterations/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir alteração.');
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh data silently every 30 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const selectedStudent = data?.students?.find(s => s.number === selectedStudentNumber);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-4">
        <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
        <div className="text-center">
          <h2 className="text-base font-bold text-white">Carregando Livro do Aluno CSMAR 02/2026...</h2>
          <p className="text-xs text-slate-500 mt-1">Processando partes de serviço e registros operacionais</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-slate-900 border border-rose-900/40 p-6 rounded-2xl max-w-md w-full shadow-2xl">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-white mb-2">Erro ao Iniciar Sistema</h2>
          <p className="text-xs text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => fetchData()}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Navigation */}
      <Navbar
        lastSync={lastSync}
        isSyncing={isSyncing}
        onSync={handleSync}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalAlunos={data?.kpis?.totalAlunos || 0}
        alunosAtivos={data?.kpis?.alunosAtivos || 0}
        onOpenAlterationModal={() => setIsAlterationModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            data={data}
            onSelectStudent={(num) => setSelectedStudentNumber(num)}
            onSelectDay={(day) => {
              setSelectedDayId(day.id);
              setActiveTab('dailyDetail');
            }}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'dailyDetail' && (
          <DailyDetailTab
            days={data.days}
            selectedDayId={selectedDayId}
            onSelectDayId={(id) => setSelectedDayId(id)}
            onSelectStudent={(num) => setSelectedStudentNumber(num)}
            onPrintDay={(day) => setSelectedPrintDay(day)}
          />
        )}

        {activeTab === 'diary' && (
          <DiaryTab
            days={data.days}
            onSelectStudent={(num) => setSelectedStudentNumber(num)}
            onPrintDay={(day) => setSelectedPrintDay(day)}
            onOpenDailyDetail={(dayId) => {
              setSelectedDayId(dayId);
              setActiveTab('dailyDetail');
            }}
          />
        )}

        {activeTab === 'students' && (
          <StudentsTab
            students={data.students}
            onSelectStudent={(num) => setSelectedStudentNumber(num)}
          />
        )}

        {activeTab === 'discipline' && (
          <DisciplineTab
            days={data.days}
            students={data.students}
            onSelectStudent={(num) => setSelectedStudentNumber(num)}
          />
        )}

        {activeTab === 'duty' && (
          <DutyTab
            students={data.students}
            onSelectStudent={(num) => setSelectedStudentNumber(num)}
          />
        )}
      </main>

      {/* Modals */}
      {selectedStudent && (
        <StudentDossierModal
          student={selectedStudent}
          onClose={() => setSelectedStudentNumber(null)}
        />
      )}

      {selectedPrintDay && (
        <PrintReportModal
          day={selectedPrintDay}
          onClose={() => setSelectedPrintDay(null)}
        />
      )}

      {isAlterationModalOpen && (
        <AddAlterationModal
          students={data?.students || []}
          onClose={() => setIsAlterationModalOpen(false)}
          onAlterationAdded={(updatedData) => {
            if (updatedData) setData(updatedData);
          }}
          existingAlterations={data?.manualAlterations || []}
          onDeleteAlteration={handleDeleteAlteration}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-[11px] text-slate-500 no-print">
        CSMAR 02/2026 • Sistema de Acompanhamento e Controle Operacional • Sincronização Automática com Google Sheets
      </footer>

    </div>
  );
}

