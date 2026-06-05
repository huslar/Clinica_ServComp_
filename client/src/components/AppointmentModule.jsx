import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { appointmentService } from "../services/appointmentService";
import { patientService } from "../services/patientService";
import { professionalService } from "../services/professionalService";

const appointmentTypes = ["Diagnostico", "Control", "Atencion"];
const durations = [15, 30, 45, 60, 75, 90, 120];
const activeStatuses = new Set(["Reservada", "Confirmada", "En espera"]);

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function patientLabel(patient) {
  return `${patient.nombres} ${patient.apellidoPaterno} ${patient.apellidoMaterno}`;
}

function professionalLabel(professional) {
  return `${professional.nombres} ${professional.apellidoPaterno}`;
}

function initialsFromName(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function AgendaIllustration() {
  return (
    <svg className="appointment-illustration" viewBox="0 0 260 150" role="img" aria-label="Agenda clinica visual">
      <rect x="16" y="18" width="170" height="116" rx="16" className="agenda-art-board" />
      <rect x="36" y="38" width="44" height="18" rx="8" className="agenda-art-soft" />
      <rect x="92" y="38" width="70" height="18" rx="8" className="agenda-art-soft" />
      <rect x="36" y="68" width="126" height="22" rx="9" className="agenda-art-strong" />
      <rect x="36" y="102" width="54" height="16" rx="8" className="agenda-art-soft" />
      <rect x="102" y="102" width="60" height="16" rx="8" className="agenda-art-soft" />
      <circle cx="201" cy="72" r="34" className="agenda-art-avatar" />
      <path d="M190 72h22M201 61v22" className="agenda-art-cross" />
      <path d="M206 109c15-8 26-23 30-41" className="agenda-art-line" />
      <path d="M58 23v-9M144 23v-9" className="agenda-art-line" />
    </svg>
  );
}

export function AppointmentModule({ onNotify }) {
  const [patients, setPatients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [date, setDate] = useState(today());
  const [professionalId, setProfessionalId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [appointmentType, setAppointmentType] = useState("Diagnostico");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startTime, setStartTime] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([patientService.list(), professionalService.list()])
      .then(([patientItems, professionalItems]) => {
        const activePatients = patientItems.filter((item) => item.estado === "Activo");
        const activeProfessionals = professionalItems.filter((item) => item.estado === "Activo");
        setPatients(activePatients);
        setProfessionals(activeProfessionals);
        if (activePatients[0]) setPatientId(String(activePatients[0].id));
        if (activeProfessionals[0]) setProfessionalId(String(activeProfessionals[0].id));
      })
      .catch((error) => onNotify(error.message));
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    appointmentService.list({ date, professionalId })
      .then(setAppointments)
      .catch((error) => onNotify(error.message))
      .finally(() => setLoading(false));
  }, [date, professionalId]);

  useEffect(() => {
    if (!professionalId || !date || !durationMinutes) return;
    appointmentService.availability({ professionalId, date, durationMinutes })
      .then((slots) => {
        setAvailableSlots(slots);
        setStartTime((current) => slots.some((slot) => slot.startTime === current) ? current : slots[0]?.startTime || "");
      })
      .catch((error) => {
        setAvailableSlots([]);
        setStartTime("");
        onNotify(error.message);
      });
  }, [professionalId, date, durationMinutes, appointments.length]);

  const selectedProfessional = professionals.find((item) => String(item.id) === professionalId);
  const dayAppointments = useMemo(() => appointments.filter((item) => item.appointmentDate === date), [appointments, date]);
  const activeCount = dayAppointments.filter((item) => activeStatuses.has(item.estado)).length;
  const attendedCount = dayAppointments.filter((item) => item.estado === "Atendida").length;
  const cancelledCount = dayAppointments.filter((item) => item.estado === "Cancelada" || item.estado === "No asiste").length;
  const visualRows = useMemo(() => {
    const rows = new Map();
    availableSlots.forEach((slot) => rows.set(slot.startTime, { startTime: slot.startTime, endTime: slot.endTime, status: "available" }));
    dayAppointments.forEach((appointment) => rows.set(appointment.startTime, { ...appointment, status: activeStatuses.has(appointment.estado) ? "booked" : "closed" }));
    return [...rows.values()].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  }, [availableSlots, dayAppointments]);

  async function reloadAppointments() {
    const items = await appointmentService.list({ date, professionalId });
    setAppointments(items);
  }

  async function saveAppointment(event) {
    event.preventDefault();
    if (!patientId || !professionalId || !date || !startTime) {
      onNotify("Selecciona paciente, profesional, fecha y horario disponible");
      return;
    }
    setSaving(true);
    try {
      await appointmentService.create({
        patientId: Number(patientId),
        professionalId: Number(professionalId),
        appointmentDate: date,
        startTime,
        durationMinutes: Number(durationMinutes),
        appointmentType,
        estado: "Reservada",
        motivo,
        observaciones,
      });
      setMotivo("");
      setObservaciones("");
      await reloadAppointments();
      onNotify("Reserva clinica creada correctamente");
    } catch (error) {
      onNotify(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id) {
    if (!window.confirm("Cancelar esta reserva clinica?")) return;
    try {
      await appointmentService.cancel(id);
      await reloadAppointments();
      onNotify("Reserva cancelada correctamente");
    } catch (error) {
      onNotify(error.message);
    }
  }

  return (
    <>
      <section className="hero appointment-hero">
        <div>
          <p className="eyebrow">Agenda clinica</p>
          <h1>RESERVAS</h1>
          <p className="hero-copy">Gestiona citas de diagnostico, control y atencion segun la disponibilidad real de cada profesional.</p>
        </div>
        <div className="appointment-date-filter">
          <label>
            <span>Fecha agenda</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="stats appointment-stats">
        <article><div className="stat-icon teal"><Icon name="calendar" /></div><div><small>Citas del dia</small><strong>{dayAppointments.length}</strong><p>Filtradas por fecha</p></div></article>
        <article><div className="stat-icon green"><Icon name="check" /></div><div><small>Activas</small><strong>{activeCount}</strong><p>Reservadas o confirmadas</p></div></article>
        <article><div className="stat-icon gold"><Icon name="activity" /></div><div><small>Atendidas</small><strong>{attendedCount}</strong><p>Con cierre clinico</p></div></article>
        <article><div className="stat-icon purple"><Icon name="shield" /></div><div><small>Bloqueadas</small><strong>{cancelledCount}</strong><p>Canceladas o no asiste</p></div></article>
      </section>

      <section className="appointment-layout">
        <aside className="appointment-panel">
          <div className="card-heading compact-heading">
            <div>
              <h2>Nueva reserva</h2>
              <p>La hora se valida contra horario y reservas activas.</p>
            </div>
          </div>

          <form className="appointment-form" onSubmit={saveAppointment}>
            <label className="field field-wide">Profesional
              <select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>
                {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professionalLabel(professional)}</option>)}
              </select>
            </label>

            {selectedProfessional && <div className="appointment-professional-card">
              <span className="patient-avatar">{initialsFromName(professionalLabel(selectedProfessional))}</span>
              <div>
                <strong>{selectedProfessional.especialidad}</strong>
                <small>{selectedProfessional.areaTrabajo} - {selectedProfessional.profesion}</small>
              </div>
            </div>}

            <label className="field field-wide">Paciente
              <select value={patientId} onChange={(event) => setPatientId(event.target.value)}>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patientLabel(patient)} - {patient.rut}</option>)}
              </select>
            </label>

            <div className="field-grid appointment-field-grid">
              <label className="field">Tipo
                <select value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)}>
                  {appointmentTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="field">Duracion
                <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>
                  {durations.map((duration) => <option key={duration} value={duration}>{duration} min</option>)}
                </select>
              </label>
            </div>

            <label className="field field-wide">Horario disponible
              <select value={startTime} onChange={(event) => setStartTime(event.target.value)} disabled={!availableSlots.length}>
                {availableSlots.length ? availableSlots.map((slot) => <option key={slot.startTime} value={slot.startTime}>{slot.startTime} - {slot.endTime}</option>) : <option value="">Sin cupos para esta duracion</option>}
              </select>
            </label>

            <label className="field field-wide">Motivo
              <input value={motivo} onChange={(event) => setMotivo(event.target.value)} maxLength={250} placeholder="Ej: Evaluacion inicial, control post tratamiento..." />
            </label>

            <label className="field field-wide">Observaciones
              <textarea value={observaciones} onChange={(event) => setObservaciones(event.target.value)} maxLength={500} placeholder="Notas administrativas o indicaciones previas a la atencion" />
            </label>

            <button className="button primary large appointment-save" disabled={saving || !availableSlots.length}>
              <Icon name="plus" /> {saving ? "Reservando..." : "Crear reserva"}
            </button>
          </form>
        </aside>

        <section className="content-card appointment-list">
          <div className="appointment-visual-header">
            <div>
              <p className="eyebrow">Vista grafica profesional</p>
              <h2>{selectedProfessional ? professionalLabel(selectedProfessional) : "Agenda profesional"}</h2>
              <p>{selectedProfessional ? `${selectedProfessional.especialidad} - ${selectedProfessional.areaTrabajo}` : "Selecciona profesional para ver disponibilidad."}</p>
              <div className="appointment-legend">
                <span><i className="free" />Disponible</span>
                <span><i className="busy" />Reservado</span>
                <span><i className="closed" />Cerrado</span>
              </div>
            </div>
            <AgendaIllustration />
          </div>

          <div className="card-heading">
            <div>
              <h2>Agenda del dia</h2>
              <p>{selectedProfessional ? professionalLabel(selectedProfessional) : "Selecciona un profesional"} - {date}</p>
            </div>
            <span className="pending-tag">{availableSlots.length} cupos libres</span>
          </div>

          <div className="availability-strip">
            {availableSlots.length ? availableSlots.slice(0, 18).map((slot) => (
              <button key={slot.startTime} className={startTime === slot.startTime ? "selected" : ""} onClick={() => setStartTime(slot.startTime)}>
                <strong>{slot.startTime}</strong><small>{slot.endTime}</small>
              </button>
            )) : <p>No hay bloques libres para la duracion seleccionada.</p>}
          </div>

          <div className="appointment-timeline">
            {visualRows.length ? visualRows.map((row) => {
              const isAvailable = row.status === "available";
              const rowClass = isAvailable ? "available" : row.status === "closed" ? "closed" : `booked ${row.appointmentType.toLowerCase()}`;
              return (
                <button
                  key={`${row.status}-${row.startTime}-${row.id || "slot"}`}
                  className={`timeline-row ${rowClass} ${startTime === row.startTime && isAvailable ? "selected" : ""}`}
                  onClick={() => isAvailable && setStartTime(row.startTime)}
                  disabled={!isAvailable}
                  title={isAvailable ? `Reservar ${row.startTime}` : `${row.patientName} ${row.startTime}`}
                >
                  <span className="timeline-hour">{row.startTime}<small>{row.endTime}</small></span>
                  <span className="timeline-track"><i /></span>
                  <span className="timeline-detail">
                    <strong>{isAvailable ? "Cupo disponible" : row.patientName}</strong>
                    <small>{isAvailable ? `${durationMinutes} minutos libres para ${appointmentType}` : `${row.appointmentType} - ${row.estado}`}</small>
                  </span>
                  {!isAvailable && <span className="timeline-avatar">{initialsFromName(row.patientName)}</span>}
                </button>
              );
            }) : <div className="appointment-visual-empty"><Icon name="calendar" /><span>No hay disponibilidad configurada para este dia.</span></div>}
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Hora</th><th>Paciente</th><th>Tipo</th><th>Estado</th><th>Motivo</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {dayAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td><strong className="appointment-time">{appointment.startTime} - {appointment.endTime}</strong></td>
                    <td><div className="patient-cell"><span className="patient-avatar">{initialsFromName(appointment.patientName)}</span><div><strong>{appointment.patientName}</strong><small>{appointment.patientRut}</small></div></div></td>
                    <td><span className={`appointment-type ${appointment.appointmentType.toLowerCase()}`}>{appointment.appointmentType}</span></td>
                    <td><span className={`appointment-status ${appointment.estado.toLowerCase().replaceAll(" ", "-")}`}><i />{appointment.estado}</span></td>
                    <td>{appointment.motivo || "Sin motivo registrado"}</td>
                    <td><div className="row-actions"><button disabled={appointment.estado === "Cancelada"} onClick={() => cancel(appointment.id)} aria-label="Cancelar"><Icon name="close" size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !dayAppointments.length && <div className="empty-state"><Icon name="calendar" size={28} /><h3>Sin reservas para esta fecha</h3><p>Selecciona un cupo disponible y crea la primera cita del dia.</p></div>}
            {loading && <div className="empty-state"><Icon name="calendar" size={28} /><h3>Cargando agenda</h3><p>Consultando reservas del profesional.</p></div>}
          </div>
        </section>
      </section>
    </>
  );
}
