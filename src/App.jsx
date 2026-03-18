import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Pill, ChevronLeft, ChevronRight, FileDown, Plus, X, Pencil, Trash2, UserCircle, Bell, BellOff, BellRing, XCircle } from 'lucide-react';
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
  
  // Seguridad para notificaciones en móvil
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  
  const [patientName, setPatientName] = useState(() => localStorage.getItem('botiquin-paciente') || '');
  const [tempPatientName, setTempPatientName] = useState(patientName);

  const [meds, setMeds] = useState(() => {
    const saved = localStorage.getItem('botiquin-v13-safe');
    return saved ? JSON.parse(saved) : [];
  });

  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    localStorage.setItem('botiquin-v13-safe', JSON.stringify(meds));
    localStorage.setItem('botiquin-paciente', patientName);
  }, [meds, patientName]);

  const handleNotifClick = () => {
    if (typeof Notification === 'undefined') {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }
    Notification.requestPermission().then(setNotifStatus);
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
    const viewDate = new Date(currentWeekStart);
    const viewMonth = viewDate.getMonth();
    const daysInMonth = new Date(viewDate.getFullYear(), viewMonth + 1, 0).getDate();

    doc.setFont("helvetica", "bold").setFontSize(20);
    doc.text(`REPORTE: ${patientName.toUpperCase()}`, pageWidth / 2, 20, { align: "center" });
    
    let y = 40;
    meds.forEach((med, idx) => {
      doc.setFillColor(30, 41, 59).rect(15, y - 5, pageWidth - 30, 10, 'F');
      doc.setTextColor(255).text(`${idx + 1}. ${med.name} (${med.dosage})`, 20, y + 1.5);
      y += 15; doc.setTextColor(0).setFontSize(8);
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = formatDate(new Date(viewDate.getFullYear(), viewMonth, d));
        const status = med.history[dStr];
        doc.text(`Día ${d}: ${status === true ? 'TOMADA' : status === false ? 'FALLO' : '---'}`, 20, y);
        y += 5; if (y > 280) { doc.addPage(); y = 20; }
      }
      y += 10;
    });
    doc.save(`Reporte_${patientName}.pdf`);
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900 pb-24">
      <div className="max-w-xl mx-auto">
        
        {/* PANTALLA BIENVENIDA */}
        {!patientName && (
          <div className="fixed inset-0 bg-white z-[100] p-10 flex flex-col items-center justify-center text-center">
            <UserCircle size={60} className="text-blue-500 mb-6" />
            <h2 className="text-2xl font-black mb-4">¡Hola!</h2>
            <input type="text" value={tempPatientName} onChange={(e) => setTempPatientName(e.target.value)} placeholder="Tu nombre" className="w-full p-4 rounded-xl bg-slate-100 mb-4" />
            <button onClick={() => setPatientName(tempPatientName)} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Empezar</button>
          </div>
        )}

        <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm">
          <h1 className="text-xl font-black">Mi Botiquín</h1>
          <div className="flex gap-2">
            <button onClick={handleNotifClick} className="p-2 text-slate-400">
              {notifStatus === 'granted' ? <BellRing size={20} className="text-blue-500"/> : <Bell size={20}/>}
            </button>
            <button onClick={exportPDF} className="bg-slate-900 text-white p-2 rounded-lg"><FileDown size={18}/></button>
          </div>
        </header>

        <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-2xl shadow-sm">
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))}><ChevronLeft/></button>
          <span className="font-bold text-sm capitalize">{currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))}><ChevronRight/></button>
        </div>

        <div className="space-y-4">
          {meds.map(med => (
            <div key={med.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-lg text-white"><Pill size={18}/></div>
                  <h2 className="font-bold text-slate-800">{med.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {setEditingMedId(med.id); setNewName(med.name); setNewDosage(med.dosage); setNewTime(med.time); setIsModalOpen(true);}} className="text-slate-300"><Pencil size={16}/></button>
                  <button onClick={() => setMeds(meds.filter(m => m.id !== med.id))} className="text-slate-300"><Trash2 size={16}/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map(date => {
                  const dStr = formatDate(date);
                  const status = med.history[dStr];
                  const isToday = formatDate(new Date()) === dStr;
                  return (
                    <button key={dStr} onClick={() => handleToggle(med.id, dStr)} className={`aspect-square rounded-lg flex flex-col items-center justify-center border ${status === true ? 'bg-blue-600 border-blue-600 text-white' : status === false ? 'bg-red-50 border-red-200 text-red-500' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                      <span className="text-[8px] font-bold">{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</span>
                      <span className="text-[10px] font-black">{date.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => {setEditingMedId(null); setNewName(''); setIsModalOpen(true);}} className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg z-50"><Plus/></button>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110]">
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-4">{editingMedId ? 'Editar' : 'Nuevo'}</h2>
              <input type="text" placeholder="Nombre" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 bg-slate-100 rounded-xl mb-3 outline-none" />
              <div className="flex gap-2 mb-4">
                <input type="text" placeholder="Dosis" value={newDosage} onChange={e => setNewDosage(e.target.value)} className="w-1/2 p-3 bg-slate-100 rounded-xl outline-none" />
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-1/2 p-3 bg-slate-100 rounded-xl outline-none" />
              </div>
              <button onClick={saveMedication} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">Guardar</button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 p-2 mt-2">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
