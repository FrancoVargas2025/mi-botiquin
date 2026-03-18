import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, Pill, ChevronLeft, ChevronRight, FileDown, 
  Plus, X, Pencil, Trash2, UserCircle, Bell, BellOff, BellRing, 
  XCircle, Phone, HeartPulse, ShieldAlert, Activity, Moon, Sun, BookOpen, MessageSquare, Calendar, LogOut
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
  
  // Datos principales (Sincronizados con el paciente actual)
  const [meds, setMeds] = useState(() => {
    // Si no hay paciente, no cargamos datos viejos de multiusuario
    if (!localStorage.getItem('botiquin-paciente')) return []; 
    const saved = localStorage.getItem('botiquin-v23-data');
    return saved ? JSON.parse(saved) : [];
  });

  // Notas diarias (Post-its, Sincronizadas)
  const [dailyNotes, setDailyNotes] = useState(() => {
    if (!localStorage.getItem('botiquin-paciente')) return {};
    const saved = localStorage.getItem('botiquin-v23-notes');
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

  // --- LÓGICA DE NOTIFICACIONES ROBUSTA ---
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
        body: "Te avisaré cuando toque tu medicación.",
        icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png'
      });
    }
  };

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    if ('Notification' in window) {
      setNotifStatus(Notification.permission);
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
            registration.showNotification(`Es hora: ${med.name}`, {
              body: `Dosis: ${med.dosage}. Toca para abrir.`,
              icon: 'https://cdn-icons-png.flaticon.com/512/822/822143.png'
            });
          }
        }
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [meds]);

  // Persistencia de datos (Solo si hay paciente)
  useEffect(() => {
    if (patientName) {
      localStorage.setItem('botiquin-v23-data', JSON.stringify(meds));
      localStorage.setItem('botiquin-v23-notes', JSON.stringify(dailyNotes));
      localStorage.setItem('botiquin-paciente', patientName);
    }
    localStorage.setItem('dark-mode', darkMode);
  }, [meds, dailyNotes, patientName, darkMode]);

  // --- LÓGICA DE CERRAR SESIÓN (NUEVO) ---
  const handleLogout = () => {
    if(window.confirm(`¿Seguro que quieres cerrar la sesión de ${patientName}?`)) {
      setPatientName('');               // Reiniciamos estado de nombre
      setTempPatientName('');           // Reiniciamos input de nombre
      setMeds([]);                      // IMPORTANTE: Borramos medicamentos actuales para el nuevo usuario
      setDailyNotes({});               // IMPORTANTE: Borramos notas actuales para el nuevo usuario
      localStorage.removeItem('botiquin-paciente'); // Borramos del almacenamiento
      // (Opcional: Si quieres reiniciar TODO, borras las claves botiquin-v23-data y notes también)
    }
  };

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
    const daysInMonth = new Date(viewDate.getFullYear(), viewMonth + 1, 0).getDate();
    doc.setFont("helvetica", "bold").setFontSize(22);
    doc.text("REPORTE MÉDICO MENSUAL", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14).setTextColor(37, 99, 235).text(`${monthNames[viewMonth].toUpperCase()} ${viewDate.getFullYear()}`, pageWidth / 2, 28, { align: "center" });
    doc.setFontSize(10).setTextColor(100).text(`Paciente: ${patientName.toUpperCase()}`, pageWidth / 2, 35, { align: "center" });
    doc.line(15, 38, pageWidth - 15, 38);
    let y = 50;
    meds.forEach((med, idx) => {
      if (y > 230) { doc.addPage(); y = 25; }
      doc.setFillColor(30, 41, 59).rect(15, y - 5, pageWidth - 30, 10, 'F');
      doc.setTextColor(255).setFontSize(11).text(`${idx + 1}. ${med.name} (${med.dosage}) - ${med.time} HS`, 20, y + 1.5);
      y += 12; doc.setTextColor(0).setFontSize(8);
      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = formatDate(new Date(viewDate.getFullYear(), viewMonth, d));
        const status = med.history[dStr];
        doc.text(`Día ${d}: ${status === true ? 'TOMADA' : status === false ? 'FALLO' : '---'}`, 20, y);
        y += 5; if (y > 280) { doc.addPage(); y = 20; }
      }
      y += 10;
    });
    doc.addPage();
    doc.setFont("helvetica", "bold").setFontSize(16).setTextColor(30, 41, 59).text("ANOTACIONES DEL MES", 15, 20);
    doc.line(15, 23, pageWidth - 15, 23);
    y = 35; doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(50);
    Object.keys(dailyNotes).sort().forEach(dateKey => {
      const d
