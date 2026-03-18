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
    const saved = localStorage.getItem('botiquin-v14-final');
    return saved ? JSON.parse(saved) : [];
  });

  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    localStorage.setItem('botiquin-v14-final', JSON.stringify(meds));
    localStorage.setItem('botiquin-paciente', patientName);
  }, [meds, patientName]);

  // --- FUNCIÓN PARA GUARDAR (LA QUE FALTABA) ---
  const saveMedication = (e) => {
    if (e) e.preventDefault();
    if (!newName) return;

    if (editingMedId) {
      setMeds(meds.map(m => m.id === editingMedId ? { ...m, name: newName, dosage: newDosage, time: newTime } : m));
    } else {
      const newMed = {
        id: Date.now(),
        name: newName,
        dosage: newDosage,
        time: newTime,
        history: {}
      };
      setMeds([...meds, newMed]);
    }
    
    // Limpiar y cerrar
    setNewName('');
    setNewDosage('');
    setNewTime('09:00');
    setEditingMedId(null);
    setIsModalOpen(false);
  };

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
            <p className="text-slate-400 mb-6">Dinos tu nombre para personalizar tus reportes.</p>
            <input type="text" value={tempPatientName} onChange={(e) => setTempPatientName(e.target.value)} placeholder="Tu nombre" className="w-full p-4 rounded-2xl bg-slate-100 mb-4 font-bold outline-none" />
            <button onClick={() => setPatientName(tempPatientName)} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg">Empezar</button>
          </div>
        )}

        <header className="flex justify-between items-center mb-6 bg-white p-5 rounded-[2rem] shadow-sm">
          <div>
            <h1 className="text-xl font-black leading-none">Mi Botiquín</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{patientName}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNotifClick} className="p-2">
              {notifStatus === 'granted' ? <BellRing size={22} className="text-blue-500"/> : <BellOff size={22} className="text-slate-300"/>}
            </button>
            <button onClick={exportPDF} className="bg-slate-900 text-white p-3 rounded-xl shadow-lg"><FileDown size={20}/></button>
          </div>
        </header>

        {/* NAVEGADOR FECHAS */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))} className="p-2"><ChevronLeft/></button>
          <span className="font-bold text-sm capitalize text-blue-600">{currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))} className="p-2"><ChevronRight/></button>
        </div>

        {/* LISTA DE MEDICAMENTOS */}
        <div className="space-y-4">
          {meds.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-300 font-bold">Pulsa el botón + para añadir</div>
          )}
          {meds.map(med => (
            <div key={med.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-3 rounded-xl text-white shadow-blue-100 shadow-lg"><Pill size={18}/></div>
                  <div>
                    <h2 className="font-bold text-slate-800 leading-none">{med.name}</h2>
                    <span className="text-[10px] text-slate-300 font-bold uppercase">{med.dosage} • {med.time} HS</span>
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

        {/* BOTÓN AÑADIR */}
        <button onClick={() => {setEditingMedId(null); setNewName(''); setNewDosage(''); setIsModalOpen(true);}} className="fixed bottom-8 right-8 bg-blue-600 text-white p-5 rounded-full shadow-2xl z-50 hover:scale-110 active:scale-90 transition-all">
          <Plus size={28}/>
        </button>

        {/* MODAL FORMULARIO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-black mb-6 text-slate-800">{editingMedId ? 'Editar Medicina' : 'Nueva Medicina'}</h2>
              <form onSubmit={saveMedication} className="space-y-4">
                <input autoFocus type="text" placeholder="Nombre" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Dosis" value={newDosage} onChange={e => setNewDosage(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold shadow-lg shadow-blue-100 mt-2 uppercase tracking-widest text-sm">Guardar</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-bold p-2 text-xs uppercase tracking-widest">Cancelar</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
