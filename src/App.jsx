import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Pill, ChevronLeft, ChevronRight, FileDown, Plus, X, XCircle, Bell, BellOff, BellRing, Pencil, Trash2 } from 'lucide-react';
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
  const [editingMedId, setEditingMedId] = useState(null); // Nuevo: rastrear qué editamos
  const [notifStatus, setNotifStatus] = useState(Notification.permission);
  const [meds, setMeds] = useState(() => {
    const saved = localStorage.getItem('botiquin-v11-final-edit');
    return saved ? JSON.parse(saved) : [];
  });

  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    localStorage.setItem('botiquin-v11-final-edit', JSON.stringify(meds));
  }, [meds]);

  // --- NOTIFICACIONES ---
  const handleNotifClick = () => {
    Notification.requestPermission().then(permission => {
      setNotifStatus(permission);
      if (permission === "granted") new Notification("🔔 Alertas Activas");
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = formatDate(now);
      meds.forEach(med => {
        if (med.time === currentTime && med.history[todayStr] === undefined) {
          if (Notification.permission === "granted") {
            new Notification(`💊 Hora de tu ${med.name}`, { body: `Dosis: ${med.dosage}.`, requireInteraction: true });
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [meds]);

  // --- LÓGICA DE EDICIÓN Y AGREGADO ---
  const openModal = (med = null) => {
    if (med) {
      setEditingMedId(med.id);
      setNewName(med.name);
      setNewDosage(med.dosage);
      setNewTime(med.time);
    } else {
      setEditingMedId(null);
      setNewName('');
      setNewDosage('');
      setNewTime('09:00');
    }
    setIsModalOpen(true);
  };

  const saveMedication = (e) => {
    e.preventDefault();
    if (!newName) return;

    if (editingMedId) {
      // Editar existente
      setMeds(meds.map(m => m.id === editingMedId ? { ...m, name: newName, dosage: newDosage, time: newTime } : m));
    } else {
      // Agregar nuevo
      setMeds([...meds, { id: Date.now(), name: newName, dosage: newDosage, time: newTime, history: {} }]);
    }
    setIsModalOpen(false);
  };

  const deleteMed = (id) => {
    if (window.confirm("¿Seguro que quieres eliminar este medicamento y todo su historial?")) {
      setMeds(meds.filter(m => m.id !== id));
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const viewDate = new Date(currentWeekStart);
    const viewMonth = viewDate.getMonth();
    const viewYear = viewDate.getFullYear();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text(`REPORTE: ${monthNames[viewMonth].toUpperCase()} ${viewYear}`, pageWidth / 2, 20, { align: "center" });
    
    let y = 45;
    meds.forEach((med, idx) => {
      if (y > 220) { doc.addPage(); y = 25; }
      doc.setFillColor(30, 41, 59);
      doc.rect(15, y - 5, pageWidth - 30, 10, 'F');
      doc.setTextColor(255);
      doc.text(`${idx + 1}. ${med.name} - ${med.dosage}`, 20, y + 1.5);
      y += 12; doc.setTextColor(0); doc.setFontSize(9);
      doc.text("DÍA", 20, y); doc.text("FECHA", 45, y); doc.text("ESTADO", 90, y);
      doc.line(15, y + 2, pageWidth - 15, y + 2);
      y += 8;
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(viewYear, viewMonth, day);
        const dStr = formatDate(d);
        const status = med.history[dStr];
        doc.text(`${day}`, 22, y);
        doc.text(`${d.toLocaleDateString('es-ES', { weekday: 'short' })} ${day}/${viewMonth + 1}`, 45, y);
        if (status === true) { doc.setTextColor(34, 197, 94); doc.text("TOMADA", 90, y); }
        else if (status === false) { doc.setTextColor(239, 68, 68); doc.text("OLVIDADA", 90, y); }
        else { doc.setTextColor(200); doc.text("Sin datos", 90, y); }
        doc.setTextColor(0); y += 6;
        if (y > 280) { doc.addPage(); y = 25; }
      }
      y += 15;
    });
    doc.save(`Reporte_Mensual_${monthNames[viewMonth]}.pdf`);
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10 font-sans text-slate-900 pb-24">
      <div className="max-w-2xl mx-auto">
        
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-black tracking-tight">Mi Botiquin</h1>
          <div className="flex gap-2">
            <button onClick={handleNotifClick} className={`p-3 rounded-xl border transition-all ${notifStatus === 'granted' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-400'}`}>
              {notifStatus === 'granted' ? <BellRing size={20} /> : <BellOff size={20} />}
            </button>
            <button onClick={exportPDF} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 text-xs">
              <FileDown size={18} /> Exportar Informe Mensual
            </button>
          </div>
        </header>

        {/* NAVEGACIÓN */}
        <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft /></button>
          <span className="font-bold text-blue-600 capitalize text-sm">{currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight /></button>
        </div>

        {/* LISTADO */}
        <div className="space-y-6">
          {meds.map(med => (
            <div key={med.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative group">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg"><Pill /></div>
                  <div>
                    <h2 className="text-xl font-black">{med.name}</h2>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{med.dosage} • {med.time} HS</p>
                  </div>
                </div>
                {/* BOTONES DE ACCIÓN (Editar/Eliminar) */}
                <div className="flex gap-2">
                  <button onClick={() => openModal(med)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><Pencil size={18} /></button>
                  <button onClick={() => deleteMed(med.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>

              {/* CRONOGRAMA */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(date => {
                  const dStr = formatDate(date);
                  const status = med.history[dStr];
                  const isToday = formatDate(new Date()) === dStr;
                  return (
                    <div key={dStr} className="flex flex-col items-center gap-2">
                      <div className="text-center leading-tight">
                        <span className={`text-[9px] font-black uppercase ${isToday ? 'text-blue-600' : 'text-slate-300'}`}>{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                        <span className={`block text-xs font-black ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{date.getDate()}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setMeds(prev => prev.map(m => {
                            if (m.id === med.id) {
                              const curr = m.history[dStr];
                              let next = curr === undefined ? true : curr === true ? false : undefined;
                              return { ...m, history: { ...m.history, [dStr]: next } };
                            }
                            return m;
                          }));
                        }}
                        className={`w-full aspect-square rounded-2xl flex items-center justify-center transition-all border-2 ${status === true ? 'bg-blue-600 border-blue-600 text-white shadow-md' : status === false ? 'bg-red-50 border-red-100 text-red-500' : 'bg-slate-50 border-slate-50 text-slate-200 hover:border-slate-100'}`}
                      >
                        {status === true ? <CheckCircle2 size={18} /> : status === false ? <XCircle size={18} /> : <Circle size={18} strokeWidth={2} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => openModal()} className="fixed bottom-10 right-10 bg-blue-600 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-50">
          <Plus size={32} />
        </button>

        {/* MODAL (Para Agregar y Editar) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-300"><X /></button>
              <h2 className="text-2xl font-black mb-6 tracking-tighter text-slate-800">
                {editingMedId ? 'Editar Medicina' : 'Nueva Medicina'}
              </h2>
              <form onSubmit={saveMedication} className="space-y-4">
                <input autoFocus type="text" placeholder="Nombre" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Dosis" value={newDosage} onChange={(e) => setNewDosage(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" />
                  <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 mt-4 uppercase">
                  {editingMedId ? 'Guardar Cambios' : 'Añadir Medicina'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}