import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Pill, ChevronLeft, ChevronRight, FileDown, 
  Plus, X, Pencil, Trash2, UserCircle, Bell, BellOff, BellRing, 
  XCircle, Phone, HeartPulse, ShieldAlert, Activity, Moon, Sun, BookOpen, MessageSquare, Calendar
} from 'lucide-react';
import jsPDF from 'jspdf';

const getStartOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDate = (date) => date.toISOString().split('T')[0];

export default function MedTracker() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getStartOfWeek(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmergenciasOpen, setIsEmergenciasOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [editingMedId, setEditingMedId] = useState(null);
  const [notifStatus, setNotifStatus] = useState('default');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dark-mode') === 'true');

  const [patientName, setPatientName] = useState(() => localStorage.getItem('botiquin-paciente') || '');
  const [tempPatientName, setTempPatientName] = useState(patientName);
  
  const [meds, setMeds] = useState(() => {
    const saved = localStorage.getItem('botiquin-v22-data');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyNotes, setDailyNotes] = useState(() => {
    const saved = localStorage.getItem('botiquin-v22-notes');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  const healthQuestions = [
    "¿Cómo te has sentido hoy?",
    "¿Notas cambios en tu metabolismo o apetito?",
    "¿Hubo mareos, fatiga o dolor inusual?",
    "¿Cómo estuvo tu energía general?",
    "¿Notaste cambios en tu estado de ánimo?",
    "¿Alguna reacción después de la medicación?"
  ];

  // --- LÓGICA DE NOTIFICACIONES (RESTABLECIDA) ---
  const handleNotifClick = async () => {
    if (!('Notification' in window)) {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification("🔔 ¡Notificaciones Activas!", {
        body: "Te avisaré cuando sea hora de tu medicación.",
        icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png'
      });
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = formatDate(now);

      for (let med of meds) {
        if (med.time === currentTime && med.history[todayStr] === undefined) {
          if (Notification.permission === "granted") {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification(`💊 Es hora: ${med.name}`, {
              body: `Dosis: ${med.dosage}. Toca para abrir el botiquín.`,
              vibrate: [200, 100, 200],
              requireInteraction: true
            });
          }
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [meds]);

  useEffect(() => {
    localStorage.setItem('botiquin-v22-data', JSON.stringify(meds));
    localStorage.setItem('botiquin-v22-notes', JSON.stringify(dailyNotes));
    localStorage.setItem('botiquin-paciente', patientName);
    localStorage.setItem('dark-mode', darkMode);
  }, [meds, dailyNotes, patientName, darkMode]);

  // --- CÁLCULO DE INTERVALO SEMANAL ---
  const getWeekIntervalText = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `Del ${currentWeekStart.getDate()} al ${end.getDate()} de ${currentWeekStart.toLocaleDateString('es-ES', { month: 'long' })}`;
  };

  const saveMedication = (e) => {
    if (e) e.preventDefault();
    if (!newName) return;
    if (editingMedId) {
      setMeds(meds.map(m => m.id === editingMedId ? { ...m, name: newName, dosage: newDosage, time: newTime } : m));
    } else {
      setMeds([...meds, { id: Date.now(), name: newName, dosage: newDosage, time: newTime, history: {} }]);
    }
    setNewName(''); setNewDosage(''); setIsModalOpen(false); setEditingMedId(null);
  };

  const handleToggle = (medId, dateStr) => {
    setMeds(prev => prev.map(m => {
      if (m.id === medId) {
        const curr = m.history[dateStr];
        let next = curr === undefined ? true : curr === true ? false : undefined;
        return { ...m, history: { ...m.history, [dateStr]: next } };
      }
      return m;
    }));
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const viewDate = new Date(currentWeekStart);
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    doc.setFont("helvetica", "bold").setFontSize(22);
    doc.text("REPORTE MÉDICO", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(37, 99, 235).text(`${monthNames[viewMonth].toUpperCase()} ${viewYear}`, pageWidth / 2, 28, { align: "center" });
    doc.setFontSize(10).setTextColor(100).text(`Paciente: ${patientName.toUpperCase()}`, pageWidth / 2, 35, { align: "center" });

    let y = 50;
    meds.forEach((med, idx) => {
      if (y > 230) { doc.addPage(); y = 25; }
      doc.setFillColor(30, 41, 59).rect(15, y - 5, pageWidth - 30, 10, 'F');
      doc.setTextColor(255).setFontSize(11).text(`${idx + 1}. ${med.name} (${med.dosage})`, 20, y + 1.5);
      y += 12; doc.setTextColor(0).setFontSize(8);
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = formatDate(new Date(viewYear, viewMonth, d));
        const status = med.history[dStr];
        doc.text(`Día ${d}: ${status === true ? 'TOMADA' : status === false ? 'FALLO' : '---'}`, 20, y);
        y += 5; if (y > 280) { doc.addPage(); y = 20; }
      }
      y += 10;
    });

    doc.addPage();
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(30, 41, 59);
    doc.text("ANOTACIONES DEL MES", 15, 20);
    doc.line(15, 23, pageWidth - 15, 23);
    y = 35;
    Object.keys(dailyNotes).sort().forEach(dateKey => {
      const d = new Date(dateKey + "T00:00:00");
      if (d.getMonth() === viewMonth && dailyNotes[dateKey]) {
        doc.setFont("helvetica", "bold").text(`${d.getDate()}/${viewMonth+1}: `, 15, y);
        doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(dailyNotes[dateKey], pageWidth - 45);
        doc.text(splitText, 35, y);
        y += (splitText.length * 5) + 5;
        if (y > 280) { doc.addPage(); y = 20; }
      }
    });

    doc.save(`Reporte_${monthNames[viewMonth]}_${patientName}.pdf`);
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950' : 'bg-slate-50'} font-sans transition-colors duration-300`}>
      
      {/* --- SIDEBAR NOTAS --- */}
      <aside className={`fixed top-0 left-0 z-[120] h-full bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 w-80 md:w-96 ${isNotesOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black dark:text-white flex items-center gap-2"><BookOpen className="text-blue-600" /> Diario</h2>
            <button onClick={() => setIsNotesOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full dark:text-white"><X size={20}/></button>
          </div>
          <div className="space-y-4 mb-6">
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha:</label>
              <div className="flex gap-2">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 dark:text-white rounded-xl text-sm font-bold outline-none" />
                <button onClick={() => setSelectedDate(formatDate(new Date()))} className="px-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Hoy</button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="bg-yellow-50 dark:bg-slate-800 p-5 rounded-2xl border-l-4 border-yellow-400 min-h-[300px]">
              <textarea value={dailyNotes[selectedDate] || ''} onChange={(e) => setDailyNotes({...dailyNotes, [selectedDate]: e.target.value})} placeholder="Escribe aquí tus síntomas..." className="w-full h-full bg-transparent outline-none text-sm font-medium text-slate-700 dark:text-slate-200 resize-none" />
            </div>
          </div>
        </div>
      </aside>

      {/* --- CONTENIDO --- */}
      <div className="max-w-xl mx-auto p-4 md:p-10 pb-32">
        
        <header className="flex justify-between items-center mb-6 bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsNotesOpen(true)} className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 relative">
              <BookOpen size={24}/>
              {dailyNotes[selectedDate] && <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full"></span>}
            </button>
            <div>
              <h1 className="text-xl font-black dark:text-white">Mi Botiquín</h1>
              <span className="text-[10px] text-blue-500 font-bold uppercase">{patientName}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-yellow-400">
              {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
            </button>
            <button onClick={handleNotifClick} className={`p-2.5 rounded-xl ${notifStatus === 'granted' ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-300'}`}>
              <BellRing size={20}/>
            </button>
            <button onClick={exportPDF} className="bg-slate-900 dark:bg-blue-600 text-white p-3 rounded-xl shadow-lg"><FileDown size={20}/></button>
          </div>
        </header>

        {/* NAVEGACIÓN SEMANAL CON INTERVALO (LO QUE PEDISTE) */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-50 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))} className="dark:text-white p-2"><ChevronLeft size={20}/></button>
              <span className="font-black text-sm uppercase dark:text-white tracking-tighter">
                {currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))} className="dark:text-white p-2"><ChevronRight size={20}/></button>
            </div>
            {/* Intervalo de la semana */}
            <p className="text-center text-[11px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">
              {getWeekIntervalText()}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {meds.map(med => (
              <div key={med.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><Pill size={18}/></div>
                    <div>
                      <h2 className="font-bold text-slate-800 dark:text-white leading-none">{med.name}</h2>
                      <span
