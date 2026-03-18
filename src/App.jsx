import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Pill, ChevronLeft, ChevronRight, FileDown, Plus, X, Pencil, Trash2, UserCircle, Bell, BellOff, BellRing, XCircle, Phone, HeartPulse, ShieldAlert, Activity } from 'lucide-react';
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
  const [editingMedId, setEditingMedId] = useState(null);
  
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  
  const [patientName, setPatientName] = useState(() => localStorage.getItem('botiquin-paciente') || '');
  const [tempPatientName, setTempPatientName] = useState(patientName);

  const [meds, setMeds] = useState(() => {
    const saved = localStorage.getItem('botiquin-v16-full');
    return saved ? JSON.parse(saved) : [];
  });

  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    localStorage.setItem('botiquin-v16-full', JSON.stringify(meds));
    localStorage.setItem('botiquin-paciente', patientName);
  }, [meds, patientName]);

  // --- SISTEMA DE NOTIFICACIONES ---
  const handleNotifClick = () => {
    if (typeof Notification === 'undefined') {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }
    Notification.requestPermission().then(setNotifStatus);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = formatDate(now);

      meds.forEach(med => {
        if (med.time === currentTime && med.history[todayStr] === undefined) {
          if (Notification.permission === "granted") {
            new Notification(`💊 Hora de tu ${med.name}`, {
              body: `Dosis: ${med.dosage}. Marcá tu toma en la app.`,
              requireInteraction: true
            });
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [meds]);

  // --- LÓGICA DE GUARDAR ---
  const saveMedication = (e) => {
    if (e) e.preventDefault();
    if (!newName) return;
    if (editingMedId) {
      setMeds(meds.map(m => m.id === editingMedId ? { ...m, name: newName, dosage: newDosage, time: newTime } : m));
    } else {
      setMeds([...meds, { id: Date.now(), name: newName, dosage: newDosage, time: newTime, history: {} }]);
    }
    setNewName(''); setNewDosage(''); setNewTime('09:00');
    setEditingMedId(null); setIsModalOpen(false);
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
    doc.text("REPORTE DE MEDICACIÓN", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(37, 99, 235);
    doc.text(`${monthNames[viewMonth].toUpperCase()} ${viewYear}`, pageWidth / 2, 28, { align: "center" });
    doc.setFontSize(10).setTextColor(100).setFont("helvetica", "normal");
    doc.text(`Paciente: ${patientName.toUpperCase()}`, pageWidth / 2, 35, { align: "center" });
    doc.line(15, 38, pageWidth - 15, 38);

    let y = 50;
    meds.forEach((med, idx) => {
      if (y > 220) { doc.addPage(); y = 25; }
      doc.setFillColor(30, 41, 59).rect(15, y - 5, pageWidth - 30, 10, 'F');
      doc.setTextColor(255).setFontSize(11);
      doc.text(`${idx + 1}. ${med.name} (${med.dosage}) - ${med.time} HS`, 20, y + 1.5);
      y += 12; doc.setTextColor(0).setFontSize(8);
      for (let d = 1; d <= daysInMonth; d++) {
        const dObj = new Date(viewYear, viewMonth, d);
        const dStr = formatDate(dObj);
        const status = med.history[dStr];
        doc.text(`${dObj.toLocaleDateString('es-ES', { weekday: 'short' })} ${d}: ${status === true ? 'TOMADA' : status === false ? 'FALLO' : '---'}`, 20, y);
        y += 5; if (y > 280) { doc.addPage(); y = 20; }
      }
      y += 10;
    });
    doc.save(`Reporte_${monthNames[viewMonth]}_${patientName}.pdf`);
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900 pb-32">
      <div className="max-w-xl mx-auto">
        
        {/* PANTALLA BIENVENIDA */}
        {!patientName && (
          <div className="fixed inset-0 bg-white z-[100] p-10 flex flex-col items-center justify-center text-center">
            <Activity size={60} className="text-blue-500 mb-6 animate-pulse" />
            <h2 className="text-3xl font-black mb-2">Bienvenido</h2>
            <p className="text-slate-400 mb-8 text-sm">Tu registro de salud personal.</p>
            <input type="text" value={tempPatientName} onChange={(e) => setTempPatientName(e.target.value)} placeholder="Nombre del Paciente" className="w-full p-5 rounded-2xl bg-slate-100 mb-4 font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" />
            <button onClick={() => setPatientName(tempPatientName)} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold shadow-xl">Comenzar</button>
          </div>
        )}

        <header className="flex justify-between items-center mb-6 bg-white p-5 rounded-[2rem] shadow-sm">
          <div>
            <h1 className="text-xl font-black leading-none">Mi Botiquín</h1>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">{patientName}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNotifClick} className={`p-2 rounded-xl transition-all ${notifStatus === 'granted' ? 'text-blue-500 bg-blue-50' : 'text-slate-300'}`}>
              {notifStatus === 'granted' ? <BellRing size={22}/> : <BellOff size={22}/>}
            </button>
            <button onClick={exportPDF} className="bg-slate-900 text-white p-3 rounded-xl shadow-lg"><FileDown size={20}/></button>
          </div>
        </header>

        {/* TRACKER SEMANAL */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
            <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))}><ChevronLeft/></button>
            <span className="font-bold text-xs uppercase tracking-tighter text-slate-400">
              {currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))}><ChevronRight/></button>
          </div>

          <div className="space-y-4">
            {meds.map(med => (
              <div key={med.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-3 rounded-xl text-white shadow-lg"><Pill size={18}/></div>
                    <div>
                      <h2 className="font-bold text-slate-800 leading-none">{med.name}</h2>
                      <span className="text-[10px] text-slate-300 font-bold">{med.dosage} • {med.time} HS</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => {setEditingMedId(med.id); setNewName(med.name); setNewDosage(med.dosage); setNewTime(med.time); setIsModalOpen(true);}} className="p-2 text-slate-200"><Pencil size={18}/></button>
                    <button onClick={() => {if(window.confirm("¿Eliminar?")) setMeds(meds.filter(m => m.id !== med.id))}} className="p-2 text-slate-200"><Trash2 size={18}/></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map(date => {
                    const dStr = formatDate(date);
                    const status = med.history[dStr];
                    const isToday = formatDate(new Date()) === dStr;
                    return (
                      <button key={dStr} onClick={() => handleToggle(med.id, dStr)} className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${status === true ? 'bg-blue-600 border-blue-600 text-white shadow-md' : status === false ? 'bg-red-50 border-red-100 text-red-500' : 'bg-slate-50 border-slate-50 text-slate-200'}`}>
                        <span className={`text-[8px] font-bold ${isToday && status === undefined ? 'text-blue-500' : ''}`}>{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                        <span className="text-[11px] font-black">{date.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN DE EMERGENCIAS ARGENTINA */}
        <div className="bg-red-50 rounded-[2.5rem] p-8 border border-red-100 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert className="text-red-600" size={28} />
            <h2 className="text-xl font-black text-red-900 tracking-tight">Emergencias (Arg)</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <a href="tel:107" className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:bg-red-100 transition-colors">
              <HeartPulse className="text-red-600 mb-2" />
              <span className="text-2xl font-black text-red-600">107</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ambulancia</span>
            </a>
            <a href="tel:911" className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:bg-red-100 transition-colors">
              <ShieldAlert className="text-blue-600 mb-2" />
              <span className="text-2xl font-black text-blue-600">911</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Policía</span>
            </a>
          </div>

          <div className="mt-6 space-y-3">
            <div className="bg-white/50 p-4 rounded-2xl border border-red-100">
              <p className="text-xs font-black text-red-800 uppercase mb-2 flex items-center gap-2">
                <Activity size={14}/> Mutuales y Obras Sociales
              </p>
              <div className="space-y-2">
                <a href="tel:08108101033" className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">OSEP Mendoza</span>
                  <span className="bg-red-600 text-white px-3 py-1 rounded-lg font-black text-xs">0810-810-1033</span>
                </a>
                <a href="tel:138" className="flex justify-between items-center text-sm border-t border-red-50 pt-2">
                  <span className="font-bold text-slate-700">PAMI (Escucha)</span>
                  <span className="bg-slate-800 text-white px-3 py-1 rounded-lg font-black text-xs">138</span>
                </a>
                <a href="tel:08009990091" className="flex justify-between items-center text-sm border-t border-red-50 pt-2">
                  <span className="font-bold text-slate-700">Salud Mental</span>
                  <span className="bg-slate-800 text-white px-3 py-1 rounded-lg font-black text-xs">0800-999-0091</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => {setEditingMedId(null); setNewName(''); setIsModalOpen(true);}} className="fixed bottom-8 right-8 bg-blue-600 text-white p-5 rounded-full shadow-2xl z-50 hover:scale-110 active:scale-90 transition-all">
          <Plus size={28}/>
        </button>

        {/* MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-black mb-6 text-slate-800">{editingMedId ? 'Editar' : 'Nuevo'}</h2>
              <form onSubmit={saveMedication} className="space-y-4">
                <input autoFocus type="text" placeholder="Nombre" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Dosis" value={newDosage} onChange={e => setNewDosage(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold shadow-lg mt-2 uppercase text-sm tracking-widest">Guardar</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold p-2 text-xs uppercase">Cancelar</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
