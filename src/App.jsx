import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Pill, ChevronLeft, ChevronRight, FileDown, Plus, X, Pencil, Trash2, UserCircle, Bell, BellOff, BellRing, XCircle, Phone, HeartPulse, ShieldAlert, Activity, LifeBuoy } from 'lucide-react';
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
  const [isEmergenciasOpen, setIsEmergenciasOpen] = useState(false); // Nuevo: Menú emergencias
  const [editingMedId, setEditingMedId] = useState(null);
  
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  
  const [patientName, setPatientName] = useState(() => localStorage.getItem('botiquin-paciente') || '');
  const [tempPatientName, setTempPatientName] = useState(patientName);

  const [meds, setMeds] = useState(() => {
    const saved = localStorage.getItem('botiquin-v18-fab');
    return saved ? JSON.parse(saved) : [];
  });

  const [newName, setNewName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  useEffect(() => {
    localStorage.setItem('botiquin-v18-fab', JSON.stringify(meds));
    localStorage.setItem('botiquin-paciente', patientName);
  }, [meds, patientName]);

  // --- NOTIFICACIONES ---
  const handleNotifClick = () => {
    if (typeof Notification === 'undefined') {
      alert("Navegador no compatible");
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
            new Notification(`💊 Toca tu ${med.name}`, { body: `Dosis: ${med.dosage}`, requireInteraction: true });
          }
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [meds]);

  // --- GUARDAR ---
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
    doc.text("REPORTE DE MEDICACIÓN", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(37, 99, 235);
    doc.text(`${monthNames[viewMonth].toUpperCase()} ${viewYear}`, pageWidth / 2, 28, { align: "center" });
    doc.setFontSize(10).setTextColor(100).text(`Paciente: ${patientName.toUpperCase()}`, pageWidth / 2, 35, { align: "center" });
    
    let y = 50;
    meds.forEach((med, idx) => {
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
            <UserCircle size={60} className="text-blue-600 mb-6" />
            <h2 className="text-3xl font-black mb-2">Hola</h2>
            <input type="text" value={tempPatientName} onChange={(e) => setTempPatientName(e.target.value)} placeholder="Tu nombre" className="w-full p-5 rounded-2xl bg-slate-100 mb-4 font-bold outline-none" />
            <button onClick={() => setPatientName(tempPatientName)} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold shadow-lg">Comenzar</button>
          </div>
        )}

        <header className="flex justify-between items-center mb-6 bg-white p-5 rounded-[2rem] shadow-sm">
          <div>
            <h1 className="text-xl font-black">Mi Botiquín</h1>
            <span className="text-[10px] text-blue-500 font-bold uppercase">{patientName}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleNotifClick} className={`p-2 rounded-xl ${notifStatus === 'granted' ? 'text-blue-500 bg-blue-50' : 'text-slate-300'}`}>
              {notifStatus === 'granted' ? <BellRing size={22}/> : <BellOff size={22}/>}
            </button>
            <button onClick={exportPDF} className="bg-slate-900 text-white p-3 rounded-xl shadow-lg"><FileDown size={20}/></button>
          </div>
        </header>

        {/* NAVEGACIÓN */}
        <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))}><ChevronLeft/></button>
          <span className="font-bold text-xs uppercase text-slate-400">
            {currentWeekStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))}><ChevronRight/></button>
        </div>

        {/* LISTA MEDICAMENTOS */}
        <div className="space-y-6">
          {meds.map(med => (
            <div key={med.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-50 relative">
              <div className="flex justify-between items-center mb-6">
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

        {/* --- BOTONES FLOTANTES --- */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 items-end z-50">
          
          {/* MENÚ DE EMERGENCIAS FLOTANTE */}
          {isEmergenciasOpen && (
            <div className="bg-white rounded-3xl shadow-2xl border border-red-100 p-4 w-64 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between mb-4 px-2">
                <span className="text-xs font-black text-red-600 uppercase tracking-widest">Emergencias</span>
                <button onClick={() => setIsEmergenciasOpen(false)}><X size={16} className="text-slate-300"/></button>
              </div>
              <div className="space-y-2">
                {[
                  { n: 'Ambulancia 107', tel: '107', c: 'text-red-600', i: HeartPulse },
                  { n: 'Policía 911', tel: '911', c: 'text-blue-600', i: ShieldAlert },
                  { n: 'OSEP Mendoza', tel: '0810-810-1033', c: 'text-red-600', i: Activity },
                  { n: 'PAMI 138', tel: '138', c: 'text-slate-600', i: Phone },
                ].map((item, idx) => (
                  <a key={idx} href={`tel:${item.tel.replace(/-/g, '')}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <item.i size={16} className={item.c} />
                      <span className="text-[11px] font-bold text-slate-700">{item.n}</span>
                    </div>
                    <Phone size={10} className="text-red-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Botón de Emergencias (Rojo) */}
          <button 
            onClick={() => setIsEmergenciasOpen(!isEmergenciasOpen)}
            className={`p-4 rounded-full shadow-xl transition-all ${isEmergenciasOpen ? 'bg-red-600 text-white rotate-90' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
          >
            {isEmergenciasOpen ? <X size={24}/> : <ShieldAlert size={24}/>}
          </button>

          {/* Botón Añadir (Azul) */}
          <button 
            onClick={() => {setEditingMedId(null); setNewName(''); setIsModalOpen(true);}}
            className="bg-blue-600 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"
          >
            <Plus size={28}/>
          </button>
        </div>

        {/* MODAL FORMULARIO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[110] p-0 sm:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] p-10 shadow-2xl relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-300"><X /></button>
              <h2 className="text-2xl font-black mb-6 text-slate-800">{editingMedId ? 'Editar' : 'Nuevo'}</h2>
              <form onSubmit={saveMedication} className="space-y-4">
                <input autoFocus type="text" placeholder="Nombre" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Dosis" value={newDosage} onChange={e => setNewDosage(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-bold shadow-lg mt-2 uppercase text-sm tracking-widest">Guardar</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
