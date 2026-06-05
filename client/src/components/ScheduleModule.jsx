import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { professionalService } from "../services/professionalService";
import { studentService } from "../services/studentService";
import { scheduleService, studentScheduleService } from "../services/scheduleService";

const days = [
  { id: 1, short: "Lun", label: "Lunes" },
  { id: 2, short: "Mar", label: "Martes" },
  { id: 3, short: "Mie", label: "Miercoles" },
  { id: 4, short: "Jue", label: "Jueves" },
  { id: 5, short: "Vie", label: "Viernes" },
  { id: 6, short: "Sab", label: "Sabado" },
  { id: 7, short: "Dom", label: "Domingo" },
];

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function slotsBetween(start, end) {
  const result = [];
  for (let minutes = toMinutes(start); minutes < toMinutes(end); minutes += 15) result.push(toTime(minutes));
  return result;
}

const visibleSlots = slotsBetween("07:00", "22:00");
const timeOptions = visibleSlots;
const endOptions = [...visibleSlots.slice(1), "22:00"];

function blockKey(dayOfWeek, startTime) {
  return `${dayOfWeek}-${startTime}`;
}

export function ScheduleModule({ onNotify, mode = "professionals" }) {
  const isStudentMode = mode === "students";
  const entityService = isStudentMode ? studentService : professionalService;
  const agendaService = isStudentMode ? studentScheduleService : scheduleService;
  const [entities, setEntities] = useState([]);
  const [entityId, setEntityId] = useState("");
  const [blocks, setBlocks] = useState(new Set());
  const [savedBlocks, setSavedBlocks] = useState(new Set());
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("13:00");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    entityService.list()
      .then((items) => {
        const activeEntities = items.filter((item) => item.estado === "Activo");
        setEntities(activeEntities);
        if (activeEntities[0]) setEntityId(String(activeEntities[0].id));
      })
      .catch((error) => onNotify(error.message));
  }, [mode]);

  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    agendaService.list(entityId)
      .then((items) => {
        const keys = new Set(items.map((item) => blockKey(item.dayOfWeek, item.startTime)));
        setBlocks(keys);
        setSavedBlocks(new Set(keys));
      })
      .catch((error) => onNotify(error.message))
      .finally(() => setLoading(false));
  }, [entityId, mode]);

  const hasChanges = useMemo(() => blocks.size !== savedBlocks.size || [...blocks].some((key) => !savedBlocks.has(key)), [blocks, savedBlocks]);
  const selectedEntity = entities.find((item) => String(item.id) === entityId);
  const hoursAssigned = (blocks.size * 15 / 60).toFixed(blocks.size % 4 ? 2 : 0);

  function toggleBlock(dayOfWeek, startTime) {
    setBlocks((current) => {
      const next = new Set(current);
      const key = blockKey(dayOfWeek, startTime);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleDay(dayId) {
    setSelectedDays((current) => current.includes(dayId) ? current.filter((id) => id !== dayId) : [...current, dayId]);
  }

  function applyRange(mode) {
    if (!selectedDays.length) return onNotify("Selecciona al menos un dia");
    if (toMinutes(rangeEnd) <= toMinutes(rangeStart)) return onNotify("La hora de termino debe ser posterior al inicio");
    const rangeSlots = slotsBetween(rangeStart, rangeEnd);
    setBlocks((current) => {
      const next = new Set(current);
      selectedDays.forEach((dayId) => rangeSlots.forEach((time) => {
        const key = blockKey(dayId, time);
        if (mode === "add") next.add(key);
        else next.delete(key);
      }));
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const payload = [...blocks].map((key) => {
        const [dayOfWeek, startTime] = key.split("-");
        return { dayOfWeek: Number(dayOfWeek), startTime };
      });
      const saved = await agendaService.save(entityId, payload);
      const keys = new Set(saved.map((item) => blockKey(item.dayOfWeek, item.startTime)));
      setBlocks(keys);
      setSavedBlocks(new Set(keys));
      onNotify(`Horario ${isStudentMode ? "del alumno" : "profesional"} guardado correctamente`);
    } catch (error) {
      onNotify(error.message);
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setBlocks(new Set(savedBlocks));
  }

  return (
    <>
      <section className="hero schedule-hero">
        <div><p className="eyebrow">Planificacion clinica</p><h1>{isStudentMode ? "HORARIOS ALUMNOS" : "HORARIOS PROFESIONALES"}</h1><p className="hero-copy">Define la disponibilidad semanal con modulos exactos de 15 minutos.</p></div>
        <div className="schedule-actions"><button className="button secondary" disabled={!hasChanges} onClick={discard}>Descartar cambios</button><button className="button primary large" disabled={!entityId || !hasChanges || saving} onClick={save}><Icon name="check" /> {saving ? "Guardando..." : "Guardar horario"}</button></div>
      </section>

      <section className="schedule-layout">
        <aside className="schedule-sidebar">
          <div className="schedule-panel">
            <p className="eyebrow">Profesional</p>
            <h2>Agenda asignada</h2>
            <label className="schedule-select"><span>Selecciona {isStudentMode ? "alumno" : "profesional"}</span><select value={entityId} onChange={(event) => setEntityId(event.target.value)}>{entities.map((item) => <option key={item.id} value={item.id}>{item.nombres} {item.apellidoPaterno}</option>)}</select></label>
            {selectedEntity && <div className="selected-professional"><span className="patient-avatar">{selectedEntity.nombres[0]}{selectedEntity.apellidoPaterno[0]}</span><div><strong>{isStudentMode ? selectedEntity.carreraEspecialidad : selectedEntity.profesion}</strong><small>{isStudentMode ? `${selectedEntity.anioCursa}° año · ${selectedEntity.categoria}` : `${selectedEntity.areaTrabajo} · ${selectedEntity.especialidad}`}</small></div></div>}
          </div>

          <div className="schedule-panel range-panel">
            <p className="eyebrow">Asignacion rapida</p><h3>Aplicar rango horario</h3><p>Selecciona dias y agrega o quita bloques en conjunto.</p>
            <div className="day-picker">{days.map((day) => <button key={day.id} className={selectedDays.includes(day.id) ? "selected" : ""} onClick={() => toggleDay(day.id)}>{day.short}</button>)}</div>
            <div className="range-times"><label><span>Desde</span><select value={rangeStart} onChange={(event) => setRangeStart(event.target.value)}>{timeOptions.map((time) => <option key={time}>{time}</option>)}</select></label><label><span>Hasta</span><select value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)}>{endOptions.map((time) => <option key={time}>{time}</option>)}</select></label></div>
            <div className="range-buttons"><button className="button primary" onClick={() => applyRange("add")}><Icon name="plus" size={15} />Agregar rango</button><button className="button secondary" onClick={() => applyRange("remove")}>Quitar rango</button></div>
          </div>

          <div className="schedule-summary"><div><small>Modulos asignados</small><strong>{blocks.size}</strong></div><div><small>Horas semanales</small><strong>{hoursAssigned}</strong></div></div>
        </aside>

        <section className="schedule-board">
          <header><div><h2>Disponibilidad semanal</h2><p>Haz clic en cualquier celda para activar o quitar un modulo de 15 minutos.</p></div>{hasChanges && <span className="pending-tag">Cambios pendientes</span>}</header>
          <div className="schedule-grid-wrap">
            {loading ? <div className="schedule-loading">Cargando agenda...</div> : <div className="schedule-grid">
              <div className="schedule-corner">Hora</div>
              {days.map((day) => <div key={day.id} className="schedule-day-head"><strong>{day.short}</strong><small>{day.label}</small></div>)}
              {visibleSlots.map((time) => <React.Fragment key={time}>
                <div className={`schedule-time ${time.endsWith(":00") ? "full-hour" : ""}`}>{time.endsWith(":00") ? time : ""}</div>
                {days.map((day) => {
                  const active = blocks.has(blockKey(day.id, time));
                  return <button key={`${day.id}-${time}`} className={`schedule-cell ${active ? "active" : ""} ${time.endsWith(":00") ? "full-hour" : ""}`} onClick={() => toggleBlock(day.id, time)} title={`${day.label} ${time} - ${toTime(toMinutes(time) + 15)}`} aria-label={`${day.label} ${time}`} aria-pressed={active} />;
                })}
              </React.Fragment>)}
            </div>}
          </div>
        </section>
      </section>
    </>
  );
}
